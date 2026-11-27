/**
 * Across Protocol v3 testnet integration (direct client-side quotes & SpokePool deposits).
 *
 * Verified 2026-11-26 against:
 *  - Live Across Testnet API: https://testnet.across.to/api/available-routes & /api/suggested-fees (CORS: *)
 *  - Live SpokePool bytecode on all 6 supported testnets (Sepolia, Base Sepolia, Arbitrum Sepolia,
 *    OP Sepolia, Unichain Sepolia, Polygon Amoy)
 *  - Live eth_call of depositV3 against Sepolia SpokePool (0x5ef6C01E11889d86803e0B23e3cB3F9E9d97B662)
 */
import { encodeFunctionData, formatUnits, parseAbi } from 'viem'
import type { PublicClient } from 'viem'
import { getChain, mustChain, type Address } from '../config/chains'
import { findToken, nativeToken, tokensForChain, WETH, type TokenCfg } from '../config/tokens'
import { assertTestnet } from './guard'
import { prepareTx, type PreparedTx } from './tx'
import { erc20Allowance } from './uniswap'
import { buildApproveCalldata } from './swapExec'

export const ACROSS_API = 'https://testnet.across.to'

/** Verified Across V3 SpokePool addresses per testnet chainId. */
export const ACROSS_SPOKE_POOLS: Record<number, Address> = {
  11155111: '0x5ef6C01E11889d86803e0B23e3cB3F9E9d97B662', // Ethereum Sepolia
  84532: '0x82B564983aE7274c86695917BBf8C99ECb6F0F8F',    // Base Sepolia
  421614: '0x7E63A5f1a8F0B4d0934B2f2327DAED3F6bb2ee75',   // Arbitrum Sepolia
  11155420: '0x4e8E101924eDE233C13e2D8622DC8aED2872d505', // OP Sepolia
  1301: '0x6999526e507Cc3b03b180BbE05E1Ff938259A874',     // Unichain Sepolia
  80002: '0xd08baaE74D6d2eAb1F3320B2E1a53eeb391ce8e5',    // Polygon Amoy
}

/** Chains where ETH is the native gas asset and Across auto-unwraps WETH on delivery. */
export const ACROSS_ETH_CHAINS = new Set([11155111, 84532, 421614, 11155420, 1301])

/** WETH contract recognized by Across SpokePools on each supported testnet. */
export const ACROSS_WETH: Record<number, Address> = {
  11155111: WETH[11155111],
  84532: WETH[84532],
  421614: WETH[421614],
  11155420: WETH[11155420],
  1301: WETH[1301],
  80002: '0x52eF3d68BaB452a294342DC3e5f464d7f610f72E',
}

export const spokePoolV3Abi = parseAbi([
  'function depositV3(address depositor, address recipient, address inputToken, address outputToken, uint256 inputAmount, uint256 outputAmount, uint256 destinationChainId, address exclusiveRelayer, uint32 quoteTimestamp, uint32 fillDeadline, uint32 exclusivityDeadline, bytes message) payable',
])

export type AcrossAssetKind = 'native' | 'weth' | 'usdc'

export interface AcrossRouteSpec {
  from: number
  to: number
  inToken: Address
  outToken: Address
  isNative: boolean
  destToken: TokenCfg
}

/**
 * Resolves the exact SpokePool input/output token pair when Across supports bridging
 * `assetKind` from `fromId` to `toId`. Returns null if unsupported.
 */
export function acrossRouteAvailable(fromId: number, toId: number, assetKind: AcrossAssetKind): AcrossRouteSpec | null {
  if (fromId === toId) return null
  if (!ACROSS_SPOKE_POOLS[fromId] || !ACROSS_SPOKE_POOLS[toId]) return null

  const from = getChain(fromId)
  const to = getChain(toId)
  if (!from || !to) return null

  if (assetKind === 'usdc') {
    if (!from.usdc || !to.usdc) return null
    const dest = findToken(toId, to.usdc)
    if (!dest) return null
    return {
      from: fromId,
      to: toId,
      inToken: from.usdc,
      outToken: to.usdc,
      isNative: false,
      destToken: dest,
    }
  }

  if (assetKind === 'native') {
    if (!ACROSS_ETH_CHAINS.has(fromId)) return null
    const inWeth = ACROSS_WETH[fromId]
    const outWeth = ACROSS_WETH[toId]
    if (!inWeth || !outWeth) return null
    // Destination gets native ETH when it is an ETH chain, or WETH ERC-20 on Polygon Amoy
    const dest = ACROSS_ETH_CHAINS.has(toId) ? nativeToken(toId) : findToken(toId, outWeth)
    if (!dest) return null
    return {
      from: fromId,
      to: toId,
      inToken: inWeth,
      outToken: outWeth,
      isNative: true,
      destToken: dest,
    }
  }

  // WETH ERC-20
  const inWeth = ACROSS_WETH[fromId]
  const outWeth = ACROSS_WETH[toId]
  if (!inWeth || !outWeth) return null
  const dest = ACROSS_ETH_CHAINS.has(toId) ? nativeToken(toId) : findToken(toId, outWeth)
  if (!dest) return null
  return {
    from: fromId,
    to: toId,
    inToken: inWeth,
    outToken: outWeth,
    isNative: false,
    destToken: dest,
  }
}

export interface AcrossQuote {
  spokePool: Address
  inputAmount: bigint
  outputAmount: bigint
  totalFee: bigint
  quoteTimestamp: number
  fillDeadline: number
  exclusivityDeadline: number
  exclusiveRelayer: Address
  estimatedFillTimeSec: number
  minDeposit: bigint
  maxDeposit: bigint
}

const feeCache = new Map<string, { at: number; quote: AcrossQuote }>()

export class AcrossQuoteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AcrossQuoteError'
  }
}

export async function fetchAcrossFee(params: {
  fromId: number
  toId: number
  inputToken: Address
  outputToken: Address
  amount: bigint
  decimals: number
  symbol: string
}): Promise<AcrossQuote> {
  const key = `${params.fromId}->${params.toId}:${params.inputToken.toLowerCase()}:${params.outputToken.toLowerCase()}:${params.amount.toString()}`
  const hit = feeCache.get(key)
  if (hit && Date.now() - hit.at < 20_000) return hit.quote

  const url = `${ACROSS_API}/api/suggested-fees?inputToken=${params.inputToken}&outputToken=${params.outputToken}&originChainId=${params.fromId}&destinationChainId=${params.toId}&amount=${params.amount.toString()}`
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  const body = (await res.json().catch(() => ({}))) as {
    code?: string
    message?: string
    spokePoolAddress?: string
    outputAmount?: string
    totalRelayFee?: { total?: string }
    relayFeeTotal?: string
    timestamp?: string | number
    fillDeadline?: string | number
    exclusivityDeadline?: string | number
    exclusiveRelayer?: string
    estimatedFillTimeSec?: number
    isAmountTooLow?: boolean
    limits?: { minDeposit?: string; maxDeposit?: string; recommendedDepositInstant?: string }
  }

  if (!res.ok || !body.outputAmount || !body.spokePoolAddress) {
    throw new AcrossQuoteError(body.message || `Across API returned ${res.status}`)
  }

  const minDeposit = BigInt(body.limits?.minDeposit ?? '0')
  const maxDeposit = BigInt(body.limits?.recommendedDepositInstant ?? body.limits?.maxDeposit ?? '0')
  const outputAmount = BigInt(body.outputAmount)

  if (body.isAmountTooLow || (minDeposit > 0n && params.amount < minDeposit)) {
    throw new AcrossQuoteError(`Minimum Across amount is ${formatUnits(minDeposit, params.decimals)} ${params.symbol}.`)
  }
  if (maxDeposit > 0n && params.amount > maxDeposit) {
    throw new AcrossQuoteError(
      `Exceeds Across testnet relayer liquidity (${formatUnits(maxDeposit, params.decimals)} ${params.symbol} max).`,
    )
  }

  // Sanity-check the remote quote before it becomes calldata: a fresh timestamp, a positive
  // output and a bounded exclusivity window. Anything else is a misquote, not a cheaper route.
  const nowSec = Math.floor(Date.now() / 1000)
  const quoteTs = Number(body.timestamp)
  if (!Number.isFinite(quoteTs) || quoteTs < nowSec - 1800 || quoteTs > nowSec + 300) {
    throw new AcrossQuoteError('Across returned a stale quote. Try again.')
  }
  if (outputAmount <= 0n) throw new AcrossQuoteError('Across returned an empty quote.')
  const exclusivity = Number(body.exclusivityDeadline ?? 0)
  if (!Number.isFinite(exclusivity) || exclusivity < 0 || exclusivity > nowSec + 7200) {
    throw new AcrossQuoteError('Across returned an invalid exclusivity window.')
  }
  const relayerRaw = (body.exclusiveRelayer || '0x0000000000000000000000000000000000000000').toLowerCase()
  if (!/^0x[0-9a-f]{40}$/.test(relayerRaw)) {
    throw new AcrossQuoteError('Across returned an invalid relayer address.')
  }

  const feeStr = body.totalRelayFee?.total ?? body.relayFeeTotal ?? '0'
  const quote: AcrossQuote = {
    spokePool: body.spokePoolAddress as Address,
    inputAmount: params.amount,
    outputAmount,
    totalFee: BigInt(feeStr),
    quoteTimestamp: quoteTs,
    fillDeadline: Number(body.fillDeadline ?? quoteTs + 7200),
    exclusivityDeadline: exclusivity,
    exclusiveRelayer: relayerRaw as Address,
    estimatedFillTimeSec: Number(body.estimatedFillTimeSec ?? 15),
    minDeposit,
    maxDeposit,
  }

  feeCache.set(key, { at: Date.now(), quote })
  return quote
}

export function buildAcrossDepositCalldata(params: {
  spokePool: Address
  depositor: Address
  recipient: Address
  inputToken: Address
  outputToken: Address
  inputAmount: bigint
  outputAmount: bigint
  destinationChainId: number
  exclusiveRelayer: Address
  quoteTimestamp: number
  fillDeadline: number
  exclusivityDeadline: number
  isNative: boolean
}): { to: Address; data: `0x${string}`; value: bigint } {
  const data = encodeFunctionData({
    abi: spokePoolV3Abi,
    functionName: 'depositV3',
    args: [
      params.depositor,
      params.recipient,
      params.inputToken,
      params.outputToken,
      params.inputAmount,
      params.outputAmount,
      BigInt(params.destinationChainId),
      params.exclusiveRelayer,
      params.quoteTimestamp,
      params.fillDeadline,
      params.exclusivityDeadline,
      '0x',
    ],
  })
  return {
    to: params.spokePool,
    data,
    value: params.isNative ? params.inputAmount : 0n,
  }
}

export async function executeAcrossBridge(p: {
  fromChainId: number
  toChainId: number
  inputToken: Address
  outputToken: Address
  amount: bigint
  isNative: boolean
  decimals: number
  symbol: string
  depositor: Address
  recipient: Address
  wallet: { sendTransaction: (tx: PreparedTx) => Promise<`0x${string}`> }
  client: PublicClient
  onStep: (step: 'approve' | 'deposit', state: 'active' | 'done' | 'failed', hash?: string) => void
}) {
  assertTestnet(p.fromChainId, 'source chain')
  assertTestnet(p.toChainId, 'destination chain')
  const from = mustChain(p.fromChainId)
  const expectedSpoke = ACROSS_SPOKE_POOLS[p.fromChainId]
  if (!expectedSpoke) throw new Error(`No verified Across SpokePool on ${from.name}.`)

  const quote = await fetchAcrossFee({
    fromId: p.fromChainId,
    toId: p.toChainId,
    inputToken: p.inputToken,
    outputToken: p.outputToken,
    amount: p.amount,
    decimals: p.decimals,
    symbol: p.symbol,
  })

  if (quote.spokePool.toLowerCase() !== expectedSpoke.toLowerCase()) {
    throw new Error(`Across API returned unexpected SpokePool ${quote.spokePool} (expected ${expectedSpoke}).`)
  }

  let approveHash: `0x${string}` | undefined
  if (!p.isNative) {
    const allowance = await erc20Allowance(p.client, p.inputToken, p.depositor, expectedSpoke)
    if (allowance < p.amount) {
      p.onStep('approve', 'active')
      try {
        const approveTx = await prepareTx(p.client, from, {
          to: p.inputToken,
          data: buildApproveCalldata(expectedSpoke, p.amount),
          account: p.depositor,
        })
        approveHash = await p.wallet.sendTransaction(approveTx)
        const rc = await p.client.waitForTransactionReceipt({ hash: approveHash })
        if (rc.status !== 'success') throw new Error('Token approval reverted on source chain.')
        p.onStep('approve', 'done', approveHash)
      } catch (e) {
        p.onStep('approve', 'failed')
        throw e
      }
    } else {
      p.onStep('approve', 'done')
    }
  } else {
    p.onStep('approve', 'done')
  }

  const built = buildAcrossDepositCalldata({
    spokePool: expectedSpoke,
    depositor: p.depositor,
    recipient: p.recipient,
    inputToken: p.inputToken,
    outputToken: p.outputToken,
    inputAmount: p.amount,
    outputAmount: quote.outputAmount,
    destinationChainId: p.toChainId,
    exclusiveRelayer: quote.exclusiveRelayer,
    quoteTimestamp: quote.quoteTimestamp,
    fillDeadline: quote.fillDeadline,
    exclusivityDeadline: quote.exclusivityDeadline,
    isNative: p.isNative,
  })

  p.onStep('deposit', 'active')
  let depositHash: `0x${string}`
  try {
    const tx = await prepareTx(p.client, from, {
      to: built.to,
      data: built.data,
      value: built.value,
      account: p.depositor,
    })
    depositHash = await p.wallet.sendTransaction(tx)
  } catch (e) {
    p.onStep('deposit', 'failed')
    throw e
  }

  const rc = await p.client.waitForTransactionReceipt({ hash: depositHash })
  if (rc.status !== 'success') {
    p.onStep('deposit', 'failed', depositHash)
    throw new Error('Across deposit reverted on the source chain.')
  }
  p.onStep('deposit', 'done', depositHash)
  return { depositHash, approveHash, outputAmount: quote.outputAmount }
}

export type AcrossStatusState =
  | { state: 'pending'; detail: string }
  | { state: 'filled'; fillTx?: string }
  | { state: 'expired'; detail: string }

export async function fetchAcrossStatus(originChainId: number, depositTxHash: string): Promise<AcrossStatusState> {
  const res = await fetch(
    `${ACROSS_API}/api/deposit/status?originChainId=${originChainId}&depositTxHash=${depositTxHash}`,
    { headers: { accept: 'application/json' } },
  )
  if (res.status === 404) {
    return { state: 'pending', detail: 'Deposit submitted; waiting for Across indexer.' }
  }
  if (!res.ok) {
    return { state: 'pending', detail: `Across indexer returned ${res.status}; retrying.` }
  }
  const body = (await res.json()) as { status?: string; fillTx?: string; fillTxnRef?: string }
  if (body.status === 'filled') {
    return { state: 'filled', fillTx: body.fillTx ?? body.fillTxnRef }
  }
  if (body.status === 'expired' || body.status === 'refunded') {
    return { state: 'expired', detail: `Deposit ${body.status}. Across relayers refund expired intents automatically.` }
  }
  return { state: 'pending', detail: `Across relayer status: ${body.status ?? 'pending'}` }
}

export function isAcrossSupportedPair(fromId: number, toId: number): boolean {
  return Boolean(ACROSS_SPOKE_POOLS[fromId] && ACROSS_SPOKE_POOLS[toId] && fromId !== toId)
}

export function acrossChainTokens(chainId: number): TokenCfg[] {
  return tokensForChain(chainId)
}

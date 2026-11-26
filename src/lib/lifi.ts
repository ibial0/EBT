/**
 * LI.FI Aggregator integration — testnet bridge + cross-chain swap.
 *
 * Uses the public REST API (https://li.quest/v1/) — no SDK dependency needed.
 * Optional: set VITE_LIFI_API_KEY for higher rate limits (from LI.FI Partner Portal).
 *
 * Supports both same-token bridges (ETH→ETH, USDC→USDC) and
 * cross-chain swaps (ETH on Sepolia → USDC on Base Sepolia, etc.).
 */

const BASE_URL = 'https://li.quest/v1'
const API_KEY = import.meta.env.VITE_LIFI_API_KEY as string | undefined

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (API_KEY) h['x-lifi-api-key'] = API_KEY
  return h
}

const TIMEOUT_MS = 15_000

async function get<T>(path: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  const res = await fetch(url.toString(), {
    headers: headers(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`LI.FI ${path} → HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface LifiChain {
  id: number
  name: string
  chainType: string
  logoURI?: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
  metamask?: { chainId: string }
  testnet?: boolean
}

export interface LifiToken {
  address: string
  chainId: number
  symbol: string
  decimals: number
  name: string
  logoURI?: string
  priceUSD?: string
}

export interface LifiQuote {
  id: string
  type: string
  tool: string
  toolDetails: { key: string; name: string; logoURI?: string }
  action: {
    fromChainId: number
    toChainId: number
    fromToken: LifiToken
    toToken: LifiToken
    fromAmount: string
    slippage: number
    fromAddress: string
  }
  estimate: {
    fromAmount: string
    toAmount: string
    toAmountMin: string
    approvalAddress?: string
    feeCosts?: Array<{ name: string; amount: string; token: LifiToken; amountUSD?: string }>
    gasCosts?: Array<{ type: string; estimate: string; limit: string; amount: string; amountUSD?: string; token: LifiToken }>
    executionDuration: number
  }
  transactionRequest?: {
    from: string
    to: string
    value: string
    data: string
    chainId: number
    gasLimit?: string
    gasPrice?: string
  }
  includedSteps?: Array<{
    id: string
    type: string
    tool: string
    toolDetails: { key: string; name: string }
    action: { fromToken: LifiToken; toToken: LifiToken; fromAmount: string }
    estimate: { fromAmount: string; toAmount: string }
  }>
}

export interface LifiStatus {
  transactionId: string
  status: 'NOT_FOUND' | 'INVALID' | 'PENDING' | 'DONE' | 'FAILED'
  substatus?: string
  substatusMessage?: string
  sending?: { txHash?: string; chainId?: number; amount?: string; token?: LifiToken }
  receiving?: { txHash?: string; chainId?: number; amount?: string; token?: LifiToken }
  lifiExplorerLink?: string
  tool?: string
}

// ─── Chain & Token Discovery ────────────────────────────────────────────────

let _chainCache: LifiChain[] | null = null

/**
 * Fetch all chains LI.FI supports (cached per session).
 * Testnet chains are included when `chainTypes` includes both EVM and others.
 */
export async function getLifiChains(): Promise<LifiChain[]> {
  if (_chainCache) return _chainCache
  const data = await get<{ chains: LifiChain[] }>('/chains', { chainTypes: 'EVM,SVM,MVM,UTXO' })
  _chainCache = data.chains
  return _chainCache
}

/** Set of chain IDs that LI.FI currently supports (cached). */
let _supportedChainIds: Set<number> | null = null
export async function getLifiSupportedChainIds(): Promise<Set<number>> {
  if (_supportedChainIds) return _supportedChainIds
  const chains = await getLifiChains()
  _supportedChainIds = new Set(chains.map((c) => c.id))
  return _supportedChainIds
}

/** Tokens available on a chain in LI.FI. */
export async function getLifiTokens(chainId: number): Promise<LifiToken[]> {
  const data = await get<{ tokens: Record<string, LifiToken[]> }>('/tokens', { chains: String(chainId) })
  return data.tokens[String(chainId)] ?? []
}

// ─── Quote & Transaction Building ───────────────────────────────────────────

export interface LifiQuoteParams {
  fromChainId: number
  toChainId: number
  /** Token address (use 0x0000...0000 for native) */
  fromToken: string
  /** Token address on dest chain */
  toToken: string
  /** Amount in wei / smallest unit as string */
  fromAmount: string
  /** Sender EVM address */
  fromAddress: string
  /** Optional: receiver address (defaults to fromAddress) */
  toAddress?: string
  /** Max slippage 0–1, default 0.005 (0.5%) */
  slippage?: number
  /** Optional: specific bridge/dex to use */
  preferBridges?: string[]
  preferExchanges?: string[]
  /** Skip simulation (faster but less safe) */
  skipSimulation?: boolean
}

/**
 * Fetch the best LI.FI route/quote for a cross-chain transfer.
 * Returns null if LI.FI has no route (chain/token pair not supported on testnet).
 */
export async function fetchLifiQuote(params: LifiQuoteParams): Promise<LifiQuote | null> {
  // Validate that both chains are supported
  const supported = await getLifiSupportedChainIds()
  if (!supported.has(params.fromChainId) || !supported.has(params.toChainId)) {
    return null
  }

  try {
    const p: Record<string, string | number | boolean> = {
      fromChain: params.fromChainId,
      toChain: params.toChainId,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      slippage: params.slippage ?? 0.005,
      skipSimulation: params.skipSimulation ?? false,
    }
    if (params.toAddress) p.toAddress = params.toAddress
    if (params.preferBridges?.length) p.preferBridges = params.preferBridges.join(',')
    if (params.preferExchanges?.length) p.preferExchanges = params.preferExchanges.join(',')

    const quote = await get<LifiQuote>('/quote', p)
    return quote
  } catch (err) {
    // 400 = no route / unsupported pair — not an integration error
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('HTTP 400') || msg.includes('HTTP 404') || msg.includes('No available quotes')) {
      return null
    }
    throw err
  }
}

/**
 * Fetch multiple competing routes from LI.FI (`/routes` endpoint).
 * Returns up to `maxRoutes` quotes sorted by output amount desc.
 */
export interface LifiRoutesParams {
  fromChainId: number
  toChainId: number
  fromToken: string
  toToken: string
  fromAmount: string
  fromAddress: string
  toAddress?: string
  slippage?: number
  maxRoutes?: number
}

export interface LifiRouteResult {
  routes: LifiQuote[]
}

export async function fetchLifiRoutes(params: LifiRoutesParams): Promise<LifiQuote[]> {
  const supported = await getLifiSupportedChainIds()
  if (!supported.has(params.fromChainId) || !supported.has(params.toChainId)) return []

  try {
    const body = {
      fromChainId: params.fromChainId,
      toChainId: params.toChainId,
      fromTokenAddress: params.fromToken,
      toTokenAddress: params.toToken,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress ?? params.fromAddress,
      options: {
        slippage: params.slippage ?? 0.005,
        maxPriceImpact: 0.4,
        order: 'RECOMMENDED',
      },
    }
    const url = `${BASE_URL}/advanced/routes`
    const res = await fetch(url, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { routes?: LifiQuote[] }
    return data.routes ?? []
  } catch {
    return []
  }
}

// ─── Transaction Execution ───────────────────────────────────────────────────

export interface LifiPreparedTx {
  to: string
  data: string
  value: bigint
  chainId: number
  gasLimit?: bigint
  /** Address that must be approved before the tx (ERC-20 approval) */
  approvalAddress?: string
  /** Amount to approve (fromAmount) */
  approvalAmount?: string
  /** Original quote, for status polling */
  quote: LifiQuote
}

/**
 * Extract a ready-to-sign transaction from a LI.FI quote.
 * Returns null if the quote has no transactionRequest (shouldn't happen for valid quotes).
 */
export function buildLifiTx(quote: LifiQuote): LifiPreparedTx | null {
  const req = quote.transactionRequest
  if (!req) return null

  return {
    to: req.to,
    data: req.data,
    value: BigInt(req.value ?? '0'),
    chainId: req.chainId,
    gasLimit: req.gasLimit ? BigInt(req.gasLimit) : undefined,
    approvalAddress: quote.estimate.approvalAddress,
    approvalAmount: quote.action.fromAmount,
    quote,
  }
}

// ─── Status Tracking ────────────────────────────────────────────────────────

/**
 * Check the status of a LI.FI transfer.
 * @param txHash  The source-chain tx hash
 * @param fromChainId  Source chain ID
 * @param toChainId  Destination chain ID
 * @param bridge  Optional bridge tool name (from quote.tool)
 */
export async function checkLifiStatus(
  txHash: string,
  fromChainId: number,
  toChainId: number,
  bridge?: string,
): Promise<LifiStatus> {
  const params: Record<string, string | number> = {
    txHash,
    fromChain: fromChainId,
    toChain: toChainId,
  }
  if (bridge) params.bridge = bridge

  const status = await get<LifiStatus>('/status', params)
  return status
}

/**
 * Poll LI.FI status until terminal state (DONE/FAILED) or timeout.
 * Calls `onUpdate` with each intermediate status.
 */
export async function pollLifiStatus(
  txHash: string,
  fromChainId: number,
  toChainId: number,
  bridge: string | undefined,
  onUpdate: (s: LifiStatus) => void,
  timeoutMs = 10 * 60_000,
): Promise<LifiStatus> {
  const deadline = Date.now() + timeoutMs
  let interval = 5_000

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval))
    const status = await checkLifiStatus(txHash, fromChainId, toChainId, bridge).catch(() => null)
    if (!status) continue
    onUpdate(status)
    if (status.status === 'DONE' || status.status === 'FAILED' || status.status === 'INVALID') {
      return status
    }
    // Back off gradually
    interval = Math.min(interval * 1.3, 30_000)
  }

  return { transactionId: txHash, status: 'PENDING', substatusMessage: 'Polling timed out' }
}

// ─── Utility ────────────────────────────────────────────────────────────────

/** Human-readable label for a LI.FI quote's bridge tool. */
export function lifiToolLabel(quote: LifiQuote): string {
  return quote.toolDetails?.name ?? quote.tool ?? 'LI.FI'
}

/** Estimated output amount as a formatted string. */
export function lifiOutAmount(quote: LifiQuote): string {
  const t = quote.action.toToken
  const raw = BigInt(quote.estimate.toAmount)
  const divisor = 10n ** BigInt(t.decimals)
  const whole = raw / divisor
  const frac = raw % divisor
  const fracStr = frac.toString().padStart(t.decimals, '0').replace(/0+$/, '').slice(0, 6)
  return fracStr ? `${whole}.${fracStr}` : String(whole)
}

/** Total fee cost in USD (sum of feeCosts + gasCosts). */
export function lifiFeeUsd(quote: LifiQuote): number {
  let total = 0
  for (const f of quote.estimate.feeCosts ?? []) total += parseFloat(f.amountUSD ?? '0')
  for (const g of quote.estimate.gasCosts ?? []) total += parseFloat(g.amountUSD ?? '0')
  return total
}

/** LI.FI explorer link for a transfer. */
export function lifiExplorerLink(txHash: string): string {
  return `https://explorer.li.fi/?txHash=${txHash}`
}

// EVM zero-address sentinel (native token)
export const LIFI_NATIVE = '0x0000000000000000000000000000000000000000'

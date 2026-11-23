/**
 * Bridge execution — CCTP v2 burn + receive, and OP Stack ETH deposits.
 *
 * All writes go through prepareTx(): we estimate gas ourselves and set an explicit
 * fee on chains with a mempool floor (Arc = 20 gwei). That removes the "Transaction
 * failed" class of wallet-side rejections seen on Arc.
 */
import { encodeFunctionData, parseAbi } from 'viem'
import type { PublicClient } from 'viem'
import type { Address, ChainCfg } from '../config/chains'
import { CCTP_MESSAGE_TRANSMITTER_V2, CCTP_TOKEN_MESSENGER_V2, explorerTx, getChain } from '../config/chains'
import { buildDepositForBurnArgs, messageTransmitterV2Abi, tokenMessengerV2Abi } from './cctp'
import { assertCctpRoute } from './guard'
import { erc20Allowance } from './uniswap'
import { depositArgs, getPortalAddress } from './opstack'
import { AlreadyMintedError, messageNonce } from './errors'
import { checkGas, prepareTx, type PreparedTx } from './tx'
import { encodeFunctionData as enc } from 'viem'

export interface TxSender {
  sendTransaction: (tx: PreparedTx) => Promise<`0x${string}`>
}

const usedNoncesAbi = parseAbi(['function usedNonces(bytes32) view returns (uint256)'])

const approveData = (spender: Address, amount: bigint) =>
  enc({ abi: parseAbi(['function approve(address spender, uint256 amount) returns (bool)']), functionName: 'approve', args: [spender, amount] })

/* ───────────────────────── CCTP burn ───────────────────────── */

export async function executeCctpBridge(p: {
  fromChainId: number
  toChainId: number
  amount: bigint
  fast: boolean
  maxFee: bigint
  recipient: Address
  wallet: TxSender
  client: PublicClient
  onStep: (step: 'approve' | 'burn', state: 'active' | 'done' | 'failed', hash?: string) => void
}) {
  const { from, to } = assertCctpRoute(p.fromChainId, p.toChainId)
  const usdc = from.usdc as Address

  const allowance = await erc20Allowance(p.client, usdc, p.recipient, CCTP_TOKEN_MESSENGER_V2)
  let approveHash: `0x${string}` | undefined

  if (allowance < p.amount) {
    p.onStep('approve', 'active')
    try {
      const tx = await prepareTx(p.client, from, {
        to: usdc,
        data: approveData(CCTP_TOKEN_MESSENGER_V2, p.amount),
        account: p.recipient,
      })
      approveHash = await p.wallet.sendTransaction(tx)
      const rc = await p.client.waitForTransactionReceipt({ hash: approveHash })
      if (rc.status !== 'success') throw new Error('USDC approval reverted on the source chain.')
      p.onStep('approve', 'done', approveHash)
    } catch (e) {
      p.onStep('approve', 'failed')
      throw e
    }
  } else {
    p.onStep('approve', 'done')
  }

  p.onStep('burn', 'active')
  let burnHash: `0x${string}`
  try {
    const tx = await prepareTx(p.client, from, {
      to: CCTP_TOKEN_MESSENGER_V2,
      data: encodeFunctionData({
        abi: tokenMessengerV2Abi,
        functionName: 'depositForBurn',
        args: buildDepositForBurnArgs({
          amount: p.amount,
          destDomain: to.cctpDomain!,
          recipient: p.recipient,
          burnToken: usdc,
          maxFee: p.maxFee,
          fast: p.fast,
        }),
      }),
      account: p.recipient,
    })
    burnHash = await p.wallet.sendTransaction(tx)
  } catch (e) {
    p.onStep('burn', 'failed')
    throw e
  }
  const rc = await p.client.waitForTransactionReceipt({ hash: burnHash })
  if (rc.status !== 'success') {
    p.onStep('burn', 'failed', burnHash)
    throw new Error('Burn transaction reverted on the source chain.')
  }
  p.onStep('burn', 'done', burnHash)
  return { burnHash, approveHash }
}

/* ───────────────────────── CCTP receive ───────────────────────── */

export function buildReceiveMessageCalldata(message: `0x${string}`, attestation: `0x${string}`) {
  return encodeFunctionData({
    abi: messageTransmitterV2Abi,
    functionName: 'receiveMessage',
    args: [message, attestation],
  })
}

/** Has this message already been delivered? */
export async function isMessageUsed(client: PublicClient, message: `0x${string}`): Promise<boolean> {
  try {
    const used = (await client.readContract({
      address: CCTP_MESSAGE_TRANSMITTER_V2,
      abi: usedNoncesAbi,
      functionName: 'usedNonces',
      args: [messageNonce(message)],
    })) as bigint
    return used !== 0n
  } catch {
    return false
  }
}

/** Dry-run the mint so failures are explained before the wallet opens. */
export async function simulateReceive(client: PublicClient, account: Address, message: `0x${string}`, attestation: `0x${string}`) {
  const data = buildReceiveMessageCalldata(message, attestation)
  await client.call({ account, to: CCTP_MESSAGE_TRANSMITTER_V2, data })
  const gas = await client.estimateGas({ account, to: CCTP_MESSAGE_TRANSMITTER_V2, data })
  return { data, gas }
}

export async function submitReceiveMessage(params: {
  chain: ChainCfg
  account: Address
  message: `0x${string}`
  attestation: `0x${string}`
  wallet: TxSender
  client: PublicClient
}) {
  const { chain, account, message, attestation, wallet, client } = params

  if (await isMessageUsed(client, message)) throw new AlreadyMintedError()

  const gasCheck = await checkGas(client, chain, account)
  if (!gasCheck.ok) {
    throw new Error(
      `Not enough ${gasCheck.symbol} on ${chain.short} for gas. This mint needs ≈${(Number(gasCheck.needed) / 1e18).toFixed(6)} ${gasCheck.symbol} — you have 0.`,
    )
  }

  const { data, gas } = await simulateReceive(client, account, message, attestation)
  const prepared = await prepareTx(client, chain, { to: CCTP_MESSAGE_TRANSMITTER_V2, data, account })
  const tx = { ...prepared, gas: prepared.gas > gas ? prepared.gas : (gas * 125n) / 100n }

  const hash = await wallet.sendTransaction(tx)
  const rc = await client.waitForTransactionReceipt({ hash })
  if (rc.status !== 'success') {
    throw new Error(`The mint transaction reverted on ${chain.short}. ${explorerTx(chain.id, hash)}`)
  }
  return hash
}

/* ───────────────────────── OP Stack deposit (ETH) ───────────────────────── */

const portalAbi = parseAbi([
  'function depositTransaction(address _to, uint256 _value, uint64 _gasLimit, bool _isCreation, bytes _data) payable',
])

export function buildOpDeposit(params: { toChainId: number; recipient: Address; mint: bigint }) {
  const chain = getChain(params.toChainId)
  if (!chain) throw new Error('Unknown destination chain')
  const portal = getPortalAddress(chain)
  if (!portal) throw new Error(`No OptimismPortal configured for ${chain.name}`)
  return {
    to: portal,
    data: encodeFunctionData({ abi: portalAbi, functionName: 'depositTransaction', args: depositArgs(params.recipient, params.mint) }),
    value: params.mint,
  }
}

export async function executeOpDeposit(params: {
  fromChain: ChainCfg
  toChainId: number
  recipient: Address
  mint: bigint
  wallet: TxSender
  client: PublicClient
  onStep: (step: 'deposit', state: 'active' | 'done' | 'failed', hash?: string) => void
}) {
  const built = buildOpDeposit({ toChainId: params.toChainId, recipient: params.recipient, mint: params.mint })
  params.onStep('deposit', 'active')
  let hash: `0x${string}`
  try {
    const tx = await prepareTx(params.client, params.fromChain, {
      to: built.to,
      data: built.data,
      value: built.value,
      account: params.recipient,
    })
    hash = await params.wallet.sendTransaction(tx)
  } catch (e) {
    params.onStep('deposit', 'failed')
    throw e
  }
  const rc = await params.client.waitForTransactionReceipt({ hash })
  if (rc.status !== 'success') {
    params.onStep('deposit', 'failed', hash)
    throw new Error('Deposit transaction reverted on the source chain.')
  }
  params.onStep('deposit', 'done', hash)
  return hash
}

export { CCTP_MESSAGE_TRANSMITTER_V2 }

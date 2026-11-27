/**
 * Stargate V2 (LayerZero OFT) — native-ETH transfers between the testnets we already support.
 *
 * Verified on 2026-11-27: the Sepolia pool holds ~458 ETH and `quoteSend` answers for both
 * Arbitrum Sepolia (eid 40231) and OP Sepolia (eid 40232), so this is a live route, not a stub.
 *
 * Only the native pool is wired: Stargate's USDC pools on these testnets use Stargate's own
 * test USDC (Sepolia 0x2F6F…7590), not the Circle USDC the rest of the app holds, so a USDC
 * leg through Stargate would ask the user for a token they do not have.
 */
import { encodeFunctionData, pad, parseAbi, type Address } from 'viem'

export interface StargateChain {
  /** LayerZero endpoint id */
  eid: number
  /** StargatePoolNative (holds the chain's native gas token) */
  nativePool: Address
}

export const STARGATE_CHAINS: Record<number, StargateChain> = {
  11155111: { eid: 40161, nativePool: '0x9Cc7e185162Aa5D1425ee924D97a87A0a34A0706' },
  421614: { eid: 40231, nativePool: '0x6fddB6270F6c71f31B62AE0260cfa8E2e2d186E0' },
  11155420: { eid: 40232, nativePool: '0xa31dCc5C71E25146b598bADA33E303627D7fC97e' },
}

/** The pool on `fromId` that can send native ETH to `toId`, or null when the pair has no pool. */
export function stargateEthPool(fromId: number, toId: number): { pool: Address; dstEid: number } | null {
  const from = STARGATE_CHAINS[fromId]
  const to = STARGATE_CHAINS[toId]
  if (!from || !to || fromId === toId) return null
  return { pool: from.nativePool, dstEid: to.eid }
}

export const stargatePoolAbi = parseAbi([
  'struct SendParam { uint32 dstEid; bytes32 to; uint256 amountLD; uint256 minAmountLD; bytes extraOptions; bytes composeMsg; bytes oftCmd; }',
  'struct MessagingFee { uint256 nativeFee; uint256 lzTokenFee; }',
  'struct MessagingReceipt { bytes32 guid; uint64 nonce; MessagingFee fee; }',
  'function quoteSend(SendParam _sendParam, bool _payInLzToken) view returns (MessagingFee)',
  'function send(SendParam _sendParam, MessagingFee _fee, address _refundAddress) payable returns (MessagingReceipt)',
])

export function stargateSendParam(dstEid: number, to: Address, amount: bigint, minAmount: bigint) {
  return {
    dstEid,
    to: pad(to, { size: 32 }),
    amountLD: amount,
    minAmountLD: minAmount,
    extraOptions: '0x' as const,
    composeMsg: '0x' as const,
    oftCmd: '0x' as const,
  }
}

/** Native fee Stargate charges on top of the amount (LayerZero messaging). */
export async function quoteStargateEth(
  client: { readContract: (a: never) => Promise<unknown> },
  pool: Address,
  dstEid: number,
  to: Address,
  amount: bigint,
): Promise<bigint> {
  const fee = (await (client.readContract as (a: never) => Promise<unknown>)({
    address: pool,
    abi: stargatePoolAbi,
    functionName: 'quoteSend',
    args: [stargateSendParam(dstEid, to, amount, 0n), false],
  } as never)) as { nativeFee?: bigint } | [bigint, bigint]
  const nativeFee = Array.isArray(fee) ? fee[0] : fee.nativeFee
  if (nativeFee == null) throw new Error('Stargate returned no fee quote.')
  return nativeFee
}

/** Calldata + value for the transfer, so callers can sign it with their own wallet client. */
export function buildStargateEthSend(args: {
  pool: Address
  dstEid: number
  to: Address
  amount: bigint
  nativeFee: bigint
  refund?: Address
}) {
  const data = encodeFunctionData({
    abi: stargatePoolAbi,
    functionName: 'send',
    args: [
      stargateSendParam(args.dstEid, args.to, args.amount, 0n),
      { nativeFee: args.nativeFee, lzTokenFee: 0n },
      args.refund ?? args.to,
    ],
  })
  return { to: args.pool, data, value: args.amount + args.nativeFee }
}

export const LZ_SCAN_TESTNET = 'https://scan-testnet.layerzero-api.com/v1'

export function stargateScanLink(txHash: string): string {
  return `https://testnet.layerzeroscan.com/tx/${txHash}`
}

/** True when LayerZero reports the message delivered on the destination. */
export async function stargateDelivered(txHash: string): Promise<boolean> {
  try {
    const res = await fetch(`${LZ_SCAN_TESTNET}/messages/tx/${txHash}`, { headers: { accept: 'application/json' } })
    if (!res.ok) return false
    const j = (await res.json()) as { data?: Array<{ status?: { name?: string } }> }
    const statuses = (j.data ?? []).map((m) => m.status?.name ?? '')
    return statuses.length > 0 && statuses.every((s) => s === 'SUCCEEDED')
  } catch {
    return false
  }
}

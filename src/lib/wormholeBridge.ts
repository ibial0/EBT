/**
 * Wormhole Token Bridge (testnet) — native USDC between the four EVM testnets we support.
 *
 * Verified on-chain 2026-11-27: every bridge answers chainId() with the right Wormhole id
 * (10002 Sepolia, 10003 Arbitrum Sepolia, 10004 Base Sepolia, 10005 OP Sepolia) and reports
 * `isWrappedAsset(USDC) == false`, so a transfer locks native USDC on the source and unlocks
 * native USDC on the destination. No wrapped-asset surprise.
 *
 * Flow: approve → transferTokens (tx 1) → guardian signs the VAA (~1-15 min) → completeTransfer (tx 2).
 */
import { encodeFunctionData, pad, parseAbi, type Address } from 'viem'

export interface WormholeBridgeCfg {
  /** Token Bridge contract on this chain */
  bridge: Address
  /** Wormhole chain id used in the VAA */
  wormholeChainId: number
}

export const WORMHOLE_BRIDGE: Record<number, WormholeBridgeCfg> = {
  11155111: { bridge: '0xDB5492265f6038831E89f495670FF909aDe94bd9', wormholeChainId: 10002 },
  421614: { bridge: '0xC7A204bDBFe983FCD8d8E61D02b475D4073fF97e', wormholeChainId: 10003 },
  84532: { bridge: '0x86F55A04690fd7815A3D802bD587e83eA888B239', wormholeChainId: 10004 },
  11155420: { bridge: '0x99737Ec4B815d816c49A385943baf0380e75c0Ac', wormholeChainId: 10005 },
}

export function wormholeBridgeFor(
  fromId: number,
  toId: number,
): { bridge: Address; destBridge: Address; recipientChain: number } | null {
  const from = WORMHOLE_BRIDGE[fromId]
  const to = WORMHOLE_BRIDGE[toId]
  if (!from || !to || fromId === toId) return null
  return { bridge: from.bridge, destBridge: to.bridge, recipientChain: to.wormholeChainId }
}

export const erc20Abi = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
])

export const tokenBridgeAbi = parseAbi([
  'function transferTokens(address token, uint256 amount, uint16 recipientChain, bytes32 recipient, uint256 arbiterFee, uint32 nonce) payable returns (uint64)',
  'function wrapAndTransferETH(uint16 recipientChain, bytes32 recipient, uint256 arbiterFee, uint32 nonce) payable returns (uint64)',
  'function completeTransfer(bytes encodedVm)',
  'function completeTransferAndUnwrapETH(bytes encodedVm)',
  'function isWrappedAsset(address token) view returns (bool)',
])

/** Calldata for the source-chain transfer (the caller handles approve + signing). */
export function buildTokenTransfer(args: {
  bridge: Address
  token: Address
  amount: bigint
  recipientChain: number
  recipient: Address
}) {
  const nonce = Math.floor(Math.random() * 0xffffffff)
  return {
    to: args.bridge,
    data: encodeFunctionData({
      abi: tokenBridgeAbi,
      functionName: 'transferTokens',
      args: [args.token, args.amount, args.recipientChain, pad(args.recipient, { size: 32 }), 0n, nonce],
    }),
    value: 0n,
  }
}

export function buildCompleteTransfer(args: { bridge: Address; vaa: `0x${string}` }) {
  return {
    to: args.bridge,
    data: encodeFunctionData({ abi: tokenBridgeAbi, functionName: 'completeTransfer', args: [args.vaa] }),
    value: 0n,
  }
}

const SCAN_API = 'https://api.testnet.wormholescan.io/api/v1'

/** Topic0 of the core bridge `LogMessagePublished(address,uint64,uint32,bytes,uint8)` event. */
export const LOG_MESSAGE_PUBLISHED = '0x6eb224fb001ed210e379b335e35efe88672a8ce935d981a6896b27ffdf52a3b2' as const

/** Pulls (emitter, sequence) out of a source transaction receipt so the VAA can be looked up. */
export function sequenceFromLogs(
  logs: Array<{ topics: readonly string[]; data: string }>,
  expectedEmitter?: Address,
): { emitter: Address; sequence: string } | null {
  const want = expectedEmitter?.toLowerCase()
  const log = logs.find((l) => {
    if (l.topics[0] !== LOG_MESSAGE_PUBLISHED || !l.topics[1] || l.data.length < 66) return false
    if (!want) return true
    // Only the token bridge we actually called may publish the message we later redeem.
    return ('0x' + l.topics[1].slice(26)).toLowerCase() === want
  })
  if (!log || !log.topics[1]) return null
  const emitter = ('0x' + log.topics[1].slice(26)) as Address
  const sequence = BigInt(log.data.slice(0, 66)).toString()
  return { emitter, sequence }
}

function toHex(raw: unknown): `0x${string}` | null {
  if (typeof raw !== 'string' || raw.length === 0) return null
  if (raw.startsWith('0x')) return raw as `0x${string}`
  try {
    const binary = atob(raw)
    let hex = '0x'
    for (let i = 0; i < binary.length; i++) hex += binary.charCodeAt(i).toString(16).padStart(2, '0')
    return hex as `0x${string}`
  } catch {
    return null
  }
}

/**
 * Signed VAA for a message, or null while the guardians have not signed yet.
 * Endpoint: GET /vaas/{wormholeChainId}/{emitter}/{sequence}
 */
export async function fetchVaa(
  wormholeChainId: number,
  emitter: Address,
  sequence: string,
): Promise<`0x${string}` | null> {
  try {
    const res = await fetch(`${SCAN_API}/vaas/${wormholeChainId}/${emitter}/${sequence}`, {
      headers: { accept: 'application/json' },
    })
    if (!res.ok) return null
    const j = (await res.json()) as Record<string, unknown>
    const data = (j.data ?? j) as Record<string, unknown>
    const vaa = data.vaa ?? data.vaaBytes ?? (j as Record<string, unknown>).vaa
    return toHex(vaa)
  } catch {
    return null
  }
}

export function wormholeScanLink(txHash: string): string {
  return `https://wormholescan.io/#/tx/${txHash}?network=TESTNET`
}

/**
 * Testnet enforcement. Every transaction path in the app funnels through here.
 * If a check fails we throw, the UI never builds a transaction from a rejected input.
 */
import { TESTNET_IDS, getChain, mustChain, CHAINS } from '../config/chains'
import type { Address } from '../config/chains'

/** Well-known mainnet ids, used only to produce a clear error message. */
const KNOWN_MAINNETS = new Set([
  1, 10, 56, 100, 130, 137, 143, 146, 324, 480, 1101, 1868, 5000, 8453, 34443, 42161, 42220, 43114, 59144, 81457,
  534352, 7777777, 4663,
])

export class TestnetViolation extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TestnetViolation'
  }
}

export function isAllowedChain(chainId?: number | null): boolean {
  return chainId != null && TESTNET_IDS.has(chainId)
}

export function assertTestnet(chainId: number | undefined | null, label = 'chain'): asserts chainId is number {
  if (chainId == null) throw new TestnetViolation(`No ${label} selected.`)
  if (KNOWN_MAINNETS.has(chainId)) throw new TestnetViolation(`Blocked: ${chainId} is a mainnet. EBT is testnet-only.`)
  if (!TESTNET_IDS.has(chainId)) throw new TestnetViolation(`Blocked: chain ${chainId} is not on the testnet allowlist.`)
}

/** Confirms a contract we are about to call is the registry one for that chain. */
export function assertContract(chainId: number, actual: string, expected?: string, what = 'contract') {
  assertTestnet(chainId)
  if (!expected) throw new TestnetViolation(`No registered ${what} for chain ${chainId}.`)
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new TestnetViolation(`Blocked: ${what} ${actual} does not match the verified deployment ${expected}.`)
  }
}

export function assertSwapRoute(chainId: number) {
  assertTestnet(chainId)
  const c = mustChain(chainId)
  if (!c.uniswap && !c.dexV2?.length) throw new TestnetViolation(`No verified DEX deployment on ${c.name}.`)
  return c
}

export function assertCctpRoute(fromId: number, toId: number) {
  assertTestnet(fromId, 'source chain')
  assertTestnet(toId, 'destination chain')
  if (fromId === toId) throw new TestnetViolation('Source and destination are the same chain, use Swap instead.')
  const a = mustChain(fromId)
  const b = mustChain(toId)
  if (a.cctpDomain == null || b.cctpDomain == null) {
    throw new TestnetViolation(`CCTP is not available for ${a.name} → ${b.name}.`)
  }
  if (!a.usdc || !b.usdc) throw new TestnetViolation('Native USDC is not registered on one of these chains.')
  return { from: a, to: b }
}

/** Runtime guard for anything read out of localStorage or a URL. */
export function sanitizeChainId(id: unknown): number | null {
  const n = typeof id === 'string' ? Number(id) : typeof id === 'number' ? id : NaN
  return Number.isFinite(n) && isAllowedChain(n) ? n : null
}

export function allowlistSummary() {
  return CHAINS.map((c) => ({ id: c.id, name: c.name, bridge: c.bridge, swap: Boolean(c.uniswap || c.dexV2?.length) }))
}

export function assertAddressLike(addr: string): asserts addr is Address {
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) throw new Error(`Not a valid EVM address: ${addr}`)
}

export function describeBlock(reason: string) {
  const c = reason.toLowerCase()
  if (c.includes('user rejected') || c.includes('user denied')) return 'You rejected the request in your wallet.'
  if (c.includes('insufficient funds')) return 'Not enough native gas token on this chain for gas.'
  return reason
}

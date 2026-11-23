/**
 * Bridge route engine.
 *
 * Nothing here assumes "USDC is supported everywhere". A route is built out of legs that
 * were each verified on chain:
 *
 *   cctp   native USDC burn-and-mint, only between two chains that are on Circle's list
 *   portal canonical OP Stack ETH deposit, only from the L1 parent into its own L2
 *   swap   a Uniswap v3 pool that actually holds liquidity (src/config/pools.ts)
 *
 * Routes are found by searching the state space (chain, token) with those legs, so a
 * composite route only appears when every single step is executable. Symbols are never
 * compared: identity is chainId + contract address, and the native asset has its own id.
 */
import { CHAINS, getChain, mustChain, type Address, type ChainCfg } from '../config/chains'
import { NATIVE_SENTINEL, WETH as WETH_OF, findToken, nativeToken, tokensForChain, type TokenCfg } from '../config/tokens'
import { POOLS, poolsForChain } from '../config/pools'
import { getPortalAddress } from './opstack'

export type RouteLeg =
  | { kind: 'cctp'; from: number; to: number; token: Address }
  | { kind: 'portal'; from: number; to: number }
  | { kind: 'swap'; chainId: number; tokenIn: Address; tokenOut: Address; fee: number }

export type RouteType = 'direct' | 'composite'

export interface RouteCandidate {
  id: string
  type: RouteType
  legs: RouteLeg[]
  /** what the user sends, on the source chain */
  inToken: TokenCfg
  /** what the user receives, on the destination chain */
  outToken: TokenCfg
  /** wallet transactions required */
  txCount: number
  /** one line explaining the shape, for the UI */
  label: string
  /** why this route exists / what it depends on */
  detail: string
}

export const tokenId = (chainId: number, address: string) => `${chainId}:${address.toLowerCase()}`

/**
 * Routing identity of an asset. A chain's native token and its wrapped form (WETH on
 * OP Stack chains, WETH on Sepolia) are two representations of the same money, and the
 * swap router wraps and unwraps between them, so they share one identity here.
 */
export function assetKey(chainId: number, address: string): string {
  const a = address.toLowerCase()
  const weth = WETH_OF[chainId]
  if (weth && a === weth.toLowerCase()) return `${chainId}:${NATIVE_SENTINEL.toLowerCase()}`
  return `${chainId}:${a}`
}

/** Tokens that are the same money on a chain, used when presenting a destination asset. */
export function nativeIsWrapped(chainId: number, address: string): boolean {
  const weth = WETH_OF[chainId]
  return Boolean(weth) && address.toLowerCase() === weth!.toLowerCase()
}
export const nativeId = (chainId: number) => tokenId(chainId, NATIVE_SENTINEL)
export const isNativeId = (id: string) => id.endsWith(`:${NATIVE_SENTINEL.toLowerCase()}`)

/** Native asset of a chain as a TokenCfg. */
export function nativeOf(chainId: number): TokenCfg {
  return nativeToken(chainId)
}

/** Tokens that can be swapped on a chain, keyed by their pool address (native maps to WETH). */
function swapKey(chainId: number, token: TokenCfg): string {
  if (token.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase()) {
    const weth = POOLS.find((p) => p.chainId === chainId)
    return '' // no WETH pool at all -> native is not swappable
  }
  return token.address.toLowerCase()
}

function poolPairs(chainId: number): Array<{ a: Address; b: Address; fee: number }> {
  return poolsForChain(chainId).map((p) => ({ a: p.token0, b: p.token1, fee: p.fee }))
}

/** Tokens reachable from `token` with one swap on `chainId`, as TokenCfg. */
export function swapNeighbours(chainId: number, token: TokenCfg): TokenCfg[] {
  const native = token.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase()
  const key = native ? (WETH_OF[chainId] ?? '').toLowerCase() : token.address.toLowerCase()
  if (!key) return []
  const out = new Map<string, TokenCfg>()
  for (const pair of poolPairs(chainId)) {
    let other: Address | null = null
    if (pair.a.toLowerCase() === key) other = pair.b
    else if (pair.b.toLowerCase() === key) other = pair.a
    if (!other) continue
    const t = findToken(chainId, other)
    if (t) out.set(assetKey(chainId, t.address), t)
  }
  return [...out.values()]
}

/** Every verified bridge leg available out of a chain, as (chain, token) transitions. */
interface BridgeEdge {
  toChain: number
  token: TokenCfg
  leg: RouteLeg
}

function bridgeEdges(chainId: number): BridgeEdge[] {
  const chain = mustChain(chainId)
  const edges: BridgeEdge[] = []
  if (chain.cctpDomain != null && chain.usdc) {
    const usdc = findToken(chainId, chain.usdc)!
    for (const other of CHAINS) {
      if (other.id === chainId) continue
      if (other.cctpDomain == null || !other.usdc) continue
      edges.push({
        toChain: other.id,
        token: findToken(other.id, other.usdc)!,
        leg: { kind: 'cctp', from: chainId, to: other.id, token: chain.usdc },
      })
      void usdc
    }
  }
  // Canonical deposits go from the L1 parent into each of its L2s, and only that way.
  for (const l2 of CHAINS) {
    if (l2.opStackParent !== chainId) continue
    const portal = getPortalAddress(l2)
    if (!portal) continue
    edges.push({
      toChain: l2.id,
      token: nativeOf(l2.id),
      leg: { kind: 'portal', from: chainId, to: l2.id },
    })
  }
  return edges
}

/** True when a direct same-asset route exists between the two chains for this asset. */
export function directRoute(fromId: number, toId: number, token: TokenCfg): RouteCandidate | null {
  if (fromId === toId) return null
  const from = mustChain(fromId)
  const to = mustChain(toId)
  const dest = (() => {
    if (token.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase()) {
      return to.viem.nativeCurrency.symbol === from.viem.nativeCurrency.symbol ? nativeOf(toId) : null
    }
    if (token.kind === 'usdc' && from.usdc && to.usdc) return findToken(toId, to.usdc) ?? null
    return null
  })()
  if (!dest) return null

  // native -> native only through the canonical portal, and only L1 -> L2
  if (token.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase()) {
    if (to.opStackParent !== fromId || !getPortalAddress(to)) return null
    return {
      id: `portal-${fromId}-${toId}`,
      type: 'direct',
      legs: [{ kind: 'portal', from: fromId, to: toId }],
      inToken: token,
      outToken: dest,
      txCount: 1,
      label: `${token.symbol} → Native bridge → ${dest.symbol}`,
      detail: `Canonical OP Stack deposit from ${from.short} into ${to.short}. Deposits are one-way; the 7-day withdrawal window is not offered.`,
    }
  }

  // USDC -> USDC only through CCTP
  if (token.kind === 'usdc' && from.cctpDomain != null && to.cctpDomain != null && from.usdc && to.usdc) {
    return {
      id: `cctp-${fromId}-${toId}`,
      type: 'direct',
      legs: [{ kind: 'cctp', from: fromId, to: toId, token: from.usdc }],
      inToken: token,
      outToken: dest,
      txCount: 2,
      label: `${token.symbol} → Circle CCTP → ${dest.symbol}`,
      detail: `Circle CCTP v2 burn-and-mint. You sign the burn, Circle attests, then you sign the mint on ${to.short}.`,
    }
  }
  return null
}

/**
 * All executable routes for a source and destination chain, best first.
 * Direct routes come first, then composites ordered by transaction count.
 */
export function findRoutes(fromId: number, toId: number, inToken: TokenCfg, outToken: TokenCfg): RouteCandidate[] {
  if (fromId === toId) return []
  const direct = directRoute(fromId, toId, inToken)
  const directId = direct && sameAsset(direct.outToken, outToken) ? direct.id : null

  const goalKey = assetKey(toId, outToken.address)
  const found: RouteCandidate[] = []
  const visited = new Set<string>()

  const queue: RouteState[] = [{ chainId: fromId, token: inToken, legs: [] }]
  visited.add(assetKey(fromId, inToken.address))

  while (queue.length > 0) {
    const cur = queue.shift()!
    if (cur.legs.length >= 4) continue

    // swap transitions on the current chain
    for (const next of swapNeighbours(cur.chainId, cur.token)) {
      const curKey = assetKey(cur.chainId, cur.token.address)
      if (assetKey(cur.chainId, next.address) === curKey) continue
      const pair = poolPairs(cur.chainId).find(
        (p) =>
          (p.a.toLowerCase() === cur.token.address.toLowerCase() && p.b.toLowerCase() === next.address.toLowerCase()) ||
          (p.b.toLowerCase() === cur.token.address.toLowerCase() && p.a.toLowerCase() === next.address.toLowerCase()) ||
          (curKey === assetKey(cur.chainId, p.a) && assetKey(cur.chainId, next.address) === assetKey(cur.chainId, p.b)) ||
          (curKey === assetKey(cur.chainId, p.b) && assetKey(cur.chainId, next.address) === assetKey(cur.chainId, p.a)),
      )
      if (!pair) continue
      const tokenIn = cur.token.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase() ? WETH_OF[cur.chainId] ?? cur.token.address : cur.token.address
      const tokenOut = next.address
      push(cur, { chainId: cur.chainId, token: next }, cur.legs.concat([{ kind: 'swap', chainId: cur.chainId, tokenIn, tokenOut, fee: pair.fee }]), goalKey, visited, queue, found, fromId, toId, inToken, outToken)
    }

    // bridge transitions
    for (const edge of bridgeEdges(cur.chainId)) {
      const leg = edge.leg
      // a bridge leg is only usable when the wallet's asset is the bridge asset
      const curIsUsdc = cur.token.kind === 'usdc'
      const curIsNative = assetKey(cur.chainId, cur.token.address) === assetKey(cur.chainId, NATIVE_SENTINEL)
      if (leg.kind === 'cctp' && !curIsUsdc) continue
      if (leg.kind === 'portal' && !curIsNative) continue
      if (assetKey(edge.toChain, edge.token.address) === assetKey(cur.chainId, cur.token.address) && edge.toChain === cur.chainId) continue
      push(cur, { chainId: edge.toChain, token: edge.token }, cur.legs.concat([leg]), goalKey, visited, queue, found, fromId, toId, inToken, outToken)
    }
  }

  const seen = new Set<string>()
  const unique = found.filter((r) => {
    const sig = r.legs.map((l) => `${l.kind}:${l.kind === 'swap' ? `${l.tokenIn}-${l.tokenOut}-${l.fee}` : `${l.from}-${l.to}`}`).join('|')
    if (seen.has(sig)) return false
    seen.add(sig)
    return true
  })
  if (direct && directId) {
    // a direct route for this pair makes the composite alternatives noise
    return [direct]
  }
  const all = unique.filter((r) => r.id !== directId)
  all.sort((a, b) => a.txCount - b.txCount)
  return all
}

interface RouteState {
  chainId: number
  token: TokenCfg
  legs: RouteLeg[]
}

function push(
  cur: RouteState,
  next: { chainId: number; token: TokenCfg },
  legs: RouteLeg[],
  goalKey: string,
  visited: Set<string>,
  queue: RouteState[],
  found: RouteCandidate[],
  fromId: number,
  toId: number,
  inToken: TokenCfg,
  outToken: TokenCfg,
) {
  const pathKey = `${assetKey(next.chainId, next.token.address)}|${legs.map((l) => l.kind[0]).join('')}`
  if (visited.has(pathKey)) return
  visited.add(pathKey)
  const stateKey = assetKey(next.chainId, next.token.address)
  if (!visited.has(stateKey)) {
    visited.add(stateKey)
    queue.push({ chainId: next.chainId, token: next.token, legs })
  }
  if (assetKey(next.chainId, next.token.address) !== goalKey) return
  const type = legs.length === 1 && (legs[0].kind === 'cctp' || legs[0].kind === 'portal') ? 'direct' : 'composite'
  const txCount = legs.length
  found.push({
    id: `${type}-${legs.map((l) => `${l.kind}${l.kind === 'swap' ? l.fee : ''}`).join('-')}-${fromId}-${toId}`,
    type,
    legs,
    inToken,
    outToken,
    txCount,
    label: describeLegs(legs, fromId, toId),
    detail: legs.length === 1 ? 'Single verified operation.' : 'Composite route: every step below is a verified operation you sign yourself.',
  })
}

function describeLegs(legs: RouteLeg[], fromId: number, toId: number): string {
  const parts: string[] = []
  for (const leg of legs) {
    if (leg.kind === 'cctp') parts.push(`${getChain(leg.from)?.short} USDC → CCTP → ${getChain(leg.to)?.short} USDC`)
    else if (leg.kind === 'portal') parts.push(`${getChain(leg.from)?.short} ETH → Native bridge → ${getChain(leg.to)?.short} ETH`)
    else {
      const a = findToken(leg.chainId, leg.tokenIn)
      const b = findToken(leg.chainId, leg.tokenOut)
      parts.push(`${a?.symbol ?? '?'} → ${b?.symbol ?? '?'} on ${getChain(leg.chainId)?.short}`)
    }
  }
  void fromId
  void toId
  return parts.join('  +  ')
}

function sameAsset(a: TokenCfg, b: TokenCfg): boolean {
  return a.address.toLowerCase() === b.address.toLowerCase()
}

/** True when at least one executable route exists from this asset to anything on the destination. */
export function hasAnyRoute(fromId: number, toId: number, token: TokenCfg): boolean {
  for (const dest of reachableDestTokens(fromId, toId, token)) {
    if (findRoutes(fromId, toId, token, dest).length > 0) return true
  }
  return false
}

/**
 * Source assets worth offering: everything that can actually reach the destination,
 * whether directly, through a swap, or through a bridge plus a swap. Tokens with no
 * route are not listed, so an unsupported pair can never be the default.
 */
export function usableSourceTokens(fromId: number, toId: number): TokenCfg[] {
  const all = [...tokensForChain(fromId)]
  const native = nativeOf(fromId)
  const hasNative = all.some((t) => t.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase())
  const list = hasNative ? all : [native, ...all]
  return list.filter((t) => hasAnyRoute(fromId, toId, t))
}

/** Destination assets reachable from a given source asset. */
export function reachableDestTokens(fromId: number, toId: number, inToken: TokenCfg): TokenCfg[] {
  const out = new Map<string, TokenCfg>()
  const all = tokensForChain(toId)
  const native = nativeOf(toId)
  const candidates = all.some((t) => t.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase()) ? all : [...all, native]
  for (const t of candidates) {
    if (findRoutes(fromId, toId, inToken, t).length === 0) continue
    const key = assetKey(toId, t.address)
    const prev = out.get(key)
    // show the native representation rather than its wrapped form
    if (!prev || t.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase()) out.set(key, t)
  }
  return [...out.values()]
}

/** Native asset symbol for a chain, used in labels. */
export function nativeSymbolOf(chainId: number): string {
  return getChain(chainId)?.viem.nativeCurrency.symbol ?? 'ETH'
}

export { CHAINS, getChain }
export type { ChainCfg }

/**
 * Bridge route engine.
 *
 * Nothing here assumes "USDC is supported everywhere". A route is built out of legs that
 * were each verified on chain:
 *
 *   cctp     native USDC burn-and-mint between Circle CCTP v2 chains
 *   across   Across Protocol v3 fast relayer fill across Sepolia / Base / Arb / OP / Unichain / Amoy
 *   portal   canonical OP Stack ETH deposit from the L1 parent into its own L2
 *   arbitrum Arbitrum Orbit canonical ETH deposit from the parent into its own Orbit chain
 *   swap     a verified Uniswap v3 pool (pools.ts) or V2 AMM pair (dexV2.ts)
 *
 * Routes are found by searching the state space (chain, token) with those legs, so a
 * composite route only appears when every single step is executable. Symbols are never
 * compared: identity is chainId + contract address, and the native asset has its own id.
 */
import { CHAINS, getChain, mustChain, type Address, type ChainCfg } from '../config/chains'
import { NATIVE_SENTINEL, WETH as WETH_OF, findToken, nativeToken, tokensForChain, type TokenCfg } from '../config/tokens'
import { poolsForChain } from '../config/pools'
import { v2PairsForChain } from './dexV2'
import { getPortalAddress } from './opstack'
import { orbitRouteExists } from './arbitrumOrbit'
import { orbitBridgeFor } from '../config/orbit'
import { ACROSS_ETH_CHAINS, ACROSS_WETH, acrossRouteAvailable } from './across'

export type RouteLeg =
  | { kind: 'cctp'; from: number; to: number; token: Address }
  | { kind: 'across'; from: number; to: number; inToken: Address; outToken: Address; isNative: boolean }
  | { kind: 'portal'; from: number; to: number }
  /** Arbitrum Orbit canonical deposit; `token` is set for an ERC-20 deposit */
  | { kind: 'arbitrum'; from: number; to: number; token?: Address }
  | { kind: 'swap'; chainId: number; tokenIn: Address; tokenOut: Address; fee: number }
  /** LI.FI aggregated bridge/swap — covers many protocols in one signature */
  | { kind: 'lifi'; from: number; to: number; tool: string; inToken: Address; outToken: Address }
  /** Relay Protocol intent-based fast bridge */
  | { kind: 'relay'; from: number; to: number; inToken: Address; outToken: Address }
  /** Wormhole Token Bridge or CCTP relay */
  | { kind: 'wormhole'; from: number; to: number; inToken: Address; outToken: Address; mode: 'cctp' | 'token-bridge' }

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
 * OP Stack chains, WETH on Sepolia, WSEI on Sei, WAVAX on Fuji) are two representations
 * of the same money, and the swap router wraps and unwraps between them, so they share one identity.
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

function poolPairs(chainId: number): Array<{ a: Address; b: Address; fee: number }> {
  const v3 = poolsForChain(chainId).map((p) => ({ a: p.token0, b: p.token1, fee: p.fee }))
  const v2 = v2PairsForChain(chainId).map((p) => ({ a: p.token0, b: p.token1, fee: 3000 }))
  return [...v3, ...v2]
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
  matchKey: string
}

function bridgeEdges(chainId: number): BridgeEdge[] {
  const chain = mustChain(chainId)
  const edges: BridgeEdge[] = []

  if (chain.cctpDomain != null && chain.usdc) {
    for (const other of CHAINS) {
      if (other.id === chainId) continue
      if (other.cctpDomain == null || !other.usdc) continue
      const destUsdc = findToken(other.id, other.usdc)
      if (!destUsdc) continue
      edges.push({
        toChain: other.id,
        token: destUsdc,
        leg: { kind: 'cctp', from: chainId, to: other.id, token: chain.usdc },
        matchKey: `usdc:${chainId}`,
      })
    }
  }

  // Canonical OP Stack deposits go from the L1 parent into each of its L2s.
  for (const l2 of CHAINS) {
    if (l2.opStackParent !== chainId) continue
    const portal = getPortalAddress(l2)
    if (!portal) continue
    edges.push({
      toChain: l2.id,
      token: nativeOf(l2.id),
      leg: { kind: 'portal', from: chainId, to: l2.id },
      matchKey: `native:${chainId}`,
    })
  }

  // Arbitrum Orbit canonical ETH deposits go from the parent chain through its Inbox.
  for (const l2 of CHAINS) {
    if (!orbitRouteExists(chainId, l2.id)) continue
    edges.push({
      toChain: l2.id,
      token: nativeOf(l2.id),
      leg: { kind: 'arbitrum', from: chainId, to: l2.id },
      matchKey: `native:${chainId}`,
    })
  }

  // Across v3 fast intents across Sepolia / Base / Arb / OP / Unichain / Amoy
  for (const other of CHAINS) {
    if (other.id === chainId) continue
    const acNative = acrossRouteAvailable(chainId, other.id, 'native')
    if (acNative) {
      edges.push({
        toChain: other.id,
        token: acNative.destToken,
        leg: { kind: 'across', from: chainId, to: other.id, inToken: acNative.inToken, outToken: acNative.outToken, isNative: true },
        matchKey: `native:${chainId}`,
      })
    }
    const acWeth = acrossRouteAvailable(chainId, other.id, 'weth')
    if (acWeth && ACROSS_WETH[chainId]) {
      edges.push({
        toChain: other.id,
        token: acWeth.destToken,
        leg: { kind: 'across', from: chainId, to: other.id, inToken: acWeth.inToken, outToken: acWeth.outToken, isNative: false },
        matchKey: `weth:${ACROSS_WETH[chainId].toLowerCase()}`,
      })
    }
    const acUsdc = acrossRouteAvailable(chainId, other.id, 'usdc')
    if (acUsdc) {
      edges.push({
        toChain: other.id,
        token: acUsdc.destToken,
        leg: { kind: 'across', from: chainId, to: other.id, inToken: acUsdc.inToken, outToken: acUsdc.outToken, isNative: false },
        matchKey: `usdc:${chainId}`,
      })
    }
  }

  return edges
}

/**
 * All direct same-asset routes between two chains for `token`.
 * Canonical / CCTP comes first (no relayer caps), with Across v3 fast options right beside it
 * or as primary when canonical bridges don't cover L2<->L2 / L2->L1 withdrawals.
 */
export function directRoutes(fromId: number, toId: number, token: TokenCfg): RouteCandidate[] {
  if (fromId === toId) return []
  const from = mustChain(fromId)
  const to = mustChain(toId)
  const out: RouteCandidate[] = []

  const isNative = token.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase()
  const amoyWeth = ACROSS_WETH[80002]?.toLowerCase()
  const isWrappedOrAmoyWeth =
    token.address.toLowerCase() === (ACROSS_WETH[fromId] ?? '').toLowerCase()

  if (isNative) {
    // 1. Canonical OP Stack deposit
    if (to.viem.nativeCurrency.symbol === from.viem.nativeCurrency.symbol && to.opStackParent === fromId && getPortalAddress(to)) {
      out.push({
        id: `portal-${fromId}-${toId}`,
        type: 'direct',
        legs: [{ kind: 'portal', from: fromId, to: toId }],
        inToken: token,
        outToken: nativeOf(toId),
        txCount: 1,
        label: `${token.symbol} → Native bridge → ${nativeOf(toId).symbol}`,
        detail: `Canonical OP Stack deposit ${from.short} → ${to.short}, one-way.`,
      })
    }
    // 2. Canonical Arbitrum Orbit deposit
    if (to.viem.nativeCurrency.symbol === from.viem.nativeCurrency.symbol && orbitRouteExists(fromId, toId)) {
      out.push({
        id: `orbit-${fromId}-${toId}`,
        type: 'direct',
        legs: [{ kind: 'arbitrum', from: fromId, to: toId }],
        inToken: token,
        outToken: nativeOf(toId),
        txCount: 1,
        label: `${token.symbol} → Arbitrum bridge → ${nativeOf(toId).symbol}`,
        detail: `Canonical Arbitrum Orbit deposit from ${from.short} into ${to.short}. The sequencer usually redeems the retryable ticket within minutes.`,
      })
    }
    // 3. Across Protocol v3 fast ETH (covers L1<->L2, L2<->L2, and Amoy WETH)
    const ac = acrossRouteAvailable(fromId, toId, 'native')
    if (ac) {
      out.push({
        id: `across-eth-${fromId}-${toId}`,
        type: 'direct',
        legs: [{ kind: 'across', from: fromId, to: toId, inToken: ac.inToken, outToken: ac.outToken, isNative: true }],
        inToken: token,
        outToken: ac.destToken,
        txCount: 1,
        label: `${token.symbol} → Across v3 → ${ac.destToken.symbol}`,
        detail: `Across Protocol v3 fast relayer bridge ${from.short} → ${to.short}. Single signature, typically fills in ~10–30s (subject to testnet relayer pool cap).`,
      })
    }
    return out
  }

  // WETH (for e.g. Polygon Amoy WETH <-> ETH chains or WETH transfers)
  if (isWrappedOrAmoyWeth) {
    const ac = acrossRouteAvailable(fromId, toId, 'weth')
    if (ac && (fromId === 80002 || toId === 80002 || token.address.toLowerCase() !== amoyWeth)) {
      out.push({
        id: `across-weth-${fromId}-${toId}`,
        type: 'direct',
        legs: [{ kind: 'across', from: fromId, to: toId, inToken: ac.inToken, outToken: ac.outToken, isNative: false }],
        inToken: token,
        outToken: ac.destToken,
        txCount: 1,
        label: `${token.symbol} → Across v3 → ${ac.destToken.symbol}`,
        detail: `Across Protocol v3 ERC-20 bridge ${from.short} → ${to.short}. Single signature after approval.`,
      })
    }
    return out
  }

  // USDC -> USDC via Circle CCTP (primary) + Across (fast 1-tx alternative)
  if (token.kind === 'usdc' && to.usdc) {
    const destUsdc = findToken(toId, to.usdc)
    if (destUsdc && from.cctpDomain != null && to.cctpDomain != null && from.usdc) {
      out.push({
        id: `cctp-${fromId}-${toId}`,
        type: 'direct',
        legs: [{ kind: 'cctp', from: fromId, to: toId, token: from.usdc }],
        inToken: token,
        outToken: destUsdc,
        txCount: 2,
        label: `${token.symbol} → Circle CCTP → ${destUsdc.symbol}`,
        detail: `Circle CCTP v2 burn-and-mint. You sign the burn, Circle attests, then you sign the mint on ${to.short}.`,
      })
    }
    const ac = acrossRouteAvailable(fromId, toId, 'usdc')
    if (ac) {
      out.push({
        id: `across-usdc-${fromId}-${toId}`,
        type: 'direct',
        legs: [{ kind: 'across', from: fromId, to: toId, inToken: ac.inToken, outToken: ac.outToken, isNative: false }],
        inToken: token,
        outToken: ac.destToken,
        txCount: 1,
        label: `${token.symbol} → Across v3 → ${ac.destToken.symbol}`,
        detail: `Across Protocol v3 fast USDC bridge ${from.short} → ${to.short}. Single signature after approval, relayer delivers directly to ${to.short}.`,
      })
    }
  }

  return out
}

/** Legacy helper returning the primary direct route if one exists. */
export function directRoute(fromId: number, toId: number, token: TokenCfg): RouteCandidate | null {
  return directRoutes(fromId, toId, token)[0] ?? null
}

/**
 * All executable routes for a source and destination chain, best first.
 * Direct routes come first, then composites ordered by transaction count.
 */
const routeCache = new Map<string, RouteCandidate[]>()

/**
 * Route search is pure config maths, and the UI asks the same pairs over and over
 * (every candidate token, every render). Memoising by chain + asset pair turns the
 * Bridge page's mount cost from ~700ms of repeated search into a lookup.
 */
export function findRoutes(fromId: number, toId: number, inToken: TokenCfg, outToken: TokenCfg): RouteCandidate[] {
  const key = `${fromId}:${inToken.address.toLowerCase()}>${toId}:${outToken.address.toLowerCase()}`
  const hit = routeCache.get(key)
  if (hit) return hit
  const built = buildRoutes(fromId, toId, inToken, outToken)
  routeCache.set(key, built)
  return built
}

function buildRoutes(fromId: number, toId: number, inToken: TokenCfg, outToken: TokenCfg): RouteCandidate[] {
  if (fromId === toId) return []
  const matchingDirect = directRoutes(fromId, toId, inToken).filter(
    (d) => assetKey(toId, d.outToken.address) === assetKey(toId, outToken.address),
  )
  if (matchingDirect.length > 0) {
    return matchingDirect
  }

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
      const curIsUsdc = cur.token.kind === 'usdc'
      const curIsNative = assetKey(cur.chainId, cur.token.address) === assetKey(cur.chainId, NATIVE_SENTINEL)
      const curIsAmoyWeth = cur.chainId === 80002 && cur.token.address.toLowerCase() === (ACROSS_WETH[80002] ?? '').toLowerCase()
      if (leg.kind === 'cctp' && !curIsUsdc) continue
      if (leg.kind === 'portal' && !curIsNative) continue
      if (leg.kind === 'arbitrum' && !curIsNative) continue
      if (leg.kind === 'across') {
        if (edge.matchKey.startsWith('usdc:') && !curIsUsdc) continue
        if (edge.matchKey.startsWith('native:') && !curIsNative) continue
        if (edge.matchKey.startsWith('weth:') && !curIsAmoyWeth && !(ACROSS_ETH_CHAINS.has(cur.chainId) && cur.token.address.toLowerCase() === (ACROSS_WETH[cur.chainId] ?? '').toLowerCase())) continue
      }
      if (assetKey(edge.toChain, edge.token.address) === assetKey(cur.chainId, cur.token.address) && edge.toChain === cur.chainId) continue
      push(cur, { chainId: edge.toChain, token: edge.token }, cur.legs.concat([leg]), goalKey, visited, queue, found, fromId, toId, inToken, outToken)
    }
  }

  const seen = new Set<string>()
  const unique = found.filter((r) => {
    const sig = r.legs
      .map((l) => `${l.kind}:${l.kind === 'swap' ? `${l.tokenIn}-${l.tokenOut}-${l.fee}` : `${l.from}-${l.to}`}`)
      .join('|')
    if (seen.has(sig)) return false
    seen.add(sig)
    return true
  })
  unique.sort((a, b) => a.txCount - b.txCount)
  return unique
}

interface RouteState {
  chainId: number
  token: TokenCfg
  legs: RouteLeg[]
}

function push(
  _cur: RouteState,
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
  const type =
    legs.length === 1 && (legs[0].kind === 'cctp' || legs[0].kind === 'portal' || legs[0].kind === 'arbitrum' || legs[0].kind === 'across' || legs[0].kind === 'lifi' || legs[0].kind === 'relay' || legs[0].kind === 'wormhole')
      ? 'direct'
      : 'composite'
  const txCount = legs.length
  found.push({
    id: `${type}-${legs.map((l) => `${l.kind}${l.kind === 'swap' ? l.fee : ''}`).join('-')}-${fromId}-${toId}`,
    type,
    legs,
    inToken,
    outToken,
    txCount,
    label: describeLegs(legs, fromId, toId),
    detail: legs.length === 1 ? 'Single verified operation.' : 'Composite route: you sign each operation yourself.',
  })
}

/** Native asset symbol for a chain, used in labels. */
export function nativeSymbolOf(chainId: number): string {
  return getChain(chainId)?.viem.nativeCurrency.symbol ?? 'ETH'
}

function describeLegs(legs: RouteLeg[], fromId: number, toId: number): string {
  const parts: string[] = []
  for (const leg of legs) {
    if (leg.kind === 'cctp') parts.push(`${getChain(leg.from)?.short} USDC → CCTP → ${getChain(leg.to)?.short} USDC`)
    else if (leg.kind === 'across') {
      const symIn = findToken(leg.from, leg.inToken)?.symbol ?? nativeSymbolOf(leg.from)
      const symOut = findToken(leg.to, leg.outToken)?.symbol ?? nativeSymbolOf(leg.to)
      parts.push(`${getChain(leg.from)?.short} ${leg.isNative ? nativeSymbolOf(leg.from) : symIn} → Across → ${getChain(leg.to)?.short} ${ACROSS_ETH_CHAINS.has(leg.to) && leg.outToken.toLowerCase() === ACROSS_WETH[leg.to]?.toLowerCase() ? nativeSymbolOf(leg.to) : symOut}`)
    } else if (leg.kind === 'portal')
      parts.push(`${getChain(leg.from)?.short} ${nativeSymbolOf(leg.from)} → Native bridge → ${getChain(leg.to)?.short} ${nativeSymbolOf(leg.to)}`)
    else if (leg.kind === 'arbitrum')
      parts.push(`${getChain(leg.from)?.short} ${nativeSymbolOf(leg.from)} → Arbitrum bridge → ${getChain(leg.to)?.short} ${nativeSymbolOf(leg.to)}`)
    else if (leg.kind === 'lifi') {
      const symIn = findToken(leg.from, leg.inToken)?.symbol ?? nativeSymbolOf(leg.from)
      const symOut = findToken(leg.to, leg.outToken)?.symbol ?? nativeSymbolOf(leg.to)
      parts.push(`${getChain(leg.from)?.short} ${symIn} → LI.FI (${leg.tool}) → ${getChain(leg.to)?.short} ${symOut}`)
    } else if (leg.kind === 'relay') {
      const symIn = findToken(leg.from, leg.inToken)?.symbol ?? nativeSymbolOf(leg.from)
      const symOut = findToken(leg.to, leg.outToken)?.symbol ?? nativeSymbolOf(leg.to)
      parts.push(`${getChain(leg.from)?.short} ${symIn} → Relay → ${getChain(leg.to)?.short} ${symOut}`)
    } else if (leg.kind === 'wormhole') {
      const symIn = findToken(leg.from, leg.inToken)?.symbol ?? nativeSymbolOf(leg.from)
      const symOut = findToken(leg.to, leg.outToken)?.symbol ?? nativeSymbolOf(leg.to)
      parts.push(`${getChain(leg.from)?.short} ${symIn} → Wormhole (${leg.mode}) → ${getChain(leg.to)?.short} ${symOut}`)
    } else {
      const a = findToken(leg.chainId, leg.tokenIn)
      const b = findToken(leg.chainId, leg.tokenOut)
      parts.push(`${a?.symbol ?? '?'} → ${b?.symbol ?? '?'} on ${getChain(leg.chainId)?.short}`)
    }
  }
  void fromId
  void toId
  return parts.join('  +  ')
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
const usableSourceCache = new Map<string, TokenCfg[]>()

export function usableSourceTokens(fromId: number, toId: number): TokenCfg[] {
  const key = `${fromId}>${toId}`
  const hit = usableSourceCache.get(key)
  if (hit) return hit
  const built = buildUsableSourceTokens(fromId, toId)
  usableSourceCache.set(key, built)
  return built
}

function buildUsableSourceTokens(fromId: number, toId: number): TokenCfg[] {
  const all = [...tokensForChain(fromId)]
  const native = nativeOf(fromId)
  const hasNative = all.some((t) => t.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase())
  const list = hasNative ? all : [native, ...all]
  return list.filter((t) => hasAnyRoute(fromId, toId, t))
}

/** Destination assets reachable from a given source asset. */
const reachableDestCache = new Map<string, TokenCfg[]>()

export function reachableDestTokens(fromId: number, toId: number, inToken: TokenCfg): TokenCfg[] {
  const key = `${fromId}>${toId}:${inToken.address.toLowerCase()}`
  const hit = reachableDestCache.get(key)
  if (hit) return hit
  const built = buildReachableDestTokens(fromId, toId, inToken)
  reachableDestCache.set(key, built)
  return built
}

function buildReachableDestTokens(fromId: number, toId: number, inToken: TokenCfg): TokenCfg[] {
  const out = new Map<string, TokenCfg>()
  const all = tokensForChain(toId)
  const native = nativeOf(toId)
  const candidates = all.some((t) => t.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase()) ? all : [...all, native]
  for (const t of candidates) {
    if (findRoutes(fromId, toId, inToken, t).length === 0) continue
    const key = assetKey(toId, t.address)
    const prev = out.get(key)
    if (!prev || t.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase()) out.set(key, t)
  }
  return [...out.values()]
}

export { CHAINS, getChain }
export type { ChainCfg }

/**
 * Why a specific token cannot leave `fromId` for `toId`.
 */
export function noRouteReason(fromId: number, toId: number, token: TokenCfg): string {
  const from = getChain(fromId)
  const to = getChain(toId)
  if (!from || !to) return 'Unknown chain.'
  const isNative = token.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase()

  const orbitCfg = orbitBridgeFor(toId)
  const toIsParentOfFrom = to.opStackParent === fromId || orbitCfg?.chainId === fromId || false
  if (toIsParentOfFrom) {
    return `Leaving ${from.short} for ${to.short} is a canonical withdrawal, not a one-shot transfer: it settles only after the challenge period (7 days on mainnet Arbitrum). The withdrawal panel on this page walks the three signed steps.`
  }

  /**
   * Robinhood Chain (and every Arbitrum Orbit chain) can be entered with one signed
   * transaction, but the way back is a three-step withdrawal: initiate on the L2, wait for
   * the rollup's challenge period, then claim on the L1. There is no single transaction to
   * sign here, so the user is told exactly why and sent to the canonical bridge.
   */
  const orbitFrom = orbitBridgeFor(fromId)
  if (orbitFrom && orbitFrom.parentChainId === toId) {
    return `Going from ${from.short} back to ${to.short} is a canonical Arbitrum withdrawal, not a one-shot transfer: withdraw on ${from.short}, wait for that block to be confirmed on ${to.short} (this testnet: about 4 minutes; mainnet Arbitrum: 7 days), then claim it with the proof the chain itself builds. All three steps are below and each one is signed by you.`
  }

  if (isNative) {
    const parentId = from.opStackParent ?? orbitBridgeFor(fromId)?.parentChainId
    const parent = parentId != null ? getChain(parentId) : undefined
    if (parentId != null && parent) {
      return `${token.symbol} on ${from.short} has no fast relayer route out and canonical withdrawals only go to ${parent.short} with a 7-day window.`
    }
    return `No verified provider moves ${token.symbol} from ${from.short} to ${to.short}.`
  }
  if (!from.cctpDomain || !to.cctpDomain) {
    return `${token.symbol} has no bridge on ${from.short} to ${to.short}.`
  }
  return `No verified route for ${token.symbol} from ${from.short} to ${to.short}.`
}

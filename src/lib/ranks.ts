import { getChain } from '../config/chains'
import { loadPortfolioCache } from './portfolio'
import { peekPrices, priceOf } from './prices'

/**
 * Ordering rule used by every network and token selector in the app.
 *
 * Rank by what the connected wallet actually holds: funded networks first (by USD), then funded
 * tokens, then everything else in its original curated order. With no wallet, or no cached
 * balances yet, the lists stay exactly as the product designed them.
 *
 * Balances come from the portfolio cache (written whenever the Portfolio tab loads, and prefetched
 * on connect), so ranking costs a localStorage read, not a chain scan.
 */
export interface Ranks {
  /** chainId -> total USD held there */
  chainUsd: Map<number, number>
  /** `${chainId}:${address}` (native = `${chainId}:native`) -> USD, present only when balance > 0 */
  tokUsd: Map<string, number>
}

const EMPTY: Ranks = { chainUsd: new Map(), tokUsd: new Map() }
const TOKEN_KEY = (chainId: number, addr: string) => `${chainId}:${addr.toLowerCase()}`

let memo: { owner: string; at: number; ranks: Ranks } | null = null

function nativeMeta(chainId: number): { symbol: string; decimals: number } {
  const c = getChain(chainId)
  return {
    symbol: c?.nativeIsUsdc ? 'USDC' : (c?.viem.nativeCurrency.symbol ?? 'ETH'),
    decimals: c?.nativeIsUsdc ? 6 : (c?.viem.nativeCurrency.decimals ?? 18),
  }
}

export function ranksFor(owner?: string | null): Ranks {
  if (!owner) return EMPTY
  const key = owner.toLowerCase()
  if (memo && memo.owner === key && Date.now() - memo.at < 30_000) return memo.ranks

  const cache = loadPortfolioCache(owner)
  if (!cache) return EMPTY

  const prices = peekPrices()
  const chainUsd = new Map<number, number>()
  const tokUsd = new Map<string, number>()

  for (const h of cache.holdings) {
    let sum = 0
    const add = (addr: string, symbol: string, balance: bigint | null, decimals: number) => {
      if (balance == null || balance === 0n) return
      const amount = Number(balance) / 10 ** decimals
      if (!Number.isFinite(amount) || amount <= 0) return
      const value = (priceOf(prices, symbol) ?? 0) * amount
      tokUsd.set(TOKEN_KEY(h.chainId, addr), value)
      sum += value
    }
    const meta = nativeMeta(h.chainId)
    add('native', meta.symbol, h.native, meta.decimals)
    for (const t of h.tokens) add(t.token.address, t.token.symbol, t.balance, t.token.decimals)
    chainUsd.set(h.chainId, sum)
  }

  memo = { owner: key, at: Date.now(), ranks: { chainUsd, tokUsd } }
  return memo.ranks
}

/** Funded first (USD desc), zero/unknown after, original order preserved inside each bucket. */
function sortRanked<T>(items: T[], valueOf: (item: T) => number | undefined): T[] {
  return items
    .map((item, i) => ({ item, i, usd: valueOf(item) }))
    .sort((a, b) => {
      const av = a.usd && a.usd > 0 ? a.usd : 0
      const bv = b.usd && b.usd > 0 ? b.usd : 0
      if ((av > 0) !== (bv > 0)) return av > 0 ? -1 : 1
      if (av !== bv) return bv - av
      return a.i - b.i
    })
    .map((x) => x.item)
}

export function rankChains<T>(items: T[], getId: (item: T) => number, ranks: Ranks): T[] {
  if (ranks.chainUsd.size === 0) return items
  return sortRanked(items, (item) => ranks.chainUsd.get(getId(item)))
}

export function rankTokens<T>(
  items: T[],
  chainId: number,
  getAddress: (item: T) => string,
  ranks: Ranks,
): T[] {
  if (ranks.tokUsd.size === 0) return items
  return sortRanked(items, (item) => ranks.tokUsd.get(TOKEN_KEY(chainId, getAddress(item))))
}

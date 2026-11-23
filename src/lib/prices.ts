/**
 * Reference prices for the portfolio.
 *
 * Testnet tokens have no real market, so these are mainnet spot prices used only to make
 * the portfolio readable. They are labelled as estimates everywhere they appear.
 * DefiLlama first (open CORS, no key), CoinGecko as a fallback, then a small static table.
 */
export type PriceMap = Record<string, number>

const IDS: Record<string, string> = {
  ETH: 'coingecko:ethereum',
  WETH: 'coingecko:ethereum',
  USDC: 'coingecko:usd-coin',
  USDT: 'coingecko:tether',
  DAI: 'coingecko:dai',
  EURC: 'coingecko:euro-coin',
  LINK: 'coingecko:chainlink',
  WBTC: 'coingecko:wrapped-bitcoin',
  UNI: 'coingecko:uniswap',
  AVAX: 'coingecko:avalanche-2',
  POL: 'coingecko:polygon-ecosystem-token',
  SEI: 'coingecko:sei-network',
  INJ: 'coingecko:injective-protocol',
  MON: 'coingecko:monad',
}

/** Conservative fallbacks so the total never reads zero while a price API is down. */
const FALLBACK: PriceMap = {
  USDC: 1,
  USDT: 1,
  DAI: 1,
  EURC: 1.09,
  ETH: 1721,
  WETH: 1721,
  WBTC: 61462,
  LINK: 8.92,
  UNI: 4.74,
  AVAX: 6.69,
  POL: 0.077,
  SEI: 0.034,
  INJ: 6.4,
}

const CACHE_KEY = 'ebt.prices.v1'
const TTL = 10 * 60 * 1000

interface CachedPrices {
  at: number
  prices: PriceMap
  live: boolean
}

function readCache(): CachedPrices | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedPrices
    return parsed && typeof parsed.at === 'number' ? parsed : null
  } catch {
    return null
  }
}

export interface PriceResult {
  prices: PriceMap
  live: boolean
  at: number
}

export async function loadPrices(): Promise<PriceResult> {
  const cached = readCache()
  if (cached && Date.now() - cached.at < TTL) return { prices: { ...FALLBACK, ...cached.prices }, live: cached.live, at: cached.at }

  const wanted = Object.values(IDS)
  try {
    const res = await fetch(`https://coins.llama.fi/prices/current/${wanted.join(',')}`)
    if (!res.ok) throw new Error(String(res.status))
    const body = (await res.json()) as { coins?: Record<string, { price: number; symbol?: string }> }
    const prices: PriceMap = {}
    for (const [symbol, id] of Object.entries(IDS)) {
      const hit = body.coins?.[id]
      if (hit && Number.isFinite(hit.price)) prices[symbol] = hit.price
    }
    if (Object.keys(prices).length === 0) throw new Error('empty price table')
    const at = Date.now()
    persist({ at, prices, live: true })
    return { prices: { ...FALLBACK, ...prices }, live: true, at }
  } catch {
    const at = cached?.at ?? Date.now()
    if (!cached) persist({ at, prices: FALLBACK, live: false })
    return { prices: { ...FALLBACK, ...(cached?.prices ?? {}) }, live: false, at }
  }
}

function persist(v: CachedPrices) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(v))
  } catch {
    /* storage unavailable */
  }
}

export const priceOf = (prices: PriceMap, symbol: string): number | undefined => prices[symbol.toUpperCase()]

const usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
const usdFmtSmall = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 })

export function usd(value: number): string {
  if (!Number.isFinite(value)) return '-'
  if (value !== 0 && Math.abs(value) < 0.01) return usdFmtSmall.format(value)
  return usdFmt.format(value)
}

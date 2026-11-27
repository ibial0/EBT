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
  'USDC.E': 'coingecko:usd-coin',
  USDT: 'coingecko:tether',
  DAI: 'coingecko:dai',
  PUSD: 'coingecko:plume-usd',
  EURC: 'coingecko:euro-coin',
  EURS: 'coingecko:stasis-eurs',
  LINK: 'coingecko:chainlink',
  WBTC: 'coingecko:wrapped-bitcoin',
  CIRBTC: 'coingecko:bitcoin',
  UNI: 'coingecko:uniswap',
  AVAX: 'coingecko:avalanche-2',
  WAVAX: 'coingecko:avalanche-2',
  POL: 'coingecko:polygon-ecosystem-token',
  WPOL: 'coingecko:polygon-ecosystem-token',
  SEI: 'coingecko:sei-network',
  WSEI: 'coingecko:sei-network',
  INJ: 'coingecko:injective-protocol',
  WINJ: 'coingecko:injective-protocol',
  MON: 'coingecko:monad',
  WMON: 'coingecko:monad',
  AAVE: 'coingecko:aave',
  GHO: 'coingecko:gho',
  CBETH: 'coingecko:coinbase-wrapped-staked-eth',
  OKB: 'coingecko:okb',
  XPL: 'coingecko:plasma',
  WXPL: 'coingecko:plasma',
  JASMY: 'coingecko:jasmycoin',
  WJASMY: 'coingecko:jasmycoin',
  PLUME: 'coingecko:plume',
  WPLUME: 'coingecko:plume',
  SYN: 'coingecko:synapse-2',
  THP: 'coingecko:humanity',
  VTHP: 'coingecko:humanity',
  SX: 'coingecko:sx-network',
  SXAI: 'coingecko:xai-blockchain',
  // Robinhood Testnet tokenized equities (xStocks mainnet reference feeds on DefiLlama)
  TSLA: 'coingecko:tesla-xstock',
  AMZN: 'coingecko:amazon-xstock',
  AMD: 'coingecko:amd-xstock',
  PLTR: 'coingecko:palantir-xstock',
  NFLX: 'coingecko:netflix-xstock',
  // Expanded active testnet native reference feeds (display estimates only)
  SOL: 'coingecko:solana',
  SUI: 'coingecko:sui',
  APT: 'coingecko:aptos',
  STRK: 'coingecko:starknet',
  XLM: 'coingecko:stellar',
  ALGO: 'coingecko:algorand',
  NEAR: 'coingecko:near',
  WND: 'coingecko:polkadot',
  XRP: 'coingecko:ripple',
  BERA: 'coingecko:berachain-bera',
  BNB: 'coingecko:binancecoin',
  TBNB: 'coingecko:binancecoin',
  WBNB: 'coingecko:binancecoin',
  BUSD: 'coingecko:binance-usd',
  CAKE: 'coingecko:pancakeswap-token',
  BTCB: 'coingecko:bitcoin',
  WHBAR: 'coingecko:hedera-hashgraph',
  SAUCE: 'coingecko:saucerswap',
  CELO: 'coingecko:celo',
  'S-CELO': 'coingecko:celo',
  TCORE: 'coingecko:coredaoorg',
  TCORE2: 'coingecko:coredaoorg',
  CTC: 'coingecko:creditcoin-2',
  TCTC: 'coingecko:creditcoin-2',
  CRO: 'coingecko:crypto-com-chain',
  TCRO: 'coingecko:crypto-com-chain',
  ZKCRO: 'coingecko:crypto-com-chain',
  DOGE: 'coingecko:dogecoin',
  XDAI: 'coingecko:dai',
  G: 'coingecko:g-token',
  HBAR: 'coingecko:hedera-hashgraph',
  HYPE: 'coingecko:hyperliquid',
  KAIA: 'coingecko:kaia',
  MNT: 'coingecko:mantle',
  METIS: 'coingecko:metis-token',
  TMETIS: 'coingecko:metis-token',
  RON: 'coingecko:ronin',
  BONE: 'coingecko:bone-shibaswap',
  S: 'coingecko:sonic-3',
  SBY: 'coingecko:astar',
  TAC: 'coingecko:tac',
  WEMIX: 'coingecko:wemix-token',
  TWEMIX: 'coingecko:wemix-token',
  XDC: 'coingecko:xdce-crowd-sale',
  TXDC: 'coingecko:xdce-crowd-sale',
  GAS: 'coingecko:gas',
  USD: 'coingecko:usd-coin',
}

/** Conservative fallbacks so the total never reads zero while a price API is down. */
const FALLBACK: PriceMap = {
  USDC: 1,
  'USDC.E': 1,
  USDT: 1,
  DAI: 1,
  PUSD: 1,
  EURC: 1.09,
  EURS: 1.09,
  ETH: 1703,
  WETH: 1703,
  WBTC: 60900,
  CIRBTC: 60867,
  LINK: 9.25,
  UNI: 4.75,
  AVAX: 6.67,
  WAVAX: 6.67,
  POL: 0.076,
  WPOL: 0.076,
  SEI: 0.036,
  WSEI: 0.036,
  INJ: 6.27,
  WINJ: 6.27,
  MON: 0.011,
  WMON: 0.011,
  AAVE: 97.4,
  GHO: 1,
  CBETH: 1948,
  OKB: 82.2,
  XPL: 0.048,
  WXPL: 0.048,
  JASMY: 0.0031,
  WJASMY: 0.0031,
  PLUME: 0.0108,
  WPLUME: 0.0108,
  SYN: 0.115,
  THP: 0.0115,
  VTHP: 0.0115,
  SX: 0.0126,
  SXAI: 0.0055,
  TSLA: 382,
  AMZN: 247,
  AMD: 414,
  PLTR: 164,
  NFLX: 59,
  SOL: 140,
  SUI: 2.1,
  APT: 6.2,
  STRK: 0.35,
  XLM: 0.28,
  ALGO: 0.22,
  NEAR: 3.1,
  XRP: 1.4,
  BNB: 620,
  TBNB: 620,
  WBNB: 620,
  BUSD: 1,
  CAKE: 1.8,
  BTCB: 60900,
  WHBAR: 0.16,
  SAUCE: 0.04,
  BERA: 2.5,
  CELO: 0.45,
  TCORE: 0.55,
  TCORE2: 0.55,
  CRO: 0.11,
  TCRO: 0.11,
  ZKCRO: 0.11,
  DOGE: 0.18,
  XDAI: 1,
  HBAR: 0.16,
  HYPE: 18,
  KAIA: 0.13,
  MNT: 0.72,
  METIS: 21,
  TMETIS: 21,
  RON: 1.1,
  WEMIX: 0.7,
  XDC: 0.065,
  TXDC: 0.065,
  GAS: 3.5,
  USD: 1,
}

const CACHE_KEY = 'ebt.prices.v2'
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

  const wanted = [...new Set(Object.values(IDS))]
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

/** Synchronous view of the price table, for callers that rank by value during render. */
export const peekPrices = (): PriceMap => ({ ...FALLBACK, ...(readCache()?.prices ?? {}) })

export const priceOf = (prices: PriceMap, symbol: string): number | undefined => prices[symbol.toUpperCase()]

const usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
const usdFmtSmall = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 })

export function usd(value: number): string {
  if (!Number.isFinite(value)) return '-'
  if (value !== 0 && Math.abs(value) < 0.01) return usdFmtSmall.format(value)
  return usdFmt.format(value)
}

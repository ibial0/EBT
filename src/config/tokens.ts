import type { Address } from './chains'
import { getChain } from './chains'

export type TokenKind = 'usdc' | 'weth' | 'token'

export interface TokenCfg {
  chainId: number
  address: Address
  symbol: string
  name: string
  decimals: number
  kind: TokenKind
  /** accent colour for the generated icon */
  color: string
  /** address verified on-chain on 2026-11-23 */
  verified: boolean
}

const t = (
  chainId: number,
  address: Address,
  symbol: string,
  name: string,
  decimals: number,
  kind: TokenKind,
  color: string,
): TokenCfg => ({ chainId, address, symbol, name, decimals, kind, color, verified: true })

export const WETH: Record<number, Address> = {
  11155111: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  84532: '0x4200000000000000000000000000000000000006',
  1301: '0x4200000000000000000000000000000000000006',
}

export const TOKENS: TokenCfg[] = [
  // ── Ethereum Sepolia, every pair below was quoted live against Uniswap v3 on 2026-11-23
  t(11155111, '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(11155111, '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', 'WETH', 'Wrapped Ether', 18, 'weth', '#627eea'),
  t(11155111, '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', 'UNI', 'Uniswap', 18, 'token', '#ff007a'),
  t(11155111, '0x68194a729C2450ad26072b3D33ADaCbcef39D574', 'DAI', 'Dai Stablecoin', 18, 'token', '#f5ac37'),
  t(11155111, '0x779877A7B0D9E8603169DdbD7836e478b4624789', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(11155111, '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', 'USDT', 'Tether USD', 6, 'token', '#26a17b'),
  t(11155111, '0x29f2D40B0605204364af54EC677bD022dA425d03', 'WBTC', 'Wrapped BTC', 8, 'token', '#f7931a'),

  // ── Base Sepolia
  t(84532, '0x036CbD53842c5426634e7929541eC2318f3dCF7e', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(84532, '0x4200000000000000000000000000000000000006', 'WETH', 'Wrapped Ether', 18, 'weth', '#627eea'),

  // ── Unichain Sepolia
  t(1301, '0x31d0220469e10c4E71834a79b1f276d740d3768F', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(1301, '0x4200000000000000000000000000000000000006', 'WETH', 'Wrapped Ether', 18, 'weth', '#627eea'),

  // ── Arc Testnet: native USDC (18dp native / 6dp ERC-20 view) + EURC + cirBTC
  t(5042002, '0x3600000000000000000000000000000000000000', 'USDC', 'USD Coin (native on Arc)', 6, 'usdc', '#2775ca'),
  t(5042002, '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', 'EURC', 'Euro Coin', 6, 'token', '#1a5cff'),
  t(5042002, '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF', 'cirBTC', 'Circle Wrapped BTC (verify before use)', 8, 'token', '#f7931a'),

  // ── USD Coin on the remaining CCTP testnets (needed for bridge balances + portfolio)
  t(43113, '0x5425890298aed601595a70AB815c96711a31Bc65', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(11155420, '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(421614, '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(80002, '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(59141, '0xFEce4462D57bD51A6A552365A011b95f0E16d9B7', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(812242, '0x6d7f141b6819C2c9CC2f818e6ad549E7Ca090F8f', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(4801, '0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(10143, '0x534b2f3A21130d7a60830c2Df862319e593943A3', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(1328, '0x4fCF1784B31630811181f670Aea7A7bEF803eaED', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(763373, '0xFabab97dCE620294D2B0b0e46C68964e326300Ac', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(1439, '0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(9746, '0xE67Fb267022cBA8064Dd388CC2FED724F3120D9D', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(1952, '0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
]

export function tokensForChain(chainId?: number | null): TokenCfg[] {
  if (chainId == null) return []
  return TOKENS.filter((tk) => tk.chainId === chainId)
}

export function findToken(chainId: number, address?: string | null): TokenCfg | undefined {
  if (!address) return undefined
  const a = address.toLowerCase()
  return TOKENS.find((tk) => tk.chainId === chainId && tk.address.toLowerCase() === a)
}

export function tokenBySymbol(chainId: number, symbol: string): TokenCfg | undefined {
  return TOKENS.find((tk) => tk.chainId === chainId && tk.symbol === symbol)
}

export const USDC_OF = (chainId: number): TokenCfg | undefined => {
  const c = getChain(chainId)
  if (!c?.usdc) return undefined
  return findToken(chainId, c.usdc) ?? undefined
}

/** Sentinel address used to represent the chain's native gas token in selectors. */
export const NATIVE_SENTINEL: Address = '0x0000000000000000000000000000000000000000'

export const NATIVE = (chainId: number) => {
  const c = getChain(chainId)
  return {
    symbol: c?.viem.nativeCurrency.symbol ?? 'ETH',
    name: c?.viem.nativeCurrency.name ?? 'Ether',
    decimals: c?.viem.nativeCurrency.decimals ?? 18,
  }
}

/** Native gas token presented as a selectable token. */
export function nativeToken(chainId: number): TokenCfg {
  const n = NATIVE(chainId)
  const c = getChain(chainId)
  return {
    chainId,
    address: NATIVE_SENTINEL,
    symbol: n.symbol,
    name: `${n.name} (native)`,
    decimals: n.decimals,
    kind: 'token',
    color: c?.gradient[0] ?? '#64748b',
    verified: true,
  }
}

export const isNativeToken = (t?: TokenCfg | null) => t?.address === NATIVE_SENTINEL


/* ───────────────────────── user-imported tokens ───────────────────────── */

const CUSTOM_KEY = 'ebt.customTokens.v1'

export interface CustomToken extends TokenCfg {
  importedAt: number
}

export function loadCustomTokens(): CustomToken[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((x) => x && typeof x.address === 'string') : []
  } catch {
    return []
  }
}

export function saveCustomToken(tk: Omit<CustomToken, 'importedAt'>) {
  if (typeof localStorage === 'undefined') return
  const list = loadCustomTokens().filter(
    (x) => !(x.chainId === tk.chainId && x.address.toLowerCase() === tk.address.toLowerCase()),
  )
  list.push({ ...tk, importedAt: Date.now() })
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list))
}

export function allTokensForChain(chainId: number): TokenCfg[] {
  const base = tokensForChain(chainId)
  const custom = loadCustomTokens().filter((x) => x.chainId === chainId)
  const seen = new Set(base.map((x) => x.address.toLowerCase()))
  return [...base, ...custom.filter((c) => !seen.has(c.address.toLowerCase()))]
}

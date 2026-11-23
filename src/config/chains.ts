import type { Chain } from 'viem'
import {
  sepolia,
  avalancheFuji,
  optimismSepolia,
  arbitrumSepolia,
  baseSepolia,
  polygonAmoy,
  unichainSepolia,
  lineaSepolia,
  codexTestnet,
  worldchainSepolia,
  monadTestnet,
  seiTestnet,
  inkSepolia,
  arcTestnet,
  injectiveTestnet,
  plasmaTestnet,
  xLayerTestnet,
  giwaSepolia,
} from 'viem/chains'

export type Address = `0x${string}`

export interface FaucetLink {
  label: string
  url: string
  tokens?: string[]
  note?: string
}

export interface UniswapDeployment {
  quoter: Address
  router02: Address
  factory: Address
  /** SwapRouter02 (no deadline, multicall) or the older SwapRouter (deadline, no multicall) */
  kind?: 'router02' | 'v1'
}

export interface ChainCfg {
  /** chain id — this is the hard testnet allowlist key */
  id: number
  key: string
  name: string
  /** short label for pills */
  short: string
  viem: Chain
  /** CCTP v2 domain id, verified against Circle docs */
  cctpDomain?: number
  /** native USDC on this testnet, verified on-chain (symbol() = USDC, 6 decimals) */
  usdc?: Address
  /** verified Uniswap v3 deployment (quoter/router/factory) */
  uniswap?: UniswapDeployment
  /** primary bridge capability used for badges; opStackParent adds ETH deposits on top */
  bridge: 'cctp' | 'opstack' | 'none'
  /** OP Stack L1 parent chain id — enables canonical ETH deposits from that parent */
  opStackParent?: number
  /** true when the native gas asset IS USDC (Arc): 18-decimal native view, 6-decimal ERC-20 view */
  nativeIsUsdc?: boolean
  /** minimum maxFeePerGas in gwei that the chain's mempool accepts (Arc = 20) */
  minGasPriceGwei?: number
  color: string
  gradient: [string, string]
  faucets: FaucetLink[]
  verifiedAt: string
}

const VERIFIED = '2026-11-23'

export const CCTP_TOKEN_MESSENGER_V2: Address = '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA'
export const CCTP_MESSAGE_TRANSMITTER_V2: Address = '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275'

export const CHAINS: ChainCfg[] = [
  {
    id: sepolia.id,
    key: 'sepolia',
    name: 'Ethereum Sepolia',
    short: 'Sepolia',
    viem: sepolia,
    cctpDomain: 0,
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    uniswap: {
      quoter: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3',
      router02: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
      factory: '0x0227628f3F023bb0B980b67D528571c95c6DaC1c',
    },
    bridge: 'cctp',
    color: '#8a92b2',
    gradient: ['#627eea', '#3b5bd9'],
    faucets: [
      { label: 'Google Web3 Faucet', url: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia', tokens: ['ETH'] },
      { label: 'Alchemy Sepolia Faucet', url: 'https://www.alchemy.com/faucets/ethereum-sepolia', tokens: ['ETH'] },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'] },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: avalancheFuji.id,
    key: 'avalancheFuji',
    name: 'Avalanche Fuji',
    short: 'Fuji',
    viem: avalancheFuji,
    cctpDomain: 1,
    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
    bridge: 'cctp',
    color: '#e84142',
    gradient: ['#ff5a5f', '#c31c23'],
    faucets: [
      { label: 'Avalanche Faucet', url: 'https://faucet.avax.network/', tokens: ['AVAX'] },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'] },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: optimismSepolia.id,
    key: 'optimismSepolia',
    name: 'OP Sepolia',
    short: 'OP Sepolia',
    viem: optimismSepolia,
    cctpDomain: 2,
    usdc: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    bridge: 'cctp',
    opStackParent: sepolia.id,
    color: '#ff0420',
    gradient: ['#ff4a5c', '#c40018'],
    faucets: [
      { label: 'Superchain Faucet', url: 'https://console.optimism.io/faucet', tokens: ['ETH'] },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'] },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: arbitrumSepolia.id,
    key: 'arbitrumSepolia',
    name: 'Arbitrum Sepolia',
    short: 'Arb Sepolia',
    viem: arbitrumSepolia,
    cctpDomain: 3,
    usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    bridge: 'cctp',
    color: '#28a0f0',
    gradient: ['#4dc3ff', '#0e6bb0'],
    faucets: [
      { label: 'Alchemy Arbitrum Sepolia', url: 'https://www.alchemy.com/faucets/arbitrum-sepolia', tokens: ['ETH'] },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'] },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: baseSepolia.id,
    key: 'baseSepolia',
    name: 'Base Sepolia',
    short: 'Base Sepolia',
    viem: baseSepolia,
    cctpDomain: 6,
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    uniswap: {
      quoter: '0xC5290058841028F1614F3A6F0F5816cAd0df5E27',
      router02: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4',
      factory: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
    },
    bridge: 'cctp',
    opStackParent: sepolia.id,
    color: '#0052ff',
    gradient: ['#3b82f6', '#0038b3'],
    faucets: [
      { label: 'Coinbase CDP Faucet', url: 'https://portal.cdp.coinbase.com/products/faucet', tokens: ['ETH'] },
      { label: 'Alchemy Base Sepolia', url: 'https://www.alchemy.com/faucets/base-sepolia', tokens: ['ETH'] },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'] },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: polygonAmoy.id,
    key: 'polygonAmoy',
    name: 'Polygon Amoy',
    short: 'Amoy',
    viem: polygonAmoy,
    cctpDomain: 7,
    usdc: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    bridge: 'cctp',
    color: '#8247e5',
    gradient: ['#a855f7', '#5b21b6'],
    faucets: [
      { label: 'Polygon Faucet', url: 'https://faucet.polygon.technology/', tokens: ['POL'], note: 'Bot-protected — open in a normal browser tab.' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'] },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: unichainSepolia.id,
    key: 'unichainSepolia',
    name: 'Unichain Sepolia',
    short: 'Unichain',
    viem: unichainSepolia,
    cctpDomain: 10,
    usdc: '0x31d0220469e10c4E71834a79b1f276d740d3768F',
    uniswap: {
      quoter: '0x6Dd37329A1A225a6Fca658265D460423DCafBF89',
      router02: '0xd1AAE39293221B77B0C71fBD6dCb7Ea29Bb5B166',
      factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    },
    bridge: 'cctp',
    opStackParent: sepolia.id,
    color: '#ff007a',
    gradient: ['#ff4d9d', '#c4005e'],
    faucets: [
      { label: 'Superchain Faucet', url: 'https://console.optimism.io/faucet', tokens: ['ETH'] },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'] },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: lineaSepolia.id,
    key: 'lineaSepolia',
    name: 'Linea Sepolia',
    short: 'Linea',
    viem: lineaSepolia,
    cctpDomain: 11,
    usdc: '0xFEce4462D57bD51A6A552365A011b95f0E16d9B7',
    bridge: 'cctp',
    color: '#61dfff',
    gradient: ['#7bf3ff', '#0e7490'],
    faucets: [
      { label: 'Linea docs', url: 'https://linea.build/', tokens: ['ETH'], note: 'The dedicated faucet host did not resolve during verification — open the docs for the current faucet.' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'] },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: codexTestnet.id,
    key: 'codexTestnet',
    name: 'Codex Testnet',
    short: 'Codex',
    viem: codexTestnet,
    cctpDomain: 12,
    usdc: '0x6d7f141b6819C2c9CC2f818e6ad549E7Ca090F8f',
    bridge: 'cctp',
    color: '#e7e3d4',
    gradient: ['#fef3c7', '#a1803f'],
    faucets: [
      { label: 'Codex explorer', url: 'https://explorer.codex-stg.xyz/', tokens: ['ETH'], note: 'Faucet entry point lives in the Codex explorer/docs.' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'] },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: worldchainSepolia.id,
    key: 'worldchainSepolia',
    name: 'World Chain Sepolia',
    short: 'World',
    viem: worldchainSepolia,
    cctpDomain: 14,
    usdc: '0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88',
    bridge: 'cctp',
    opStackParent: sepolia.id,
    color: '#d4d4d8',
    gradient: ['#e5e7eb', '#6b7280'],
    faucets: [
      { label: 'World Chain docs', url: 'https://docs.world.org/world-chain', tokens: ['ETH'], note: 'Faucet instructions live in the World Chain docs.' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'] },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: monadTestnet.id,
    key: 'monadTestnet',
    name: 'Monad Testnet',
    short: 'Monad',
    viem: monadTestnet,
    cctpDomain: 15,
    usdc: '0x534b2f3A21130d7a60830c2Df862319e593943A3',
    bridge: 'cctp',
    color: '#836ef9',
    gradient: ['#a78bfa', '#5b21b6'],
    faucets: [
      { label: 'Monad Faucet', url: 'https://testnet.monad.xyz/', tokens: ['MON'] },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'] },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: seiTestnet.id,
    key: 'seiTestnet',
    name: 'Sei Testnet',
    short: 'Sei',
    viem: seiTestnet,
    cctpDomain: 16,
    usdc: '0x4fCF1784B31630811181f670Aea7A7bEF803eaED',
    bridge: 'cctp',
    color: '#9e1f19',
    gradient: ['#ef4444', '#7f1d1d'],
    faucets: [
      { label: 'Sei docs', url: 'https://docs.sei.io/', tokens: ['SEI'], note: 'The atlantic-2 faucet host did not resolve during verification.' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'] },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: inkSepolia.id,
    key: 'inkSepolia',
    name: 'Ink Sepolia',
    short: 'Ink',
    viem: inkSepolia,
    cctpDomain: 21,
    usdc: '0xFabab97dCE620294D2B0b0e46C68964e326300Ac',
    bridge: 'cctp',
    opStackParent: sepolia.id,
    color: '#7c3aed',
    gradient: ['#a78bfa', '#4c1d95'],
    faucets: [
      { label: 'Ink Faucet', url: 'https://inkonchain.com/faucet', tokens: ['ETH'] },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'] },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: arcTestnet.id,
    key: 'arcTestnet',
    name: 'Arc Testnet',
    short: 'Arc',
    viem: arcTestnet,
    cctpDomain: 26,
    usdc: '0x3600000000000000000000000000000000000000',
    uniswap: {
      quoter: '0xf4DDb3683aa6c5dB41b1e42FF0E95700B9a407C5',
      router02: '0x60828cc42BB99a3D9981b25BA4F99eD6d87E7328',
      factory: '0xcF768f25dA5Ccc602b24eA33a28A0df3e3DdB152',
      kind: 'v1',
    },
    bridge: 'cctp',
    nativeIsUsdc: true,
    minGasPriceGwei: 20,
    color: '#2dd4bf',
    gradient: ['#5eead4', '#0f766e'],
    faucets: [
      { label: 'Arc Faucet', url: 'https://faucet.circle.com', tokens: ['USDC', 'EURC'] },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: injectiveTestnet.id,
    key: 'injectiveTestnet',
    name: 'Injective Testnet',
    short: 'Injective',
    viem: injectiveTestnet,
    cctpDomain: 29,
    usdc: '0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d',
    bridge: 'cctp',
    color: '#00a3ff',
    gradient: ['#38bdf8', '#0369a1'],
    faucets: [
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'] },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: plasmaTestnet.id,
    key: 'plasmaTestnet',
    name: 'Plasma Testnet',
    short: 'Plasma',
    viem: plasmaTestnet,
    cctpDomain: 33,
    usdc: '0xE67Fb267022cBA8064Dd388CC2FED724F3120D9D',
    bridge: 'cctp',
    color: '#00e5c0',
    gradient: ['#2dd4bf', '#047857'],
    faucets: [
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'] },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: xLayerTestnet.id,
    key: 'xLayerTestnet',
    name: 'X Layer Testnet',
    short: 'X Layer',
    viem: xLayerTestnet,
    cctpDomain: 37,
    usdc: '0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3',
    bridge: 'cctp',
    color: '#e2e8f0',
    gradient: ['#cbd5e1', '#475569'],
    faucets: [
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'] },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: giwaSepolia.id,
    key: 'giwaSepolia',
    name: 'GIWA Sepolia',
    short: 'GIWA',
    viem: giwaSepolia,
    bridge: 'opstack',
    opStackParent: sepolia.id,
    color: '#f472b6',
    gradient: ['#fb7185', '#9d174d'],
    faucets: [
      { label: 'GIWA Faucet Docs', url: 'https://docs.giwa.io/get-started/faucets', tokens: ['ETH'] },
      { label: 'Sepolia ETH (L1 gas)', url: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia', tokens: ['ETH'] },
    ],
    verifiedAt: VERIFIED,
  },
]

/** The single source of truth for what "testnet only" means. */
export const TESTNET_IDS: ReadonlySet<number> = new Set(CHAINS.map((c) => c.id))

const BY_ID = new Map<number, ChainCfg>(CHAINS.map((c) => [c.id, c]))
const BY_KEY = new Map<string, ChainCfg>(CHAINS.map((c) => [c.key, c]))

export function getChain(id?: number | null): ChainCfg | undefined {
  if (id == null) return undefined
  return BY_ID.get(id)
}

export function getChainByKey(key: string): ChainCfg | undefined {
  return BY_KEY.get(key)
}

export function mustChain(id: number): ChainCfg {
  const c = BY_ID.get(id)
  if (!c) throw new Error(`Chain ${id} is not on the testnet allowlist`)
  return c
}

export const CCTP_CHAINS = CHAINS.filter((c) => c.bridge === 'cctp' && c.cctpDomain != null && c.usdc)
export const SWAP_CHAINS = CHAINS.filter((c) => c.uniswap)
export const BRIDGEABLE_FROM = CCTP_CHAINS

/** viem chain objects for the wagmi config. Only allowlisted testnets. */
export const VIEM_CHAINS = CHAINS.map((c) => c.viem)

/** Native gas asset decimals. Arc reports USDC with 18 decimals natively (ERC-20 view = 6). */
export function nativeDecimals(chainId: number): number {
  const c = getChain(chainId)
  if (!c) return 18
  return c.nativeIsUsdc ? 18 : (c.viem.nativeCurrency.decimals ?? 18)
}

export function nativeSymbol(chainId: number): string {
  const c = getChain(chainId)
  if (!c) return 'ETH'
  return c.nativeIsUsdc ? 'USDC' : (c.viem.nativeCurrency.symbol ?? 'ETH')
}

export function explorerTx(chainId: number, hash: string): string {
  const c = getChain(chainId)
  const base = c?.viem.blockExplorers?.default?.url
  return base ? `${base}/tx/${hash}` : ''
}

export function explorerAddress(chainId: number, addr: string): string {
  const c = getChain(chainId)
  const base = c?.viem.blockExplorers?.default?.url
  return base ? `${base}/address/${addr}` : ''
}

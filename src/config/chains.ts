import { defineChain, type Chain } from 'viem'
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
  /** how access works */
  access?: 'free' | 'pow' | 'tasks' | 'account'
  /** verified cooldown, when the provider states one */
  cooldown?: string
  /** last time the link was checked */
  checked?: string
}

export interface UniswapDeployment {
  quoter: Address
  router02: Address
  factory: Address
  /** SwapRouter02 (no deadline, multicall) or the older SwapRouter (deadline, no multicall) */
  kind?: 'router02' | 'v1'
}

export interface ChainCfg {
  /** chain id, this is the hard testnet allowlist key */
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
  bridge: 'cctp' | 'opstack' | 'orbit' | 'none'
  /** OP Stack L1 parent chain id, enables canonical ETH deposits from that parent */
  opStackParent?: number
  /** true when the native gas asset IS USDC (Arc): 18-decimal native view, 6-decimal ERC-20 view */
  nativeIsUsdc?: boolean
  /** minimum maxFeePerGas in gwei that the chain's mempool accepts (Arc = 20) */
  minGasPriceGwei?: number
  /** why a capability is absent, shown instead of the generic reason */
  bridgeNote?: string
  color: string
  gradient: [string, string]
  faucets: FaucetLink[]
  verifiedAt: string
}

const VERIFIED = '2026-11-23'

// --- Arbitrum Orbit testnets (verified deployments, see src/config/orbit.ts) ---
const o_SXToronto = defineChain({
  id: 79479957,
  name: 'SX Toronto',
  nativeCurrency: { name: 'SX', symbol: 'SX', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc-rollup.toronto.sx.technology'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://explorerl2.toronto.sx.technology' } },
})
const o_Humanity = defineChain({
  id: 7080969,
  name: 'Humanity Testnet',
  nativeCurrency: { name: 'tHP', symbol: 'tHP', decimals: 18 },
  rpcUrls: { default: { http: ['https://humanity-testnet.g.alchemy.com/public'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://humanity-testnet.explorer.alchemy.com' } },
})
const o_Plume = defineChain({
  id: 98867,
  name: 'Plume Testnet',
  nativeCurrency: { name: 'PLUME', symbol: 'PLUME', decimals: 18 },
  rpcUrls: { default: { http: ['https://testnet-rpc.plume.org'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://testnet-explorer.plume.org' } },
})
const o_TRex = defineChain({
  id: 1962,
  name: 'T-Rex Testnet',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://testnetrpc.trex.xyz'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://testnet.trex.xyz' } },
})
const o_GalacticaCas = defineChain({
  id: 843843,
  name: 'Galactica Cassiopeia Testnet',
  nativeCurrency: { name: 'GNET', symbol: 'GNET', decimals: 18 },
  rpcUrls: { default: { http: ['https://galactica-cassiopeia.g.alchemy.com/public'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://galactica-cassiopeia.explorer.alchemy.com' } },
})
const o_HPPSepolia = defineChain({
  id: 181228,
  name: 'HPP Sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://sepolia.hpp.io'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://sepolia-explorer.hpp.io' } },
})
const o_JASMY = defineChain({
  id: 681,
  name: 'JASMY Chain Testnet',
  nativeCurrency: { name: 'JASMY', symbol: 'JASMY', decimals: 18 },
  rpcUrls: { default: { http: ['https://jasmy-chain-testnet.alt.technology'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://jasmy-chain-testnet-explorer.alt.technology' } },
})
const o_Mars = defineChain({
  id: 704852,
  name: 'Mars Chain Testnet',
  nativeCurrency: { name: 'MarsC', symbol: 'MarsC', decimals: 18 },
  rpcUrls: { default: { http: ['https://testnet-rpc.mars-chain.io'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://testnet-explorer.mars-chain.io' } },
})
const o_GenLayer = defineChain({
  id: 4221,
  name: 'GenLayer Chain Testnet',
  nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet-chain.genlayer.com'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://scan.testnet-chain.genlayer.com' } },
})
const o_WorldMobile = defineChain({
  id: 323432,
  name: 'WorldMobile Testnet',
  nativeCurrency: { name: 'WOMOX', symbol: 'WOMOX', decimals: 18 },
  rpcUrls: { default: { http: ['https://worldmobile-testnet.g.alchemy.com/public'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://testnet-explorer.worldmobile.net' } },
})
const o_Xai = defineChain({
  id: 37714555429,
  name: 'Xai Testnet',
  nativeCurrency: { name: 'sXAI', symbol: 'sXAI', decimals: 18 },
  rpcUrls: { default: { http: ['https://testnet-v2.xai-chain.net/rpc'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://testnet-explorer-v2.xai-chain.net' } },
})
const o_Edge = defineChain({
  id: 33431,
  name: 'Edge Testnet',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://edge-testnet.g.alchemy.com/public'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://edge-testnet.explorer.alchemy.com' } },
})

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
      { label: 'Google Web3 Faucet', url: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia', tokens: ['ETH'], access: 'account', cooldown: 'rate limit', checked: VERIFIED, note: '0.05 ETH. Needs a Google Account and about 0.001 ETH on mainnet; the drip limit depends on the network.' },
      { label: 'QuickNode Sepolia', url: 'https://faucet.quicknode.com/ethereum/sepolia', tokens: ['ETH'], access: 'free', cooldown: '12h', checked: VERIFIED, note: 'No QuickNode account, but the wallet needs a small mainnet balance. Optional X share doubles the drip.' },
      { label: 'Sepolia PoW Faucet', url: 'https://sepolia-faucet.pk910.de/', tokens: ['ETH'], access: 'pow', note: 'Mine in the browser to earn ETH. Slower, but no account and no daily cap.', checked: VERIFIED },
      { label: 'Alchemy Sepolia Faucet', url: 'https://www.alchemy.com/faucets/ethereum-sepolia', tokens: ['ETH'], access: 'free', cooldown: '24h', checked: VERIFIED, note: '0.1 ETH every 24h. No Alchemy account, but the wallet must meet eligibility rules (small mainnet balance).' },
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
      { label: 'Avalanche Builder Hub Faucet', url: 'https://build.avax.network/console/primary-network/faucet', tokens: ['AVAX'], access: 'account', cooldown: '2h', checked: VERIFIED, note: 'Up to 2 Fuji AVAX per day, one request every 2 hours. Needs a Builder Hub account, or mainnet AVAX balance for the no-coupon path.' },
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
    uniswap: {
      quoter: '0xC5290058841028F1614F3A6F0F5816cAd0df5E27',
      router02: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4',
      factory: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
    },
    bridge: 'cctp',
    opStackParent: sepolia.id,
    color: '#ff0420',
    gradient: ['#ff4a5c', '#c40018'],
    faucets: [
      { label: 'Superchain Faucet', url: 'https://console.optimism.io/faucet', tokens: ['ETH'], access: 'account', cooldown: '24h', checked: VERIFIED, note: 'Shown as under maintenance on 2026-11-23. Use the Alchemy OP Sepolia entry below.' },
      { label: 'Alchemy OP Sepolia', url: 'https://www.alchemy.com/faucets/optimism-sepolia', tokens: ['ETH'], access: 'account', cooldown: '24h', checked: VERIFIED },
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
      { label: 'Alchemy Arbitrum Sepolia', url: 'https://www.alchemy.com/faucets/arbitrum-sepolia', tokens: ['ETH'], access: 'account', cooldown: '24h', checked: VERIFIED },
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
      { label: 'Alchemy Base Sepolia', url: 'https://www.alchemy.com/faucets/base-sepolia', tokens: ['ETH'], access: 'account', cooldown: '24h', checked: VERIFIED },
      { label: 'QuickNode Base Sepolia', url: 'https://faucet.quicknode.com/base/sepolia', tokens: ['ETH'], access: 'account', cooldown: '12h', checked: VERIFIED },
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
      { label: 'Polygon Faucet', url: 'https://faucet.polygon.technology/', tokens: ['POL'], note: 'Bot-protected, open in a normal browser tab.' },
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
      { label: 'Superchain Faucet', url: 'https://console.optimism.io/faucet', tokens: ['ETH'], access: 'account', cooldown: '24h', checked: VERIFIED, note: 'Shown as under maintenance on 2026-11-23. Use the Alchemy Unichain Sepolia entry below.' },
      { label: 'Alchemy Unichain Sepolia', url: 'https://www.alchemy.com/faucets/unichain-sepolia', tokens: ['ETH'], access: 'free', cooldown: '24h', checked: VERIFIED, note: '0.1 ETH every 24h. No Alchemy account, but the wallet must meet eligibility rules.' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '2h', checked: VERIFIED },
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
      { label: 'MetaMask Developer Faucet (Linea)', url: 'https://developer.metamask.com/faucet/linea-sepolia', tokens: ['ETH'], access: 'account', cooldown: '24h', checked: VERIFIED, note: 'Linea docs state a 0.5 ETH daily maximum. Needs a MetaMask developer account.' },
      { label: 'QuickNode Linea Sepolia', url: 'https://faucet.quicknode.com/linea/sepolia', tokens: ['ETH'], access: 'free', cooldown: '12h', checked: VERIFIED, note: 'No account, but the wallet needs a small mainnet balance.' },
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
      { label: 'Codex explorer', url: 'https://explorer.codex-stg.xyz/', tokens: ['ETH'], note: 'No official Codex Testnet faucet was found. The explorer is linked so you can check gas and transactions; get Sepolia ETH and bridge if a route is ever listed.' },
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
      { label: 'Alchemy World Chain Sepolia', url: 'https://www.alchemy.com/faucets/world-chain-sepolia', tokens: ['ETH'], access: 'free', cooldown: '24h', checked: VERIFIED, note: '0.1 ETH every 24h. No account, but the wallet must meet eligibility rules (about 0.001 ETH mainnet).' },
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
      { label: 'Monad Faucet', url: 'https://faucet.monad.xyz/', tokens: ['MON'], access: 'free', cooldown: '24h', checked: VERIFIED, note: 'Up to 50 testnet MON every 24 hours.' },
      { label: 'Monad developer docs', url: 'https://testnet.monad.xyz/', tokens: ['MON'], note: 'Redirects to the Monad developer docs, kept as the fallback entry point.' },
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
      { label: 'Sei Faucet', url: 'https://docs.sei.io/learn/faucet', tokens: ['SEI'], access: 'account', cooldown: '24h', checked: VERIFIED, note: 'The official faucet page embeds a third-party widget; the amount is not published.' },
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
      { label: 'Ink Faucet', url: 'https://inkonchain.com/faucet', tokens: ['ETH'], access: 'account', cooldown: '24h', checked: VERIFIED, note: '0.01 ETH per request. Offers Alchemy, QuickNode and Superchain as providers.' },
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
    id: 46630,
    key: 'robinhoodTestnet',
    name: 'Robinhood Chain Testnet',
    short: 'Robinhood',
    viem: {
      id: 46630,
      name: 'Robinhood Chain Testnet',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: ['https://rpc.testnet.chain.robinhood.com'] } },
      blockExplorers: {
        default: { name: 'Robinhood Chain Testnet Explorer', url: 'https://explorer.testnet.chain.robinhood.com' },
      },
    } as unknown as Chain,
    bridge: 'orbit',
    bridgeNote:
      'No Circle CCTP route: TokenMessengerV2 and MessageTransmitterV2 exist at the canonical addresses (localDomain 35) but Circle does not document this chain, and several look-alike USDC tokens exist without a verifiably Circle-issued one. ETH deposits go through the Arbitrum Orbit inbox instead.',
    color: '#00c853',
    gradient: ['#00c853', '#00522d'],
    faucets: [
      { label: 'Robinhood Chain Faucet', url: 'https://faucet.testnet.chain.robinhood.com', tokens: ['ETH'], access: 'free', checked: VERIFIED, note: 'Official testnet faucet. Rate-limited for automated checks, so it may need a normal browser tab.' },
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
      { label: 'GIWA Faucet', url: 'https://faucet.giwa.io/', tokens: ['ETH'], access: 'free', cooldown: '24h', note: '0.005 ETH per claim. The host blocks automated checks, so open it in a normal tab.', checked: VERIFIED },
      { label: 'Nodit GIWA Faucet', url: 'https://faucet.lambda256.io/giwa-sepolia', tokens: ['ETH'], access: 'free', cooldown: '24h', note: '0.01 ETH per wallet every 24 hours. No account, but the page asks you to follow @NoditPlatform on X.', checked: VERIFIED },
      { label: 'Sepolia ETH for L1 gas', url: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia', tokens: ['ETH'], access: 'account', cooldown: '24h', checked: VERIFIED },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: o_SXToronto.id,
    key: 'o_SXToronto',
    name: 'SX Toronto',
    short: 'SXTO',
    viem: o_SXToronto,
    bridge: 'none',
    bridgeNote: 'Arbitrum Orbit testnet, but its native gas token is not ETH: the Orbit inbox is an ERC20Inbox that prices retryable tickets in that token, so a plain ETH deposit is not offered.',
    color: '#f59e0b',
    gradient: ['#f59e0b', '#0b1120'],
    faucets: [],
    verifiedAt: VERIFIED,
  },
  {
    id: o_Humanity.id,
    key: 'o_Humanity',
    name: 'Humanity Testnet',
    short: 'HUM',
    viem: o_Humanity,
    bridge: 'none',
    bridgeNote: 'Arbitrum Orbit testnet, but its native gas token is not ETH: the Orbit inbox is an ERC20Inbox that prices retryable tickets in that token, so a plain ETH deposit is not offered.',
    color: '#38bdf8',
    gradient: ['#38bdf8', '#0b1120'],
    faucets: [],
    verifiedAt: VERIFIED,
  },
  {
    id: o_Plume.id,
    key: 'o_Plume',
    name: 'Plume Testnet',
    short: 'PLUME',
    viem: o_Plume,
    bridge: 'none',
    bridgeNote: 'Arbitrum Orbit testnet, but its native gas token is not ETH: the Orbit inbox is an ERC20Inbox that prices retryable tickets in that token, so a plain ETH deposit is not offered.',
    color: '#a78bfa',
    gradient: ['#a78bfa', '#0b1120'],
    faucets: [],
    verifiedAt: VERIFIED,
  },
  {
    id: o_TRex.id,
    key: 'o_TRex',
    name: 'T-Rex Testnet',
    short: 'TREX',
    viem: o_TRex,
    bridge: 'orbit',
    color: '#fb7185',
    gradient: ['#fb7185', '#0b1120'],
    faucets: [],
    verifiedAt: VERIFIED,
  },
  {
    id: o_GalacticaCas.id,
    key: 'o_GalacticaCas',
    name: 'Galactica Cassiopeia Testnet',
    short: 'GAL',
    viem: o_GalacticaCas,
    bridge: 'none',
    bridgeNote: 'Arbitrum Orbit testnet, but its native gas token is not ETH: the Orbit inbox is an ERC20Inbox that prices retryable tickets in that token, so a plain ETH deposit is not offered.',
    color: '#34d399',
    gradient: ['#34d399', '#0b1120'],
    faucets: [],
    verifiedAt: VERIFIED,
  },
  {
    id: o_HPPSepolia.id,
    key: 'o_HPPSepolia',
    name: 'HPP Sepolia',
    short: 'HPP',
    viem: o_HPPSepolia,
    bridge: 'orbit',
    color: '#fbbf24',
    gradient: ['#fbbf24', '#0b1120'],
    faucets: [],
    verifiedAt: VERIFIED,
  },
  {
    id: o_JASMY.id,
    key: 'o_JASMY',
    name: 'JASMY Chain Testnet',
    short: 'JAS',
    viem: o_JASMY,
    bridge: 'none',
    bridgeNote: 'Arbitrum Orbit testnet, but its native gas token is not ETH: the Orbit inbox is an ERC20Inbox that prices retryable tickets in that token, so a plain ETH deposit is not offered.',
    color: '#818cf8',
    gradient: ['#818cf8', '#0b1120'],
    faucets: [],
    verifiedAt: VERIFIED,
  },
  {
    id: o_Mars.id,
    key: 'o_Mars',
    name: 'Mars Chain Testnet',
    short: 'MARS',
    viem: o_Mars,
    bridge: 'none',
    bridgeNote: 'Arbitrum Orbit testnet, but its native gas token is not ETH: the Orbit inbox is an ERC20Inbox that prices retryable tickets in that token, so a plain ETH deposit is not offered.',
    color: '#f97316',
    gradient: ['#f97316', '#0b1120'],
    faucets: [],
    verifiedAt: VERIFIED,
  },
  {
    id: o_GenLayer.id,
    key: 'o_GenLayer',
    name: 'GenLayer Chain Testnet',
    short: 'GEN',
    viem: o_GenLayer,
    bridge: 'none',
    bridgeNote: 'Arbitrum Orbit testnet, but its native gas token is not ETH: the Orbit inbox is an ERC20Inbox that prices retryable tickets in that token, so a plain ETH deposit is not offered.',
    color: '#22d3ee',
    gradient: ['#22d3ee', '#0b1120'],
    faucets: [],
    verifiedAt: VERIFIED,
  },
  {
    id: o_WorldMobile.id,
    key: 'o_WorldMobile',
    name: 'WorldMobile Testnet',
    short: 'WOM',
    viem: o_WorldMobile,
    bridge: 'none',
    bridgeNote: 'Arbitrum Orbit testnet, but its native gas token is not ETH: the Orbit inbox is an ERC20Inbox that prices retryable tickets in that token, so a plain ETH deposit is not offered.',
    color: '#e879f9',
    gradient: ['#e879f9', '#0b1120'],
    faucets: [],
    verifiedAt: VERIFIED,
  },
  {
    id: o_Xai.id,
    key: 'o_Xai',
    name: 'Xai Testnet',
    short: 'XAI',
    viem: o_Xai,
    bridge: 'none',
    bridgeNote: 'Arbitrum Orbit testnet, but its native gas token is not ETH: the Orbit inbox is an ERC20Inbox that prices retryable tickets in that token, so a plain ETH deposit is not offered.',
    color: '#4ade80',
    gradient: ['#4ade80', '#0b1120'],
    faucets: [],
    verifiedAt: VERIFIED,
  },
  {
    id: o_Edge.id,
    key: 'o_Edge',
    name: 'Edge Testnet',
    short: 'EDGE',
    viem: o_Edge,
    bridge: 'orbit',
    color: '#f43f5e',
    gradient: ['#f43f5e', '#0b1120'],
    faucets: [],
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

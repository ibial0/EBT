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
  abstractTestnet,
  berachainBepolia,
  bscTestnet,
  bobSepolia,
  celoSepolia,
  creditCoin3Testnet,
  cronosTestnet,
  gnosisChiado,
  hederaTestnet,
  hoodi,
  hyperliquidEvmTestnet,
  jovaySepolia,
  kairos,
  liskSepolia,
  mantleSepoliaTestnet,
  megaethTestnet,
  metisSepolia,
  modeTestnet,
  neoxT4,
  opBNBTestnet,
  saigon,
  shibariumTestnet,
  soneiumMinato,
  tacSPB,
  tempoModerato,
  wemixTestnet,
  xdcTestnet,
  zkSyncSepoliaTestnet,
  zoraSepolia,
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
  /** amount dispensed per claim, e.g. "0.05 ETH", "0.5 AVAX" */
  amount?: string
  /** last time the link was checked */
  checked?: string
  /** faucet source classification: official chain/Circle portal, ecosystem infra (e.g. Chainlink), third-party, or Discord */
  sourceType?: 'official' | 'ecosystem' | 'third-party' | 'discord'
  /** verification state without claiming tokens (verified live, untested behind gate/login, upstream maintenance, or unavailable) */
  verification?: 'verified' | 'untested' | 'maintenance' | 'unavailable'
  /** structured requirement bullets shown inside the Requirements panel */
  requirements?: string[]
  /**
   * Set when a token has no faucet we could verify. The entry renders as a warning row with
   * no link, so the page never sends anyone to a URL that does not exist.
   */
  missing?: string
  /**
   * Set when a faucet was previously active but is now deprecated/inactive.
   * Renders with a strikethrough and "inactive" badge instead of being removed.
   */
  inactive?: boolean
}

export interface UniswapDeployment {
  quoter: Address
  router02: Address
  factory: Address
  /** SwapRouter02 (no deadline, multicall) or the older SwapRouter (deadline, no multicall) */
  kind?: 'router02' | 'v1'
  /** custom fee tiers when the DEX deviates from standard Uniswap v3 (e.g. Pancake V3 2500, SaucerSwap V2 1500) */
  feeTiers?: readonly number[]
}

/** Uniswap V2-style AMM (DragonSwap, TraderJoe, SushiSwap, etc.) */
export interface DexV2Deployment {
  name: string
  router: Address
  factory: Address
  /** Wrapped native token (WSEI, WAVAX, WETH, etc.) */
  wrappedNative: Address
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
  /** Uniswap V2-style AMM for chains that do not have a V3 deployment */
  dexV2?: DexV2Deployment[]
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

const e_AB = defineChain({
  id: 26888,
  name: 'AB Testnet',
  nativeCurrency: { name: 'AB', symbol: 'AB', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.core.testnet.ab.org'] } },
  blockExplorers: { default: { name: 'AB Explorer', url: 'https://explorer.core.testnet.ab.org' } },
  testnet: true,
})
const e_ADI = defineChain({
  id: 99999,
  name: 'ADI Testnet',
  nativeCurrency: { name: 'ADI', symbol: 'ADI', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.ab.testnet.adifoundation.ai/'] } },
  blockExplorers: { default: { name: 'ADI Explorer', url: 'https://explorer.ab.testnet.adifoundation.ai' } },
  testnet: true,
})
const e_AstarShibuya = defineChain({
  id: 81,
  name: 'Astar Shibuya Testnet',
  nativeCurrency: { name: 'Shibuya', symbol: 'SBY', decimals: 18 },
  rpcUrls: { default: { http: ['https://evm.shibuya.astar.network'] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://shibuya.blockscout.com' } },
  testnet: true,
})
const e_CoreTestnet2 = defineChain({
  id: 1114,
  name: 'Core Testnet',
  nativeCurrency: { name: 'tCORE2', symbol: 'tCORE2', decimals: 18 },
  rpcUrls: { default: { http: ['https://core-testnet.drpc.org'] } },
  blockExplorers: { default: { name: 'Core Scan', url: 'https://scan.test2.btcs.network' } },
  testnet: true,
})
const e_CronosZkEvm = defineChain({
  id: 240,
  name: 'Cronos zkEVM Testnet',
  nativeCurrency: { name: 'zkCRO', symbol: 'zkCRO', decimals: 18 },
  rpcUrls: { default: { http: ['https://cronos-zkevm-testnet.drpc.org'] } },
  blockExplorers: { default: { name: 'Cronos zkEVM Explorer', url: 'https://explorer.zkevm.cronos.org/testnet' } },
  testnet: true,
})
const e_DogeOS = defineChain({
  id: 6281971,
  name: 'DogeOS Chikyu Testnet',
  nativeCurrency: { name: 'Dogecoin', symbol: 'DOGE', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.dogeos.com'] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://blockscout.testnet.dogeos.com' } },
  testnet: true,
})
const e_Gravity = defineChain({
  id: 7771625,
  name: 'Gravity Longevity Testnet',
  nativeCurrency: { name: 'Gravity', symbol: 'G', decimals: 18 },
  rpcUrls: { default: { http: ['https://testnet-rpc.gravity.xyz'] } },
  blockExplorers: { default: { name: 'Gravity Explorer', url: 'https://explorer-testnet.gravity.xyz' } },
  testnet: true,
})
const e_Metal = defineChain({
  id: 1740,
  name: 'Metal Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://testnet.rpc.metall2.com'] } },
  blockExplorers: { default: { name: 'Metal L2 Explorer', url: 'https://testnet.explorer.metall2.com' } },
  contracts: {
    portal: { 11155111: { address: '0x01D4dfC994878682811b2980653D03E589f093cB' } },
  },
  testnet: true,
})
const e_MorphHoodi = defineChain({
  id: 2910,
  name: 'Morph Hoodi Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc-hoodi.morphl2.io'] } },
  blockExplorers: { default: { name: 'Morph Hoodi Explorer', url: 'https://explorer-hoodi.morphl2.io' } },
  testnet: true,
})
const e_Mova = defineChain({
  id: 10323,
  name: 'Mova Testnet',
  nativeCurrency: { name: 'MOVA', symbol: 'MOVA', decimals: 18 },
  rpcUrls: { default: { http: ['https://mars.rpc.movachain.com'] } },
  blockExplorers: { default: { name: 'Mova Scan', url: 'https://scan.mars.movachain.com' } },
  testnet: true,
})
const e_PharosAtlantic = defineChain({
  id: 688689,
  name: 'Pharos Atlantic Testnet',
  nativeCurrency: { name: 'Pharos', symbol: 'PHRS', decimals: 18 },
  rpcUrls: { default: { http: ['https://atlantic.dplabs-internal.com'] } },
  blockExplorers: { default: { name: 'Pharos Scan', url: 'https://atlantic.pharosscan.xyz' } },
  testnet: true,
})

const withCorsRpc = (c: Chain, url: string): Chain => ({
  ...c,
  rpcUrls: { ...c.rpcUrls, default: { http: [url] } },
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
      { label: 'Google Cloud Web3 Faucet', url: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia', tokens: ['ETH'], access: 'account', cooldown: '24h', amount: '0.05 ETH', checked: VERIFIED, note: '0.05 ETH per day. Requires a Google Account. Wallet must have at least 0.001 ETH on Ethereum mainnet.' },
      { label: 'QuickNode Sepolia Faucet', url: 'https://faucet.quicknode.com/ethereum/sepolia', tokens: ['ETH'], access: 'free', cooldown: '12h', amount: '0.05 ETH', checked: VERIFIED, note: 'No QuickNode account required. Wallet must have a small Ethereum mainnet balance. Sharing on X doubles the drip to 0.1 ETH.' },
      { label: 'Sepolia PoW Faucet', url: 'https://sepolia-faucet.pk910.de/', tokens: ['ETH'], access: 'pow', amount: 'variable', checked: VERIFIED, note: 'Mine ETH directly in your browser using proof-of-work. No account required, no daily cap. Slower but always available.' },
      { label: 'Alchemy Sepolia Faucet', url: 'https://www.alchemy.com/faucets/ethereum-sepolia', tokens: ['ETH'], access: 'free', cooldown: '24h', amount: '0.1 ETH', checked: VERIFIED, note: '0.1 ETH every 24h. No Alchemy account needed. Wallet must have a small Ethereum mainnet balance to be eligible.' },
      { label: 'Chainlink Faucet', url: 'https://faucets.chain.link/sepolia', tokens: ['ETH', 'LINK'], access: 'account', cooldown: '24h', amount: '0.5 ETH + LINK', checked: VERIFIED, note: 'Up to 0.5 ETH plus testnet LINK per day. Connect wallet via MetaMask or WalletConnect. No mainnet balance required.' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '2h', amount: '20 USDC', checked: VERIFIED, note: '20 USDC per claim (per network). No account required, rate-limited every 2h per network.' },
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
    dexV2: [
      {
        /** TraderJoe V1 — Uniswap V2 fork. Verified on-chain 2026-11-25. */
        name: 'TraderJoe V1',
        router: '0xd7f655E3376cE2D7A2b08fF01Eb3B1023191A901',
        factory: '0xF5c7d9733e5f53abCC1695820c4818C59B457C2C',
        wrappedNative: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c',
      },
      {
        /** SushiSwap V2 — additional liquidity source on Fuji. */
        name: 'SushiSwap V2',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
        wrappedNative: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c',
      },
    ],
    bridge: 'cctp',
    color: '#e84142',
    gradient: ['#ff5a5f', '#c31c23'],
    faucets: [
      { label: 'Avalanche Builder Hub Faucet', url: 'https://build.avax.network/console/primary-network/faucet', tokens: ['AVAX'], access: 'account', cooldown: '2h', amount: '2 AVAX/day', checked: VERIFIED, note: 'Up to 2 Fuji AVAX per day, one request every 2h. Requires a free Builder Hub account. Mainnet AVAX balance removes the coupon requirement.' },
      { label: 'QuickNode Avalanche Fuji Faucet', url: 'https://faucet.quicknode.com/avalanche/fuji', tokens: ['AVAX'], access: 'account', cooldown: '12h', checked: VERIFIED, note: 'QuickNode account required. Wallet must have a small mainnet balance.' },
      { label: 'Chainlink Faucet (Fuji)', url: 'https://faucets.chain.link/fuji', tokens: ['AVAX', 'LINK'], access: 'account', cooldown: '24h', amount: '25 LINK + AVAX', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing LINK + native AVAX on Avalanche Fuji.' },
      { label: 'Circle USDC & EURC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC', 'EURC'], access: 'free', cooldown: '1h', amount: '20 USDC/EURC', sourceType: 'official', verification: 'untested', requirements: ['No account required', '1h cooldown per network'], checked: '2026-11-26', note: '20 USDC or EURC per claim on Avalanche Fuji (AVAX enabled in Circle Faucet).' },
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
      { label: 'Superchain Faucet', url: 'https://console.optimism.io/faucet', tokens: ['ETH'], access: 'account', cooldown: '24h', amount: '0.05 ETH', checked: VERIFIED, note: '0.05 ETH per request. Supports OP Sepolia, Base, Unichain, Ink, Worldchain and more. Requires GitHub login or Optimist NFT.' },
      { label: 'Alchemy OP Sepolia Faucet', url: 'https://www.alchemy.com/faucets/optimism-sepolia', tokens: ['ETH'], access: 'account', cooldown: '24h', amount: '0.1 ETH', checked: VERIFIED, note: '0.1 ETH per 24h. Free Alchemy account required.' },
      { label: 'QuickNode OP Sepolia Faucet', url: 'https://faucet.quicknode.com/optimism/sepolia', tokens: ['ETH'], access: 'account', cooldown: '12h', checked: VERIFIED, note: 'QuickNode account required.' },
      { label: 'Chainlink Faucet (OP)', url: 'https://faucets.chain.link/optimism-sepolia', tokens: ['ETH', 'LINK'], access: 'account', cooldown: '24h', checked: VERIFIED, note: 'ETH + testnet LINK on OP Sepolia. Connect wallet via MetaMask.' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '2h', amount: '20 USDC', checked: VERIFIED, note: '20 USDC per claim (per network). No account required, rate-limited every 2h per network.' },
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
    uniswap: {
      quoter: '0x2779a0CC1c3e0E44D2542EC3e79e3864Ae93Ef0B',
      router02: '0x101F443B4d1b059569D643917553c771E1b9663E',
      factory: '0x248AB79Bbb9bC29bB72f7Cd42F17e054Fc40188e',
    },
    bridge: 'cctp',
    color: '#28a0f0',
    gradient: ['#4dc3ff', '#0e6bb0'],
    faucets: [
      { label: 'Alchemy Arbitrum Sepolia Faucet', url: 'https://www.alchemy.com/faucets/arbitrum-sepolia', tokens: ['ETH'], access: 'account', cooldown: '24h', amount: '0.1 ETH', checked: VERIFIED, note: '0.1 ETH per 24h. Free Alchemy account required.' },
      { label: 'QuickNode Arbitrum Sepolia Faucet', url: 'https://faucet.quicknode.com/arbitrum/sepolia', tokens: ['ETH'], access: 'account', cooldown: '12h', checked: VERIFIED, note: 'QuickNode account required.' },
      { label: 'Chainlink Faucet (Arbitrum)', url: 'https://faucets.chain.link/arbitrum-sepolia', tokens: ['ETH', 'LINK'], access: 'account', cooldown: '24h', checked: VERIFIED, note: 'ETH + testnet LINK on Arbitrum Sepolia. Connect wallet via MetaMask.' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '2h', amount: '20 USDC', checked: VERIFIED, note: '20 USDC per claim (per network). No account required, rate-limited every 2h per network.' },
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
      { label: 'Coinbase CDP Faucet', url: 'https://portal.cdp.coinbase.com/products/faucet', tokens: ['ETH'], access: 'account', cooldown: '24h', amount: '0.1 ETH', checked: VERIFIED, note: '0.1 ETH per day. Free Coinbase Developer Platform account required.' },
      { label: 'Alchemy Base Sepolia Faucet', url: 'https://www.alchemy.com/faucets/base-sepolia', tokens: ['ETH'], access: 'account', cooldown: '24h', amount: '0.1 ETH', checked: VERIFIED, note: '0.1 ETH per 24h. Free Alchemy account required.' },
      { label: 'QuickNode Base Sepolia Faucet', url: 'https://faucet.quicknode.com/base/sepolia', tokens: ['ETH'], access: 'account', cooldown: '12h', amount: '0.025 ETH', checked: VERIFIED, note: '0.025 ETH per 12h. Free QuickNode account required.' },
      { label: 'Superchain Faucet (Base)', url: 'https://console.optimism.io/faucet', tokens: ['ETH'], access: 'account', cooldown: '24h', amount: '0.05 ETH', checked: VERIFIED, note: '0.05 ETH. Supports Base Sepolia, OP Sepolia, and all OP Stack chains. GitHub login or Optimist NFT.' },
      { label: 'Chainlink Faucet (Base)', url: 'https://faucets.chain.link/base-sepolia', tokens: ['ETH', 'LINK'], access: 'account', cooldown: '24h', checked: VERIFIED, note: 'ETH + testnet LINK on Base Sepolia. Connect wallet via MetaMask.' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '2h', amount: '20 USDC', checked: VERIFIED, note: '20 USDC per claim (per network). No account required, rate-limited every 2h per network.' },
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
      { label: 'Polygon Faucet', url: 'https://faucet.polygon.technology/', tokens: ['POL'], access: 'free', cooldown: '24h', amount: '0.5 POL', checked: VERIFIED, note: '0.5 POL per claim. Bot-protected � open in a normal browser tab.' },
      { label: 'Alchemy Polygon Amoy Faucet', url: 'https://www.alchemy.com/faucets/polygon-amoy', tokens: ['POL'], access: 'account', cooldown: '24h', amount: '0.5 POL', checked: VERIFIED, note: '0.5 POL per 24h. Free Alchemy account required.' },
      { label: 'QuickNode Polygon Amoy Faucet', url: 'https://faucet.quicknode.com/polygon/amoy', tokens: ['POL'], access: 'account', cooldown: '12h', checked: VERIFIED, note: 'QuickNode account required.' },
      { label: 'Chainlink Faucet (Amoy)', url: 'https://faucets.chain.link/polygon-amoy', tokens: ['POL', 'LINK'], access: 'account', cooldown: '24h', checked: VERIFIED, note: 'POL + testnet LINK on Polygon Amoy. Connect wallet via MetaMask.' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '2h', amount: '20 USDC', checked: VERIFIED, note: '20 USDC per claim (per network). No account required, rate-limited every 2h per network.' },
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
      { label: 'Superchain Faucet', url: 'https://console.optimism.io/faucet', tokens: ['ETH'], access: 'account', cooldown: '24h', amount: '0.05 ETH', checked: VERIFIED, note: '0.05 ETH per request. Supports Unichain, OP Sepolia, Base, Ink, Worldchain and more. GitHub login or Optimist NFT required.' },
      { label: 'Alchemy Unichain Sepolia Faucet', url: 'https://www.alchemy.com/faucets/unichain-sepolia', tokens: ['ETH'], access: 'free', cooldown: '24h', amount: '0.1 ETH', checked: VERIFIED, note: '0.1 ETH every 24h. No Alchemy account needed. Wallet must meet eligibility rules (small mainnet balance).' },
      { label: 'QuickNode Unichain Faucet', url: 'https://faucet.quicknode.com/unichain/sepolia', tokens: ['ETH'], access: 'account', cooldown: '12h', sourceType: 'third-party', verification: 'untested', requirements: ['Free QuickNode account', 'Small mainnet balance check'], checked: '2026-11-26', note: 'QuickNode Unichain Sepolia ETH faucet.' },
      { label: 'Chainlink Faucet (Unichain)', url: 'https://faucets.chain.link/unichain-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Unichain Sepolia (1301).' },
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
      { label: 'MetaMask Developer Faucet', url: 'https://developer.metamask.com/faucet/linea-sepolia', tokens: ['ETH'], access: 'account', cooldown: '24h', amount: '0.5 ETH', checked: VERIFIED, note: 'Up to 0.5 ETH per day. Requires a free MetaMask developer account.' },
      { label: 'QuickNode Linea Sepolia Faucet', url: 'https://faucet.quicknode.com/linea/sepolia', tokens: ['ETH'], access: 'free', cooldown: '12h', amount: '0.05 ETH', checked: VERIFIED, note: '0.05 ETH per 12h. No account required but wallet needs a small mainnet balance.' },
      { label: 'Chainlink Faucet (Linea)', url: 'https://faucets.chain.link/linea-sepolia', tokens: ['ETH', 'LINK'], access: 'account', cooldown: '24h', amount: '0.5 ETH + 25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing native ETH + LINK on Linea Sepolia (59141).' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '2h', amount: '20 USDC', checked: VERIFIED, note: '20 USDC per claim (per network). No account required, rate-limited every 2h per network.' },
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
    opStackParent: 11155111,
    usdc: '0x6d7f141b6819C2c9CC2f818e6ad549E7Ca090F8f',
    bridge: 'cctp',
    color: '#e7e3d4',
    gradient: ['#fef3c7', '#a1803f'],
    faucets: [
      { label: 'Codex Testnet ETH Faucet', url: 'https://faucet-eth.testnet.codex.storage', tokens: ['ETH'], access: 'free', checked: VERIFIED, note: 'Official Codex testnet ETH faucet. No account required. Open in a normal browser tab.' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '2h', amount: '20 USDC', checked: VERIFIED, note: '20 USDC per claim (per network). No account required, rate-limited every 2h per network.' },
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
      { label: 'Alchemy World Chain Faucet', url: 'https://www.alchemy.com/faucets/world-chain-sepolia', tokens: ['ETH'], access: 'free', cooldown: '24h', amount: '0.1 ETH', checked: VERIFIED, note: '0.1 ETH every 24h. No account required. Wallet must have ~0.001 ETH on Ethereum mainnet.' },
      { label: 'Superchain Faucet (World)', url: 'https://console.optimism.io/faucet', tokens: ['ETH'], access: 'account', cooldown: '24h', amount: '0.05 ETH', checked: VERIFIED, note: '0.05 ETH. Covers World Chain Sepolia and all OP Stack chains. GitHub login or Optimist NFT required.' },
      { label: 'Chainlink Faucet (World Chain)', url: 'https://faucets.chain.link/worldchain-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on World Chain Sepolia (4801).' },
      { label: 'Circle USDC & EURC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC', 'EURC'], access: 'free', cooldown: '1h', amount: '20 USDC/EURC', sourceType: 'official', verification: 'untested', checked: '2026-11-26', note: '20 USDC or EURC per claim on World Chain Sepolia.' },
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
      { label: 'Monad Faucet', url: 'https://faucet.monad.xyz/', tokens: ['MON'], access: 'free', cooldown: '24h', amount: '50 MON', checked: VERIFIED, note: 'Up to 50 MON per 24h. No account required. Connecting X (Twitter) or Discord may increase the drip amount.' },
      { label: 'Alchemy Monad Testnet Faucet', url: 'https://www.alchemy.com/faucets/monad-testnet', tokens: ['MON'], access: 'account', cooldown: '24h', sourceType: 'third-party', verification: 'untested', requirements: ['Free Alchemy account', 'Small mainnet balance check'], checked: '2026-11-26', note: 'Alchemy Monad Testnet MON faucet.' },
      { label: 'QuickNode Monad Testnet Faucet', url: 'https://faucet.quicknode.com/monad/testnet', tokens: ['MON'], access: 'account', cooldown: '12h', sourceType: 'third-party', verification: 'untested', requirements: ['Free QuickNode account'], checked: '2026-11-26', note: 'QuickNode Monad Testnet MON faucet.' },
      { label: 'Chainlink Faucet (Monad)', url: 'https://faucets.chain.link/monad-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Monad Testnet (10143).' },
      { label: 'Monad Testnet Portal', url: 'https://testnet.monad.xyz/', tokens: ['MON'], access: 'free', note: 'Official Monad testnet portal. May redirect to developer docs.' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '2h', amount: '20 USDC', checked: VERIFIED, note: '20 USDC per claim (per network). No account required, rate-limited every 2h per network.' },
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
    dexV2: [
      {
        /** DragonSwap V2 — Uniswap V2 fork. Factory + router verified on-chain 2026-11-25. */
        name: 'DragonSwap V2',
        router: '0x527b42CA5e11370259EcaE68561C14dA415477C8',
        factory: '0xeE6Ad607238f8d2C63767245d78520F06c303D31',
        wrappedNative: '0xF8EB55EC97B59d91fe9E91A1d61147e0d2A7b6F7',
      },
    ],
    bridge: 'cctp',
    color: '#9e1f19',
    gradient: ['#ef4444', '#7f1d1d'],
    faucets: [
      { label: 'Sei Official Faucet', url: 'https://docs.sei.io/learn/faucet', tokens: ['SEI'], access: 'account', cooldown: '24h', checked: VERIFIED, note: 'Official Sei faucet page. Embeds a third-party widget; exact amount not published. Account required.' },
      { label: 'All That Node Sei Faucet', url: 'https://www.allthatnode.com/faucet/sei.dsrv', tokens: ['SEI'], access: 'free', cooldown: '24h', checked: VERIFIED, note: 'Free testnet SEI from DSRV All That Node. No account required.' },
      { label: 'QuickNode Sei Faucet', url: 'https://faucet.quicknode.com/sei/testnet', tokens: ['SEI'], access: 'free', cooldown: '12h', checked: VERIFIED, note: 'QuickNode multi-chain faucet for Sei Testnet. Wallet needs small mainnet ETH balance.' },
      { label: 'Chainlink Faucet (Sei)', url: 'https://faucets.chain.link/sei-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Sei Testnet (1328).' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '2h', amount: '20 USDC', checked: VERIFIED, note: '20 USDC per claim (per network). No account required, rate-limited every 2h per network.' },
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
      { label: 'Ink Official Faucet', url: 'https://inkonchain.com/faucet', tokens: ['ETH'], access: 'account', cooldown: '24h', amount: '0.01 ETH', checked: VERIFIED, note: '0.01 ETH per request. Provides Alchemy, QuickNode and Superchain as backend providers.' },
      { label: 'Alchemy Ink Sepolia Faucet', url: 'https://www.alchemy.com/faucets/ink-sepolia', tokens: ['ETH'], access: 'account', cooldown: '24h', sourceType: 'third-party', verification: 'untested', requirements: ['Free Alchemy account', 'Small mainnet balance check'], checked: '2026-11-26', note: 'Alchemy Ink Sepolia ETH faucet.' },
      { label: 'Circle USDC & EURC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC', 'EURC'], access: 'free', cooldown: '1h', amount: '20 USDC/EURC', sourceType: 'official', verification: 'untested', checked: '2026-11-26', note: '20 USDC or EURC per claim on Ink Sepolia.' },
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
      /** Synthra V3 on Arc Testnet (QuoterV2 + SwapRouter02). Verified live on-chain 2026-11-26. */
      quoter: '0x3Ce954107b1A675826B33bF23060Dd655e3758fE',
      router02: '0xA545bCB1Bd7985c59ea162aB1748A0803434C31b',
      factory: '0x0fB6EEDA6e90E90797083861A75D15752a27f59c',
    },
    bridge: 'cctp',
    nativeIsUsdc: true,
    minGasPriceGwei: 20,
    color: '#2dd4bf',
    gradient: ['#5eead4', '#0f766e'],
    faucets: [
      { label: 'Circle Arc Faucet (USDC/EURC)', url: 'https://faucet.circle.com', tokens: ['USDC', 'EURC'], access: 'free', cooldown: '1h', amount: '20 USDC/EURC', checked: VERIFIED, note: 'USDC is the native gas token on Arc. Use Circle faucet to claim testnet USDC and EURC. Select Arc Testnet from the network list.' },
      { label: 'Chainlink Faucet (Arc)', url: 'https://faucets.chain.link/arc-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Arc Testnet (5042002).' },
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
      { label: 'Injective Testnet Faucet', url: 'https://testnet.faucet.injective.network', tokens: ['INJ'], access: 'free', checked: VERIFIED, note: 'Official Injective testnet faucet. Drips testnet INJ for gas. No account required, bot-protected.' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '2h', amount: '20 USDC', checked: VERIFIED, note: '20 USDC per claim (per network). No account required, rate-limited every 2h per network.' },
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
      { label: 'QuickNode Plasma Faucet', url: 'https://faucet.quicknode.com/plasma/testnet', tokens: ['XPL'], access: 'account', cooldown: '12h', checked: VERIFIED, note: 'Testnet XPL (native gas token) via QuickNode. Free QuickNode account required.' },
      { label: 'Chainlink Faucet (Plasma)', url: 'https://faucets.chain.link/plasma-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Plasma Testnet (9746).' },
      { label: 'Circle USDC & EURC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC', 'EURC'], access: 'free', cooldown: '1h', amount: '20 USDC/EURC', sourceType: 'official', verification: 'untested', checked: '2026-11-26', note: '20 USDC or EURC per claim on Plasma Testnet.' },
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
      { label: 'OKX Wallet Testnet Faucet', url: 'https://www.okx.com/web3/build/faucet', tokens: ['OKB'], access: 'account', cooldown: '24h', checked: VERIFIED, note: 'Testnet OKB via OKX Wallet. Open OKX Wallet, switch to X Layer Testnet, and use the built-in Testnet Faucet Center.' },
      { label: 'Chainlink Faucet (X Layer)', url: 'https://faucets.chain.link/xlayer-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on X Layer Testnet (1952).' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '2h', amount: '20 USDC', checked: VERIFIED, note: '20 USDC per claim (per network). No account required, rate-limited every 2h per network.' },
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
    uniswap: {
      /** Synthra V3 (Uniswap V3 fork, identical ABI). Verified on-chain 2026-11-25. */
      quoter: '0x231606c321A99DE81e28fE48B07a93F1ba49e713',
      router02: '0x3Ce954107b1A675826B33bF23060Dd655e3758fE',
      factory: '0x911b4000D3422F482F4062a913885f7b035382Df',
    },
    bridge: 'orbit',
    bridgeNote:
      'No Circle CCTP route: TokenMessengerV2 and MessageTransmitterV2 exist at the canonical addresses (localDomain 35) but Circle does not document this chain, and several look-alike USDC tokens exist without a verifiably Circle-issued one. ETH deposits go through the Arbitrum Orbit inbox instead.',
    color: '#00c853',
    gradient: ['#00c853', '#00522d'],
    faucets: [
      { label: 'Robinhood Chain Faucet', url: 'https://faucet.testnet.chain.robinhood.com', tokens: ['ETH'], access: 'free', checked: VERIFIED, note: 'Official Robinhood testnet faucet. No account required, rate-limited.' },
      { label: 'QuickNode Robinhood Faucet', url: 'https://faucet.quicknode.com/robinhood/testnet', tokens: ['ETH'], access: 'free', cooldown: '12h', checked: VERIFIED, note: 'QuickNode multi-chain faucet for Robinhood Testnet. Wallet needs small mainnet ETH balance.' },
      { label: 'Alchemy Robinhood Faucet', url: 'https://www.alchemy.com/faucets/robinhood-testnet', tokens: ['ETH'], access: 'free', cooldown: '24h', checked: VERIFIED, note: 'Alchemy multi-chain faucet. Select Robinhood Testnet. Wallet needs small mainnet ETH balance.' },
      { label: 'Chainlink Faucet (Robinhood)', url: 'https://faucets.chain.link/robinhood-testnet', tokens: ['ETH', 'LINK'], access: 'account', cooldown: '24h', checked: VERIFIED, note: 'ETH + testnet LINK on Robinhood Testnet. Connect wallet via MetaMask.' },
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
      { label: 'GIWA Official Faucet', url: 'https://faucet.giwa.io/', tokens: ['ETH'], access: 'free', cooldown: '24h', amount: '0.005 ETH', checked: VERIFIED, note: '0.005 ETH per claim. No account required. Open in a normal browser tab (automated checks blocked).' },
      { label: 'Nodit GIWA Faucet', url: 'https://faucet.lambda256.io/giwa-sepolia', tokens: ['ETH'], access: 'free', cooldown: '24h', amount: '0.01 ETH', checked: VERIFIED, note: '0.01 ETH per 24h. No account required. Page asks you to follow @NoditPlatform on X (optional).' },
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
    faucets: [
      { label: 'SX Toronto Faucet', url: 'https://faucet.sx.technology', tokens: ['SX'], access: 'free', checked: '2026-11-25', note: 'Official SX faucet for the Toronto testnet. No account required.' },
    ],
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
    faucets: [
      { label: 'Humanity Protocol Testnet Faucet', url: 'https://faucet.testnet.humanity.org', tokens: ['tHP'], access: 'free', checked: VERIFIED, note: 'Official Humanity Protocol testnet faucet. Drips tHP (native gas token). No account required, bot-protected.' },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: o_Plume.id,
    key: 'o_Plume',
    name: 'Plume Testnet',
    short: 'PLUME',
    viem: o_Plume,
    cctpDomain: 22,
    usdc: '0xcB5f30e335672893c7eb944B374c196392C19D18',
    bridge: 'cctp',
    bridgeNote: 'Circle CCTP v2 native USDC is live (domain 22). Native PLUME Arbitrum Orbit deposits use an ERC20Inbox and are not bridged directly from Sepolia ETH.',
    color: '#a78bfa',
    gradient: ['#a78bfa', '#0b1120'],
    faucets: [
      { label: 'Plume Faucet', url: 'https://faucet.plume.org', tokens: ['PLUME'], access: 'free', cooldown: '24h', checked: VERIFIED, note: 'Official Plume testnet faucet for the native PLUME gas token. If the domain changes, check plume.org for the latest faucet link.' },
      { label: 'Chainlink Faucet (Plume)', url: 'https://faucets.chain.link/plume-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Plume Testnet (98867).' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '1h', amount: '20 USDC', sourceType: 'official', verification: 'untested', note: 'The official Circle faucet for testnet USDC on Plume (PLUME enabled).', checked: '2026-11-26' },
    ],
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
    faucets: [
      { label: 'Circle USDC Faucet (Edge)', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '1h', amount: '20 USDC', sourceType: 'official', verification: 'untested', requirements: ['No account required', '1h cooldown per network'], checked: '2026-11-26', note: 'Official Circle Faucet (EDGE enabled on Edge Testnet 33431).' },
      { label: 'Chainlink Faucet (Edge)', url: 'https://faucets.chain.link/edge-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Edge Testnet (33431).' },
      { label: 'No native ETH faucet found', url: '', tokens: ['ETH'], missing: 'ETH', note: 'Checked 2026-11-26: no public faucet for ETH could be verified. Bridge Sepolia ETH via Orbit inbox from Arbitrum Sepolia.', checked: '2026-11-26' },
    ],
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
    faucets: [
      { label: 'No native GNET faucet found', url: '', tokens: ['GNET'], missing: 'GNET', note: 'Checked 2026-11-25: no public faucet for GNET could be verified. Bridge it from its parent chain, or ask in the network Discord.', checked: '2026-11-25' },
    ],
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
    faucets: [
      { label: 'HPP Faucet', url: 'https://faucet.hpp.io', tokens: ['ETH'], access: 'free', cooldown: '24h', amount: '0.005 ETH', checked: VERIFIED, note: '0.005 ETH per claim. 1 claim per wallet per 24h. Also drips 1 HPP ERC-20 and 1 USDC.e. Protected by Turnstile captcha.' },
    ],
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
    faucets: [
      { label: 'No native JASMY faucet found', url: '', tokens: ['JASMY'], missing: 'JASMY', note: 'Checked 2026-11-25: no public faucet for JASMY could be verified. Bridge it from its parent chain, or ask in the network Discord.', checked: '2026-11-25' },
    ],
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
    faucets: [
      { label: 'MarsChain Faucet (thirdweb)', url: 'https://thirdweb.com/marschain-testnet', tokens: ['MarsC'], access: 'account', note: 'thirdweb hosts a faucet page for MarsChain.', checked: '2026-11-25' },
    ],
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
    faucets: [
      { label: 'GenLayer Testnet Faucet', url: 'https://testnet-faucet.genlayer.foundation', tokens: ['GEN'], access: 'free', checked: VERIFIED, note: 'Official GenLayer testnet faucet. Drips GEN tokens for gas. Connect wallet or verify via GitHub.' },
    ],
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
    faucets: [
      { label: 'No native WOMOX faucet found', url: '', tokens: ['WOMOX'], missing: 'WOMOX', note: 'Checked 2026-11-25: no public faucet for WOMOX could be verified. Bridge it from its parent chain, or ask in the network Discord.', checked: '2026-11-25' },
    ],
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
    faucets: [
      { label: 'QuickNode Xai Faucet', url: 'https://faucet.quicknode.com/xai/testnet', tokens: ['sXAI'], access: 'free', cooldown: '12h', checked: VERIFIED, note: 'QuickNode multi-chain faucet for Xai Testnet. Select Xai Testnet. Wallet needs small mainnet ETH balance.' },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: o_Edge.id,
    key: 'o_Edge',
    name: 'Edge Testnet',
    short: 'EDGE',
    viem: o_Edge,
    cctpDomain: 28,
    usdc: '0x2d9F7CAD728051AA35Ecdc472a14cf8cDF5CFD6B',
    bridge: 'orbit',
    color: '#f43f5e',
    gradient: ['#f43f5e', '#0b1120'],
    faucets: [
      { label: 'Circle USDC Faucet (Edge)', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '1h', amount: '20 USDC', sourceType: 'official', verification: 'untested', requirements: ['No account required', '1h cooldown per network'], checked: '2026-11-26', note: 'Official Circle Faucet (EDGE enabled on Edge Testnet 33431).' },
      { label: 'Chainlink Faucet (Edge)', url: 'https://faucets.chain.link/edge-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Edge Testnet (33431).' },
      { label: 'No native ETH faucet found', url: '', tokens: ['ETH'], missing: 'ETH', note: 'Checked 2026-11-26: no public faucet for ETH could be verified. Bridge Sepolia ETH via Orbit inbox from Arbitrum Sepolia.', checked: '2026-11-26' },
    ],
    verifiedAt: VERIFIED,
  },

  // ── Newly verified active EVM testnets (Phase A/B audit 2026-11-26) ─────────────────────
  {
    id: e_AB.id,
    key: 'abTestnet',
    name: 'AB Testnet',
    short: 'AB',
    viem: e_AB,
    bridge: 'none',
    color: '#22d3ee',
    gradient: ['#22d3ee', '#0e7490'],
    faucets: [
      { label: 'AB Testnet Faucet', url: 'https://faucet.testnet.ab.org', tokens: ['AB'], access: 'free', sourceType: 'official', verification: 'untested', requirements: ['Official AB testnet faucet domain (web root may vary; check AB docs if unavailable)'], checked: '2026-11-26', note: 'Official AB Testnet host for native AB gas.' },
      { label: 'Chainlink Faucet (AB)', url: 'https://faucets.chain.link/ab-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h. Connect EVM wallet; does not drip native AB.' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: abstractTestnet.id,
    key: 'abstractTestnet',
    name: 'Abstract Testnet',
    short: 'Abstract',
    viem: withCorsRpc(abstractTestnet, 'https://api.testnet.abs.xyz'),
    uniswap: {
      /** Official Abstract Testnet Uniswap V3 (docs.abs.xyz). Verified live on-chain 2026-11-26. */
      quoter: '0xdE41045eb15C8352413199f35d6d1A32803DaaE2',
      router02: '0xb9D4347d129a83cBC40499Cd4fF223dE172a70dF',
      factory: '0x2E17FF9b877661bDFEF8879a4B31665157a960F0',
    },
    dexV2: [
      {
        name: 'Uniswap V2',
        router: '0x96ff7D9dbf52FdcAe79157d3b249282c7FABd409',
        factory: '0x566d7510dEE58360a64C9827257cF6D0Dc43985E',
        wrappedNative: '0x9EDCde0257F2386Ce177C3a7FCdd97787F0D841d',
      },
    ],
    bridge: 'none',
    color: '#32d77e',
    gradient: ['#32d77e', '#065f46'],
    faucets: [
      { label: 'Alchemy Abstract Testnet Faucet', url: 'https://www.alchemy.com/faucets/abstract-testnet', tokens: ['ETH'], access: 'account', cooldown: '24h', sourceType: 'third-party', verification: 'untested', requirements: ['Free Alchemy account', 'Small Ethereum mainnet balance'], checked: '2026-11-26', note: 'Alchemy multi-chain faucet for Abstract Sepolia ETH.' },
      { label: 'Abstract Docs / Faucet Guide', url: 'https://docs.abs.xyz/tooling/faucets', tokens: ['ETH'], access: 'free', sourceType: 'official', verification: 'verified', requirements: ['Lists ecosystem faucets & Sepolia bridge'], checked: '2026-11-26', note: 'Official Abstract developer docs faucet guide.' },
      { label: 'Chainlink Faucet (Abstract)', url: 'https://faucets.chain.link/abstract-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h. Connect EVM wallet; native ETH not dripped by Chainlink.' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: e_ADI.id,
    key: 'adiTestnet',
    name: 'ADI Testnet',
    short: 'ADI',
    viem: e_ADI,
    bridge: 'none',
    color: '#3b82f6',
    gradient: ['#3b82f6', '#1e3a8a'],
    faucets: [
      { label: 'ADI Foundation Faucet V3', url: 'https://faucet.ab.testnet.adifoundation.ai/', tokens: ['ADI'], access: 'free', sourceType: 'official', verification: 'untested', requirements: ['Paste EVM wallet address', 'Rate limit applies'], checked: '2026-11-26', note: 'Official ADI Foundation Testnet Faucet V3 (HTTP 200 verified).' },
      { label: 'Chainlink Faucet (ADI)', url: 'https://faucets.chain.link/adi-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on ADI Testnet (99999).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: e_AstarShibuya.id,
    key: 'astarShibuya',
    name: 'Astar Shibuya Testnet',
    short: 'Shibuya',
    viem: e_AstarShibuya,
    bridge: 'none',
    color: '#0075ff',
    gradient: ['#0075ff', '#1e3a8a'],
    faucets: [
      { label: 'Astar Portal Faucet (Shibuya)', url: 'https://portal.astar.network/shibuya-testnet/assets', tokens: ['SBY'], access: 'free', sourceType: 'official', verification: 'untested', requirements: ['Connect EVM or Substrate wallet in Astar Portal', 'Built-in SBY faucet'], checked: '2026-11-26', note: 'Official Astar Portal faucet for Shibuya testnet SBY gas.' },
      { label: 'Chainlink Faucet (Shibuya)', url: 'https://faucets.chain.link/astar-shibuya', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Astar Shibuya (chain 81).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: berachainBepolia.id,
    key: 'berachainBepolia',
    name: 'Berachain Bepolia',
    short: 'Bepolia',
    viem: withCorsRpc(berachainBepolia, 'https://bepolia.rpc.berachain.com'),
    bridge: 'none',
    color: '#f47226',
    gradient: ['#f47226', '#7c2d12'],
    faucets: [
      { label: 'Berachain Bepolia Faucet', url: 'https://bepolia.faucet.berachain.com/', tokens: ['BERA'], access: 'free', cooldown: '8h', sourceType: 'official', verification: 'untested', requirements: ['Open in interactive browser (Vercel security checkpoint)', '>= 0.001 ETH on Ethereum mainnet'], checked: '2026-11-26', note: 'Official Berachain Bepolia BERA faucet.' },
      { label: 'Chainlink Faucet (Bepolia)', url: 'https://faucets.chain.link/berachain-testnet-bepolia', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Berachain Bepolia (80069).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: bscTestnet.id,
    key: 'bscTestnet',
    name: 'BNB Chain Testnet',
    short: 'BNB Test',
    viem: withCorsRpc(bscTestnet, 'https://bsc-testnet-rpc.publicnode.com'),
    uniswap: {
      /** PancakeSwap V3 on BSC Testnet (SwapRouter v1 + fee tiers 100/500/2500/10000). Verified on-chain 2026-11-26. */
      quoter: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
      router02: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
      factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
      kind: 'v1',
      feeTiers: [100, 500, 2500, 10000],
    },
    dexV2: [
      {
        name: 'PancakeSwap V2',
        router: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
        factory: '0x6725F303b657a9451d8BA641348b6761A6CC7a17',
        wrappedNative: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
      },
    ],
    bridge: 'none',
    bridgeNote: 'Circle CCTP v2 Domain 17 on BSC supports USYC only (not native USDC).',
    color: '#f0b90b',
    gradient: ['#f0b90b', '#78350f'],
    faucets: [
      { label: 'BNB Smart Chain Official Faucet', url: 'https://www.bnbchain.org/en/testnet-faucet', tokens: ['tBNB'], access: 'account', cooldown: '24h', sourceType: 'official', verification: 'untested', requirements: ['Small BNB balance on BNB Smart Chain mainnet (0.002 BNB) or Discord verification', '24h cooldown'], checked: '2026-11-26', note: 'Official BNB Chain Testnet faucet (HTTP 200 verified).' },
      { label: 'QuickNode BNB Testnet Faucet', url: 'https://faucet.quicknode.com/binance-smart-chain/bnb-testnet', tokens: ['tBNB'], access: 'account', cooldown: '12h', sourceType: 'third-party', verification: 'untested', requirements: ['Free QuickNode account', 'Mainnet wallet balance check'], checked: '2026-11-26', note: 'QuickNode BNB Smart Chain Testnet faucet.' },
      { label: 'Chainlink Faucet (BNB Testnet)', url: 'https://faucets.chain.link/bnb-chain-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on BNB Chain Testnet (97).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: bobSepolia.id,
    key: 'bobSepolia',
    name: 'BOB Testnet',
    short: 'BOB Sep',
    viem: withCorsRpc(bobSepolia, 'https://bob-sepolia.rpc.gobob.xyz/'),
    opStackParent: 11155111,
    bridge: 'opstack',
    color: '#f47226',
    gradient: ['#f47226', '#7c2d12'],
    faucets: [
      { label: 'Superchain Faucet (BOB)', url: 'https://console.optimism.io/faucet', tokens: ['ETH'], access: 'account', cooldown: '24h', amount: '0.05 ETH', sourceType: 'official', verification: 'untested', requirements: ['GitHub account or Optimist NFT', 'Covers Superchain testnets including BOB Sepolia'], checked: '2026-11-26', note: 'Optimism Superchain faucet covering BOB Sepolia.' },
      { label: 'Chainlink Faucet (BOB)', url: 'https://faucets.chain.link/bob-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on BOB Sepolia (808813).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: celoSepolia.id,
    key: 'celoSepolia',
    name: 'Celo Sepolia',
    short: 'Celo Sep',
    viem: withCorsRpc(celoSepolia, 'https://forno.celo-sepolia.celo-testnet.org'),
    usdc: '0x01C5C0122039549AD1493B8220cABEdD739BC44E',
    bridge: 'none',
    color: '#fcff52',
    gradient: ['#fcff52', '#4d7c0f'],
    faucets: [
      { label: 'Celo Sepolia Official Faucet', url: 'https://faucet.celo.org/celo-sepolia', tokens: ['CELO'], access: 'account', cooldown: '24h', sourceType: 'official', verification: 'untested', requirements: ['Google / GitHub or self-serve browser verification', '24h cooldown'], checked: '2026-11-26', note: 'Official Celo Sepolia gas faucet (HTTP 200 verified).' },
      { label: 'Circle USDC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '1h', amount: '20 USDC', sourceType: 'official', verification: 'untested', requirements: ['No account required', '1h cooldown per network'], checked: '2026-11-26', note: 'Official Circle Faucet (CELO enabled). Verified Celo Sepolia USDC contract on-chain.' },
      { label: 'Chainlink Faucet (Celo Sepolia)', url: 'https://faucets.chain.link/celo-sepolia', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Celo Sepolia.' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: e_CoreTestnet2.id,
    key: 'coreTestnet2',
    name: 'Core Testnet',
    short: 'Core T2',
    viem: e_CoreTestnet2,
    bridge: 'none',
    color: '#ff9211',
    gradient: ['#ff9211', '#7c2d12'],
    faucets: [
      { label: 'Core Testnet 2 Faucet', url: 'https://scan.test2.btcs.network/faucet', tokens: ['tCORE2'], access: 'free', cooldown: '24h', sourceType: 'official', verification: 'untested', requirements: ['Open in interactive browser (server timed out on headless HTTP check)', 'reCAPTCHA verification'], checked: '2026-11-26', note: 'Official Core Blockchain Testnet 2 tCORE2 faucet per coredao.org docs.' },
      { label: 'Chainlink Faucet (Core Testnet)', url: 'https://faucets.chain.link/core-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Core Testnet 2 (1114).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: creditCoin3Testnet.id,
    key: 'creditcoinTestnet',
    name: 'Creditcoin Testnet',
    short: 'Creditcoin',
    viem: withCorsRpc(creditCoin3Testnet, 'https://rpc.cc3-testnet.creditcoin.network'),
    bridge: 'none',
    color: '#94a3b8',
    gradient: ['#64748b', '#1e293b'],
    faucets: [
      { label: 'Creditcoin Discord Faucet', url: 'https://discord.com/invite/creditcoin', tokens: ['tCTC'], access: 'account', sourceType: 'discord', verification: 'untested', requirements: ['Discord account required', 'Request tCTC via bot command in Creditcoin testnet faucet channel'], checked: '2026-11-26', note: 'Official Creditcoin Discord community faucet for tCTC gas.' },
      { label: 'Chainlink Faucet (Creditcoin)', url: 'https://faucets.chain.link/creditcoin-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Creditcoin Testnet (102031).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: cronosTestnet.id,
    key: 'cronosTestnet',
    name: 'Cronos Testnet',
    short: 'Cronos',
    viem: withCorsRpc(cronosTestnet, 'https://cronos-testnet.drpc.org'),
    cctpDomain: 32,
    usdc: '0xEb33dc5fac03833e132593659e1dE7256aB59794',
    bridge: 'cctp',
    color: '#002d74',
    gradient: ['#1d4ed8', '#002d74'],
    faucets: [
      { label: 'Cronos Testnet Faucet', url: 'https://faucet.cronos.org/', tokens: ['TCRO'], access: 'free', cooldown: '24h', sourceType: 'official', verification: 'untested', requirements: ['Interactive browser required (Cloudflare 403 on scripted checks)', 'Captcha'], checked: '2026-11-26', note: 'Official Cronos EVM Testnet TCRO faucet.' },
      { label: 'Circle USDC & EURC Faucet', url: 'https://faucet.circle.com', tokens: ['USDC', 'EURC'], access: 'free', cooldown: '1h', amount: '20 USDC/EURC', sourceType: 'official', verification: 'untested', requirements: ['No account required', '1h cooldown per network'], checked: '2026-11-26', note: 'Official Circle Faucet (CRONOS enabled for USDC & EURC).' },
      { label: 'Chainlink Faucet (Cronos)', url: 'https://faucets.chain.link/cronos-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h.' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: e_CronosZkEvm.id,
    key: 'cronosZkEvmTestnet',
    name: 'Cronos zkEVM Testnet',
    short: 'Cronos zk',
    viem: e_CronosZkEvm,
    bridge: 'none',
    color: '#2563eb',
    gradient: ['#2563eb', '#002d74'],
    faucets: [
      { label: 'Cronos zkEVM Testnet Faucet', url: 'https://zkevm.cronos.org/faucet', tokens: ['zkTCRO'], access: 'free', sourceType: 'official', verification: 'untested', requirements: ['Interactive browser required (Cloudflare 403 on scripted checks)', 'zkTCRO drip for zkEVM Sepolia'], checked: '2026-11-26', note: 'Official Cronos zkEVM Testnet faucet.' },
      { label: 'Chainlink Faucet (Cronos zkEVM)', url: 'https://faucets.chain.link/cronos-testnet-zkevm', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Cronos zkEVM Sepolia Testnet (240).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: e_DogeOS.id,
    key: 'dogeosChikyu',
    name: 'DogeOS Chikyu Testnet',
    short: 'DogeOS',
    viem: e_DogeOS,
    bridge: 'none',
    color: '#fed70b',
    gradient: ['#fed70b', '#854d0e'],
    faucets: [
      { label: 'DogeOS Chikyu Faucet', url: 'https://faucet.testnet.dogeos.com/', tokens: ['DOGE'], access: 'free', sourceType: 'official', verification: 'untested', requirements: ['Paste EVM wallet address', 'Rate limit applies'], checked: '2026-11-26', note: 'Official DogeOS Chikyu native DOGE faucet (HTTP 200 verified).' },
      { label: 'Chainlink Faucet (DogeOS)', url: 'https://faucets.chain.link/dogeos-testnet-chikyu', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on DogeOS Chikyu (6281971).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: hoodi.id,
    key: 'ethereumHoodi',
    name: 'Ethereum Hoodi Testnet',
    short: 'Hoodi',
    viem: withCorsRpc(hoodi, 'https://ethereum-hoodi-rpc.publicnode.com'),
    bridge: 'none',
    color: '#627eea',
    gradient: ['#627eea', '#1e3a8a'],
    faucets: [
      { label: 'Hoodi PoW Faucet (pk910)', url: 'https://hoodi-faucet.pk910.de/', tokens: ['ETH'], access: 'pow', sourceType: 'third-party', verification: 'untested', requirements: ['Browser proof-of-work mining', 'Optional Gitcoin Passport boost'], checked: '2026-11-26', note: 'Browser PoW miner for Hoodi ETH (HTTP 200 verified).' },
      { label: 'EthPandaOps Hoodi Faucet', url: 'https://faucet.hoodi.ethpandaops.io/', tokens: ['ETH'], access: 'pow', sourceType: 'official', verification: 'untested', requirements: ['Browser proof-of-work mining'], checked: '2026-11-26', note: 'Ethereum Foundation / EthPandaOps Hoodi PoW faucet.' },
      { label: 'Google Cloud Hoodi Faucet', url: 'https://cloud.google.com/application/web3/faucet/ethereum/hoodi', tokens: ['ETH'], access: 'account', cooldown: '24h', sourceType: 'third-party', verification: 'untested', requirements: ['Google account sign-in', '24h cooldown'], checked: '2026-11-26', note: 'Google Cloud Web3 faucet for Ethereum Hoodi ETH.' },
      { label: 'Chainlink Faucet (Hoodi)', url: 'https://faucets.chain.link/hoodi', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Ethereum Hoodi (560048).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: gnosisChiado.id,
    key: 'gnosisChiado',
    name: 'Gnosis Chiado Testnet',
    short: 'Chiado',
    viem: withCorsRpc(gnosisChiado, 'https://rpc.chiadochain.net'),
    bridge: 'none',
    color: '#3e6956',
    gradient: ['#3e6956', '#14532d'],
    faucets: [
      { label: 'Gnosis Official Faucet', url: 'https://faucet.gnosischain.com/', tokens: ['xDAI'], access: 'free', sourceType: 'official', verification: 'untested', requirements: ['Select Chiado Testnet in UI', 'Captcha / rate limit'], checked: '2026-11-26', note: 'Official Gnosis Faucet covering Chiado Testnet xDAI (HTTP 200 verified).' },
      { label: 'Chainlink Faucet (Chiado)', url: 'https://faucets.chain.link/gnosis-chiado-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Gnosis Chiado (10200).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: e_Gravity.id,
    key: 'gravityLongevity',
    name: 'Gravity Longevity Testnet',
    short: 'Gravity',
    viem: e_Gravity,
    bridge: 'none',
    color: '#e11d48',
    gradient: ['#e11d48', '#881337'],
    faucets: [
      { label: 'Gravity Official Faucet', url: 'https://faucet.gravity.xyz/', tokens: ['G'], access: 'free', sourceType: 'official', verification: 'untested', requirements: ['Connect wallet or paste EVM address', 'Rate limit applies'], checked: '2026-11-26', note: 'Official Gravity Longevity native G faucet (HTTP 200 verified).' },
      { label: 'Chainlink Faucet (Gravity)', url: 'https://faucets.chain.link/gravity-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Gravity Longevity (7771625).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: hederaTestnet.id,
    key: 'hederaTestnet',
    name: 'Hedera Testnet',
    short: 'Hedera',
    viem: withCorsRpc(hederaTestnet, 'https://testnet.hashio.io/api'),
    uniswap: {
      /** SaucerSwap V2 on Hedera Testnet (0.0.1535b2 QuoterV2 / 0.0.159398 SwapRouter / 0.0.1243ee Factory). Verified live 2026-11-26. */
      quoter: '0x00000000000000000000000000000000001535b2',
      router02: '0x0000000000000000000000000000000000159398',
      factory: '0x00000000000000000000000000000000001243ee',
      kind: 'v1',
      feeTiers: [500, 1500, 3000, 10000],
    },
    bridge: 'none',
    color: '#222222',
    gradient: ['#52525b', '#18181b'],
    faucets: [
      { label: 'Hedera Developer Portal Faucet', url: 'https://portal.hedera.com/faucet', tokens: ['HBAR'], access: 'account', cooldown: '24h', amount: '100 HBAR', sourceType: 'official', verification: 'untested', requirements: ['Free Hedera Portal account', 'Interactive browser required (Cloudflare gated)'], checked: '2026-11-26', note: 'Official Hedera Testnet HBAR faucet.' },
      { label: 'Circle USDC Faucet (Hedera)', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '1h', amount: '20 USDC', sourceType: 'official', verification: 'untested', requirements: ['HTS USDC token association (0.0.429274)', '1h cooldown'], checked: '2026-11-26', note: 'Official Circle Faucet (HBAR enabled; native HTS USDC token 0.0.429274).' },
      { label: 'Chainlink Faucet (Hedera)', url: 'https://faucets.chain.link/hedera-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Hedera EVM (296).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: hyperliquidEvmTestnet.id,
    key: 'hyperevmTestnet',
    name: 'HyperEVM Testnet',
    short: 'HyperEVM',
    viem: withCorsRpc(hyperliquidEvmTestnet, 'https://rpc.hyperliquid-testnet.xyz/evm'),
    cctpDomain: 19,
    usdc: '0x2B3370eE501B4a559b57D449569354196457D8Ab',
    bridge: 'cctp',
    color: '#97fce4',
    gradient: ['#97fce4', '#0f766e'],
    faucets: [
      { label: 'Hyperliquid Testnet Drip Faucet', url: 'https://app.hyperliquid-testnet.xyz/drip', tokens: ['USDC', 'HYPE'], access: 'free', sourceType: 'official', verification: 'untested', requirements: ['May require prior testnet activity on Hyperliquid Testnet to claim HYPE gas'], checked: '2026-11-26', note: 'Official Hyperliquid Testnet drip portal.' },
      { label: 'Circle USDC Faucet (HyperEVM)', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '1h', amount: '20 USDC', sourceType: 'official', verification: 'untested', requirements: ['No account required', '1h cooldown per network'], checked: '2026-11-26', note: 'Official Circle Faucet (HYPEREVM enabled).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: jovaySepolia.id,
    key: 'jovayTestnet',
    name: 'Jovay Testnet',
    short: 'Jovay',
    viem: withCorsRpc(jovaySepolia, 'https://api.zan.top/public/jovay-testnet'),
    bridge: 'none',
    color: '#326cff',
    gradient: ['#326cff', '#1e3a8a'],
    faucets: [
      { label: 'ZAN Jovay Faucet', url: 'https://www.zan.top/faucet/jovay', tokens: ['ETH'], access: 'account', cooldown: '24h', sourceType: 'third-party', verification: 'untested', requirements: ['Free ZAN account required', '24h cooldown'], checked: '2026-11-26', note: 'ZAN ecosystem faucet for Jovay Testnet ETH (HTTP 200 verified).' },
      { label: 'Chainlink Faucet (Jovay)', url: 'https://faucets.chain.link/jovay-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Jovay Testnet (2019775).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: kairos.id,
    key: 'kaiaTestnet',
    name: 'Kaia Testnet',
    short: 'Kaia',
    viem: withCorsRpc(kairos, 'https://public-en-kairos.node.kaia.io'),
    bridge: 'none',
    color: '#bff009',
    gradient: ['#bff009', '#3f6212'],
    faucets: [
      { label: 'Kaia Kairos Official Faucet', url: 'https://www.kaia.io/faucet', tokens: ['KAIA'], access: 'free', cooldown: '24h', sourceType: 'official', verification: 'untested', requirements: ['Paste EVM wallet address', 'Cloudflare captcha & 24h cooldown'], checked: '2026-11-26', note: 'Official Kaia Kairos KAIA faucet (HTTP 200 verified).' },
      { label: 'Chainlink Faucet (Kaia Kairos)', url: 'https://faucets.chain.link/kaia-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Kaia Kairos (1001).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: liskSepolia.id,
    key: 'liskSepolia',
    name: 'Lisk Testnet',
    short: 'Lisk Sep',
    viem: withCorsRpc(liskSepolia, 'https://lisk-sepolia.gateway.tenderly.co'),
    opStackParent: 11155111,
    bridge: 'opstack',
    color: '#64748b',
    gradient: ['#94a3b8', '#1e293b'],
    faucets: [
      { label: 'Superchain Faucet (Lisk)', url: 'https://console.optimism.io/faucet', tokens: ['ETH'], access: 'account', cooldown: '24h', amount: '0.05 ETH', sourceType: 'official', verification: 'untested', requirements: ['GitHub account or Optimist NFT', 'Covers Superchain Lisk Sepolia'], checked: '2026-11-26', note: 'Optimism Superchain faucet covering Lisk Sepolia (4202).' },
      { label: 'Chainlink Faucet (Lisk)', url: 'https://faucets.chain.link/lisk-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Lisk Sepolia (4202).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: mantleSepoliaTestnet.id,
    key: 'mantleSepolia',
    name: 'Mantle Sepolia',
    short: 'Mantle',
    viem: withCorsRpc(mantleSepoliaTestnet, 'https://rpc.sepolia.mantle.xyz'),
    bridge: 'none',
    color: '#a1a1aa',
    gradient: ['#d4d4d8', '#27272a'],
    faucets: [
      { label: 'Mantle Official Faucet', url: 'https://faucet.mantle.xyz/', tokens: ['MNT'], access: 'account', cooldown: '24h', sourceType: 'official', verification: 'untested', requirements: ['Twitter/X verification', 'Sepolia ETH for minting fee'], checked: '2026-11-26', note: 'Official Mantle Sepolia MNT faucet (HTTP 200 verified).' },
      { label: 'QuickNode Mantle Faucet', url: 'https://faucet.quicknode.com/mantle/sepolia', tokens: ['MNT'], access: 'account', cooldown: '12h', sourceType: 'third-party', verification: 'untested', requirements: ['Free QuickNode account', 'Small mainnet balance check'], checked: '2026-11-26', note: 'QuickNode Mantle Sepolia MNT faucet (HTTP 200 verified).' },
      { label: 'Chainlink Faucet (Mantle)', url: 'https://faucets.chain.link/mantle-sepolia', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Mantle Sepolia (5003).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: megaethTestnet.id,
    key: 'megaethTestnet2',
    name: 'MegaETH Testnet 2',
    short: 'MegaETH 2',
    viem: withCorsRpc(megaethTestnet, 'https://carrot.megaeth.com/rpc'),
    bridge: 'none',
    color: '#dfd9d9',
    gradient: ['#e4e4e7', '#3f3f46'],
    faucets: [
      { label: 'MegaETH Testnet Portal', url: 'https://testnet.megaeth.com/', tokens: ['ETH'], access: 'free', sourceType: 'official', verification: 'untested', requirements: ['Connect wallet on MegaETH Testnet portal', 'Rate limit applies'], checked: '2026-11-26', note: 'Official MegaETH Testnet portal with faucet (HTTP 200 verified).' },
      { label: 'Chainlink Faucet (MegaETH 2)', url: 'https://faucets.chain.link/megaeth-testnet-2', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on MegaETH Testnet 2 (6343).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: e_Metal.id,
    key: 'metalTestnet',
    name: 'Metal Testnet',
    short: 'Metal',
    viem: e_Metal,
    opStackParent: 11155111,
    bridge: 'opstack',
    color: '#f5f5f5',
    gradient: ['#f4f4f5', '#52525b'],
    faucets: [
      { label: 'Superchain Faucet (Metal L2)', url: 'https://console.optimism.io/faucet', tokens: ['ETH'], access: 'account', cooldown: '24h', amount: '0.05 ETH', sourceType: 'official', verification: 'untested', requirements: ['GitHub account or Optimist NFT', 'Covers OP Superchain L2s'], checked: '2026-11-26', note: 'Optimism Superchain faucet covering Metal L2 Testnet (1740).' },
      { label: 'Chainlink Faucet (Metal)', url: 'https://faucets.chain.link/metal-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Metal L2 Testnet (1740).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: metisSepolia.id,
    key: 'metisSepolia',
    name: 'Metis Sepolia',
    short: 'Metis Sep',
    viem: withCorsRpc(metisSepolia, 'https://sepolia.metisdevops.link'),
    bridge: 'none',
    color: '#00d2ff',
    gradient: ['#00d2ff', '#0369a1'],
    faucets: [
      { label: 'Chainlink Faucet (Metis)', url: 'https://faucets.chain.link/metis-sepolia', tokens: ['METIS', 'LINK'], access: 'account', cooldown: '24h', amount: '0.5 METIS + 25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet drips both native METIS (0.5) and LINK (25) per 24h.' },
      { label: 'thirdweb Metis Sepolia Faucet', url: 'https://thirdweb.com/metis-sepolia-testnet', tokens: ['METIS'], access: 'free', sourceType: 'third-party', verification: 'untested', requirements: ['thirdweb faucet tab', 'Rate limit applies'], checked: '2026-11-26', note: 'thirdweb Metis Sepolia portal with faucet tab (HTTP 200 verified).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: modeTestnet.id,
    key: 'modeSepolia',
    name: 'Mode Sepolia',
    short: 'Mode Sep',
    viem: withCorsRpc(modeTestnet, 'https://sepolia.mode.network'),
    opStackParent: 11155111,
    bridge: 'opstack',
    color: '#d7ff00',
    gradient: ['#d7ff00', '#4d7c0f'],
    faucets: [
      { label: 'Chainlink Faucet (Mode)', url: 'https://faucets.chain.link/mode-sepolia', tokens: ['ETH', 'LINK'], access: 'account', cooldown: '24h', amount: '0.5 ETH + 25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet drips both native ETH (0.5) and LINK (25) per 24h.' },
      { label: 'Superchain Faucet (Mode)', url: 'https://console.optimism.io/faucet', tokens: ['ETH'], access: 'account', cooldown: '24h', amount: '0.05 ETH', sourceType: 'official', verification: 'untested', requirements: ['GitHub account or Optimist NFT'], checked: '2026-11-26', note: 'Optimism Superchain faucet covering Mode Sepolia (919).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: e_MorphHoodi.id,
    key: 'morphHoodi',
    name: 'Morph Hoodi Testnet',
    short: 'Morph Hoodi',
    viem: e_MorphHoodi,
    cctpDomain: 30,
    usdc: '0x7433b41C6c5e1d58D4Da99483609520255ab661B',
    bridge: 'cctp',
    color: '#14a800',
    gradient: ['#14a800', '#14532d'],
    faucets: [
      { label: 'QuickNode Morph Hoodi Faucet', url: 'https://faucet.quicknode.com/morph/hoodi', tokens: ['ETH'], access: 'account', cooldown: '12h', sourceType: 'third-party', verification: 'untested', requirements: ['Free QuickNode account', 'Small mainnet balance check'], checked: '2026-11-26', note: 'QuickNode Morph Hoodi ETH faucet (HTTP 200 verified).' },
      { label: 'Morph Hoodi Canonical Bridge', url: 'https://bridge-hoodi.morph.network/', tokens: ['ETH'], access: 'free', sourceType: 'official', verification: 'verified', requirements: ['Hold Ethereum Hoodi ETH (560048)', 'Bridge to Morph Hoodi (2910)'], checked: '2026-11-26', note: 'Official Morph Hoodi bridge from Ethereum Hoodi.' },
      { label: 'Circle USDC Faucet (Morph)', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '1h', amount: '20 USDC', sourceType: 'official', verification: 'untested', requirements: ['No account required', '1h cooldown per network'], checked: '2026-11-26', note: 'Official Circle Faucet (MORPH enabled on Morph Hoodi 2910).' },
      { label: 'Chainlink Faucet (Morph Hoodi)', url: 'https://faucets.chain.link/ethereum-testnet-hoodi-morph', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Morph Hoodi (2910).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: e_Mova.id,
    key: 'movaTestnet',
    name: 'Mova Testnet',
    short: 'Mova',
    viem: e_Mova,
    bridge: 'none',
    color: '#c0ff72',
    gradient: ['#c0ff72', '#3f6212'],
    faucets: [
      { label: 'Mova Testnet Faucet', url: 'https://faucet.mars.movachain.com/', tokens: ['MOVA'], access: 'free', sourceType: 'official', verification: 'untested', requirements: ['Connect EVM wallet', 'Mova Testnet (10323) gas drip'], checked: '2026-11-26', note: 'Official Mova Testnet faucet (HTTP 200 verified).' },
      { label: 'Chainlink Faucet (Mova)', url: 'https://faucets.chain.link/mova-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Mova Testnet (10323).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: neoxT4.id,
    key: 'neoxTestnet',
    name: 'Neo X Testnet',
    short: 'Neo X T4',
    viem: withCorsRpc(neoxT4, 'https://neoxt4seed1.ngd.network'),
    bridge: 'none',
    color: '#00e599',
    gradient: ['#00e599', '#065f46'],
    faucets: [
      { label: 'Neo X Testnet Wish Faucet', url: 'https://neoxwish.ngd.network/', tokens: ['GAS'], access: 'account', cooldown: '24h', sourceType: 'official', verification: 'untested', requirements: ['Login / social connect', 'Drips native testnet GAS'], checked: '2026-11-26', note: 'Official Neo X Testnet Wish faucet (HTTP 200 verified).' },
      { label: 'Chainlink Faucet (Neo X T4)', url: 'https://faucets.chain.link/neox-testnet-t4', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Neo X Testnet T4.' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: opBNBTestnet.id,
    key: 'opbnbTestnet',
    name: 'opBNB Testnet',
    short: 'opBNB',
    viem: withCorsRpc(opBNBTestnet, 'https://opbnb-testnet-rpc.bnbchain.org'),
    opStackParent: 97,
    bridge: 'opstack',
    color: '#f0b90b',
    gradient: ['#f0b90b', '#78350f'],
    faucets: [
      { label: 'BNB Official Faucet (+ opBNB Bridge)', url: 'https://www.bnbchain.org/en/testnet-faucet', tokens: ['tBNB'], access: 'account', cooldown: '24h', sourceType: 'official', verification: 'untested', requirements: ['Claim tBNB on BSC Testnet (97) or use BNB opBNB testnet bridge', 'Small mainnet BNB balance or Discord check'], checked: '2026-11-26', note: 'Official BNB Chain faucet feeding BSC Testnet / opBNB Testnet.' },
      { label: 'Chainlink Faucet (opBNB)', url: 'https://faucets.chain.link/opbnb-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on opBNB Testnet (5611).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: e_PharosAtlantic.id,
    key: 'pharosAtlantic',
    name: 'Pharos Atlantic Testnet',
    short: 'Pharos',
    viem: e_PharosAtlantic,
    cctpDomain: 31,
    usdc: '0xcfC8330f4BCAB529c625D12781b1C19466A9Fc8B',
    bridge: 'cctp',
    color: '#3b82f6',
    gradient: ['#3b82f6', '#0007b8'],
    faucets: [
      { label: 'Pharos Atlantic Faucet Portal', url: 'https://testnet.pharosnetwork.xyz/', tokens: ['PHRS'], access: 'free', sourceType: 'official', verification: 'untested', requirements: ['Connect wallet on Pharos Atlantic Testnet portal'], checked: '2026-11-26', note: 'Official Pharos Atlantic Testnet portal & faucet (HTTP 200 verified).' },
      { label: 'Chainlink Faucet (Pharos Atlantic)', url: 'https://faucets.chain.link/pharos-atlantic-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Pharos Atlantic (688689).' },
      { label: 'Circle USDC Faucet (Pharos)', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '1h', sourceType: 'official', verification: 'maintenance', requirements: ['Circle Faucet currently reports PHAROS maintenanceMode: true'], checked: '2026-11-26', note: 'Circle Faucet currently shows PHAROS maintenanceMode: true.' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: saigon.id,
    key: 'roninSaigon',
    name: 'Ronin Saigon',
    short: 'Saigon',
    viem: withCorsRpc(saigon, 'https://saigon-testnet.roninchain.com/rpc'),
    bridge: 'none',
    color: '#004de5',
    gradient: ['#004de5', '#1e3a8a'],
    faucets: [
      { label: 'Ronin Saigon Official Faucet', url: 'https://faucet.roninchain.com/', tokens: ['RON'], access: 'free', cooldown: '24h', sourceType: 'official', verification: 'untested', requirements: ['Paste 0x or ronin: address', 'reCAPTCHA & daily cap'], checked: '2026-11-26', note: 'Official Ronin Saigon native RON faucet (HTTP 200 verified).' },
      { label: 'Chainlink Faucet (Ronin Saigon)', url: 'https://faucets.chain.link/ethereum-testnet-sepolia-ronin-1', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Ronin Saigon (202601).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: shibariumTestnet.id,
    key: 'shibariumPuppynet',
    name: 'Shibarium Puppynet',
    short: 'Puppynet',
    viem: withCorsRpc(shibariumTestnet, 'https://rpc.puppynet.shib.io'),
    bridge: 'none',
    color: '#f00500',
    gradient: ['#f00500', '#7f1d1d'],
    faucets: [
      { label: 'Shibarium Puppynet Faucet', url: 'https://shib.io/shibarium/faucet', tokens: ['BONE'], access: 'free', cooldown: '24h', sourceType: 'official', verification: 'untested', requirements: ['Paste EVM wallet address', 'Captcha & cooldown'], checked: '2026-11-26', note: 'Official Shibarium Puppynet BONE gas faucet (HTTP 200 verified).' },
      { label: 'Chainlink Faucet (Shibarium)', url: 'https://faucets.chain.link/shibarium-puppynet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Shibarium Puppynet (157).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: soneiumMinato.id,
    key: 'soneiumMinato',
    name: 'Soneium Minato',
    short: 'Minato',
    viem: withCorsRpc(soneiumMinato, 'https://rpc.minato.soneium.org'),
    opStackParent: 11155111,
    bridge: 'opstack',
    color: '#71717a',
    gradient: ['#a1a1aa', '#27272a'],
    faucets: [
      { label: 'Alchemy Soneium Minato Faucet', url: 'https://www.alchemy.com/faucets/soneium-minato', tokens: ['ETH'], access: 'account', cooldown: '24h', sourceType: 'third-party', verification: 'untested', requirements: ['Free Alchemy account', 'Small mainnet balance check'], checked: '2026-11-26', note: 'Alchemy Soneium Minato ETH faucet (HTTP 200 verified).' },
      { label: 'Superchain Faucet (Soneium)', url: 'https://console.optimism.io/faucet', tokens: ['ETH'], access: 'account', cooldown: '24h', amount: '0.05 ETH', sourceType: 'official', verification: 'untested', requirements: ['GitHub login or Optimist NFT'], checked: '2026-11-26', note: 'Optimism Superchain faucet covering Soneium Minato (1946).' },
      { label: 'Chainlink Faucet (Soneium Minato)', url: 'https://faucets.chain.link/soneium-minato', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Soneium Minato (1946).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: tacSPB.id,
    key: 'tacSpb',
    name: 'TAC Saint Petersburg Testnet',
    short: 'TAC SPB',
    viem: withCorsRpc(tacSPB, 'https://rpc-public-spb.tac.build'),
    bridge: 'none',
    color: '#953ca3',
    gradient: ['#953ca3', '#4c1d95'],
    faucets: [
      { label: 'TAC Saint Petersburg Faucet', url: 'https://spb.faucet.tac.build/', tokens: ['TAC'], access: 'free', sourceType: 'official', verification: 'untested', requirements: ['Paste EVM wallet address', 'Rate limit applies'], checked: '2026-11-26', note: 'Official TAC Saint Petersburg Testnet faucet (HTTP 200 verified).' },
      { label: 'Chainlink Faucet (TAC SPB)', url: 'https://faucets.chain.link/tac-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on TAC Saint Petersburg (2391).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: tempoModerato.id,
    key: 'tempoModerato',
    name: 'Tempo Moderato Testnet',
    short: 'Tempo',
    viem: withCorsRpc(tempoModerato, 'https://rpc.moderato.tempo.xyz'),
    bridge: 'none',
    color: '#a1a1aa',
    gradient: ['#a1a1aa', '#18181b'],
    faucets: [
      { label: 'Tempo Testnet Faucet Guide', url: 'https://tempo.com/developers/docs/quickstart/faucet', tokens: ['USD', 'USDC'], access: 'free', sourceType: 'official', verification: 'verified', requirements: ['Calls `tempo_fundAddress` RPC or Tempo CLI command documented here'], checked: '2026-11-26', note: 'Official Tempo Moderato faucet documentation (HTTP 200 verified).' },
      { label: 'Chainlink Faucet (Tempo Moderato)', url: 'https://faucets.chain.link/tempo-testnet-moderato', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Tempo Moderato (42431).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: wemixTestnet.id,
    key: 'wemixTestnet',
    name: 'WEMIX Testnet',
    short: 'WEMIX',
    viem: withCorsRpc(wemixTestnet, 'https://api.test.wemix.com'),
    bridge: 'none',
    color: '#38bdf8',
    gradient: ['#38bdf8', '#1d4ed8'],
    faucets: [
      { label: 'Chainlink Faucet (WEMIX)', url: 'https://faucets.chain.link/wemix-testnet', tokens: ['WEMIX', 'LINK'], access: 'account', cooldown: '24h', amount: '0.5 WEMIX + 25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet drips native WEMIX (0.5) and LINK (25) per 24h.' },
      { label: 'WEMIX Testnet Wallet Faucet', url: 'https://wallet.test.wemix.com/faucet', tokens: ['WEMIX'], access: 'free', sourceType: 'official', verification: 'untested', requirements: ['Official WEMIX Testnet portal', 'Connect wallet / request WEMIX'], checked: '2026-11-26', note: 'Official WEMIX Testnet portal faucet (HTTP 200 verified).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: xdcTestnet.id,
    key: 'xdcApothem',
    name: 'XDC Apothem Testnet',
    short: 'Apothem',
    viem: withCorsRpc(xdcTestnet, 'https://erpc.apothem.network'),
    cctpDomain: 18,
    usdc: '0xb5AB69F7bBada22B28e79C8FFAECe55eF1c771D4',
    bridge: 'cctp',
    color: '#abdfef',
    gradient: ['#38bdf8', '#0f172a'],
    faucets: [
      { label: 'XDC Apothem Official Faucet', url: 'https://faucet.apothem.network/', tokens: ['XDC'], access: 'free', cooldown: '24h', sourceType: 'official', verification: 'untested', requirements: ['Accepts xdc... or 0x... address', 'Captcha & daily rate limit'], checked: '2026-11-26', note: 'Official XDC Apothem Testnet XDC faucet (HTTP 200 verified).' },
      { label: 'Circle USDC Faucet (XDC)', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '1h', amount: '20 USDC', sourceType: 'official', verification: 'untested', requirements: ['No account required', '1h cooldown per network'], checked: '2026-11-26', note: 'Official Circle Faucet (XDC enabled). Supports standard 0x EVM form of xdc... address.' },
      { label: 'Chainlink Faucet (XDC)', url: 'https://faucets.chain.link/xdc-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on XDC Apothem (51).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: zkSyncSepoliaTestnet.id,
    key: 'zkSyncSepolia',
    name: 'zkSync Sepolia',
    short: 'zkSync Sep',
    viem: withCorsRpc(zkSyncSepoliaTestnet, 'https://sepolia.era.zksync.dev'),
    usdc: '0xAe045DE5638162fa134807Cb558E15A3F5A7F853',
    bridge: 'none',
    color: '#8b5cf6',
    gradient: ['#8b5cf6', '#312e81'],
    faucets: [
      { label: 'Chainlink Faucet (zkSync Sepolia)', url: 'https://faucets.chain.link/zksync-sepolia', tokens: ['ETH', 'LINK'], access: 'account', cooldown: '24h', amount: '0.5 ETH + 25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet drips both ETH (0.5) and LINK (25) per 24h.' },
      { label: 'Alchemy zkSync Sepolia Faucet', url: 'https://www.alchemy.com/faucets/zksync-sepolia', tokens: ['ETH'], access: 'account', cooldown: '24h', sourceType: 'third-party', verification: 'untested', requirements: ['Free Alchemy account', 'Small mainnet balance check'], checked: '2026-11-26', note: 'Alchemy zkSync Sepolia ETH faucet (HTTP 200 verified).' },
      { label: 'Chainstack zkSync Faucet', url: 'https://faucet.chainstack.com/zksync-testnet-faucet', tokens: ['ETH'], access: 'account', cooldown: '24h', sourceType: 'third-party', verification: 'untested', requirements: ['Chainstack account / API key'], checked: '2026-11-26', note: 'Chainstack zkSync Sepolia faucet (HTTP 200 verified).' },
      { label: 'Circle USDC Faucet (zkSync)', url: 'https://faucet.circle.com', tokens: ['USDC'], access: 'free', cooldown: '1h', amount: '20 USDC', sourceType: 'official', verification: 'untested', requirements: ['No account required', '1h cooldown per network'], checked: '2026-11-26', note: 'Official Circle Faucet (ZKS enabled on zkSync Sepolia 300).' },
    ],
    verifiedAt: '2026-11-26',
  },
  {
    id: zoraSepolia.id,
    key: 'zoraSepolia',
    name: 'Zora Testnet',
    short: 'Zora Sep',
    viem: withCorsRpc(zoraSepolia, 'https://sepolia.rpc.zora.energy'),
    opStackParent: 11155111,
    bridge: 'opstack',
    color: '#3b82f6',
    gradient: ['#6366f1', '#1e1b4b'],
    faucets: [
      { label: 'Superchain Faucet (Zora)', url: 'https://console.optimism.io/faucet', tokens: ['ETH'], access: 'account', cooldown: '24h', amount: '0.05 ETH', sourceType: 'official', verification: 'untested', requirements: ['GitHub account or Optimist NFT', 'Covers Superchain Zora Sepolia'], checked: '2026-11-26', note: 'Optimism Superchain faucet covering Zora Sepolia (999999999).' },
      { label: 'Chainlink Faucet (Zora)', url: 'https://faucets.chain.link/zora-testnet', tokens: ['LINK'], access: 'account', cooldown: '24h', amount: '25 LINK', sourceType: 'ecosystem', verification: 'untested', requirements: ['Connect EVM wallet', 'Cloudflare Turnstile captcha'], checked: '2026-11-26', note: 'Chainlink Turnstile faucet distributing 25 LINK per 24h on Zora Sepolia (999999999).' },
    ],
    verifiedAt: '2026-11-26',
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
export const SWAP_CHAINS = CHAINS.filter((c) => c.uniswap || (c.dexV2 && c.dexV2.length > 0))
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














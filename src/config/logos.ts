/**
 * Central asset registry.
 *
 * Identity is `chainId + contract address` (or the native sentinel). The symbol is
 * only a fallback, because a look-alike ERC-20 can be named USDC on any chain and a
 * symbol-keyed map would hand out Circle's logo for it.
 *
 * Every file lives in /public/logos and is served locally, so nothing depends on a
 * third-party host at runtime.
 */
import { NATIVE_SENTINEL } from './tokens'

export const NATIVE_KEY = (chainId: number) => `${chainId}:${NATIVE_SENTINEL.toLowerCase()}`
export const tokenKey = (chainId: number, address: string) => `${chainId}:${address.toLowerCase()}`

const CHAIN_LOGOS: Record<string, string> = {
  sepolia: 'tw_ethereum.png',
  baseSepolia: 'tw_base.png',
  arbitrumSepolia: 'tw_arbitrum.png',
  optimismSepolia: 'tw_optimism.png',
  polygonAmoy: 'tw_polygon.png',
  avalancheFuji: 'avalanche.webp',
  unichainSepolia: 'unichain.webp',
  lineaSepolia: 'linea.webp',
  worldchainSepolia: 'worldchain.webp',
  monadTestnet: 'monad.webp',
  seiTestnet: 'sei.webp',
  inkSepolia: 'ink.webp',
  plasmaTestnet: 'plasma.webp',
  xLayerTestnet: 'xlayer.webp',
  arcTestnet: 'arc.webp',
  codexTestnet: 'codex.webp',
  injectiveTestnet: 'injective.webp',
  giwaSepolia: 'giwa.png',
  robinhoodTestnet: 'robinhood.png',
  // Arbitrum Orbit testnets
  o_SXToronto: 'sxtoronto.png',
  o_Humanity: 'humanity.png',
  o_Plume: 'plume.png',
  o_TRex: 'trex.png',
  o_GalacticaCas: 'galactica.png',
  o_HPPSepolia: 'hpp.png',
  o_JASMY: 'jasmy.png',
  o_GenLayer: 'genlayer.png',
  o_WorldMobile: 'worldmobile.png',
  o_Xai: 'xai.png',
  o_Edge: 'edge.png',
}

/** chainId -> file, for chains whose viem key is enough */
const CHAIN_LOGOS_BY_ID: Record<number, string> = {
  11155111: 'tw_ethereum.png',
  84532: 'tw_base.png',
  421614: 'tw_arbitrum.png',
  11155420: 'tw_optimism.png',
  80002: 'tw_polygon.png',
  43113: 'avalanche.webp',
  1301: 'unichain.webp',
  59141: 'linea.webp',
  4801: 'worldchain.webp',
  10143: 'monad.webp',
  1328: 'sei.webp',
  763373: 'ink.webp',
  9746: 'plasma.webp',
  1952: 'xlayer.webp',
  5042002: 'arc.webp',
  812242: 'codex.webp',
  1439: 'injective.webp',
  91342: 'giwa.png',
  46630: 'robinhood.png',
  // Arbitrum Orbit testnets
  79479957: 'sxtoronto.png',
  7080969: 'humanity.png',
  98867: 'plume.png',
  1962: 'trex.png',
  843843: 'galactica.png',
  181228: 'hpp.png',
  681: 'jasmy.png',
  4221: 'genlayer.png',
  323432: 'worldmobile.png',
  37714555429: 'xai.png',
  33431: 'edge.png',
}

/**
 * Exact, address-level token logos. Chains not listed here fall back to the symbol
 * map below, and then to a monogram. Never add an entry without verifying the
 * contract on chain.
 */
const TOKEN_LOGOS: Record<string, string> = {
  // USDC, per chain, real Circle deployment
  '11155111:0x1c7d4b196cb0c7b01d743fbc6116a902379c7238': 'usdc.png',
  '84532:0x036cbd53842c5426634e7929541ec2318f3dcf7e': 'usdc.png',
  '1301:0x31d0220469e10c4e71834a79b1f276d740d3768f': 'usdc.png',
  '5042002:0x3600000000000000000000000000000000000000': 'usdc.png',
  '43113:0x5425890298aed601595a70ab815c96711a31bc65': 'usdc.png',
  '11155420:0x5fd84259d66cd46123540766be93dfe6d43130d7': 'usdc.png',
  '421614:0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d': 'usdc.png',
  '80002:0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582': 'usdc.png',
  '59141:0xfece4462d57bd51a6a552365a011b95f0e16d9b7': 'usdc.png',
  '812242:0x6d7f141b6819c2c9cc2f818e6ad549e7ca090f8f': 'usdc.png',
  '4801:0x66145f38cbac35ca6f1dfb4914df98f1614aea88': 'usdc.png',
  '10143:0x534b2f3a21130d7a60830c2df862319e593943a3': 'usdc.png',
  '1328:0x4fcf1784b31630811181f670aea7a7bef803eaed': 'usdc.png',
  '763373:0xfabab97dce620294d2b0b0e46c68964e326300ac': 'usdc.png',
  '1439:0x0c382e685bbee6e5d3d9c29e29e341fee8e84c5d': 'usdc.png',
  '9746:0xe67fb267022cba8064dd388cc2fed724f3120d9d': 'usdc.png',
  '1952:0xdec90b78111ba2fc6fc6d84d8b9ec159a2d4b9b3': 'usdc.png',
  // Sepolia majors
  '11155111:0xfff9976782d46cc05630d1f6ebab18b2324d6b14': 'weth.png',
  '11155111:0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'uni.png',
  '11155111:0x68194a729c2450ad26072b3d33adacbcef39d574': 'dai.png',
  '11155111:0x779877a7b0d9e8603169ddbd7836e478b4624789': 'link.png',
  '11155111:0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0': 'usdt.png',
  '11155111:0x29f2d40b0605204364af54ec677bd022da425d03': 'wbtc.png',
  // OP Stack wrapped ETH (canonical predeploy)
  '11155420:0x4200000000000000000000000000000000000006': 'weth.png',
  '84532:0x4200000000000000000000000000000000000006': 'weth.png',
  '1301:0x4200000000000000000000000000000000000006': 'weth.png',
  // Arc
  '5042002:0x89b50855aa3be2f677cd6303cec089b5f319d72a': 'eurc.png',
}

/** Last-resort symbol map. Only for tokens whose address could not be verified. */
const SYMBOL_LOGOS: Record<string, string> = {
  USDC: 'usdc.png',
  USDT: 'usdt.png',
  DAI: 'dai.png',
  WETH: 'weth.png',
  ETH: 'eth.png',
  UNI: 'uni.png',
  LINK: 'link.png',
  WBTC: 'wbtc.png',
  EURC: 'eurc.png',
}

export function chainLogoFile(chainKey: string, chainId?: number): string | undefined {
  return CHAIN_LOGOS[chainKey] ?? (chainId != null ? CHAIN_LOGOS_BY_ID[chainId] : undefined)
}

/**
 * @param verified false when the token was user-imported; the symbol fallback is then
 *   suppressed so an imported look-alike never borrows a real project's logo.
 */
export function tokenLogoFile(
  chainId: number | undefined,
  address: string | undefined,
  symbol: string,
  verified = true,
): string | undefined {
  if (chainId != null && address) {
    const exact = TOKEN_LOGOS[tokenKey(chainId, address)]
    if (exact) return exact
  }
  if (!verified) return undefined
  return SYMBOL_LOGOS[symbol.toUpperCase()]
}

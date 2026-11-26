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
  11155420: '0x4200000000000000000000000000000000000006',
  84532: '0x4200000000000000000000000000000000000006',
  1301: '0x4200000000000000000000000000000000000006',
  /** Arbitrum Sepolia canonical WETH */
  421614: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
  /** Robinhood Chain Testnet - Synthra WETH */
  46630: '0x33e4191705c386532ba27cBF171Db86919200B94',
  /** Sei Testnet - Wrapped SEI (DragonSwap) */
  1328: '0xF8EB55EC97B59d91fe9E91A1d61147e0d2A7b6F7',
  /** Avalanche Fuji - Wrapped AVAX */
  43113: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c',
  /** Abstract Testnet - WETH9 (Uniswap V3/V2) */
  11124: '0x9EDCde0257F2386Ce177C3a7FCdd97787F0D841d',
  /** BNB Chain Testnet - WBNB (PancakeSwap V2/V3) */
  97: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
  /** Hedera Testnet - WHBAR HTS (SaucerSwap V2 0.0.15058) */
  296: '0x0000000000000000000000000000000000003aD2',
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
  t(11155111, '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4', 'EURC', 'Euro Coin', 6, 'token', '#1a5cff'),
  t(11155111, '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a', 'AAVE', 'Aave Token', 18, 'token', '#b6509e'),
  t(11155111, '0xc4bF5CbDaBE595361438F8c6a187bDc330539c60', 'GHO', 'Gho Token', 18, 'token', '#31c3a2'),
  t(11155111, '0x6d906e526a4e2Ca02097BA9d0caA3c382F52278E', 'EURS', 'STASIS EURO', 2, 'token', '#005bb5'),

  // ── OP Sepolia
  t(11155420, '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(11155420, '0x4200000000000000000000000000000000000006', 'WETH', 'Wrapped Ether', 18, 'weth', '#627eea'),
  t(11155420, '0xE4aB69C077896252FAFBD49EFD26B5D171A32410', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),

  // ── Base Sepolia
  t(84532, '0x036CbD53842c5426634e7929541eC2318f3dCF7e', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(84532, '0x4200000000000000000000000000000000000006', 'WETH', 'Wrapped Ether', 18, 'weth', '#627eea'),
  t(84532, '0x808456652fdb597867f38412077A9182bf77359F', 'EURC', 'Euro Coin', 6, 'token', '#1a5cff'),
  t(84532, '0xE4aB69C077896252FAFBD49EFD26B5D171A32410', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(84532, '0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a', 'USDT', 'Tether USD', 6, 'token', '#26a17b'),
  t(84532, '0x54114591963CF60EF3aA63bEfD6eC263D98145a4', 'WBTC', 'Wrapped BTC', 8, 'token', '#f7931a'),
  t(84532, '0xD171b9694f7A2597Ed006D41f7509aaD4B485c4B', 'cbETH', 'Coinbase Wrapped Staked ETH', 18, 'token', '#0052ff'),

  // ── Arbitrum Sepolia
  t(421614, '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(421614, '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73', 'WETH', 'Wrapped Ether', 18, 'weth', '#627eea'),
  t(421614, '0xb1D4538B4571d411F07960EF2838Ce337FE1E80E', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),

  // ── Unichain Sepolia
  t(1301, '0x31d0220469e10c4E71834a79b1f276d740d3768F', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(1301, '0x4200000000000000000000000000000000000006', 'WETH', 'Wrapped Ether', 18, 'weth', '#627eea'),

  // ── Avalanche Fuji (TraderJoe V1 + SushiSwap V2)
  t(43113, '0x5425890298aed601595a70AB815c96711a31Bc65', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(43113, '0x5E44db7996c682E92a960b65AC713a54AD815c6B', 'EURC', 'Euro Coin', 6, 'token', '#1a5cff'),
  t(43113, '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', 'WAVAX', 'Wrapped AVAX', 18, 'token', '#e84142'),
  t(43113, '0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),

  // ── Polygon Amoy
  t(80002, '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(80002, '0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9', 'WPOL', 'Wrapped Polygon Ecosystem Token', 18, 'token', '#7b3fe4'),
  t(80002, '0x52eF3d68BaB452a294342DC3e5f464d7f610f72E', 'WETH', 'Wrapped Ether', 18, 'token', '#627eea'),
  t(80002, '0x0Fd9e8d3aF1aaee056EB9e802c3A762a667b1904', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),

  // ── Linea Sepolia
  t(59141, '0xFEce4462D57bD51A6A552365A011b95f0E16d9B7', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(59141, '0x37854ca6A5bd92a08D0F282D22D3d05325c83781', 'WETH', 'Wrapped Ether', 18, 'weth', '#627eea'),
  t(59141, '0xF64E6E064a71B45514691D397ad4204972cD6508', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),

  // ── Codex Testnet
  t(812242, '0x6d7f141b6819C2c9CC2f818e6ad549E7Ca090F8f', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(812242, '0x4200000000000000000000000000000000000006', 'WETH', 'Wrapped Ether', 18, 'weth', '#627eea'),

  // ── World Chain Sepolia
  t(4801, '0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(4801, '0x4200000000000000000000000000000000000006', 'WETH', 'Wrapped Ether', 18, 'weth', '#627eea'),
  t(4801, '0xe479EcA5740Ac65d6E1823bea2f1c08Bc14e954F', 'EURC', 'Euro Coin', 6, 'token', '#1a5cff'),

  // ── Monad Testnet
  t(10143, '0x534b2f3A21130d7a60830c2Df862319e593943A3', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(10143, '0xFb8bf4c1CC7a94c73D209a149eA2AbEa852BC541', 'WMON', 'Wrapped MON', 18, 'token', '#836ef9'),

  // ── Sei Testnet (DragonSwap V2)
  t(1328, '0x4fCF1784B31630811181f670Aea7A7bEF803eaED', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(1328, '0xF8EB55EC97B59d91fe9E91A1d61147e0d2A7b6F7', 'WSEI', 'Wrapped SEI', 18, 'token', '#9e1f19'),

  // ── Ink Sepolia
  t(763373, '0xFabab97dCE620294D2B0b0e46C68964e326300Ac', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(763373, '0x4200000000000000000000000000000000000006', 'WETH', 'Wrapped Ether', 18, 'weth', '#627eea'),

  // ── Arc Testnet: native USDC + EURC + cirBTC
  t(5042002, '0x3600000000000000000000000000000000000000', 'USDC', 'USD Coin (native on Arc)', 6, 'usdc', '#2775ca'),
  t(5042002, '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', 'EURC', 'Euro Coin', 6, 'token', '#1a5cff'),
  t(5042002, '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF', 'cirBTC', 'Circle Wrapped BTC', 8, 'token', '#f7931a'),

  // ── Injective Testnet
  t(1439, '0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(1439, '0x0000000088827d2d103ee2d9A6b781773AE03FfB', 'WINJ', 'Wrapped INJ', 18, 'token', '#00b2ff'),

  // ── Plasma Testnet
  t(9746, '0xE67Fb267022cBA8064Dd388CC2FED724F3120D9D', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(9746, '0x6100E367285b01F48D07953803A2d8dCA5D19873', 'WXPL', 'Wrapped XPL', 18, 'token', '#7c3aed'),

  // ── X Layer Testnet
  t(1952, '0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),

  // ── GIWA Sepolia
  t(91342, '0x4200000000000000000000000000000000000006', 'WETH', 'Wrapped Ether', 18, 'weth', '#627eea'),

  // ── Robinhood Chain Testnet (Synthra V3 DEX) — WETH & USDC both have 18 decimals here
  t(46630, '0x33e4191705c386532ba27cBF171Db86919200B94', 'WETH', 'Wrapped Ether', 18, 'weth', '#627eea'),
  t(46630, '0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F', 'USDC', 'USD Coin', 18, 'usdc', '#2775ca'),
  t(46630, '0xC5124C846c6e6307986988dFb7e743327aA05F19', 'SYN', 'Synapse', 18, 'token', '#9e6de5'),
  t(46630, '0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02', 'AMZN', 'Amazon', 18, 'token', '#ff9900'),
  t(46630, '0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E', 'TSLA', 'Tesla', 18, 'token', '#e31937'),
  t(46630, '0x71178BAc73cBeb415514eB542a8995b82669778d', 'AMD', 'AMD', 18, 'token', '#ed1c24'),
  t(46630, '0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0', 'PLTR', 'Palantir Technologies', 18, 'token', '#101827'),
  t(46630, '0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93', 'NFLX', 'Netflix', 18, 'token', '#e50914'),

  // ── T-Rex Testnet
  t(1962, '0x24305a5E6F469950E9842e95A7D577D5522E5151', 'WETH', 'Wrapped Ether', 18, 'weth', '#627eea'),

  // ── Humanity Testnet
  t(7080969, '0xf15a69e2733f03273c37551927dC68Fef71926bf', 'vtHP', 'Locked tHP', 18, 'token', '#ff6b35'),
  t(7080969, '0xC039A75878cfe316a506f28B4BedCF43a6Bc21b6', 'WETH', 'Wrapped Ether', 18, 'weth', '#627eea'),

  // ── Plume Testnet
  t(98867, '0xcB5f30e335672893c7eb944B374c196392C19D18', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(98867, '0xC1FD14775c8665B31c7154074f537338774351EB', 'WPLUME', 'Wrapped Plume', 18, 'token', '#5b4fff'),
  t(98867, '0x1E0E030AbCb4f07de629DCCEa458a271e0E82624', 'pUSD', 'Plume USD', 6, 'token', '#c0392b'),

  // ── HPP Sepolia
  t(181228, '0x8ebCaf48D2D91b8CEcF1668A4519823881Bf8fc3', 'HPP', 'HousePartyProtocol', 18, 'token', '#ff4488'),
  t(181228, '0x401eCb1D350407f13ba348573E5630B83638E30D', 'USDC.e', 'Bridged USDC', 6, 'token', '#2775ca'),

  // ── JASMY Chain Testnet
  t(681, '0x714D183bC0958Aa813Ea376950E32AdD75AaD68E', 'WJASMY', 'Wrapped Jasmy', 18, 'token', '#1b56f5'),

  // ── Verified Circle USDC / EURC on existing & expanded testnets (checked on-chain 2026-11-26)
  t(9746, '0x98AfA0F93Dd993B736399f9074eDcEBD1985A330', 'EURC', 'Euro Coin', 6, 'token', '#1a5cff'),
  t(33431, '0x2d9F7CAD728051AA35Ecdc472a14cf8cDF5CFD6B', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(11142220, '0x01C5C0122039549AD1493B8220cABEdD739BC44E', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(338, '0xEb33dc5fac03833e132593659e1dE7256aB59794', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(338, '0x31f7538adb53cF16350e6B0c89d03D91b7D12c46', 'EURC', 'Euro Coin', 6, 'token', '#1a5cff'),
  t(998, '0x2B3370eE501B4a559b57D449569354196457D8Ab', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(2910, '0x7433b41C6c5e1d58D4Da99483609520255ab661B', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(688689, '0xcfC8330f4BCAB529c625D12781b1C19466A9Fc8B', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(51, '0xb5AB69F7bBada22B28e79C8FFAECe55eF1c771D4', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),
  t(300, '0xAe045DE5638162fa134807Cb558E15A3F5A7F853', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),

  // ── Verified Chainlink LINK tokens (eth_getCode + symbol() + decimals() verified on-chain 2026-11-26)
  t(1301, '0xda40816f278Cd049c137F6612822D181065EBfB4', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(1328, '0xA9d21ed8260DE08fF39DC5e7B65806d4e1CB817B', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(1952, '0xe5e3a4fF1773d043a387b16Ceb3c91cC49bAFD54', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(9746, '0xe5e3a4fF1773d043a387b16Ceb3c91cC49bAFD54', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(10143, '0xe5e3a4fF1773d043a387b16Ceb3c91cC49bAFD54', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(33431, '0xD610B8f58689de7755947C05342A2DFaC30ebD57', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(46630, '0xD610B8f58689de7755947C05342A2DFaC30ebD57', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(98867, '0xB97e3665AEAF96BDD6b300B2e0C93C662104A068', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(5042002, '0x3F1f176e347235858DD6Db905DDBA09Eaf25478a', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(26888, '0xe5e3a4fF1773d043a387b16Ceb3c91cC49bAFD54', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(11124, '0x6641415a61bCe80D97a715054d1334360Ab833Eb', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(99999, '0x64c12A9Bfdb4DEB5F37A0eC4c5fae0405669612A', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(81, '0xe74037112db8807b3b4b3895f5790e5bc1866a29', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(80069, '0x5aD0A67f4Da0E8665a3fbf15E4215A780407Cf33', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(97, '0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(808813, '0xcd2AfB2933391E35e8682cbaaF75d9CA7339b183', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(1114, '0x6C475841d1D7871940E93579E5DBaE01634e17aA', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(102031, '0xCff3838dCB78502Ebb718b30cEb4d87377eb2d2d', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(338, '0x2896e619Fa7c831A7E52b87EffF4d671bEc6B262', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(240, '0xB96217A159cB11Bc51E87c8CAe46C7dF8826A827', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(6281971, '0xe5e3a4fF1773d043a387b16Ceb3c91cC49bAFD54', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(560048, '0x76c00B055414de203B79B4955E28119BF459033e', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(10200, '0xDCA67FD8324990792C0bfaE95903B8A64097754F', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(7771625, '0xe5e3a4fF1773d043a387b16Ceb3c91cC49bAFD54', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(296, '0x90a386d59b9A6a4795a011e8f032Fc21ED6FEFb6', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(2019775, '0xd3e461C55676B10634a5F81b747c324B85686Dd1', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(1001, '0xAF3243f975afe2269Da8Ffa835CA3A8F8B6A5A36', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(4202, '0x6641415a61bCe80D97a715054d1334360Ab833Eb', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(5003, '0x22bdEdEa0beBdD7CfFC95bA53826E55afFE9DE04', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(6343, '0xAd1652471967E7FBf524245782A7f4430F6a4243', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(1740, '0x7ECBE3416d92E8d79C8e5d8EB8Aad5DdEdAa0237', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(59902, '0x9870D6a0e05F867EAAe696e106741843F7fD116D', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(919, '0x925a4bfE64AE2bFAC8a02b35F78e60C29743755d', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(2910, '0xe5e3a4fF1773d043a387b16Ceb3c91cC49bAFD54', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(10323, '0xe5e3a4fF1773d043a387b16Ceb3c91cC49bAFD54', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(5611, '0x56E16E648c51609A14Eb14B99BAB771Bee797045', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(688689, '0x2f79e049f552E600D5d8118923278Aa0fCD67179', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(202601, '0x2282DA461850d900ba7E777b6D4161a415860931', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(157, '0x44637eEfD71A090990f89faEC7022fc74B2969aD', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(1946, '0x7ea13478Ea3961A0e8b538cb05a9DF0477c79Cd2', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(2391, '0xe5e3a4fF1773d043a387b16Ceb3c91cC49bAFD54', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(42431, '0xEAB080c724587fFC9F2EFF82e36EE4Fb27774959', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(1112, '0x3580c7a817ccd41f7e02143bfa411d4eeae78093', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(51, '0xe5e3a4fF1773d043a387b16Ceb3c91cC49bAFD54', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),
  t(300, '0x23A1aFD896c8c8876AF46aDc38521f4432658d1e', 'LINK', 'ChainLink Token', 18, 'token', '#2a5ada'),

  // ── Abstract Testnet DEX tokens (Uniswap V3/V2, verified on-chain 2026-11-26)
  t(11124, '0x9EDCde0257F2386Ce177C3a7FCdd97787F0D841d', 'WETH', 'Wrapped Ether', 18, 'weth', '#627eea'),
  t(11124, '0xe4C7fBB0a626ed208021ccabA6Be1566905E2dFc', 'USDC', 'USD Coin', 6, 'usdc', '#2775ca'),

  // ── BNB Chain Testnet DEX tokens (PancakeSwap V2/V3, verified on-chain 2026-11-26)
  t(97, '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', 'WBNB', 'Wrapped BNB', 18, 'weth', '#f0b90b'),
  t(97, '0x64544969ed7EBf5f083679233325356EbE738930', 'USDC', 'USD Coin', 18, 'usdc', '#2775ca'),
  t(97, '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd', 'USDT', 'Tether USD', 18, 'token', '#26a17b'),
  t(97, '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee', 'BUSD', 'Binance USD', 18, 'token', '#f0b90b'),
  t(97, '0xFa60D973F7642B748046464e165A65B7323b0DEE', 'Cake', 'PancakeSwap Token', 18, 'token', '#1fc7d4'),
  t(97, '0xEC5dCb5Dbf4B114C9d0F65BcCAb49EC54F6A0867', 'DAI', 'Dai Token', 18, 'token', '#f5ac37'),
  t(97, '0xd66c6B4F0be8CE5b39D52E0Fd1344c389929B378', 'ETH', 'Ethereum Token', 18, 'token', '#627eea'),
  t(97, '0x6ce8dA28E2f864420840cF74474eFf5fD80E65B8', 'BTCB', 'BTCB Token', 18, 'token', '#f7931a'),

  // ── Hedera Testnet DEX & HTS tokens (SaucerSwap V2 + Circle HTS, verified 2026-11-26)
  t(296, '0x0000000000000000000000000000000000003aD2', 'WHBAR', 'Wrapped HBAR (HTS)', 8, 'weth', '#8259ef'),
  t(296, '0x0000000000000000000000000000000000001549', 'USDC', 'USD Coin (SaucerSwap 0.0.5449)', 6, 'usdc', '#2775ca'),
  t(296, '0x0000000000000000000000000000000000068cDa', 'USDC', 'USD Coin (Circle HTS 0.0.429274)', 6, 'usdc', '#2775ca'),
  t(296, '0x0000000000000000000000000000000000120f46', 'SAUCE', 'SaucerSwap (0.0.1183558)', 6, 'token', '#22d3ee'),
  t(296, '0x0000000000000000000000000000000000428957', 'HLQT', 'HeliSwap Liquidity', 8, 'token', '#38bdf8'),
  t(296, '0x00000000000000000000000000000000003991ed', 'KARATE', 'Karate Combat', 8, 'token', '#ef4444'),
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

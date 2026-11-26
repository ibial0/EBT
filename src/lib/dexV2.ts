/**
 * Uniswap V2-style AMM integration for testnet chains that use a V2 router
 * instead of Uniswap V3.
 *
 * Supported chains:
 *  - Sei Testnet (1328)     — DragonSwap V2 (swapExactSEIForTokens / swapExactTokensForSEI)
 *  - Avalanche Fuji (43113) — TraderJoe V1 (swapExactAVAXForTokens / swapExactTokensForAVAX) + SushiSwap V2
 *
 * Verified on-chain with eth_call simulations on 2026-11-26.
 */
import { parseAbi, encodeFunctionData } from 'viem'
import type { PublicClient } from 'viem'
import type { Address, ChainCfg } from '../config/chains'
import { assertSwapRoute } from './guard'
import { erc20Abi } from './uniswap'
import { prepareTx, type PreparedTx } from './tx'
import { buildApproveCalldata } from './swapExec'

// ── ABIs ──────────────────────────────────────────────────────────────────────

export const v2RouterAbi = parseAbi([
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function getAmountsIn(uint amountOut, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactAVAXForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForAVAX(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactSEIForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForSEI(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function factory() view returns (address)',
])

export const v2PairAbi = parseAbi([
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
])

export const v2FactoryAbi = parseAbi([
  'function getPair(address tokenA, address tokenB) view returns (address pair)',
])

// ── Chain-specific configs ────────────────────────────────────────────────────

export type NativeFnStyle = 'eth' | 'avax' | 'sei'

export interface V2DexConfig {
  /** Human-readable name */
  name: string
  /** UniswapV2Router02-compatible router address */
  router: Address
  /** UniswapV2Factory address */
  factory: Address
  /** Wrapped native token (WETH / WSEI / WAVAX) */
  wrappedNative: Address
  /** Native swap function family verified on this router */
  nativeFnStyle: NativeFnStyle
}

/** V2 DEX configs keyed by chainId (with verified native function selectors). */
export const V2_DEXES: Record<number, V2DexConfig[]> = {
  /** Sei Testnet — DragonSwap V2 */
  1328: [
    {
      name: 'DragonSwap V2',
      router: '0x527b42CA5e11370259EcaE68561C14dA415477C8',
      factory: '0xeE6Ad607238f8d2C63767245d78520F06c303D31',
      wrappedNative: '0xF8EB55EC97B59d91fe9E91A1d61147e0d2A7b6F7', // WSEI
      nativeFnStyle: 'sei',
    },
  ],
  /** Avalanche Fuji — SushiSwap V2 + TraderJoe V1 */
  43113: [
    {
      name: 'TraderJoe V1',
      router: '0xd7f655E3376cE2D7A2b08fF01Eb3B1023191A901',
      factory: '0xF5c7d9733e5f53abCC1695820c4818C59B457C2C',
      wrappedNative: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', // WAVAX
      nativeFnStyle: 'avax',
    },
    {
      name: 'SushiSwap V2',
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      wrappedNative: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', // WAVAX
      nativeFnStyle: 'eth',
    },
  ],
  /** Abstract Testnet — Uniswap V2 */
  11124: [
    {
      name: 'Uniswap V2',
      router: '0x96ff7D9dbf52FdcAe79157d3b249282c7FABd409',
      factory: '0x566d7510dEE58360a64C9827257cF6D0Dc43985E',
      wrappedNative: '0x9EDCde0257F2386Ce177C3a7FCdd97787F0D841d', // WETH9
      nativeFnStyle: 'eth',
    },
  ],
  /** BNB Chain Testnet — PancakeSwap V2 */
  97: [
    {
      name: 'PancakeSwap V2',
      router: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
      factory: '0x6725F303b657a9451d8BA641348b6761A6CC7a17',
      wrappedNative: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // WBNB
      nativeFnStyle: 'eth',
    },
  ],
}

export interface V2PairCfg {
  chainId: number
  token0: Address
  token1: Address
  dexName: string
  pair: Address
}

/** Tradeable pairs verified with non-zero on-chain reserves on 2026-11-26. */
export const V2_PAIRS: V2PairCfg[] = [
  // Sei Testnet — DragonSwap V2 (Circle USDC / WSEI)
  {
    chainId: 1328,
    token0: '0x4fCF1784B31630811181f670Aea7A7bEF803eaED', // USDC
    token1: '0xF8EB55EC97B59d91fe9E91A1d61147e0d2A7b6F7', // WSEI
    dexName: 'DragonSwap V2',
    pair: '0x7DC571F2B6046edC0B14473340D9704A1459d195',
  },
  // Avalanche Fuji — SushiSwap V2 & TraderJoe V1
  {
    chainId: 43113,
    token0: '0x5425890298aed601595a70AB815c96711a31Bc65', // USDC
    token1: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', // WAVAX
    dexName: 'SushiSwap V2',
    pair: '0x1B92bf7394d317A758d953F6428445A8977e195C',
  },
  {
    chainId: 43113,
    token0: '0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846', // LINK
    token1: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', // WAVAX
    dexName: 'TraderJoe V1',
    pair: '0x5ECdA10aAC1f275327b552277dB0cB13135fcEDa',
  },
  {
    chainId: 43113,
    token0: '0x5425890298aed601595a70AB815c96711a31Bc65', // USDC (via 2-hop TraderJoe WAVAX)
    token1: '0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846', // LINK
    dexName: 'TraderJoe V1 (2-hop)',
    pair: '0x8436B8c75ed2F015a80b8472526dd1A79BF54E38',
  },
  // Abstract Testnet — Uniswap V2 (WETH / USDC)
  {
    chainId: 11124,
    token0: '0x9EDCde0257F2386Ce177C3a7FCdd97787F0D841d', // WETH
    token1: '0xe4C7fBB0a626ed208021ccabA6Be1566905E2dFc', // USDC
    dexName: 'Uniswap V2',
    pair: '0xdD6C76447B06e814dFF9D307020618993321F479',
  },
  // BNB Chain Testnet — PancakeSwap V2 (all paired via WBNB for direct + 2-hop swaps)
  {
    chainId: 97,
    token0: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // WBNB
    token1: '0x64544969ed7EBf5f083679233325356EbE738930', // USDC
    dexName: 'PancakeSwap V2',
    pair: '0xBBbEA32C9f6400d36ABA0804F907bd860BA8a96f',
  },
  {
    chainId: 97,
    token0: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // WBNB
    token1: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd', // USDT
    dexName: 'PancakeSwap V2',
    pair: '0x5F52Ad4bD4f519AE79999400ad8B83A3D002fD92',
  },
  {
    chainId: 97,
    token0: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // WBNB
    token1: '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee', // BUSD
    dexName: 'PancakeSwap V2',
    pair: '0x575Cb459b6E6B8187d3Ef9a25105D64011874820',
  },
  {
    chainId: 97,
    token0: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // WBNB
    token1: '0xFa60D973F7642B748046464e165A65B7323b0DEE', // Cake
    dexName: 'PancakeSwap V2',
    pair: '0xa96818CA65B57bEc2155Ba5c81a70151f63300CD',
  },
  {
    chainId: 97,
    token0: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // WBNB
    token1: '0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06', // LINK
    dexName: 'PancakeSwap V2',
    pair: '0x51a92448E8D1360B84589E1255aadAb4e685811C',
  },
  {
    chainId: 97,
    token0: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // WBNB
    token1: '0xEC5dCb5Dbf4B114C9d0F65BcCAb49EC54F6A0867', // DAI
    dexName: 'PancakeSwap V2',
    pair: '0xE38f211555f87D5f11f64a5fbB910FC3b87d59aD',
  },
  {
    chainId: 97,
    token0: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // WBNB
    token1: '0xd66c6B4F0be8CE5b39D52E0Fd1344c389929B378', // ETH
    dexName: 'PancakeSwap V2',
    pair: '0x4D6F42B822A6Dff31e54f4FC1EEEffD5Ed8830Dd',
  },
  {
    chainId: 97,
    token0: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // WBNB
    token1: '0x6ce8dA28E2f864420840cF74474eFf5fD80E65B8', // BTCB
    dexName: 'PancakeSwap V2',
    pair: '0x012d9cEB1aaE02d31f5665275175Bd8A7c55CDd2',
  },
]

const v2PairsCache = new Map<number, Array<{ token0: Address; token1: Address }>>()

export function v2PairsForChain(chainId: number): Array<{ token0: Address; token1: Address }> {
  const cached = v2PairsCache.get(chainId)
  if (cached) return cached
  const built = buildV2PairsForChain(chainId)
  v2PairsCache.set(chainId, built)
  return built
}

function buildV2PairsForChain(chainId: number): Array<{ token0: Address; token1: Address }> {
  const direct = V2_PAIRS.filter((p) => p.chainId === chainId)
  const out = direct.map(({ token0, token1 }) => ({ token0, token1 }))
  const dexes = V2_DEXES[chainId] ?? []
  for (const dex of dexes) {
    const w = dex.wrappedNative.toLowerCase()
    const peers: Address[] = []
    for (const p of direct) {
      if (p.dexName !== dex.name) continue
      const t0 = p.token0.toLowerCase()
      const t1 = p.token1.toLowerCase()
      if (t0 === w) peers.push(p.token1)
      else if (t1 === w) peers.push(p.token0)
    }
    for (let i = 0; i < peers.length; i++) {
      for (let j = i + 1; j < peers.length; j++) {
        out.push({ token0: peers[i], token1: peers[j] })
      }
    }
  }
  return out
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface V2Quote {
  /** Amount of output tokens (raw, before slippage) */
  amountOut: bigint
  amountOutFormatted: string
  /** The DEX that produced this quote */
  dexName: string
  /** Winning router address for approval and swap execution */
  router: Address
  /** Wrapped native address on this DEX */
  wrappedNative: Address
  /** Native function naming style used by this router */
  nativeFnStyle: NativeFnStyle
  /** Route path: [tokenIn, tokenOut] or [tokenIn, wrappedNative, tokenOut] */
  path: Address[]
  priceImpactBps: number | null
  route: string
}

// ── Quote functions ───────────────────────────────────────────────────────────

async function getV2Quote(
  client: PublicClient,
  dex: V2DexConfig,
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
): Promise<{ amountOut: bigint; path: Address[] } | null> {
  if (amountIn <= 0n || tokenIn.toLowerCase() === tokenOut.toLowerCase()) return null

  const tryPath = async (path: Address[]): Promise<bigint | null> => {
    try {
      const amounts = (await client.readContract({
        address: dex.router,
        abi: v2RouterAbi,
        functionName: 'getAmountsOut',
        args: [amountIn, path],
      })) as readonly bigint[]
      const out = amounts[amounts.length - 1]
      return out > 0n ? out : null
    } catch {
      return null
    }
  }

  // Try direct path first
  const direct = await tryPath([tokenIn, tokenOut])
  if (direct !== null) return { amountOut: direct, path: [tokenIn, tokenOut] }

  // Try 2-hop via wrapped native
  if (
    tokenIn.toLowerCase() !== dex.wrappedNative.toLowerCase() &&
    tokenOut.toLowerCase() !== dex.wrappedNative.toLowerCase()
  ) {
    const twoHop = await tryPath([tokenIn, dex.wrappedNative, tokenOut])
    if (twoHop !== null) return { amountOut: twoHop, path: [tokenIn, dex.wrappedNative, tokenOut] }
  }

  return null
}

/**
 * Best V2 quote across all configured DEXes for a chain.
 * Probes at 10% size to estimate marginal price impact and compares all routers in parallel.
 */
export async function quoteBestV2(
  client: PublicClient,
  chainId: number,
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  _tokenInDecimals: number,
  _tokenOutDecimals: number,
): Promise<V2Quote | null> {
  const dexes = V2_DEXES[chainId]
  if (!dexes || amountIn <= 0n) return null

  const candidates = await Promise.all(
    dexes.map(async (dex) => {
      const result = await getV2Quote(client, dex, tokenIn, tokenOut, amountIn)
      if (!result) return null
      return { dex, ...result }
    }),
  )

  const usable = candidates.filter(Boolean) as Array<{ dex: V2DexConfig; amountOut: bigint; path: Address[] }>
  if (usable.length === 0) return null

  const best = usable.reduce((a, b) => (b.amountOut > a.amountOut ? b : a))

  let priceImpactBps: number | null = null
  try {
    const probeAmt = amountIn / 10n > 0n ? amountIn / 10n : 1n
    const probeResult = await getV2Quote(client, best.dex, tokenIn, tokenOut, probeAmt)
    if (probeResult && probeResult.amountOut > 0n) {
      const rateMain = (best.amountOut * 1_000_000n) / amountIn
      const rateProbe = (probeResult.amountOut * 1_000_000n) / probeAmt
      if (rateProbe > 0n) {
        const diff = rateProbe > rateMain ? rateProbe - rateMain : 0n
        priceImpactBps = Number((diff * 10000n) / rateProbe)
        if (priceImpactBps > 9000) priceImpactBps = null
      }
    }
  } catch {
    /* ignore impact probe errors */
  }

  const hopDesc = best.path.length === 3 ? '2-hop' : 'direct'

  return {
    amountOut: best.amountOut,
    amountOutFormatted: best.amountOut.toString(),
    dexName: best.dex.name,
    router: best.dex.router,
    wrappedNative: best.dex.wrappedNative,
    nativeFnStyle: best.dex.nativeFnStyle,
    path: best.path,
    priceImpactBps,
    route: `${best.dex.name}, ${hopDesc}`,
  }
}

// ── Execution ─────────────────────────────────────────────────────────────────

export interface V2SwapParams {
  chainId: number
  dexName: string
  router: Address
  nativeFnStyle: NativeFnStyle
  account: Address
  tokenIn: Address | null // null = native
  tokenOut: Address | null // null = native
  wrappedNative: Address
  amountIn: bigint
  amountOutMinimum: bigint
  path: Address[]
  deadline?: bigint
}

const NATIVE_IN_FN: Record<NativeFnStyle, 'swapExactETHForTokens' | 'swapExactAVAXForTokens' | 'swapExactSEIForTokens'> = {
  eth: 'swapExactETHForTokens',
  avax: 'swapExactAVAXForTokens',
  sei: 'swapExactSEIForTokens',
}

const NATIVE_OUT_FN: Record<NativeFnStyle, 'swapExactTokensForETH' | 'swapExactTokensForAVAX' | 'swapExactTokensForSEI'> = {
  eth: 'swapExactTokensForETH',
  avax: 'swapExactTokensForAVAX',
  sei: 'swapExactTokensForSEI',
}

/**
 * Builds exact calldata for a Uniswap V2-style swap, dispatching the native function
 * variant expected by each router (ETH vs AVAX vs SEI).
 */
export function buildV2SwapCalldata(params: V2SwapParams): {
  to: Address
  data: `0x${string}`
  value: bigint
} {
  const deadline = params.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 1200)
  const nativeIn = params.tokenIn === null
  const nativeOut = params.tokenOut === null

  let data: `0x${string}`
  let value = 0n

  if (nativeIn) {
    value = params.amountIn
    data = encodeFunctionData({
      abi: v2RouterAbi,
      functionName: NATIVE_IN_FN[params.nativeFnStyle],
      args: [params.amountOutMinimum, params.path, params.account, deadline],
    })
  } else if (nativeOut) {
    data = encodeFunctionData({
      abi: v2RouterAbi,
      functionName: NATIVE_OUT_FN[params.nativeFnStyle],
      args: [params.amountIn, params.amountOutMinimum, params.path, params.account, deadline],
    })
  } else {
    data = encodeFunctionData({
      abi: v2RouterAbi,
      functionName: 'swapExactTokensForTokens',
      args: [params.amountIn, params.amountOutMinimum, params.path, params.account, deadline],
    })
  }

  return { to: params.router, data, value }
}

export async function executeV2Swap(p: {
  chain: ChainCfg
  account: Address
  tokenIn: Address | null
  tokenOut: Address | null
  amountIn: bigint
  amountOutMinimum: bigint
  quote: V2Quote
  wallet: { sendTransaction: (tx: PreparedTx) => Promise<`0x${string}`> }
  publicClient: PublicClient
  onStep?: (step: 'approve' | 'swap', state: 'active' | 'done' | 'failed', hash?: string) => void
}): Promise<{ swapHash: `0x${string}`; approveHash?: `0x${string}` }> {
  const chain = assertSwapRoute(p.chain.id)
  const router = p.quote.router
  let approveHash: `0x${string}` | undefined

  if (p.tokenIn !== null) {
    const token = p.tokenIn
    const allowance = (await p.publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [p.account, router],
    })) as bigint

    if (allowance < p.amountIn) {
      p.onStep?.('approve', 'active')
      try {
        const approveTx = await prepareTx(p.publicClient, chain, {
          to: token,
          data: buildApproveCalldata(router, p.amountIn),
          account: p.account,
        })
        approveHash = await p.wallet.sendTransaction(approveTx)
        const rc = await p.publicClient.waitForTransactionReceipt({ hash: approveHash })
        if (rc.status !== 'success') throw new Error('Approval transaction reverted.')
        p.onStep?.('approve', 'done', approveHash)
      } catch (e) {
        p.onStep?.('approve', 'failed')
        throw e
      }
    } else {
      p.onStep?.('approve', 'done')
    }
  } else {
    p.onStep?.('approve', 'done')
  }

  const tx = buildV2SwapCalldata({
    chainId: chain.id,
    dexName: p.quote.dexName,
    router,
    nativeFnStyle: p.quote.nativeFnStyle,
    account: p.account,
    tokenIn: p.tokenIn,
    tokenOut: p.tokenOut,
    wrappedNative: p.quote.wrappedNative,
    amountIn: p.amountIn,
    amountOutMinimum: p.amountOutMinimum,
    path: p.quote.path,
  })

  p.onStep?.('swap', 'active')
  let swapHash: `0x${string}`
  try {
    const prepared = await prepareTx(p.publicClient, chain, { ...tx, account: p.account })
    swapHash = await p.wallet.sendTransaction(prepared)
  } catch (e) {
    p.onStep?.('swap', 'failed')
    throw e
  }
  const rc = await p.publicClient.waitForTransactionReceipt({ hash: swapHash })
  if (rc.status !== 'success') {
    p.onStep?.('swap', 'failed', swapHash)
    throw new Error('Swap transaction reverted on-chain.')
  }
  p.onStep?.('swap', 'done', swapHash)
  return { swapHash, approveHash }
}

/** True when a chain uses the V2-style DEX (no Uniswap V3 quoter). */
export function hasV2Dex(chainId: number): boolean {
  return Boolean(V2_DEXES[chainId]?.length)
}

/** Returns the primary DEX config for a chain, or null. */
export function primaryV2Dex(chainId: number): V2DexConfig | null {
  return V2_DEXES[chainId]?.[0] ?? null
}

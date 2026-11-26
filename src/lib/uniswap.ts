/**
 * Uniswap v3, direct on-chain integration (no Trading API key).
 *
 * Verified 2026-11-23:
 *  - Deployment addresses come from @uniswap/sdk-core CHAIN_TO_ADDRESSES_MAP (official npm package).
 *  - Live QuoterV2 eth_call returns real amounts on Ethereum Sepolia, Base Sepolia and Unichain Sepolia.
 */
import { formatUnits, parseAbi } from 'viem'
import type { PublicClient } from 'viem'
import type { ChainCfg, Address } from '../config/chains'

export const quoterV2Abi = parseAbi([
  'function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)',
])

export const swapRouter02Abi = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
  'function multicall(bytes[] data) payable returns (bytes[] results)',
  'function wrapETH(uint256 amount) payable',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) payable',
  'function refundETH() payable',
])

export const swapRouterV1Abi = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
])

export const v3FactoryAbi = parseAbi([
  'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)',
])

export const poolAbi = parseAbi([
  'function slot0() view returns (uint160 sqrtPriceX96,int24 tick,uint16 observationIndex,uint16 observationCardinality,uint16 observationCardinalityNext,uint8 feeProtocol,bool unlocked)',
  'function liquidity() view returns (uint128)',
  'function token0() view returns (address)',
])

export const erc20Abi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
])

export const ADDRESS_THIS: Address = '0x0000000000000000000000000000000000000002'
export const FEE_TIERS = [100, 500, 3000, 10000] as const
export const MAX_UINT256 = 2n ** 256n - 1n

export interface SwapQuote {
  fee: number
  amountOut: bigint
  amountOutFormatted: string
  priceImpactBps: number | null
  route: string
}

/**
 * Tries every live fee tier and returns the best quote that is actually fillable.
 *
 * Thin testnet pools make QuoterV2 return a *partial* fill without reverting, which looks
 * like a great rate (a 23 USDC swap "quoting" 1.25 EURC). Every candidate is therefore
 * probed at a quarter of the amount: a real quote must grow with size. Anything flat or
 * shrinking is rejected instead of being offered to the wallet.
 */
export async function quoteBest(
  client: PublicClient,
  chain: ChainCfg,
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
): Promise<SwapQuote | null> {
  const dep = chain.uniswap
  if (!dep || amountIn <= 0n) return null

  const read = async (fee: number, amount: bigint): Promise<bigint | null> => {
    try {
      const [out] = (await client.readContract({
        address: dep.quoter,
        abi: quoterV2Abi,
        functionName: 'quoteExactInputSingle',
        args: [{ tokenIn, tokenOut, amountIn: amount, fee, sqrtPriceLimitX96: 0n }],
      })) as readonly [bigint, bigint, number, bigint]
      return out > 0n ? out : null
    } catch {
      return null // no pool, or not enough liquidity at this tier
    }
  }

  const probeAmount = amountIn / 2n > 0n ? amountIn / 2n : 1n
  const tiers = dep.feeTiers ?? FEE_TIERS
  const candidates = await Promise.all(
    tiers.map(async (fee) => {
      const [out, probe] = await Promise.all([read(fee, amountIn), read(fee, probeAmount)])
      if (out === null || probe === null) return null
      // a genuine quote must beat the smaller probe; flat output means a partial fill.
      // below ~0.001 token the two outputs can round to the same integer, so dust is exempt.
      const dust = probeAmount < 1000n
      if (!dust && out <= probe) return null
      const perUnit = (out * 1_000_000n) / amountIn
      const probePerUnit = (probe * 1_000_000n) / probeAmount
      // reject tiers whose marginal rate improves with size (impossible in an AMM)
      if (perUnit > probePerUnit) return null
      return { fee, amountOut: out }
    }),
  )

  const usable = candidates.filter(Boolean) as Array<{ fee: number; amountOut: bigint }>
  if (usable.length === 0) return null
  const best = usable.reduce((a, b) => (b.amountOut > a.amountOut ? b : a))

  const impact = await priceImpactBps(client, chain, tokenIn, tokenOut, amountIn, best.amountOut, best.fee)
  if (impact != null && impact > 9000) return null

  return {
    fee: best.fee,
    amountOut: best.amountOut,
    amountOutFormatted: best.amountOut.toString(),
    priceImpactBps: impact,
    route: `Uniswap v3, ${best.fee / 10000}% pool, single hop`,
  }
}

/**
 * Largest input the best pool can genuinely fill right now (binary search on the same
 * validity rule). Used to turn "no route" into an actionable number.
 */
const depthCache = new Map<string, { at: number; value: { amount: bigint; fee: number; impactBps: number | null } | null }>()

export async function maxFillable(
  client: PublicClient,
  chain: ChainCfg,
  tokenIn: Address,
  tokenOut: Address,
  ceiling: bigint,
  maxImpactBps = 500,
): Promise<{ amount: bigint; fee: number; impactBps: number | null } | null> {
  const dep = chain.uniswap
  if (!dep || ceiling <= 0n) return null

  const key = `${chain.id}:${tokenIn.toLowerCase()}:${tokenOut.toLowerCase()}`
  const hit = depthCache.get(key)
  if (hit && Date.now() - hit.at < 60_000) return hit.value

  const read = async (fee: number, amount: bigint): Promise<bigint | null> => {
    try {
      const [out] = (await client.readContract({
        address: dep.quoter,
        abi: quoterV2Abi,
        functionName: 'quoteExactInputSingle',
        args: [{ tokenIn, tokenOut, amountIn: amount, fee, sqrtPriceLimitX96: 0n }],
      })) as readonly [bigint, bigint, number, bigint]
      return out > 0n ? out : null
    } catch {
      return null
    }
  }

  const valid = async (fee: number, amount: bigint) => {
    if (amount <= 0n) return false
    const probe = amount / 2n > 0n ? amount / 2n : 1n
    const [out, small] = await Promise.all([read(fee, amount), read(fee, probe)])
    if (out === null || small === null) return false
    const dust = amount < 2000n
    if (!dust && out <= small) return false
    if (dust) return true
    return (out * 1_000_000n) / amount <= (small * 1_000_000n) / probe
  }

  // every tier is searched in parallel so the UI waits on the slowest one, not the sum
  const tiers = dep.feeTiers ?? FEE_TIERS
  const perTier = await Promise.all(
    tiers.map(async (fee) => {
      let lo = ceiling / 1000n
      if (lo === 0n) lo = 1n
      let hi = ceiling
      if (!(await valid(fee, lo))) return null
      if (await valid(fee, hi)) return { amount: hi, fee }
      for (let i = 0; i < 9 && hi - lo > lo / 40n + 1n; i++) {
        const mid = (lo + hi) / 2n
        if (mid === lo || mid === hi) break
        if (await valid(fee, mid)) lo = mid
        else hi = mid
      }
      return { amount: lo, fee }
    }),
  )

  const usable = perTier.filter(Boolean) as Array<{ amount: bigint; fee: number }>
  let best: { amount: bigint; fee: number } | null = usable.length
    ? usable.reduce((a, b) => (b.amount > a.amount ? b : a))
    : null

  // a fill that only works at a huge price impact is not a useful suggestion: walk it down
  let impact: number | null = null
  if (best) {
    for (let i = 0; i < 5; i++) {
      const out = await read(best.fee, best.amount)
      if (out === null) break
      impact = await priceImpactBps(client, chain, tokenIn, tokenOut, best.amount, out, best.fee)
      if (impact == null || impact <= maxImpactBps) break
      const smaller: bigint = best.amount / 2n
      if (smaller < 1000n) break
      best = { amount: smaller, fee: best.fee }
    }
  }

  const value = best ? { ...best, impactBps: impact } : null
  depthCache.set(key, { at: Date.now(), value })
  return value
}

/**
 * Price impact vs. the pool's current mid price.
 * spot = (sqrtPriceX96^2 / 2^192) gives tokenOut per tokenIn in raw units.
 */
async function priceImpactBps(
  client: PublicClient,
  chain: ChainCfg,
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  quoteOut: bigint,
  fee: number,
): Promise<number | null> {
  const dep = chain.uniswap
  if (!dep) return null
  try {
    const pool = (await client.readContract({
      address: dep.factory,
      abi: v3FactoryAbi,
      functionName: 'getPool',
      args: [tokenIn, tokenOut, fee],
    })) as Address
    if (!pool || pool === '0x0000000000000000000000000000000000000000') return null
    const slot0 = (await client.readContract({ address: pool, abi: poolAbi, functionName: 'slot0' })) as readonly [
      bigint, number, number, number, number, number, boolean,
    ]
    const token0 = (await client.readContract({ address: pool, abi: poolAbi, functionName: 'token0' })) as Address
    const sqrt = slot0[0]
    if (sqrt === 0n) return null
    // Uniswap stores sqrt(token1/token0); invert when we are selling token1.
    const spotOut =
      token0.toLowerCase() === tokenIn.toLowerCase()
        ? (amountIn * sqrt * sqrt) / 2n ** 192n
        : (amountIn * 2n ** 192n) / (sqrt * sqrt)
    if (spotOut === 0n) return null
    const bps = Number(((spotOut - quoteOut) * 10000n) / spotOut)
    if (bps > 9000) return null // pool state looks unusable, do not report a fake 99% impact
    return Math.max(0, bps)
  } catch {
    return null
  }
}

export function applySlippage(amountOut: bigint, slippageBps: number): bigint {
  return (amountOut * BigInt(10_000 - slippageBps)) / 10_000n
}

export function formatAmount(raw: bigint, decimals: number, maxFrac = 6): string {
  const s = formatUnits(raw, decimals)
  const [w, f = ''] = s.split('.')
  if (!f) return w
  const trimmed = f.slice(0, maxFrac).replace(/0+$/, '')
  return trimmed ? `${w}.${trimmed}` : w
}

export async function erc20Balance(client: PublicClient, token: Address, owner: Address): Promise<bigint> {
  return (await client.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [owner] })) as bigint
}

export async function erc20Allowance(
  client: PublicClient,
  token: Address,
  owner: Address,
  spender: Address,
): Promise<bigint> {
  return (await client.readContract({ address: token, abi: erc20Abi, functionName: 'allowance', args: [owner, spender] })) as bigint
}

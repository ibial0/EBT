/**
 * Liquidity intelligence for the Overview dashboard.
 *
 * Everything here is read from the pools themselves: `liquidity()`, `token0/token1`
 * and the two ERC-20 `balanceOf(pool)` calls. No aggregator, no invented USD value.
 *
 * Status is derived from the two reserves and never from a price feed. Because the
 * two legs are different tokens with different prices, only an effectively empty leg
 * can be called out safely; the two amounts are never compared to each other:
 *   drained  one leg is dust (< 0.01 token) while the other is substantial
 *   active   both legs hold a usable amount
 */
import { createPublicClient, http, formatUnits, parseAbi, type Address } from 'viem'
import { CHAINS, getChain } from '../config/chains'
import { POOLS, type PoolCfg } from '../config/pools'
import { findToken } from '../config/tokens'

const POOL_ABI = parseAbi([
  'function liquidity() view returns (uint128)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
])
const ERC20 = parseAbi(['function balanceOf(address) view returns (uint256)'])

/** a leg below this many whole tokens counts as dust */
const DUST = 0.01
/** the other leg must be at least this large for the dust reading to mean "drained" */
const SUBSTANTIAL = 1

export type PoolStatus = 'active' | 'drained' | 'unreachable'

export interface PoolSnapshot {
  chainId: number
  pool: Address
  fee: number
  token0: Address
  token1: Address
  symbol0: string
  symbol1: string
  decimals0: number
  decimals1: number
  reserve0: bigint | null
  reserve1: bigint | null
  liquidity: bigint | null
  /** smaller leg expressed in whole tokens */
  depth: number | null
  status: PoolStatus
  error?: string
  source: 'pool contract'
  at: number
}

function clientFor(chainId: number) {
  const chain = getChain(chainId)
  if (!chain) return null
  const url = chain.viem.rpcUrls.default.http[0]
  return createPublicClient({ transport: http(url, { timeout: 15_000, retryCount: 1 }) })
}

async function readPool(pool: PoolCfg): Promise<PoolSnapshot> {
  const client = clientFor(pool.chainId)
  const token0 = findToken(pool.chainId, pool.token0)
  const token1 = findToken(pool.chainId, pool.token1)
  const base: PoolSnapshot = {
    chainId: pool.chainId,
    pool: pool.address,
    fee: pool.fee,
    token0: pool.token0,
    token1: pool.token1,
    symbol0: token0?.symbol ?? pool.token0.slice(0, 6),
    symbol1: token1?.symbol ?? pool.token1.slice(0, 6),
    decimals0: token0?.decimals ?? 18,
    decimals1: token1?.decimals ?? 18,
    reserve0: null,
    reserve1: null,
    liquidity: null,
    depth: null,
    status: 'unreachable',
    source: 'pool contract',
    at: Date.now(),
  }
  if (!client) return { ...base, error: 'no RPC client' }

  try {
    const [liq, t0, t1] = (await Promise.all([
      client.readContract({ address: pool.address, abi: POOL_ABI, functionName: 'liquidity' }),
      client.readContract({ address: pool.address, abi: POOL_ABI, functionName: 'token0' }),
      client.readContract({ address: pool.address, abi: POOL_ABI, functionName: 'token1' }),
    ])) as [bigint, Address, Address]

    const [r0, r1] = (await Promise.all([
      client.readContract({ address: t0, abi: ERC20, functionName: 'balanceOf', args: [pool.address] }),
      client.readContract({ address: t1, abi: ERC20, functionName: 'balanceOf', args: [pool.address] }),
    ])) as [bigint, bigint]

    const d0 = token0?.decimals ?? 18
    const d1 = token1?.decimals ?? 18
    const h0 = Number(formatUnits(r0, d0))
    const h1 = Number(formatUnits(r1, d1))
    const depth = Math.min(h0, h1)
    const max = Math.max(h0, h1)

    let status: PoolStatus = 'active'
    if (depth < DUST && max >= SUBSTANTIAL) status = 'drained'

    return { ...base, reserve0: r0, reserve1: r1, liquidity: liq, depth, status, symbol0: token0?.symbol ?? t0.slice(0, 6), symbol1: token1?.symbol ?? t1.slice(0, 6), decimals0: d0, decimals1: d1 }
  } catch (e) {
    return { ...base, error: (e as Error).message.slice(0, 90) }
  }
}

/** Reads every verified pool. Bounded concurrency, one chain at a time. */
export async function loadLiquidity(chainIds?: number[]): Promise<PoolSnapshot[]> {
  const ids = chainIds ?? CHAINS.map((c) => c.id)
  const wanted = POOLS.filter((p) => ids.includes(p.chainId))
  const out: PoolSnapshot[] = []
  for (let i = 0; i < wanted.length; i += 6) {
    const slice = wanted.slice(i, i + 6)
    out.push(...(await Promise.all(slice.map(readPool))))
  }
  return out
}

export function feeLabel(fee: number) {
  return `${(fee / 10000).toFixed(2)}%`
}

/** Liquidity value L, formatted, used only as a relative ranking signal. */
export function liquidityLabel(liq: bigint | null) {
  if (liq == null) return '-'
  const n = Number(liq)
  if (n >= 1e24) return `${(n / 1e24).toFixed(2)}T`
  if (n >= 1e21) return `${(n / 1e21).toFixed(2)}B`
  if (n >= 1e18) return `${(n / 1e18).toFixed(2)}M`
  if (n >= 1e15) return `${(n / 1e15).toFixed(2)}K`
  return n.toLocaleString()
}

/** Chains that have at least one verified pool. */
export function LIQUID_CHAIN_IDS(): number[] {
  return [...new Set(POOLS.map((p) => p.chainId))]
}

/** True when the chain has a verified deployment, whether or not pools were found. */
export function chainHasVenue(chainId: number) {
  const c = getChain(chainId)
  return Boolean(c?.uniswap || c?.dexV2?.length)
}

export { POOLS }

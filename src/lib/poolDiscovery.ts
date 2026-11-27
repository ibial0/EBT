/**
 * On-chain pool discovery for the "sell any token into the chain's native coin" path.
 *
 * The static pool list in `config/pools.ts` is a snapshot: a handful of pairs that were verified
 * once. A token can have a perfectly liquid Uniswap v3 pool against WETH and still be missing from
 * that list (LINK on Sepolia is the example), which used to grey the whole token out in Swap.
 *
 * This module asks the factory directly: `getPool(token, weth, fee)` for every fee tier, then reads
 * `liquidity()`. No API, no indexer, no key. Results are cached per chain+token, so opening the
 * picker repeatedly costs nothing.
 */
import { parseAbi } from 'viem'
import type { PublicClient } from 'viem'
import type { Address } from '../config/chains'

const factoryAbi = parseAbi([
  'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)',
])
const poolAbi = parseAbi(['function liquidity() view returns (uint128)'])
const v2FactoryAbi = parseAbi([
  'function getPair(address tokenA, address tokenB) view returns (address pair)',
])
const v2PairAbi = parseAbi([
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
])

/** Uniswap v3 fee tiers in hundredths of a bip. */
export const FEE_TIERS = [100, 500, 3000, 10_000] as const

export interface DiscoveredPool {
  token: Address
  fee: number
  pool: Address
  liquidity: bigint
}

interface CacheEntry {
  at: number
  pools: DiscoveredPool[]
}

const TTL = 10 * 60_000
const cache = new Map<string, CacheEntry>()

const keyOf = (chainId: number, token: string) => `${chainId}:${token.toLowerCase()}`

/**
 * Every fee tier that holds a live pool for `token` against the wrapped native coin.
 * A pool with `liquidity() == 0` is skipped: quoting it would revert anyway.
 */
export async function discoverNativePools(
  client: PublicClient,
  chainId: number,
  factory: Address,
  token: Address,
  weth: Address,
): Promise<DiscoveredPool[]> {
  const cached = cache.get(keyOf(chainId, token))
  if (cached && Date.now() - cached.at < TTL) return cached.pools

  const found: DiscoveredPool[] = []
  await Promise.all(
    FEE_TIERS.map(async (fee) => {
      try {
        const pool = (await client.readContract({
          address: factory,
          abi: factoryAbi,
          functionName: 'getPool',
          args: [token, weth, fee],
        })) as Address
        if (!pool || pool === '0x0000000000000000000000000000000000000000') return
        const liquidity = (await client.readContract({
          address: pool,
          abi: poolAbi,
          functionName: 'liquidity',
        })) as bigint
        if (liquidity <= 0n) return
        found.push({ token, fee, pool, liquidity })
      } catch {
        /* factory missing on this chain, or the pair does not exist */
      }
    }),
  )

  found.sort((a, b) => a.fee - b.fee)
  cache.set(keyOf(chainId, token), { at: Date.now(), pools: found })
  return found
}

/** True when this token has at least one live pool against the wrapped native coin. */
export async function hasNativePool(
  client: PublicClient,
  chainId: number,
  factory: Address,
  token: Address,
  weth: Address,
): Promise<boolean> {
  return (await discoverNativePools(client, chainId, factory, token, weth)).length > 0
}


/** Uniswap V2-style pair for `token` against the wrapped native coin, or null when there is none. */
const v2Cache = new Map<string, { at: number; pair: Address | null }>()

export async function discoverV2Pair(
  client: PublicClient,
  chainId: number,
  factory: Address,
  token: Address,
  weth: Address,
): Promise<Address | null> {
  const key = `${chainId}:${token.toLowerCase()}`
  const cached = v2Cache.get(key)
  if (cached && Date.now() - cached.at < TTL) return cached.pair

  let pair: Address | null = null
  try {
    const found = (await client.readContract({
      address: factory,
      abi: v2FactoryAbi,
      functionName: 'getPair',
      args: [token, weth],
    })) as Address
    if (found && found !== '0x0000000000000000000000000000000000000000') {
      const reserves = (await client.readContract({
        address: found,
        abi: v2PairAbi,
        functionName: 'getReserves',
      })) as readonly [bigint, bigint, number]
      if (reserves[0] > 0n && reserves[1] > 0n) pair = found
    }
  } catch {
    /* no factory on this chain, or the pair does not exist */
  }

  v2Cache.set(key, { at: Date.now(), pair })
  return pair
}

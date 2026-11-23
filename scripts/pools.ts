/**
 * Verified pool discovery for the liquidity dashboard.
 * Reads every (tokenA, tokenB, feeTier) combination on each swap-capable chain and
 * keeps the ones with real liquidity, then reads reserves. Read-only.
 *
 *   npx esbuild scripts/pools.ts --bundle --platform=node --format=esm --outfile=scripts/pools.mjs
 *   node scripts/pools.mjs
 */
import { createPublicClient, http, formatUnits, parseAbi, type Address } from 'viem'
import { CHAINS, getChain } from '../src/config/chains'

/** Same endpoints the app uses (src/lib/wallet.ts). Inlined so this script does not bundle wagmi. */
const RPC: Record<number, string> = {
  11155111: 'https://ethereum-sepolia-rpc.publicnode.com',
  11155420: 'https://sepolia.optimism.io',
  84532: 'https://sepolia.base.org',
  1301: 'https://sepolia.unichain.org',
  5042002: 'https://rpc.testnet.arc.io',
}
import { TOKENS, tokensForChain, NATIVE_SENTINEL } from '../src/config/tokens'

const FACTORY_ABI = parseAbi([
  'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)',
])
const POOL_ABI = parseAbi([
  'function liquidity() view returns (uint128)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
])
const ERC20 = parseAbi(['function balanceOf(address) view returns (uint256)', 'function symbol() view returns (string)'])
const FEES = [100, 500, 3000, 10000]

function rpc(c: { id: number; viem: { rpcUrls: { default: { http: string[] } } } }) {
  // use the same endpoints the app uses; viem's defaults (thirdweb) rate-limit
  return RPC[c.id] ?? c.viem.rpcUrls.default.http[0]
}

;(async () => {
  const out: unknown[] = []
  for (const chain of CHAINS.filter((c) => c.uniswap)) {
    const client = createPublicClient({ transport: http(rpc(chain), { timeout: 25000, retryCount: 1 }) })
    const dep = chain.uniswap!
    const native = {
      address: NATIVE_SENTINEL,
      symbol: chain.nativeIsUsdc ? 'USDC' : chain.viem.nativeCurrency.symbol,
      decimals: chain.nativeIsUsdc ? 6 : 18,
    }
    // Arc has no wrapped-native token, so the native view is not tradable against anything
    const list = chain.nativeIsUsdc
      ? tokensForChain(chain.id)
      : [...tokensForChain(chain.id), native]
    const seen = new Set<string>()
    for (let i = 0; i < list.length; i++) {
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue
        const a = list[i]
        const b = list[j]
        const key = `${a.address.toLowerCase()}-${b.address.toLowerCase()}`
        if (seen.has(key)) continue
        seen.add(key)
        for (const fee of FEES) {
          let pool: Address | null = null
          try {
            pool = (await client.readContract({
              address: dep.factory as Address,
              abi: FACTORY_ABI,
              functionName: 'getPool',
              args: [a.address as Address, b.address as Address, fee],
            })) as Address
          } catch {
            continue
          }
          if (!pool || pool === '0x0000000000000000000000000000000000000000') continue
          let liq = 0n
          try {
            liq = (await client.readContract({ address: pool, abi: POOL_ABI, functionName: 'liquidity' })) as bigint
          } catch {
            continue
          }
          if (liq === 0n) continue
          let t0 = '0x0000000000000000000000000000000000000000' as Address
          let t1 = t0
          try {
            const [x, y] = await Promise.all([
              client.readContract({ address: pool, abi: POOL_ABI, functionName: 'token0' }),
              client.readContract({ address: pool, abi: POOL_ABI, functionName: 'token1' }),
            ])
            t0 = x as Address
            t1 = y as Address
          } catch {
            /* keep zeros */
          }
          const tokenOf = (addr: Address) =>
            list.find((tk) => tk.address.toLowerCase() === addr.toLowerCase()) ?? null
          const A = tokenOf(t0)
          const B = tokenOf(t1)
          const bal = async (addr: Address) => {
            if (addr.toLowerCase() === NATIVE_SENTINEL.toLowerCase()) {
              try {
                return (await client.readContract({ address: t0, abi: ERC20, functionName: 'balanceOf', args: [pool] })) as bigint
              } catch {
                return 0n
              }
            }
            try {
              return (await client.readContract({ address: addr, abi: ERC20, functionName: 'balanceOf', args: [pool] })) as bigint
            } catch {
              return 0n
            }
          }
          const [r0, r1] = await Promise.all([bal(t0), bal(t1)])
          out.push({
            chainId: chain.id,
            chain: chain.short,
            pool,
            fee,
            token0: { address: t0, symbol: A?.symbol ?? '?', decimals: A?.decimals ?? 18 },
            token1: { address: t1, symbol: B?.symbol ?? '?', decimals: B?.decimals ?? 18 },
            liquidity: liq.toString(),
            reserve0: r0.toString(),
            reserve1: r1.toString(),
            reserve0Human: Number(formatUnits(r0, A?.decimals ?? 18)).toFixed(6),
            reserve1Human: Number(formatUnits(r1, B?.decimals ?? 18)).toFixed(6),
          })
          console.log(
            `${chain.short} ${A?.symbol ?? '?'}/${B?.symbol ?? '?'} fee ${fee / 100}% pool ${pool} liq ${liq} r0 ${formatUnits(r0, A?.decimals ?? 18)} r1 ${formatUnits(r1, B?.decimals ?? 18)}`,
          )
        }
      }
    }
  }
  const { writeFileSync } = await import('node:fs')
  writeFileSync('scripts/pools.json', JSON.stringify(out, null, 2))
  console.log(`\n${out.length} live pools written to scripts/pools.json`)
})()

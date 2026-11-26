/* Measures the portfolio scan: how fast the first chain paints, and how long the full set takes. */
import { loadPortfolio } from '../src/lib/portfolio'

const OWNER = '0x000000000000000000000000000000000000dEaD' as const

async function run(concurrency: number) {
  const t0 = Date.now()
  let first = 0
  let count = 0
  const res = await loadPortfolio(OWNER, {
    concurrency,
    onChain: () => {
      count += 1
      if (!first) first = Date.now() - t0
    },
  })
  const total = Date.now() - t0
  console.log(
    `concurrency=${concurrency}: first chain ${(first / 1000).toFixed(2)}s · ${count} chains · all ${res.length} done in ${(total / 1000).toFixed(1)}s`,
  )
  return { first, total, count: res.length }
}

const a = await run(5)
const b = await run(12)
console.log(`first paint improved ${(a.first / Math.max(b.first, 1)).toFixed(1)}x`)

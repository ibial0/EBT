/**
 * Bridge route matrix check. Pure route-engine assertions against verified legs.
 * No signatures, no transactions.
 *
 *   npx esbuild scripts/routes-check.ts --bundle --platform=node --format=esm \
 *     --outfile=scripts/routes-check.mjs --log-level=error --external:@x402/* && node scripts/routes-check.mjs
 */
import { getChain } from '../src/config/chains'
import { USDC_OF, findToken, nativeToken, type TokenCfg } from '../src/config/tokens'
import { findRoutes, reachableDestTokens, usableSourceTokens } from '../src/lib/routes'

const N = (id: number) => nativeToken(id)
const U = (id: number) => USDC_OF(id)!
const ARC_EURC = findToken(5042002, '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a')!
const ARC_CIRBTC = findToken(5042002, '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF')!

interface Case {
  name: string
  from: number
  to: number
  in: TokenCfg
  out: TokenCfg
  expect: 'direct' | 'composite' | 'none'
  expectTx?: number
}

const CASES: Case[] = [
  { name: 'Sepolia ETH -> Base ETH', from: 11155111, to: 84532, in: N(11155111), out: N(84532), expect: 'direct', expectTx: 1 },
  { name: 'Sepolia USDC -> Base USDC', from: 11155111, to: 84532, in: U(11155111), out: U(84532), expect: 'direct', expectTx: 2 },
  { name: 'Sepolia USDC -> Base ETH', from: 11155111, to: 84532, in: U(11155111), out: N(84532), expect: 'composite' },
  { name: 'Sepolia USDC -> Arc USDC', from: 11155111, to: 5042002, in: U(11155111), out: U(5042002), expect: 'direct', expectTx: 2 },
  { name: 'Sepolia ETH -> Arc USDC', from: 11155111, to: 5042002, in: N(11155111), out: U(5042002), expect: 'composite' },
  { name: 'Arc USDC -> GIWA ETH', from: 5042002, to: 91342, in: U(5042002), out: N(91342), expect: 'composite', expectTx: 3 },
  { name: 'Arc EURC -> GIWA ETH', from: 5042002, to: 91342, in: ARC_EURC, out: N(91342), expect: 'composite', expectTx: 4 },
  { name: 'Arc cirBTC -> GIWA ETH', from: 5042002, to: 91342, in: ARC_CIRBTC, out: N(91342), expect: 'none' },
  { name: 'Base ETH -> GIWA ETH', from: 84532, to: 91342, in: N(84532), out: N(91342), expect: 'composite', expectTx: 4 },
  { name: 'Base USDC -> GIWA ETH', from: 84532, to: 91342, in: U(84532), out: N(91342), expect: 'composite', expectTx: 3 },
  { name: 'Sepolia ETH -> GIWA ETH', from: 11155111, to: 91342, in: N(11155111), out: N(91342), expect: 'direct', expectTx: 1 },
  { name: 'Robinhood -> GIWA (no provider)', from: 46630, to: 91342, in: N(46630), out: N(91342), expect: 'none' },
]

let pass = 0
const failures: string[] = []
console.log('=== Bridge route matrix ===')
for (const c of CASES) {
  const routes = findRoutes(c.from, c.to, c.in, c.out)
  const best = routes[0]
  const ok =
    c.expect === 'none'
      ? routes.length === 0
      : Boolean(best) && best.type === c.expect && (c.expectTx == null || best.txCount === c.expectTx)
  if (ok) pass++
  else failures.push(c.name)
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(32)} ${best ? `${best.type} tx=${best.txCount} | ${best.label}` : 'NO ROUTE'}`,
  )
}

console.log('\n=== route-aware selectors ===')
const sepBase = usableSourceTokens(11155111, 84532).map((t) => t.symbol)
console.log(`Sepolia -> Base usable sources: ${sepBase.join(', ')}`)
if (!sepBase.includes('ETH') || !sepBase.includes('USDC')) failures.push('Sepolia source list incomplete')
const baseGiwa = usableSourceTokens(84532, 91342).map((t) => t.symbol)
console.log(`Base -> GIWA usable sources: ${baseGiwa.join(', ') || 'none'}`)
if (!baseGiwa.includes('USDC')) failures.push('Base -> GIWA should offer USDC')
const dests = reachableDestTokens(11155111, 84532, U(11155111)).map((t) => t.symbol)
console.log(`Sepolia USDC -> Base reachable destinations: ${dests.join(', ')}`)
if (!dests.includes('USDC') || !dests.includes('ETH')) failures.push('destination list incomplete')

console.log(`\n=== ${pass}/${CASES.length} route checks passed ===`)
if (failures.length) {
  console.log('FAILED: ' + failures.join(' | '))
  process.exit(1)
}
void getChain

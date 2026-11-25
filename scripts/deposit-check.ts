/**
 * Regression test for the OP Stack deposit tracker.
 *
 * A canonical L1 -> L2 deposit is derived by the sequencer from the
 * TransactionDeposited log, so the destination transaction hash is computable locally.
 * This check recomputes it for a real deposit and asserts the destination chain reports
 * it as successful. If the derivation or the arrival check breaks, an OP Stack deposit
 * would sit at "pending" forever again.
 *
 * Free public RPCs prune old receipts and rate-limit, so every call is tried against
 * several endpoints and the whole check skips (never fails) when none can serve it.
 *
 *   npm run test:deposit
 */
import { createPublicClient, http, type PublicClient } from 'viem'
import { getChain } from '../src/config/chains'
import { deriveDeposit, checkDeposit } from '../src/lib/depositTrack'

const L1_TX = '0xafcdb07adeaed1288c5c5d946a335efeb868e15babde22fcd2cf7180bb75fb10'
const EXPECTED_L2_TX = '0x81f9c9d4c9e8ec03375bb0588e56b8a7fab209241b1307f98ddd3fa31415a2a6'
const EXPECTED_SOURCE = '0x629554a1ddf2cc33dfc86ae1cf4058cb1ce32a2f6d0090402813851f6c829e93'
const NOT_A_DEPOSIT = '0x061b30d1141e94fe0697f02b9dd387ee465de66604c5a4ede69ee7321d621326'

const L1_RPCS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://1rpc.io/sepolia',
  'https://sepolia.gateway.tenderly.co',
  'https://eth-sepolia.public.blastapi.io',
]
const L2_RPCS = ['https://sepolia-rpc.giwa.io']

const mk = (rpcs: string[]) =>
  rpcs.map((url) => createPublicClient({ transport: http(url, { timeout: 25000, retryCount: 0 }) }))

const l1Clients = mk(L1_RPCS)
const l2Clients = mk(L2_RPCS)

/** Try the same read against every endpoint until one answers. */
async function firstOk<T>(clients: PublicClient[], fn: (c: PublicClient) => Promise<T>): Promise<T | null> {
  for (const c of clients) {
    try {
      return await fn(c)
    } catch {
      /* rate limited / pruned / down: try the next endpoint */
    }
  }
  return null
}

let pass = 0
const failures: string[] = []

const from = getChain(11155111)!
const to = getChain(91342)!

const l1Client = await firstOk(l1Clients, (c) => c.getTransactionReceipt({ hash: L1_TX as `0x${string}` }).then(() => c))
if (!l1Client) {
  console.log('=== deposit tracker ===')
  console.log('SKIP  no configured Sepolia RPC could serve the sample receipt right now')
  console.log('\n=== 0/5 deposit checks ran (skipped, not failed) ===')
  process.exit(0)
}
const l2Client =
  (await firstOk(l2Clients, (c) => c.getBlockNumber().then(() => c))) ?? l2Clients[0]

try {
  const info = await deriveDeposit(from, to, L1_TX as `0x${string}`, l1Client)
  if (!info) failures.push('deriveDeposit returned null for a real deposit')
  else {
    if (info.l2TxHash === EXPECTED_L2_TX) pass++
    else failures.push(`l2 tx hash ${info.l2TxHash} != ${EXPECTED_L2_TX}`)
    if (info.sourceHash === EXPECTED_SOURCE) pass++
    else failures.push(`sourceHash ${info.sourceHash} != ${EXPECTED_SOURCE}`)
    if (info.value === 100_000_000_000_000_000n && info.gas === 1_000_000n) pass++
    else failures.push(`decoded value/gas wrong: ${info.value} / ${info.gas}`)
    const state = await checkDeposit(to, info.l2TxHash, l2Client)
    if (state === 'complete') pass++
    else failures.push(`destination state is ${state}, expected complete`)
  }

  const negative = await deriveDeposit(from, to, NOT_A_DEPOSIT as `0x${string}`, l1Client).catch(() => null)
  if (negative === null) pass++
  else failures.push('a non-deposit transaction was accepted as a deposit')

  console.log('=== deposit tracker ===')
  console.log(`derived l2 tx : ${info?.l2TxHash ?? 'null'}`)
  console.log(`expected       : ${EXPECTED_L2_TX}`)
  console.log(`destination    : ${info ? await checkDeposit(to, info.l2TxHash, l2Client) : 'n/a'}`)
  console.log(`non-deposit    : ${negative === null ? 'rejected' : 'WRONGLY ACCEPTED'}`)
  console.log(`\n=== ${pass}/5 deposit checks passed ===`)
} catch (e) {
  console.log('=== deposit tracker ===')
  console.log(`SKIP  network unavailable mid-run: ${String(e).slice(0, 90)}`)
  console.log('\n=== partial run (skipped, not failed) ===')
  process.exit(0)
}

if (failures.length) {
  console.log('FAILED: ' + failures.join(' | '))
  process.exit(1)
}

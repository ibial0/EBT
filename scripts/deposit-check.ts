/**
 * Regression test for the OP Stack deposit tracker.
 *
 * A canonical L1 -> L2 deposit is derived by the sequencer from the
 * TransactionDeposited log, so the destination transaction hash is computable
 * locally. This check recomputes it for a real deposit and asserts the
 * destination chain reports it as successful. If the derivation or the arrival
 * check breaks, an OP Stack deposit would sit at "pending" forever again.
 *
 *   npm run test:deposit
 */
import { createPublicClient, http } from 'viem'
import { getChain } from '../src/config/chains'
import { deriveDeposit, checkDeposit } from '../src/lib/depositTrack'

const L1_TX = '0xafcdb07adeaed1288c5c5d946a335efeb868e15babde22fcd2cf7180bb75fb10'
const EXPECTED_L2_TX = '0x81f9c9d4c9e8ec03375bb0588e56b8a7fab209241b1307f98ddd3fa31415a2a6'
const EXPECTED_SOURCE = '0x629554a1ddf2cc33dfc86ae1cf4058cb1ce32a2f6d0090402813851f6c829e93'
const NOT_A_DEPOSIT = '0x061b30d1141e94fe0697f02b9dd387ee465de66604c5a4ede69ee7321d621326'

const l1Client = createPublicClient({
  transport: http('https://ethereum-sepolia-rpc.publicnode.com', { timeout: 30000, retryCount: 1 }),
})
const l2Client = createPublicClient({
  transport: http('https://sepolia-rpc.giwa.io', { timeout: 30000, retryCount: 1 }),
})

let pass = 0
const failures: string[] = []

const from = getChain(11155111)!
const to = getChain(91342)!

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

const negative = await deriveDeposit(from, to, NOT_A_DEPOSIT as `0x${string}`, l1Client)
if (negative === null) pass++
else failures.push('a non-deposit transaction was accepted as a deposit')

console.log('=== deposit tracker ===')
console.log(`derived l2 tx : ${info?.l2TxHash ?? 'null'}`)
console.log(`expected       : ${EXPECTED_L2_TX}`)
console.log(`destination    : ${info ? await checkDeposit(to, info.l2TxHash, l2Client) : 'n/a'}`)
console.log(`non-deposit    : ${negative === null ? 'rejected' : 'WRONGLY ACCEPTED'}`)
console.log(`\n=== ${pass}/5 deposit checks passed ===`)
if (failures.length) {
  console.log('FAILED: ' + failures.join(' | '))
  process.exit(1)
}

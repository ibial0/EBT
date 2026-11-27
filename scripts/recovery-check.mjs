/**
 * CCTP v2 expiry rules: a message is mintable only while the destination block is below the
 * expiration block encoded inside the message. Zero means "no expiry encoded".
 * Run: npm run test:recovery
 */
import { isCctpExpired } from '../src/lib/cctpMessage.ts'

let pass = 0
let fail = 0
function check(name, got, want) {
  if (got === want) { pass++; console.log('PASS ', name) }
  else { fail++; console.log('FAIL ', name, '| got', got, 'want', want) }
}

check('no expiry encoded', isCctpExpired(0n, 999999n), false)
check('block below expiry', isCctpExpired(1000n, 999n), false)
check('block at expiry', isCctpExpired(1000n, 1000n), true)
check('block past expiry', isCctpExpired(1000n, 1001n), true)
check('huge values stay bigint-safe', isCctpExpired(2n ** 200n, 2n ** 200n - 1n), false)

console.log(`\n=== ${pass}/${pass + fail} expiry checks passed ===`)
process.exit(fail ? 1 : 0)

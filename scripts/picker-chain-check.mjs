/**
 * The picker must open on the chain printed on the page, not on whatever was picked last time.
 * Run: npm run test:picker
 */
import { initialPickerChain } from '../src/lib/pickerChain.ts'

let pass = 0
let fail = 0
const check = (name, got, want) => {
  if (got === want) { pass++; console.log('PASS ', name) }
  else { fail++; console.log('FAIL ', name, '| got', got, 'want', want) }
}

const chains = [11155111, 84532, 421614]

check('page chain wins over remembered', initialPickerChain(84532, chains, 11155111), 84532)
check('page chain wins over all', initialPickerChain(11155111, chains, 'all'), 11155111)
check('unknown page chain falls back', initialPickerChain(999, chains, 421614), 421614)
check('no page chain uses remembered', initialPickerChain(undefined, chains, 84532), 84532)
check('no page chain and no memory = all', initialPickerChain(undefined, chains, 'all'), 'all')
check('synthetic non-EVM id works', initialPickerChain(-1001, [-1001, 11155111], 'all'), -1001)

console.log(`\n=== ${pass}/${pass + fail} picker checks passed ===`)
process.exit(fail ? 1 : 0)

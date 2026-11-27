/**
 * Regression test for the portfolio value history.
 *
 * The chart must never move because a wallet was connected or disconnected: a reading belongs
 * to the set of wallets it was measured from. Run with `npm run test:history`.
 */
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const { recordSnapshot, loadHistory } = await import('../src/lib/history.ts')

let failed = 0
let total = 0
const check = (name, ok, extra = '') => {
  total++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`)
  if (!ok) failed++
}

const A = 'eip155:0xabc|solana:xyz'
const B = 'solana:xyz'
const t0 = Date.now()

let h = recordSnapshot(1000, t0, A)
check('first reading is stored with its wallet set', h.length === 1 && h[0].acct === A)

h = recordSnapshot(1012, t0 + 60_000, A)
check('same set, same bucket: one point, newest value', h.length === 1 && h[0].v === 1012)

const before = JSON.stringify(h)
h = recordSnapshot(300, t0 + 90_000, B)
check(
  'wallet set changed: line untouched (no fake loss)',
  JSON.stringify(h) === before,
  `value ${h.at(-1).v}`,
)

h = recordSnapshot(1012, t0 + 120_000, A)
check('same set reconnected: history keeps recording', h.at(-1).v === 1012 && h.at(-1).acct === A)

h = recordSnapshot(1050, t0 + 10 * 60_000, A)
check('new bucket, same set: a new point', h.length === 2 && h.at(-1).v === 1050)

// A store written before this field existed must be adopted, not thrown away.
store.clear()
store.set('ebt.portfolioHistory', JSON.stringify([{ t: t0 - 1000, v: 800 }]))
h = recordSnapshot(900, t0, A)
check('legacy point adopted into the current wallet set', h.length === 1 && h[0].v === 900 && h[0].acct === A)
check('reload sees the same points', loadHistory().length === 1)

console.log(`\n=== ${failed === 0 ? `${total}/${total} history checks passed` : `${failed}/${total} failed`} ===`)
process.exit(failed === 0 ? 0 : 1)

const { validateReceiver, canSendFrom } = await import('file:///C:/EBT/src/lib/addressCheck.ts')
let fail = 0
let total = 0
const t = (name, got, want) => {
  total++
  const ok = got === want
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` — got ${JSON.stringify(got)}`}`)
  if (!ok) fail++
}
const evm = '0x4f619f3e940C75DE719719B7A0638d2C7dadF0a5'
const sol = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
const sui = '0x' + 'a'.repeat(64)

t('evm address in evm field', validateReceiver(evm, 'evm').ok, true)
t('solana address in evm field -> EVM message', validateReceiver(sol, 'evm').message, 'That is not a valid EVM address.')
t('evm address in solana field -> Solana message', validateReceiver(evm, 'solana').message, 'That is not a valid Solana address.')
t('solana address accepted for solana', validateReceiver(sol, 'solana').ok, true)
t('base58 with 0/O/I/l rejected', validateReceiver(sol.replace('7', '0'), 'solana').ok, false)
t('evm address in sui field -> Sui message', validateReceiver(evm, 'sui').message, 'That is not a valid Sui address.')
t('sui 64-hex accepted', validateReceiver(sui, 'sui').ok, true)
t('sui short 40-hex rejected', validateReceiver(evm, 'sui').ok, false)
t('aptos short hex accepted', validateReceiver('0x1', 'aptos').ok, true)
t('stellar wrong length rejected', validateReceiver('G' + 'A'.repeat(54), 'stellar').ok, false)
t('send allowed only for evm', [canSendFrom('evm'), canSendFrom('solana'), canSendFrom('sui')].join(','), 'true,false,false')
console.log(`\n=== ${fail === 0 ? total + '/' + total : fail + '/' + total} receiver checks passed ===`)
process.exit(fail ? 1 : 0)

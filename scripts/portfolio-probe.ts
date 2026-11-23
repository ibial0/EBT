import { loadPortfolio } from '../src/lib/portfolio'
import { nativeDecimals, nativeSymbol, getChain } from '../src/config/chains'
import { formatUnits } from 'viem'

const who = '0x17078d3B7F67f7207719B7E0f91656644425E58e' as const

loadPortfolio(who, 5).then((rows) => {
  let tokens = 0
  for (const r of rows) {
    const chain = getChain(r.chainId)!
    const nat = r.native == null ? 'ERR' : `${Number(formatUnits(r.native, nativeDecimals(r.chainId))).toFixed(4)} ${nativeSymbol(r.chainId)}`
    const held = r.tokens.filter((t) => (t.balance ?? 0n) > 0n)
    tokens += held.length
    if (nat !== 'ERR' && nat.startsWith('0.0000') && held.length === 0) continue
    console.log(`${chain.short.padEnd(14)} native ${nat.padEnd(22)} tokens ${held.length} (${r.ms}ms)`)
    for (const t of held.slice(0, 3)) {
      console.log(`   · ${t.token.symbol} ${t.token.verified ? '' : '(custom) '}${Number(formatUnits(t.balance!, t.token.decimals)).toFixed(4)}  ${t.token.address.slice(0, 10)}…`)
    }
  }
  console.log('chains read:', rows.length, '| token positions with balance:', tokens)
  const errs = rows.filter((r) => r.nativeError)
  if (errs.length) console.log('native errors:', errs.map((e) => `${getChain(e.chainId)?.short}: ${e.nativeError}`).join(' | '))
})


import { createPublicClient, http, parseAbi } from 'viem'
const c = createPublicClient({ transport: http('https://sepolia.base.org') })
const rc = await c.getTransactionReceipt({ hash: '0x56fcc08faf1c3645e93d4fd24e95c29dda3121543f3ce19cf9d2a8be82409fe2' })
const T = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
for (const l of rc.logs) {
  if (l.topics[0] === T) {
    console.log('token', l.address, 'from', '0x'+l.topics[1].slice(26), 'to', '0x'+l.topics[2].slice(26), 'value', BigInt(l.data).toString())
    try { const s = await c.readContract({address: l.address, abi: parseAbi(['function symbol() view returns (string)']), functionName:'symbol'}); console.log('  symbol', s) } catch {}
  }
}

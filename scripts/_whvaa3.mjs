
import { createPublicClient, http } from 'viem'
const c = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const h = '0x2450bcb3263cd61c016771fb7e172ab41b5155d6bd9a188b6291cf36efd4d227'
const r = await c.getTransactionReceipt({ hash: h })
const TOPIC = '0x6eb224fb001ed210e379b335e35efe88672a8ce935d981a6896b27ffdf52a3b2'
const log = r.logs.find(l => l.topics[0] === TOPIC)
const emitter = '0x' + (log.topics[1] ?? '').slice(26)
const seq = BigInt(log.data.slice(0, 66))
console.log('emitter', emitter, 'seq', seq.toString())
for (const u of [
  `https://api.testnet.wormholescan.io/api/v1/vaas/10002/${emitter}/${seq}`,
  `https://api.testnet.wormholescan.io/api/v1/transactions?txHash=${h}`,
]) {
  const res = await fetch(u)
  const t = await res.text()
  console.log(u, res.status, t.slice(0, 200))
}

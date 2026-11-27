
import { createPublicClient, http } from 'viem'
const c = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const h = '0x2450bcb3263cd61c016771fb7e172ab41b5155d6bd9a188b6291cf36efd4d227'
const r = await c.getTransactionReceipt({ hash: h })
console.log('logs', r.logs.length)
for (const l of r.logs) console.log(l.address, l.topics[0]?.slice(0,18), l.topics.length, l.data.slice(0,80))
const TOPIC = '0x6eb224fb001ed210e379b335e35efe88672a8ce935d981a6896b27ffdf52a3b2'
const log = r.logs.find(l => l.topics[0] === TOPIC)
if (log) {
  const sender = '0x' + log.data.slice(26, 66)
  const seq = BigInt('0x' + log.data.slice(66, 130))
  console.log('sender', sender, 'seq', seq.toString())
  for (const u of [
    `https://api.testnet.wormholescan.io/api/v1/vaas/10002/${sender}/${seq}`,
    `https://wormhole-v2-testnet-api.certus.one/v1/signed_vaa/10002/${sender}/${seq}`,
  ]) {
    const res = await fetch(u)
    const t = await res.text()
    console.log(u, res.status, t.slice(0, 140))
  }
}


import { createPublicClient, http } from 'viem'
const c = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const h = '0x2450bcb3263cd61c016771fb7e172ab41b5155d6bd9a188b6291cf36efd4d227'
const r = await c.getTransactionReceipt({ hash: h })
const TOPIC = '0x6eb224fb001ed210e379b335e35efe88672a8ce935d981a6896b27ffdf52a3b2'
const log = r.logs.find(l => l.topics[0] === TOPIC && l.address.toLowerCase() === '0xdb5492265f6038831e89f495670ff909ade94bd9')
console.log('found', !!log)
if (log) {
  const seq = BigInt('0x' + log.data.slice(66, 130))
  console.log('emitter', log.address, 'seq', seq.toString())
  for (const u of [
    `https://api.testnet.wormholescan.io/api/v1/vaas/10002/${log.address}/${seq}`,
    `https://wormhole-v2-testnet-api.certus.one/v1/signed_vaa/10002/${log.address}/${seq}`,
  ]) {
    const res = await fetch(u)
    console.log(u, res.status, (await res.text()).slice(0, 160))
  }
}


import { createPublicClient, http } from 'viem'
const l1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const OUTBOX = '0x8D180Caf588f3Da027BEf1F42a106Da93F90b166'
const BRIDGE = '0x96295BDad104eaD97cC08797b3dC68efF59CcF30'
const head = await l1.getBlockNumber()
console.log('head', head.toString())
for (const [name, addr] of [['outbox', OUTBOX], ['bridge', BRIDGE]]) {
  for (const span of [2000n, 20000n]) {
    try {
      const logs = await l1.getLogs({ address: addr, fromBlock: head - span, toBlock: head })
      console.log(name, 'span', span.toString(), 'logs', logs.length, logs.slice(-2).map(l => l.blockNumber.toString() + ':' + l.topics[0].slice(0, 18)).join(' '))
    } catch (e) { console.log(name, span.toString(), 'ERR', e.message.slice(0, 80)) }
  }
}
// bridge events across a wide window: look for the classic bridge event names
const anyLogs = await l1.getLogs({ address: BRIDGE, fromBlock: head - 20000n, toBlock: head }).catch(e => [])
const byTopic = {}
for (const l of anyLogs) byTopic[l.topics[0]] = (byTopic[l.topics[0]] || 0) + 1
console.log('bridge topics', JSON.stringify(byTopic))

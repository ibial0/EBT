
import { createPublicClient, http, parseAbi } from 'viem'
const l1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const l2 = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const OUTBOX = '0x8D180Caf588f3Da027BEf1F42a106Da93F90b166'
const NODE = '0x00000000000000000000000000000000000000C8'
const nodeAbi = parseAbi(['function constructOutboxProof(uint64 size, uint64 leaf) view returns (bytes32 send, bytes32 root, bytes32[] proof)'])
const outboxAbi = parseAbi(['function roots(bytes32) view returns (bytes32)'])

const seen = new Map()
for (let size = 294979n; size <= 295060n; size += 1n) {
  let root
  try {
    const [, r] = await l2.readContract({ address: NODE, abi: nodeAbi, functionName: 'constructOutboxProof', args: [size, 294978n] })
    root = r
  } catch { continue }
  if (!seen.has(root)) {
    const v = await l1.readContract({ address: OUTBOX, abi: outboxAbi, functionName: 'roots', args: [root] }).catch(() => 'ERR')
    seen.set(root, { firstSize: size, registered: v })
    if (v !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log('HIT size', size.toString(), 'root', root, 'registeredFor', v)
    }
  }
}
console.log('distinct roots', seen.size, JSON.stringify([...seen].map(([r, v]) => [v.firstSize.toString(), r.slice(0,10), String(v.registered).slice(0,10)])))


import { createPublicClient, http, parseAbi } from 'viem'
const l2 = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const l1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const NODE='0x00000000000000000000000000000000000000C8'
const OUTBOX='0x8D180Caf588f3Da027BEf1F42a106Da93F90b166'
const nodeAbi = parseAbi(['function constructOutboxProof(uint64 size, uint64 leaf) view returns (bytes32 send, bytes32 root, bytes32[] proof)'])
const l2to = await l2.getBlockNumber()
console.log('L2 head', l2to)
const pos = 294975n
const r = await l2.readContract({ address: NODE, abi: nodeAbi, functionName: 'constructOutboxProof', args: [pos+1n, pos] })
console.log('send', r[0])
console.log('root', r[1])
console.log('proof len', r[2].length)
const code = await l1.getCode({ address: OUTBOX })
console.log('outbox code bytes', (code.length-2)/2)
for (const [label, val] of [['send', r[0]], ['root', r[1]]]) {
  try { console.log('roots('+label+')', await l1.readContract({ address: OUTBOX, abi: parseAbi(['function roots(bytes32) view returns (bool)']), functionName: 'roots', args: [val] })) } catch(e){ console.log('roots('+label+') fail', e.shortMessage) }
}

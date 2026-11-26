
import { createPublicClient, http, parseAbi, parseAbiItem, decodeEventLog } from 'viem'
const l1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const l2 = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const OUTBOX = '0x8D180Caf588f3Da027BEf1F42a106Da93F90b166'
const NODE = '0x00000000000000000000000000000000000000C8'
const ARBSYS = '0x0000000000000000000000000000000000000064'
const ev = parseAbiItem('event L2ToL1Tx(address caller, address indexed destination, uint256 indexed hash, uint256 indexed position, uint256 arbBlockNum, uint256 ethBlockNum, uint256 timestamp, uint256 callvalue, bytes data)')
const receipt = await l2.getTransactionReceipt({ hash: '0xf37307848fd3fe53ae00a714668665d5f7db649986c749ab1932100dd938c3bd' })
let msg
for (const log of receipt.logs) {
  if (log.address.toLowerCase() !== ARBSYS) continue
  try { const d = decodeEventLog({ abi: [ev], data: log.data, topics: log.topics }); if (d.eventName === 'L2ToL1Tx') msg = d.args } catch {}
}
console.log('msg', JSON.stringify({ ...msg, data: msg?.data?.slice(0,10) }, (k,v) => typeof v === 'bigint' ? v.toString() : v))

const nodeAbi = parseAbi(['function constructOutboxProof(uint64 size, uint64 leaf) view returns (bytes32 send, bytes32 root, bytes32[] proof)'])
const outboxAbi = parseAbi([
  'function executeTransaction(bytes32[] proof, uint256 index, address l2Sender, address to, uint256 l2Block, uint256 l1Block, uint256 l2Timestamp, uint256 value, bytes data)',
  'function roots(bytes32) view returns (bytes32)',
])
const [send, root, proof] = await l2.readContract({ address: NODE, abi: nodeAbi, functionName: 'constructOutboxProof', args: [294979n, msg.position] })
console.log('send', send, '\nroot', root, '\nproofLen', proof.length)
console.log('roots(root)', await l1.readContract({ address: OUTBOX, abi: outboxAbi, functionName: 'roots', args: [root] }))
try {
  await l1.simulateContract({
    address: OUTBOX, abi: outboxAbi, functionName: 'executeTransaction',
    args: [proof, msg.position, msg.caller, msg.destination, msg.arbBlockNum, msg.ethBlockNum, msg.timestamp, msg.callvalue, msg.data],
    account: msg.destination,
  })
  console.log('SIM OK — claimable')
} catch (e) {
  console.log('SIM FAIL', (e.shortMessage || e.message).slice(0, 200))
  if (e.cause?.data) console.log('revert data', e.cause.data)
}

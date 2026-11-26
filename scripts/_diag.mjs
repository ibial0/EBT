
import { createPublicClient, http, encodeFunctionData, parseAbi, keccak256, toHex } from 'viem'
const L1 = 'https://ethereum-sepolia-rpc.publicnode.com'
const L2 = 'https://rpc.testnet.chain.robinhood.com'
const l1 = createPublicClient({ transport: http(L1) })
const l2 = createPublicClient({ transport: http(L2) })
const OUTBOX = '0x8D180Caf588f3Da027BEf1F42a106Da93F90b166'
const NODE = '0x00000000000000000000000000000000000000C8'

for (const s of ['UnknownRoot(bytes32)','AlreadySpent(uint256)','ProofTooLong(uint256)','BadSender(address)','ExecutionFailed()','NotOwner()','InvalidProof()','NoRoot()']) {
  console.log(keccak256(toHex(s)).slice(0,10), s)
}

const blockHash = '0x8a833d22'
const head = await l1.getBlockNumber()
const logs = await l1.getLogs({ address: OUTBOX, fromBlock: head - 3000n, toBlock: head })
const updated = logs.filter(l => l.topics[0].startsWith('0xb4df3847'))
console.log('updates', updated.map(l => l.blockNumber + ' ' + l.topics[1].slice(0,12) + ' root ' + l.topics[2].slice(0,12)).join(' | '))

// our block: find AssertionConfirmed logs for L2 block containing position 294978
const checkpointAbi = parseAbi(['event AssertionConfirmed(bytes32 indexed assertionId, bytes32 blockHash, bytes32 sendRoot)'])
const conf = await l1.getLogs({ address: '0xdc5F8E399DBd8a9F5F87AeC4C23Beb12431b386D', event: checkpointAbi, fromBlock: head - 3000n, toBlock: head })
console.log('confirmed', conf.map(c => c.blockNumber + ' hash ' + c.args.blockHash.slice(0,12) + ' root ' + c.args.sendRoot.slice(0,12)).join(' | '))

const nodeAbi = parseAbi(['function constructOutboxProof(uint64 size, uint64 leaf) view returns (bytes32 send, bytes32 root, bytes32[] proof)'])
for (const size of [294979n, 294980n]) {
  try {
    const [send, root, proof] = await l2.readContract({ address: NODE, abi: nodeAbi, functionName: 'constructOutboxProof', args: [size, 294978n] })
    console.log('size', size.toString(), 'send', send.slice(0,12), 'root', root.slice(0,12), 'len', proof.length)
  } catch (e) { console.log('size', size.toString(), 'ERR', e.message.slice(0, 60)) }
}

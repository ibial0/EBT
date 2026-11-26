
import { createPublicClient, http, parseAbiItem, parseAbi } from 'viem'
const l1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const l2 = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const ROLLUP='0xdc5F8E399DBd8a9F5F87AeC4C23Beb12431b386D'
const NODE='0x00000000000000000000000000000000000000C8'
const ev = parseAbiItem('event AssertionConfirmed(bytes32 indexed assertionId, bytes32 blockHash, bytes32 sendRoot)')
const head = await l1.getBlockNumber()
const logs = await l1.getLogs({ address: ROLLUP, event: ev, fromBlock: head - 1000n, toBlock: head })
const last = logs.at(-1)
console.log('confirmed at L1', last.blockNumber.toString())
console.log('blockHash', last.args.blockHash)
console.log('sendRoot ', last.args.sendRoot)
const b = await l2.getBlock({ blockHash: last.args.blockHash })
console.log('L2 block', b.number.toString(), 'sendCount', b.sendCount, 'sendRoot', b.sendRoot)
const nodeAbi = parseAbi(['function constructOutboxProof(uint64 size, uint64 leaf) view returns (bytes32 send, bytes32 root, bytes32[] proof)'])
const size = BigInt(b.sendCount)
if (size > 294975n) {
  const r = await l2.readContract({ address: NODE, abi: nodeAbi, functionName: 'constructOutboxProof', args: [size, 294975n] })
  console.log('proof at confirmed size', size.toString(), 'root', r[1], 'len', r[2].length)
}

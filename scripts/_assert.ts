
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem'
const L1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const ROLLUP = '0xdc5F8E399DBd8a9F5F87AeC4C23Beb12431b386D'
const EV = parseAbiItem('event AssertionConfirmed(bytes32 indexed assertionId, bytes32 blockHash, bytes32 sendRoot)')
const head = await L1.getBlockNumber()
console.log('l1 head', head)
const logs = await L1.getLogs({ address: ROLLUP, event: EV, fromBlock: head - 4000n, toBlock: head })
console.log('assertions in last 4000 blocks:', logs.length)
for (const l of logs.slice(-6)) {
  const blk = await L1.getBlock({ blockNumber: l.blockNumber })
  console.log('L1', l.blockNumber.toString(), new Date(Number(blk.timestamp)*1000).toISOString(), 'l2blockHash', l.args.blockHash)
}

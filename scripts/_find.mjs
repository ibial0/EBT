
import { createPublicClient, http, parseAbiItem, toHex } from 'viem'
const l2 = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const ARBSYS='0x0000000000000000000000000000000000000064'
const ev = parseAbiItem('event L2ToL1Tx(address caller, address indexed destination, uint256 indexed hash, uint256 indexed position, uint256 arbBlockNum, uint256 ethBlockNum, uint256 timestamp, uint256 callvalue, bytes data)')
const head = await l2.getBlockNumber()
const logs = await l2.getLogs({ address: ARBSYS, event: ev, args: { position: 294978n }, fromBlock: head - 20000n, toBlock: head })
for (const l of logs) {
  console.log(JSON.stringify({ tx: l.transactionHash, block: l.blockNumber.toString(), pos: l.args.position.toString(), value: l.args.callvalue.toString(), caller: l.args.caller }))
}
console.log('found', logs.length)

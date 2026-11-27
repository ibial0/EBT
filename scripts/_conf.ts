
import { createPublicClient, http, parseAbiItem } from 'viem'
const L1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const L2 = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const ROLLUP = '0xdc5F8E399DBd8a9F5F87AeC4C23Beb12431b386D'
const EV = parseAbiItem('event AssertionConfirmed(bytes32 indexed assertionId, bytes32 blockHash, bytes32 sendRoot)')
const head = await L1.getBlockNumber()
const logs = await L1.getLogs({ address: ROLLUP, event: EV, fromBlock: head - 5000n, toBlock: head })
const last = logs[logs.length-1]
const blk: any = await L2.request({ method: 'eth_getBlockByHash', params: [last.args.blockHash, false] })
console.log('latest confirmed L1 block', last.blockNumber.toString(), 'l2 sendCount', blk.sendCount ? BigInt(blk.sendCount).toString() : 'n/a', 'l2 number', blk.number ? BigInt(blk.number).toString() : '?')
const l2head = await L2.getBlockNumber()
console.log('l2 head', l2head.toString(), 'behind', (BigInt(blk.number) ? (BigInt(l2head)-BigInt(blk.number)).toString() : '?'))

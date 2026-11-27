
import { createPublicClient, http, keccak256, toHex, pad } from 'viem'
const L2 = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const head = await L2.getBlockNumber()
const USER = '0x4f619f3e940C75DE719719B7A0638d2C7dadF0a5'
const topic = keccak256(toHex('L2ToL1Tx(address,address,uint256,uint256,uint256,uint256,uint256,uint256,bytes)'))
const logs = await L2.getLogs({ address: '0x0000000000000000000000000000000000000064', topics: [topic, pad(USER, {size:32})], fromBlock: head - 80000n, toBlock: head })
console.log('logs', logs.length)
const l = logs[logs.length-1]
console.log('topics', l.topics)
console.log('dataLen', l.data.length, l.data.slice(0, 400))

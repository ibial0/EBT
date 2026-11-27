
import { createPublicClient, http, keccak256, toHex, pad } from 'viem'
const L2 = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const head = await L2.getBlockNumber()
const USER = '0x4f619f3e940C75DE719719B7A0638d2C7dadF0a5'
const topic = keccak256(toHex('L2ToL1Tx(address,address,uint256,uint256,uint256,uint256,uint256,uint256,bytes)'))
const logs = await L2.getLogs({ address: '0x0000000000000000000000000000000000000064', topics: [topic, pad(USER, {size:32})], fromBlock: head - 80000n, toBlock: head })
console.log('logs', logs.length)
for (const l of logs) {
  const pos = BigInt(l.topics[3])
  const value = BigInt('0x' + l.data.slice(2 + 64*4, 2 + 64*5))
  const ts = BigInt('0x' + l.data.slice(2 + 64*3, 2 + 64*4))
  console.log('l2blk', l.blockNumber.toString(), 'tx', l.transactionHash, 'position', pos.toString(), 'value', value.toString(), 'ts', new Date(Number(ts)*1000).toISOString())
}

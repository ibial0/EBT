
import { createPublicClient, http, keccak256, toHex } from 'viem'
const L2 = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const head = await L2.getBlockNumber()
const USER = '0x4f619f3e940C75DE719719B7A0638d2C7dadF0a5'.toLowerCase()
const topic = keccak256(toHex('L2ToL1Tx(address,address,uint256,uint256,uint256,uint256,uint256,uint256,bytes)'))
const logs = await L2.getLogs({ address: '0x0000000000000000000000000000000000000064', topics: [topic], fromBlock: head - 80000n, toBlock: head })
console.log('all logs', logs.length)
for (const l of logs) {
  const caller = '0x' + l.data.slice(26, 66)
  if (caller.toLowerCase() !== USER) continue
  const pos = BigInt(l.topics[3])
  const callvalue = BigInt('0x' + l.data.slice(2 + 64*4, 2 + 64*5))
  const ts = BigInt('0x' + l.data.slice(2 + 64*3, 2 + 64*4))
  console.log('tx', l.transactionHash, 'position', pos.toString(), 'value', callvalue.toString(), 'time', new Date(Number(ts)*1000).toISOString())
}

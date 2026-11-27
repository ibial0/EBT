
import { createPublicClient, http, parseAbiItem, keccak256, toHex, pad } from 'viem'
const L2 = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const head = await L2.getBlockNumber()
console.log('l2 head', head)
const USER = '0x4f619f3e940C75DE719719B7A0638d2C7dadF0a5'
const EV = parseAbiItem('event L2ToL1Tx(address caller, address destination, uint256 hash, uint256 position, uint256 arbBlockNum, uint256 ethBlockNum, uint256 timestamp, uint256 callvalue, uint256 data, uint256[] outgoingMessages)')
const topic = keccak256(toHex('L2ToL1Tx(address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bytes)'))
console.log('topic', topic)
try {
  const logs = await L2.getLogs({ address: '0x0000000000000000000000000000000000000064', topics: [topic, pad(USER, {size:32})], fromBlock: head - 60000n, toBlock: head })
  console.log('logs', logs.length)
  for (const l of logs.slice(-6)) {
    const pos = BigInt('0x' + l.data.slice(2 + 64*2, 2 + 64*3))
    const hash = BigInt('0x' + l.data.slice(2 + 64*1, 2 + 64*2))
    console.log('block', l.blockNumber.toString(), 'position', pos.toString(), 'callvalue', BigInt('0x'+l.data.slice(2+64*6, 2+64*7)).toString())
  }
} catch (e) { console.log('ERR', (e.shortMessage||e.message).slice(0,180)) }

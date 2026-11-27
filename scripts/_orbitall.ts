
import { createPublicClient, http, keccak256, toHex } from 'viem'
const L2 = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const head = await L2.getBlockNumber()
const blk: any = await L2.request({ method: 'eth_getBlockByNumber', params: ['latest', false] })
console.log('l2 head', head.toString(), 'head sendCount', blk.sendCount ? BigInt(blk.sendCount).toString() : 'n/a')
const topic = keccak256(toHex('L2ToL1Tx(address,address,uint256,uint256,uint256,uint256,uint256,uint256,bytes)'))
const logs = await L2.getLogs({ address: '0x0000000000000000000000000000000000000064', topics: [topic], fromBlock: head - 120000n, toBlock: head })
console.log('logs', logs.length)
const rows = logs.map(l => ({
  pos: BigInt(l.topics[3]).toString(),
  caller: '0x' + l.data.slice(26, 66),
  value: BigInt('0x' + l.data.slice(2 + 64*4, 2 + 64*5)).toString(),
  ts: Number(BigInt('0x' + l.data.slice(2 + 64*3, 2 + 64*4))),
  tx: l.transactionHash,
  blk: Number(l.blockNumber),
}))
rows.sort((a,b)=>Number(a.pos)-Number(b.pos))
for (const r of rows) console.log(r.pos, r.caller, r.value, new Date(r.ts*1000).toISOString(), r.tx)

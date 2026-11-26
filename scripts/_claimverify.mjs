
import { createPublicClient, http, formatEther } from 'viem'
const l1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const OUTBOX = '0x8D180Caf588f3Da027BEf1F42a106Da93F90b166'
const ADDR = '0x4f619f3e940C75DE719719B7A0638d2C7dadF0a5'
const head = await l1.getBlockNumber()
// find the claim tx from the outbox in the last blocks
const logs = await l1.getLogs({ address: OUTBOX, fromBlock: head - 200n, toBlock: head })
const exec = logs.filter(l => l.topics[0].startsWith('0x20af7f3b'))
console.log('executions', exec.length)
for (const l of exec.slice(-3)) {
  const r = await l1.getTransactionReceipt({ hash: l.transactionHash })
  console.log('tx', l.transactionHash, 'status', r.status, 'block', r.blockNumber.toString(), 'index', BigInt(l.data).toString(), 'gas', r.gasUsed.toString())
}
console.log('balance', formatEther(await l1.getBalance({ address: ADDR })))

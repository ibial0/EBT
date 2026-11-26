
import { createPublicClient, http, parseAbiItem, keccak256, toHex } from 'viem'
const l1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const ROLLUP='0xdc5F8E399DBd8a9F5F87AeC4C23Beb12431b386D'
const OUTBOX='0x8D180Caf588f3Da027BEf1F42a106Da93F90b166'
const CANON='0x65f07C7D521164a4d5DaC6e8dDa003c03392E087'
const ev = parseAbiItem('event AssertionConfirmed(bytes32 indexed assertionId, bytes32 blockHash, bytes32 sendRoot)')
const head = await l1.getBlockNumber()
console.log('L1 head', head)
const logs = await l1.getLogs({ address: ROLLUP, event: ev, fromBlock: head - 5000n, toBlock: head })
console.log('AssertionConfirmed logs', logs.length)
const last = logs.slice(-3)
for (const l of last) {
  const { assertionId, blockHash, sendRoot } = l.args
  const inOutbox = await l1.readContract({ address: OUTBOX, abi: [{type:'function',name:'roots',stateMutability:'view',inputs:[{type:'bytes32'}],outputs:[{type:'bool'}]}], functionName: 'roots', args: [sendRoot] }).catch(e=>'err '+e.shortMessage)
  const inCanon = await l1.readContract({ address: CANON, abi: [{type:'function',name:'roots',stateMutability:'view',inputs:[{type:'bytes32'}],outputs:[{type:'bool'}]}], functionName: 'roots', args: [sendRoot] }).catch(e=>'err')
  console.log(l.blockNumber.toString(), 'block', blockHash.slice(0,10), 'sendRoot', sendRoot.slice(0,10), 'outbox', inOutbox, 'canonical', inCanon)
}
const outboxRollup = await l1.readContract({ address: OUTBOX, abi: [{type:'function',name:'rollup',stateMutability:'view',inputs:[],outputs:[{type:'address'}]}], functionName: 'rollup' }).catch(e=>'err '+e.shortMessage)
console.log('outbox.rollup()', outboxRollup)

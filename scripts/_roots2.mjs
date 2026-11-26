
import { createPublicClient, http } from 'viem'
const l1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const OUTBOX='0x8D180Caf588f3Da027BEf1F42a106Da93F90b166'
const abi = [
 {type:'function',name:'roots',stateMutability:'view',inputs:[{type:'bytes32'}],outputs:[{type:'bytes32'}]},
 {type:'function',name:'isSpent',stateMutability:'view',inputs:[{type:'uint256'}],outputs:[{type:'bool'}]},
 {type:'function',name:'l2ToL1Sender',stateMutability:'view',inputs:[],outputs:[{type:'address'}]},
 {type:'function',name:'OUTBOX_VERSION',stateMutability:'view',inputs:[],outputs:[{type:'uint128'}]},
]
const root = '0x37369616abcbad101428131f1a1341e0fae288882ad741bbf96914bb9dfe7d3b'
console.log('roots(root)', await l1.readContract({ address: OUTBOX, abi, functionName: 'roots', args: [root] }))
console.log('isSpent(294975)', await l1.readContract({ address: OUTBOX, abi, functionName: 'isSpent', args: [294975n] }))
console.log('version', (await l1.readContract({ address: OUTBOX, abi, functionName: 'OUTBOX_VERSION' })).toString())

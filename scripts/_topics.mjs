
import { keccak256, toHex, createPublicClient, http } from 'viem'
const sigs = ['SendRootUpdated(bytes32,bytes32)', 'OutBoxTransactionExecuted(address,address,uint256,uint256)',
 'Spent(uint256)', 'RootUpdated(bytes32,bytes32)', 'SendRootUpdated(bytes32,bytes32,bytes32)']
for (const s of sigs) console.log(keccak256(toHex(s)).slice(0, 18), s)
const l1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const head = await l1.getBlockNumber()
const logs = await l1.getLogs({ address: '0x8D180Caf588f3Da027BEf1F42a106Da93F90b166', fromBlock: head - 2000n, toBlock: head })
for (const l of logs.slice(-4)) console.log(l.blockNumber.toString(), l.topics.map(t => t.slice(0, 18)).join(' '), 'data', l.data.slice(0, 66))

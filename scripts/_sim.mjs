
import { createPublicClient, http, parseAbi, decodeErrorResult } from 'viem'
const l1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const l2 = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const OUTBOX='0x8D180Caf588f3Da027BEf1F42a106Da93F90b166'
const NODE='0x00000000000000000000000000000000000000C8'
const FROM='0x4f619f3e940C75DE719719B7A0638d2C7dadF0a5'
const outboxAbi = parseAbi(['function executeTransaction(bytes32[] proof, uint256 index, address l2Sender, address to, uint256 l2Block, uint256 l1Block, uint256 l2Timestamp, uint256 value, bytes data)'])
const nodeAbi = parseAbi(['function constructOutboxProof(uint64 size, uint64 leaf) view returns (bytes32 send, bytes32 root, bytes32[] proof)'])
const w = { position: 294975n, caller: FROM, destination: FROM, callvalue: 5000000000000000n, data: '0x', arbBlockNum: 158226258n, ethBlockNum: 12218117n, timestamp: 1795716296n }
for (const k of [0n,1n,2n,5n,10n]) {
  const size = w.position + k
  const [send, root, proof] = await l2.readContract({ address: NODE, abi: nodeAbi, functionName: 'constructOutboxProof', args: [size, w.position] })
  try {
    await l1.simulateContract({
      address: OUTBOX, abi: outboxAbi, functionName: 'executeTransaction',
      args: [proof, w.position, w.caller, w.destination, w.arbBlockNum, w.ethBlockNum, w.timestamp, w.callvalue, w.data],
      account: FROM,
    })
    console.log('size', size.toString(), 'SIMULATION OK → claimable')
    break
  } catch (e) {
    console.log('size', size.toString(), 'revert:', (e.shortMessage || e.message).slice(0,140))
  }
}

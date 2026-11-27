
import { createPublicClient, http, parseAbi, decodeAbiParameters, getAbiItem, keccak256, toHex } from 'viem'
const L1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const L2 = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const OUTBOX = '0x8D180Caf588f3Da027BEf1F42a106Da93F90b166'
const NODE = '0x00000000000000000000000000000000000000C8'
const SIZE = 294990n
const TXS = [
  '0xbd4bfcf4efc752f343262993d93c0d021040fdc78e87a9d808e4b0b3bb88dd59',
  '0x1b3dc319cc77f502da95db29e04dd73e3b9c0c1c73d97690b7791c97eae1389c',
  '0xc1e3feab91c9bec909562ee08e86ef225bf1c7079e9808af73b523f055413df9',
]
const TOPIC = keccak256(toHex('L2ToL1Tx(address,address,uint256,uint256,uint256,uint256,uint256,uint256,bytes)'))
const nodeAbi = parseAbi(['function constructOutboxProof(uint64 size, uint64 leaf) view returns (bytes32 send, bytes32 root, bytes32[] proof)'])
const outboxAbi = parseAbi(['function executeTransaction(bytes32[] proof, uint256 index, address l2Sender, address to, uint256 l2Block, uint256 l1Block, uint256 l2Timestamp, uint256 value, bytes data)'])
for (const tx of TXS) {
  const rc = await L2.getTransactionReceipt({ hash: tx as `0x${string}` })
  const log = rc.logs.find(l => l.topics[0] === TOPIC)
  if (!log) { console.log(tx.slice(0,10), 'no L2ToL1Tx'); continue }
  const position = BigInt(log.topics[3])
  const [caller, arbBlockNum, ethBlockNum, timestamp, callvalue, data] = decodeAbiParameters(
    [{type:'address'},{type:'uint256'},{type:'uint256'},{type:'uint256'},{type:'uint256'},{type:'bytes'}], log.data)
  const destination = ('0x' + log.topics[1].slice(26)) as `0x${string}`
  try {
    const built = await L2.readContract({ address: NODE, abi: nodeAbi, functionName: 'constructOutboxProof', args: [SIZE, position] })
    await L1.simulateContract({ address: OUTBOX, abi: outboxAbi, functionName: 'executeTransaction',
      args: [built[2], position, caller, destination, arbBlockNum, ethBlockNum, timestamp, callvalue, data],
      account: '0x0000000000000000000000000000000000000001' })
    console.log('pos', position.toString(), 'value', callvalue.toString(), 'SIM OK — claimable')
  } catch (e) { console.log('pos', position.toString(), 'SIM FAIL', ((e as any).shortMessage || (e as Error).message).slice(0, 120)) }
}

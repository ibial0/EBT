
import { createPublicClient, http, parseAbi, decodeAbiParameters, getAbiItem } from 'viem'
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
const nodeAbi = parseAbi(['function constructOutboxProof(uint64 size, uint64 leaf) view returns (bytes32 send, bytes32 root, bytes32[] proof)'])
const outboxAbi = parseAbi(['function executeTransaction(bytes32[] proof, uint256 index, address l2Sender, address to, uint256 l2Block, uint256 l1Block, uint256 l2Timestamp, uint256 value, bytes data)'])
const EV = getAbiItem({ abi: parseAbi(['event L2ToL1Tx(address caller, address indexed destination, uint256 indexed hash, uint256 indexed position, uint256 arbBlockNum, uint256 ethBlockNum, uint256 timestamp, uint256 callvalue, bytes data)']), name: 'L2ToL1Tx' })
for (const tx of TXS) {
  const rc = await L2.getTransactionReceipt({ hash: tx as `0x${string}` })
  const log = rc.logs.find(l => l.topics[0] === EV.topic || l.address.toLowerCase() === '0x0000000000000000000000000000000000000064')
  if (!log) { console.log(tx.slice(0,10), 'no log'); continue }
  const position = BigInt(log.topics[3])
  const [caller, arbBlockNum, ethBlockNum, timestamp, callvalue, data] = decodeAbiParameters(
    [{type:'address'},{type:'uint256'},{type:'uint256'},{type:'uint256'},{type:'uint256'},{type:'bytes'}],
    log.data,
  )
  const destination = '0x' + log.topics[1].slice(26)
  console.log(tx.slice(0,10), 'pos', position.toString(), 'caller', caller, 'to', destination, 'value', callvalue.toString())
  try {
    const built = await L2.readContract({ address: NODE, abi: nodeAbi, functionName: 'constructOutboxProof', args: [SIZE, position] })
    console.log('  proof len', built[2].length)
    await L1.simulateContract({
      address: OUTBOX, abi: outboxAbi, functionName: 'executeTransaction',
      args: [built[2], position, caller, destination as `0x${string}`, arbBlockNum, ethBlockNum, timestamp, callvalue, data],
      account: '0x0000000000000000000000000000000000000001',
    })
    console.log('  SIM OK — claimable')
  } catch (e) { console.log('  SIM FAIL', ((e as any).shortMessage || (e as Error).message).slice(0, 140)) }
}

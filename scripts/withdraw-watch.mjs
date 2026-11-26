/**
 * Watches a pending Orbit withdrawal until the L1 Outbox accepts the claim.
 * Prints one line per attempt so the wait is observable, then simulates the real
 * executeTransaction call (no gas, no signature) to prove it would succeed.
 */
import { createPublicClient, http, parseAbi, parseAbiItem } from 'viem'

const L1_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'
const L2_RPC = 'https://rpc.testnet.chain.robinhood.com'
const OUTBOX = '0x8D180Caf588f3Da027BEf1F42a106Da93F90b166'
const ROLLUP = '0xdc5F8E399DBd8a9F5F87AeC4C23Beb12431b386D'
const NODE = '0x00000000000000000000000000000000000000C8'
const FROM = '0x4f619f3e940C75DE719719B7A0638d2C7dadF0a5'

const w = {
  position: BigInt(process.env.POS ?? '294975'),
  caller: FROM,
  destination: FROM,
  callvalue: BigInt(process.env.VALUE ?? '5000000000000000'),
  data: '0x',
  arbBlockNum: BigInt(process.env.L2BLOCK ?? '158226258'),
  ethBlockNum: BigInt(process.env.L1BLOCK ?? '12218117'),
  timestamp: BigInt(process.env.TS ?? '1795716296'),
}

const l1 = createPublicClient({ transport: http(L1_RPC) })
const l2 = createPublicClient({ transport: http(L2_RPC) })

const outboxAbi = parseAbi([
  'function executeTransaction(bytes32[] proof, uint256 index, address l2Sender, address to, uint256 l2Block, uint256 l1Block, uint256 l2Timestamp, uint256 value, bytes data)',
])
const nodeAbi = parseAbi([
  'function constructOutboxProof(uint64 size, uint64 leaf) view returns (bytes32 send, bytes32 root, bytes32[] proof)',
])
const confirmEvent = parseAbiItem('event AssertionConfirmed(bytes32 indexed assertionId, bytes32 blockHash, bytes32 sendRoot)')

const deadline = Date.now() + Number(process.env.MINUTES ?? 25) * 60_000
let attempt = 1
while (Date.now() < deadline) {
  const head = await l1.getBlockNumber().catch(() => 0n)
  const logs = await l1
    .getLogs({ address: ROLLUP, event: confirmEvent, fromBlock: head - 3000n, toBlock: head })
    .catch(() => [])
  const newest = logs.at(-1)
  let line = `#${attempt} l1=${head} confirmedAssertions=${logs.length}`
  if (newest) line += ` newestSendRoot=${newest.args.sendRoot.slice(0, 10)} @${newest.blockNumber}`

  let proof = null
  for (let k = 0n; k <= 8n && !proof; k++) {
    try {
      const [, , p] = await l2.readContract({
        address: NODE,
        abi: nodeAbi,
        functionName: 'constructOutboxProof',
        args: [w.position + k, w.position],
      })
      if (p?.length) proof = p
    } catch {
      /* try next size */
    }
  }

  if (proof) {
    try {
      await l1.simulateContract({
        address: OUTBOX,
        abi: outboxAbi,
        functionName: 'executeTransaction',
        args: [proof, w.position, w.caller, w.destination, w.arbBlockNum, w.ethBlockNum, w.timestamp, w.callvalue, w.data],
        account: FROM,
      })
      console.log(line, '→ CLAIM SIMULATION OK')
      process.exit(0)
    } catch (e) {
      const sig = (e.shortMessage ?? e.message).match(/0x[0-9a-f]{8}/)?.[0] ?? (e.shortMessage ?? e.message).slice(0, 80)
      line += ` proofLen=${proof.length} sim=${sig}`
    }
  } else {
    line += ' no-proof-yet'
  }
  console.log(line)
  attempt++
  await new Promise((r) => setTimeout(r, 30000))
}
console.log('timed out waiting for the outbox root')

/**
 * Withdrawal probe: initiate a real Robinhood L2 -> Sepolia withdrawal and inspect
 * every field needed for the L1 claim, then test which outbox-proof inputs the L1
 * Outbox actually accepts. Testnet only.
 */
import { readFileSync } from 'node:fs'
import { mnemonicToAccount } from 'viem/accounts'
import { createPublicClient, createWalletClient, http, parseEther, decodeEventLog, parseAbi, formatEther } from 'viem'

const wallet = JSON.parse(readFileSync(new URL('../.test-wallet.json', import.meta.url), 'utf8'))
const account = mnemonicToAccount(wallet.mnemonic)

const L2_RPC = 'https://rpc.testnet.chain.robinhood.com'
const L1_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'
const ARBSYS = '0x0000000000000000000000000000000000000064'
const NODE_INTERFACE = '0x00000000000000000000000000000000000000C8'

const l2 = createPublicClient({ transport: http(L2_RPC) })
const l1 = createPublicClient({ transport: http(L1_RPC) })
const l2wallet = createWalletClient({ account, transport: http(L2_RPC) })

const arbSysAbi = parseAbi(['function withdrawEth(address destination) payable returns (uint256)'])
const nodeAbi = parseAbi([
  'function constructOutboxProof(uint64 size, uint64 leaf) view returns (bytes32 send, bytes32 root, bytes32[] proof)',
  'function getL1Confirmations(bytes32 blockHash) view returns (uint64)',
])
const l2ToL1Event = parseAbi([
  'event L2ToL1Tx(address caller, address indexed destination, uint256 indexed hash, uint256 indexed position, uint256 arbBlockNum, uint256 ethBlockNum, uint256 timestamp, uint256 callvalue, bytes data)',
])[0]

const AMOUNT = process.argv[2] ?? '0.005'

console.log('account', account.address)
const before = await l2.getBalance({ address: account.address })
console.log('L2 balance', formatEther(before))

const hash = await l2wallet.writeContract({
  address: ARBSYS,
  abi: arbSysAbi,
  functionName: 'withdrawEth',
  args: [account.address],
  value: parseEther(AMOUNT),
})
console.log('withdraw tx', hash)

const receipt = await l2.waitForTransactionReceipt({ hash })
console.log('L2 status', receipt.status, 'block', receipt.blockNumber)

let ev = null
for (const log of receipt.logs) {
  try {
    const d = decodeEventLog({ abi: [l2ToL1Event], data: log.data, topics: log.topics })
    ev = { ...d.args, address: log.address }
  } catch {}
}
console.log('L2ToL1Tx', ev ? JSON.stringify(ev, (k, v) => (typeof v === 'bigint' ? v.toString() : v)) : 'NOT FOUND')

const block = await l2.getBlock({ blockHash: receipt.blockHash })
console.log('L2 block hash', receipt.blockHash, 'l1BlockNumber field', block.l1BlockNumber ?? 'n/a')

let conf = 0n
for (let i = 0; i < 40; i++) {
  try {
    conf = await l2.readContract({
      address: NODE_INTERFACE,
      abi: nodeAbi,
      functionName: 'getL1Confirmations',
      args: [receipt.blockHash],
    })
  } catch (e) {
    console.log('getL1Confirmations failed', e.message)
    break
  }
  console.log('L1 confirmations', conf.toString())
  if (conf > 0n) break
  await new Promise((r) => setTimeout(r, 15000))
}

if (ev && conf > 0n) {
  const pos = ev.position
  const outbox = process.env.OUTBOX
  const candidates = []
  for (let k = 0; k <= 24; k++) candidates.push([`size=pos+${k}`, [pos + BigInt(k), pos]])
  candidates.push(['pos,pos', [pos, pos]])
  candidates.push(['pos>>64,pos', [pos >> 64n, pos]])
  for (const [label, [size, leaf]] of candidates) {
    try {
      const r = await l2.readContract({
        address: NODE_INTERFACE,
        abi: nodeAbi,
        functionName: 'constructOutboxProof',
        args: [size, leaf],
      })
      let accepted = 'no outbox'
      if (outbox) {
        accepted = String(
          await l1.readContract({ address: outbox, abi: parseAbi(['function roots(bytes32) view returns (bool)']), functionName: 'roots', args: [r[1]] }),
        )
      }
      console.log(label, 'size', size.toString(), 'leaf', leaf.toString(), 'root', r[1], 'proofLen', r[2].length, 'accepted', accepted)
    } catch (e) {
      console.log(label, 'failed:', (e.shortMessage ?? e.message).slice(0, 120))
    }
  }
}

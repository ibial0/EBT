/**
 * Canonical Arbitrum Orbit withdrawal: L2 -> L1.
 *
 * An Orbit chain cannot move value to its parent in one transaction. The canonical path is:
 *
 *   1. L2  ArbSys.withdrawEth(destination)      — burns/escrows value, emits L2ToL1Tx
 *   2. wait for the assertion that contains the send to be confirmed on L1
 *      (this testnet: 20 L1 blocks ≈ 4 minutes; mainnet Arbitrum: 7 days)
 *   3. L1  Outbox.executeTransaction(proof, ...) — releases the value to the destination
 *
 * The proof is built by the L2 node itself (`NodeInterface.constructOutboxProof`) and is
 * only accepted once the L1 Outbox has registered the matching send root, which is verified
 * here before anything is signed. No value moves without the user signing each step.
 */
import { decodeEventLog, parseAbi, parseAbiItem, type Address } from 'viem'
import { getPublicClient, getWalletClient } from 'wagmi/actions'
import { ensureWalletChain, wagmiConfig } from './wallet'
import { ORBIT_BRIDGES } from '../config/orbit'

const ARBSYS: Address = '0x0000000000000000000000000000000000000064'
const NODE_INTERFACE: Address = '0x00000000000000000000000000000000000000C8'

const withdrawAbi = parseAbi(['function withdrawEth(address destination) payable returns (uint256)'])
const l2ToL1Event = parseAbiItem(
  'event L2ToL1Tx(address caller, address indexed destination, uint256 indexed hash, uint256 indexed position, uint256 arbBlockNum, uint256 ethBlockNum, uint256 timestamp, uint256 callvalue, bytes data)',
)
const nodeAbi = parseAbi([
  'function constructOutboxProof(uint64 size, uint64 leaf) view returns (bytes32 send, bytes32 root, bytes32[] proof)',
])
const assertionConfirmedEvent = parseAbiItem(
  'event AssertionConfirmed(bytes32 indexed assertionId, bytes32 blockHash, bytes32 sendRoot)',
)
const outboxAbi = parseAbi([
  'function executeTransaction(bytes32[] proof, uint256 index, address l2Sender, address to, uint256 l2Block, uint256 l1Block, uint256 l2Timestamp, uint256 value, bytes data)',
])

export interface Withdrawal {
  txHash: `0x${string}`
  l2BlockHash: `0x${string}`
  position: bigint
  caller: Address
  destination: Address
  callvalue: bigint
  data: `0x${string}`
  arbBlockNum: bigint
  ethBlockNum: bigint
  timestamp: bigint
}

/** Step 1 — burn the value on the Orbit chain and emit the L2ToL1Tx message. */
export async function initiateWithdrawEth(chainId: number, amountWei: bigint): Promise<`0x${string}`> {
  if (amountWei <= 0n) throw new Error('Enter an amount greater than zero.')
  await ensureWalletChain(chainId)
  const wallet = await getWalletClient(wagmiConfig, { chainId: chainId as never })
  if (!wallet?.account) throw new Error('Connect a wallet first.')
  return wallet.writeContract({
    address: ARBSYS,
    abi: withdrawAbi,
    functionName: 'withdrawEth',
    args: [wallet.account.address],
    value: amountWei,
    account: wallet.account,
    chain: null,
  })
}

/** Reads the withdrawal message out of the L2 receipt. */
export async function readWithdrawal(chainId: number, txHash: `0x${string}`): Promise<Withdrawal> {
  const client = getPublicClient(wagmiConfig, { chainId: chainId as never })
  if (!client) throw new Error('No RPC for this chain.')
  const receipt = await client.waitForTransactionReceipt({ hash: txHash })
  if (receipt.status !== 'success') throw new Error('The withdrawal transaction reverted on L2.')
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== ARBSYS.toLowerCase()) continue
    try {
      const decoded = decodeEventLog({ abi: [l2ToL1Event], data: log.data, topics: log.topics })
      const a = decoded.args as unknown as Record<string, never>
      return {
        txHash,
        l2BlockHash: receipt.blockHash,
        position: a.position as unknown as bigint,
        caller: a.caller as unknown as Address,
        destination: a.destination as unknown as Address,
        callvalue: a.callvalue as unknown as bigint,
        data: a.data as unknown as `0x${string}`,
        arbBlockNum: a.arbBlockNum as unknown as bigint,
        ethBlockNum: a.ethBlockNum as unknown as bigint,
        timestamp: a.timestamp as unknown as bigint,
      }
    } catch {
      /* not the withdrawal event */
    }
  }
  throw new Error('No L2ToL1Tx event in that transaction.')
}

/**
 * What the rollup has actually confirmed on the parent chain.
 *
 * A withdrawal is claimable only once the assertion that *contains* its send is confirmed,
 * and every assertion carries a snapshot: `sendCount` (how many L2->L1 sends it covers) and
 * `sendRoot` (the merkle root of those sends). Until `sendCount` is past your position the
 * message simply is not in a confirmed tree yet — that is the real wait, not a timer.
 */
export interface RollupProgress {
  size: bigint
  sendRoot: `0x${string}`
  blockHash: `0x${string}`
  l1Block: bigint
}

export async function confirmedSends(chainId: number, parentChainId: number): Promise<RollupProgress | null> {
  const cfg = ORBIT_BRIDGES[chainId]
  if (!cfg) return null
  const l1 = getPublicClient(wagmiConfig, { chainId: parentChainId as never })
  const l2 = getPublicClient(wagmiConfig, { chainId: chainId as never })
  if (!l1 || !l2) return null
  const head = await l1.getBlockNumber().catch(() => 0n)
  const from = head > 6000n ? head - 6000n : 0n
  const logs = await l1
    .getLogs({ address: cfg.rollup, event: assertionConfirmedEvent, fromBlock: from, toBlock: head })
    .catch(() => [])
  const last = logs[logs.length - 1]
  if (!last) return null
  try {
    const block = (await l2.getBlock({ blockHash: last.args.blockHash as `0x${string}` })) as unknown as {
      sendCount?: `0x${string}` | number
    }
    if (block.sendCount == null) return null
    return {
      size: BigInt(block.sendCount as unknown as string),
      sendRoot: last.args.sendRoot as `0x${string}`,
      blockHash: last.args.blockHash as `0x${string}`,
      l1Block: last.blockNumber ?? 0n,
    }
  } catch {
    return null
  }
}

/**
 * Builds the outbox proof. `size` must be the send-count of a *confirmed* accumulator, and
 * the L2 node is the only party that can build the matching tree, so the proof is accepted
 * only when the L1 outbox already knows the root it produces.
 */
export async function findOutboxProof(
  chainId: number,
  parentChainId: number,
  w: Withdrawal,
): Promise<{ proof: `0x${string}`[]; index: bigint; size: bigint }> {
  const cfg = ORBIT_BRIDGES[chainId]
  if (!cfg?.outbox) throw new Error('This chain has no outbox configured.')
  const l2 = getPublicClient(wagmiConfig, { chainId: chainId as never })
  const l1 = getPublicClient(wagmiConfig, { chainId: parentChainId as never })
  if (!l2 || !l1) throw new Error('Missing RPC for the withdrawal.')

  const confirmed = await confirmedSends(chainId, parentChainId)
  if (!confirmed) throw new Error('Could not read the rollup confirmation state.')
  if (confirmed.size <= w.position) {
    throw new Error(
      `Not in a confirmed assertion yet — the rollup has confirmed sends up to #${confirmed.size}, your message is #${w.position + 1n}.`,
    )
  }

  const [, root, proof] = (await l2.readContract({
    address: NODE_INTERFACE,
    abi: nodeAbi,
    functionName: 'constructOutboxProof',
    args: [confirmed.size, w.position],
  })) as unknown as [`0x${string}`, `0x${string}`, `0x${string}`[]]
  if (!proof?.length) throw new Error('The node returned no proof.')
  if (root.toLowerCase() !== confirmed.sendRoot.toLowerCase()) {
    throw new Error('The node proof does not match the confirmed send root.')
  }

  // Final say belongs to the outbox itself: a static call that would revert means "not yet".
  try {
    await l1.simulateContract({
      address: cfg.outbox,
      abi: outboxAbi,
      functionName: 'executeTransaction',
      args: [proof, w.position, w.caller, w.destination, w.arbBlockNum, w.ethBlockNum, w.timestamp, w.callvalue, w.data],
      account: w.destination,
    })
  } catch {
    throw new Error('The outbox rejected the proof — the withdrawal is not claimable yet.')
  }
  return { proof, index: w.position, size: confirmed.size }
}

/** Step 3 — release the value on the parent chain. */
export async function claimWithdrawal(
  chainId: number,
  parentChainId: number,
  w: Withdrawal,
  proof: `0x${string}`[],
): Promise<`0x${string}`> {
  const cfg = ORBIT_BRIDGES[chainId]
  if (!cfg?.outbox) throw new Error('This chain has no outbox configured.')
  await ensureWalletChain(parentChainId)
  const wallet = await getWalletClient(wagmiConfig, { chainId: parentChainId as never })
  if (!wallet?.account) throw new Error('Connect a wallet on the parent chain first.')
  return wallet.writeContract({
    address: cfg.outbox,
    abi: outboxAbi,
    functionName: 'executeTransaction',
    args: [proof, w.position, w.caller, w.destination, w.arbBlockNum, w.ethBlockNum, w.timestamp, w.callvalue, w.data],
    account: wallet.account,
    chain: null,
  })
}

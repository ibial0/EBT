/**
 * OP Stack deposit arrival tracker.
 *
 * A canonical L1 -> L2 deposit is not a second signature: the sequencer derives it
 * from the `TransactionDeposited` log of the L1 transaction. That derivation is
 * deterministic, so the L2 transaction hash can be computed locally and then
 * checked against the destination chain. No explorer API, no guessing.
 *
 * Spec: https://specs.optimism.io/protocol/deposits.html
 *   sourceHash = keccak256(bytes32(uint256(0)), keccak256(l1BlockHash, bytes32(uint256(l1LogIndex))))
 *   depositTx  = keccak256(0x7E || rlp([sourceHash, from, to, mint, value, gas, isSystemTx, data]))
 */
import { encodeAbiParameters, keccak256, parseAbi, type Address, type Hex, type PublicClient } from 'viem'
import { getActivity, listActivity, updateActivity, updateStep, appendStep, finalizeFromSteps } from './activity'
import { getChain } from '../config/chains'
import { getPortalAddress } from './opstack'
import type { ChainCfg } from '../config/chains'

const DEPOSIT_EVENT =
  'event TransactionDeposited(address indexed from, address indexed to, uint256 indexed version, bytes opaqueData)'
const DEPOSIT_TOPIC = '0xb3813568d9991fc951961fcb4c784893574240a28925604d09fc577c55bb7c32'

/* ------------------------------------------------------------------ RLP */

function concat(...parts: Uint8Array[]): Uint8Array {
  const n = parts.reduce((a, p) => a + p.length, 0)
  const out = new Uint8Array(n)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}
function lenBytes(n: number): Uint8Array {
  const out: number[] = []
  while (n > 0) {
    out.unshift(n & 0xff)
    n = Math.floor(n / 256)
  }
  return new Uint8Array(out)
}
/** RLP of a byte string. */
function rlpBytes(b: Uint8Array): Uint8Array {
  if (b.length === 1 && b[0] < 0x80) return b
  if (b.length < 56) return concat(new Uint8Array([0x80 + b.length]), b)
  const l = lenBytes(b.length)
  return concat(new Uint8Array([0xb7 + l.length]), l, b)
}
/** RLP of a uint (minimal big-endian, zero encodes as the empty string). */
function rlpUint(n: bigint): Uint8Array {
  if (n === 0n) return rlpBytes(new Uint8Array(0))
  const out: number[] = []
  let v = n
  while (v > 0n) {
    out.unshift(Number(v & 255n))
    v >>= 8n
  }
  return rlpBytes(new Uint8Array(out))
}
function rlpList(items: Uint8Array[]): Uint8Array {
  const body = concat(...items)
  if (body.length < 56) return concat(new Uint8Array([0xc0 + body.length]), body)
  const l = lenBytes(body.length)
  return concat(new Uint8Array([0xf7 + l.length]), l, body)
}
const fromHex = (h: Hex) => new Uint8Array((h.slice(2).match(/.{2}/g) ?? []).map((x) => parseInt(x, 16)))
const word = (n: bigint) => ('0x' + n.toString(16).padStart(64, '0')) as Hex

/* ------------------------------------------------------------- derivation */

export interface DepositInfo {
  sourceHash: Hex
  l2TxHash: Hex
  from: Address
  to: Address
  mint: bigint
  value: bigint
  gas: bigint
}

/**
 * Reads the L1 receipt and recomputes the destination transaction hash.
 * Returns null when the transaction is not a portal deposit.
 */
export async function deriveDeposit(
  l1: ChainCfg,
  l2: ChainCfg,
  l1TxHash: Hex,
  client: PublicClient,
): Promise<DepositInfo | null> {
  const portal = getPortalAddress(l2)
  if (!portal) return null

  const rc = await client.getTransactionReceipt({ hash: l1TxHash })
  const log = rc.logs.find(
    (l) => l.address.toLowerCase() === portal.toLowerCase() && l.topics[0] === DEPOSIT_TOPIC,
  )
  if (!log) return null

  const fromTopic = log.topics[1]
  const toTopic = log.topics[2]
  if (!fromTopic || !toTopic) return null
  const from = ('0x' + fromTopic.slice(26)) as Address
  const to = ('0x' + toTopic.slice(26)) as Address

  // opaqueData is the ABI-encoded `bytes` payload: offset, length, then the packed body.
  const raw = log.data
  const offset = Number(BigInt('0x' + raw.slice(2, 66)))
  const bodyLen = Number(BigInt('0x' + raw.slice(66, 130)))
  const body = raw.slice(2 + (offset + 32) * 2, 2 + (offset + 32) * 2 + bodyLen * 2)
  if (body.length < 146) return null

  const mint = BigInt('0x' + body.slice(0, 64))
  const value = BigInt('0x' + body.slice(64, 128))
  const gas = BigInt('0x' + body.slice(128, 144))
  const isCreation = body.slice(144, 146) === '01'
  const data = '0x' as Hex

  const block = await client.getBlock({ blockNumber: rc.blockNumber })
  const l1BlockHash = block.hash
  if (!l1BlockHash) return null

  const inner = keccak256(
    encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'uint256' }],
      [l1BlockHash, BigInt(log.logIndex)],
    ),
  )
  const sourceHash = keccak256(encodeAbiParameters([{ type: 'bytes32' }, { type: 'bytes32' }], [word(0n), inner]))

  const payload = rlpList([
    rlpBytes(fromHex(sourceHash)),
    rlpBytes(fromHex(from)),
    // a contract-creation deposit carries the null address, not the `to` argument
    rlpBytes(isCreation ? new Uint8Array(0) : fromHex(to)),
    rlpUint(mint),
    rlpUint(value),
    rlpUint(gas),
    rlpUint(0n), // isSystemTx, disabled since Regolith
    rlpBytes(fromHex(data)),
  ])
  const l2TxHash = keccak256(concat(new Uint8Array([0x7e]), payload))

  return { sourceHash, l2TxHash, from, to, mint, value, gas }
}

/* ---------------------------------------------------------------- tracking */

const running = new Map<string, number>()

export function isDepositTracking(id: string) {
  return running.has(id)
}

/** Destination chain state for a computed deposit hash. */
export async function checkDeposit(l2: ChainCfg, l2TxHash: Hex, client: PublicClient) {
  const tx = await client.getTransaction({ hash: l2TxHash }).catch(() => null)
  if (!tx) return 'pending' as const
  const rc = await client.getTransactionReceipt({ hash: l2TxHash }).catch(() => null)
  if (!rc) return 'pending' as const
  return rc.status === 'success' ? ('complete' as const) : ('failed' as const)
}

/** The step that carries the L1 deposit hash, and the step that reports L2 arrival. */
export function depositSteps(item: {
  steps: { key: string; status: string; hash?: string; chainId?: number; label?: string; note?: string }[]
  toChainId: number
}): { l1Key: string | null; arriveKey: string } {
  const arrive = item.steps.find((s) => s.key.startsWith('arrive'))
  const arriveKey = arrive?.key ?? 'arrive0'
  // records written before the arrival step existed only carry the L1 hash
  const l1 = item.steps.find((s) => s.hash && s.status === 'done' && s.key !== arriveKey)
  return { l1Key: l1?.key ?? null, arriveKey }
}

export async function pollDepositOnce(
  id: string,
  l1Client: PublicClient,
  l2Client: PublicClient,
): Promise<'pending' | 'complete' | 'failed' | 'idle'> {
  const item = getActivity(id)
  if (!item || item.provider !== 'opstack') return 'idle'
  const from = getChain(item.fromChainId)
  const to = getChain(item.toChainId)
  if (!from || !to) return 'idle'

  const { l1Key, arriveKey } = depositSteps(item)
  if (!l1Key) return 'idle'
  const deposit = item.steps.find((s) => s.key === l1Key)
  if (!deposit?.hash) return 'idle'
  const arrive = item.steps.find((s) => s.key === arriveKey)
  if (arrive?.status === 'done' && item.status === 'complete') return 'complete'

  const info = await deriveDeposit(from, to, deposit.hash as Hex, l1Client)
  if (!info) return 'idle'

  const state = await checkDeposit(to, info.l2TxHash, l2Client)
  // records predating the arrival step get one appended; the L1 hash is kept
  if (!arrive) appendStep(id, arriveKey, {
    label: `Arrives on ${to.short}`,
    status: 'active',
    chainId: to.id,
    note: 'Deposit submitted on L1. Waiting for the sequencer.',
  })
  if (state === 'complete') {
    updateStep(id, arriveKey, {
      status: 'done',
      hash: info.l2TxHash,
      chainId: to.id,
      note: 'Included by the sequencer.',
    })
    updateActivity(id, { meta: { ...(item.meta ?? {}), l2TxHash: info.l2TxHash, sourceHash: info.sourceHash } })
    finalizeFromSteps(id)
    return 'complete'
  }
  if (state === 'failed') {
    updateStep(id, arriveKey, { status: 'failed', note: 'The deposit was included but its execution reverted.' })
    return 'failed'
  }
  updateStep(id, arriveKey, { status: 'active', note: 'Deposit submitted on L1. Waiting for the sequencer.' })
  return 'pending'
}

export function startDepositTracking(
  id: string,
  clients: { l1: PublicClient; l2: PublicClient },
  opts?: { maxMinutes?: number; onDone?: (s: 'complete' | 'failed') => void },
) {
  const existing = running.get(id)
  if (existing) window.clearTimeout(existing)

  const deadline = Date.now() + (opts?.maxMinutes ?? 45) * 60_000
  let delay = 5000

  const tick = async () => {
    try {
      const state = await pollDepositOnce(id, clients.l1, clients.l2)
      if (state === 'complete' || state === 'failed' || state === 'idle') {
        running.delete(id)
        opts?.onDone?.(state === 'complete' ? 'complete' : 'failed')
        return
      }
    } catch {
      /* transient RPC error */
    }
    if (Date.now() > deadline) {
      running.delete(id)
      const item = getActivity(id)
      if (item) {
        const { arriveKey } = depositSteps(item)
        updateStep(id, arriveKey, { note: 'Still not included after 45 min. Re-open this transfer to keep checking.' })
      }
      return
    }
    delay = Math.min(delay * 1.25, 30_000)
    running.set(id, window.setTimeout(tick, delay))
  }

  running.set(id, window.setTimeout(tick, 2000))
}

/** Resume every unfinished OP Stack deposit when the app loads. */
export function resumeDepositTracking(clients: (id: number) => PublicClient | null | undefined) {
  for (const item of listActivity()) {
    if (item.provider !== 'opstack' || item.status === 'complete') continue
    const from = getChain(item.fromChainId)
    const to = getChain(item.toChainId)
    if (!from || !to) continue
    const { l1Key } = depositSteps(item)
    if (!l1Key) continue
    const l1 = clients(item.fromChainId)
    const l2 = clients(item.toChainId)
    if (!l1 || !l2) continue
    startDepositTracking(item.id, { l1, l2 })
  }
}

export const depositEventAbi = parseAbi([DEPOSIT_EVENT])

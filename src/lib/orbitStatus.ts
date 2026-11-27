/**
 * Shared, short-lived cache for the rollup's confirmed send count.
 *
 * Four places ask the same question (bridge card, activity list, bell, recovery tab). Without a
 * cache each of them scans the same 6,000 L1 blocks and re-reads the same L2 block, so the claim
 * button only appears after several round trips. One 20s cache makes the first paint instant and
 * keeps the four views consistent with each other.
 */
import { confirmedSends } from './orbitWithdraw'

const TTL_MS = 20_000
const STORE = 'ebt.confirmedSizes.v1'
type Entry = { at: number; size: bigint | null }
const cache = new Map<string, Entry>()

function load(): Record<string, { at: number; size: string | null }> {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? '{}')
  } catch {
    return {}
  }
}

function persist(): void {
  try {
    const out: Record<string, { at: number; size: string | null }> = {}
    for (const [k, v] of cache) out[k] = { at: v.at, size: v.size == null ? null : v.size.toString() }
    localStorage.setItem(STORE, JSON.stringify(out))
  } catch {
    /* storage full or blocked; the in-memory cache still works */
  }
}

/** Synchronous read of the last known confirmed size, for a first paint without RPC. */
export function peekConfirmedSize(fromId: number, toId: number): bigint | null {
  const key = `${fromId}:${toId}`
  const mem = cache.get(key)
  if (mem) return mem.size
  const raw = load()[key]
  if (!raw) return null
  const size = raw.size == null ? null : BigInt(raw.size)
  cache.set(key, { at: raw.at, size })
  return size
}

export async function confirmedSize(fromId: number, toId: number): Promise<bigint | null> {
  const key = `${fromId}:${toId}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.size
  const progress = await confirmedSends(fromId, toId).catch(() => null)
  const size = progress ? progress.size : null
  cache.set(key, { at: Date.now(), size })
  persist()
  return size
}

export function primeConfirmedSize(fromId: number, toId: number, size: bigint): void {
  cache.set(`${fromId}:${toId}`, { at: Date.now(), size })
  persist()
}

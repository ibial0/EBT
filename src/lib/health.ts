import { useQuery } from '@tanstack/react-query'
import { getPublicClient } from 'wagmi/actions'
import { CHAINS } from '../config/chains'
import { NON_EVM_NETWORKS, type NetworkEntry } from '../config/networks'
import { wagmiConfig } from './wallet'

export interface ChainHealth {
  id: number
  key: string
  name: string
  ok: boolean
  blockNumber?: string
  latencyMs?: number
  error?: string
}

export interface NonEvmHealth {
  id: string
  key: string
  name: string
  ok: boolean
  height?: string
  latencyMs?: number
  error?: string
}

async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return out
}

async function probe(chainId: number): Promise<ChainHealth> {
  const meta = CHAINS.find((c) => c.id === chainId)!
  const t0 = performance.now()
  const client = getPublicClient(wagmiConfig, { chainId: chainId as never })
  if (!client) return { id: chainId, key: meta.key, name: meta.name, ok: false, error: 'no client' }
  try {
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout after 7s')), 7000))
    const bn = await Promise.race([client.getBlockNumber(), timeout])
    return { id: chainId, key: meta.key, name: meta.name, ok: true, blockNumber: bn.toString(), latencyMs: Math.round(performance.now() - t0) }
  } catch (e) {
    return { id: chainId, key: meta.key, name: meta.name, ok: false, error: (e as Error).message.slice(0, 90) }
  }
}

async function probeNonEvm(net: NetworkEntry): Promise<NonEvmHealth> {
  const t0 = performance.now()
  try {
    const signal = AbortSignal.timeout(7000)
    if (net.family === 'solana') {
      const r = await fetch(net.rpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"jsonrpc":"2.0","id":1,"method":"getSlot"}', signal })
      const j = (await r.json()) as { result?: number }
      if (j.result == null) throw new Error('missing slot')
      return { id: net.id, key: net.key, name: net.name, ok: true, height: String(j.result), latencyMs: Math.round(performance.now() - t0) }
    }
    if (net.family === 'sui') {
      const r = await fetch(net.rpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"query":"{ checkpoint { sequenceNumber } }"}', signal })
      const j = (await r.json()) as { data?: { checkpoint?: { sequenceNumber?: number } } }
      const seq = j.data?.checkpoint?.sequenceNumber
      if (seq == null) throw new Error('missing checkpoint')
      return { id: net.id, key: net.key, name: net.name, ok: true, height: String(seq), latencyMs: Math.round(performance.now() - t0) }
    }
    if (net.family === 'starknet') {
      const r = await fetch(net.rpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"jsonrpc":"2.0","id":1,"method":"starknet_blockNumber","params":[]}', signal })
      const j = (await r.json()) as { result?: number }
      if (j.result == null) throw new Error('missing block')
      return { id: net.id, key: net.key, name: net.name, ok: true, height: String(j.result), latencyMs: Math.round(performance.now() - t0) }
    }
    if (net.family === 'near') {
      const r = await fetch(net.rpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"jsonrpc":"2.0","id":1,"method":"status","params":[]}', signal })
      const j = (await r.json()) as { result?: { sync_info?: { latest_block_height?: number } } }
      const h = j.result?.sync_info?.latest_block_height
      if (h == null) throw new Error('missing status')
      return { id: net.id, key: net.key, name: net.name, ok: true, height: String(h), latencyMs: Math.round(performance.now() - t0) }
    }
    if (net.family === 'polkadot') {
      const r = await fetch(net.rpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"jsonrpc":"2.0","id":1,"method":"system_chain","params":[]}', signal })
      const j = (await r.json()) as { result?: string }
      if (!j.result) throw new Error('missing chain')
      return { id: net.id, key: net.key, name: net.name, ok: true, latencyMs: Math.round(performance.now() - t0) }
    }
    if (net.family === 'xrpl') {
      const r = await fetch(net.rpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"method":"server_info","params":[{}]}', signal })
      const j = (await r.json()) as { result?: { info?: { validated_ledger?: { seq?: number } } } }
      const seq = j.result?.info?.validated_ledger?.seq
      if (!j.result?.info) throw new Error('missing server_info')
      return { id: net.id, key: net.key, name: net.name, ok: true, height: seq ? String(seq) : undefined, latencyMs: Math.round(performance.now() - t0) }
    }
    // GET JSON REST ecosystems: Aptos, Stellar, Algorand, Cosmos (Noble)
    const r = await fetch(net.rpcUrl, { signal })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const j = (await r.json()) as Record<string, unknown>
    const h =
      typeof j.block_height === 'string' || typeof j.block_height === 'number'
        ? String(j.block_height)
        : typeof j['last-round'] === 'number'
          ? String(j['last-round'])
          : typeof j.history_latest_ledger === 'number'
            ? String(j.history_latest_ledger)
            : typeof j.ledger_version === 'string'
              ? j.ledger_version
              : undefined
    return { id: net.id, key: net.key, name: net.name, ok: true, height: h, latencyMs: Math.round(performance.now() - t0) }
  } catch (e) {
    return { id: net.id, key: net.key, name: net.name, ok: false, error: (e as Error).message.slice(0, 90) }
  }
}

/** Live RPC probe of every allowlisted EVM chain (bounded concurrency 8 so sockets are not saturated). */
export function useNetworkHealth() {
  return useQuery({
    queryKey: ['network-health'],
    queryFn: () => mapLimit(CHAINS, 8, (c) => probe(c.id)),
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 0,
  })
}

/** Live RPC/REST/GraphQL probe of non-EVM testnets. */
export function useNonEvmHealth() {
  return useQuery({
    queryKey: ['non-evm-health'],
    queryFn: () => mapLimit(NON_EVM_NETWORKS, 5, probeNonEvm),
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 0,
  })
}

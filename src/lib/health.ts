import { useQuery } from '@tanstack/react-query'
import { getPublicClient } from 'wagmi/actions'
import { CHAINS } from '../config/chains'
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

/** Live RPC probe of every allowlisted chain (parallel, 7s timeout each). */
export function useNetworkHealth() {
  return useQuery({
    queryKey: ['network-health'],
    queryFn: async () => {
      const results = await Promise.all(CHAINS.map((c) => probe(c.id)))
      return results
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 0,
  })
}

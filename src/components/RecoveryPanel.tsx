import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import type { Address } from 'viem'
import { LifeBuoy } from 'lucide-react'
import { Badge, Button, Card, ChainLogo, Spinner, notify } from './ui'
import { getChain } from '../config/chains'
import { useActivity } from '../lib/activity'
import { recoverAll, recoverOne, scanRecoverables } from '../lib/recovery'
import { ensureWalletChain } from '../lib/wallet'

export function RecoveryPanel({ compact }: { compact?: boolean }) {
  const { address } = useAccount()
  const records = useActivity()
  /**
   * Recovery is personal: only entries belonging to the wallet that is connected right now.
   * Without this a disconnected browser still showed the previous wallet's claimable USDC.
   */
  const items = address
    ? records.filter((i) => i.owner?.toLowerCase() === address.toLowerCase())
    : []
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const [busy, setBusy] = useState<string | null>(null)
  const [results, setResults] = useState<Array<{ id: string; ok: boolean; error?: string }>>([])

  const hasCandidates = items.some((i) => {
    const msg = i.meta?.message as string | undefined
    const att = i.meta?.attestation as string | undefined
    return i.provider === 'cctp' && Boolean(msg && att) && i.steps.find((s) => s.key === 'receive')?.status !== 'done'
  })

  const scan = useQuery({
    queryKey: ['recoverables', address, items.map((i) => `${i.id}:${i.updatedAt}`).join('|')],
    queryFn: scanRecoverables,
    enabled: Boolean(address) && hasCandidates,
    staleTime: 30_000,
    retry: 0,
  })

  if (!hasCandidates) return null

  const all = scan.data ?? []
  const claimable = all.filter((r) => r.checked && !r.used)
  const total = claimable.reduce((n, r) => n + Number(r.amount || 0), 0)

  async function run(id: string) {
    const target = all.find((r) => r.item.id === id)
    if (!target || !address) return
    setBusy(id)
    try {
      await ensureWalletChain(target.destChainId)
      const res = await recoverOne(target, address as Address)
      setResults((r) => [...r.filter((x) => x.id !== res.id), { id: res.id, ok: res.ok, error: res.error }])
      notify(res.ok ? `Recovered ${target.amount} USDC on ${target.destChainName}` : res.error ?? 'Recovery failed', res.ok ? 'success' : 'error')
      await scan.refetch()
    } finally {
      setBusy(null)
    }
  }

  async function runAll() {
    if (!address) return
    setBusy('all')
    try {
      const out = await recoverAll(claimable, address as Address)
      setResults(out)
      const ok = out.filter((r) => r.ok).length
      notify(`${ok} of ${out.length} recovered`, ok === out.length ? 'success' : 'error')
      await scan.refetch()
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className={compact ? 'p-4' : 'p-5'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[14px] text-t1">
            <LifeBuoy size={15} className="text-accent" /> Recovery
            <Badge tone={claimable.length ? 'amber' : 'default'}>{claimable.length} claimable</Badge>
          </div>
          <p className="mt-1 max-w-[60ch] text-[12px] leading-5 text-t2">
            {claimable.length
              ? `${total.toFixed(4)} USDC is burned but not minted yet. Minting only costs gas on the destination chain.`
              : 'No funds are stuck. Checked on chain, not from a cached status.'}
          </p>
        </div>
        {claimable.length > 1 && (
          <Button variant="primary" size="sm" loading={busy === 'all'} onClick={runAll}>
            Recover all
          </Button>
        )}
      </div>

      <div className="mt-3 space-y-1">
        {scan.isLoading && (
          <div className="flex items-center gap-2 py-2 text-[12px] text-t2">
            <Spinner size={13} /> Checking messages on their destination chains
          </div>
        )}
        {all.map((r) => {
          const from = getChain(r.item.fromChainId)
          const to = getChain(r.destChainId)
          const res = results.find((x) => x.id === r.item.id)
          return (
            <div key={r.item.id} className="flex items-center gap-3 rounded-lg px-1 py-2">
              {from && <ChainLogo chain={from} size={20} />}
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-t1">
                  {r.amount} {r.symbol} · {from?.short ?? ''} to {to?.short ?? ''}
                </div>
                <div className="text-[11px] text-t3">
                  {r.used
                    ? 'Already minted, nothing to do'
                    : !r.checked
                      ? `Unverified: ${r.error ?? 'destination RPC did not answer'}`
                      : res?.ok
                        ? 'Recovered'
                        : res?.error ?? 'Ready to mint'}
                </div>
              </div>
              {!r.used && r.checked && (
                <Button size="sm" variant="secondary" loading={busy === r.item.id} onClick={() => run(r.item.id)}>
                  Recover
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

import { Download, Trash2 } from 'lucide-react'
import { CHAINS } from '../config/chains'
import { PROVIDERS } from '../config/providers'
import { RPC } from '../lib/wallet'
import { Badge, Button, Card, ChainLogo, CopyButton, notify, StatusDot } from '../components/ui'
import { PageHeader } from '../components/Layout'
import { clearActivity, listActivity } from '../lib/activity'
import { useNetworkHealth } from '../lib/health'
import { allowlistSummary } from '../lib/guard'

export default function Settings() {
  const health = useNetworkHealth()
  const records = listActivity()

  function exportData() {
    const blob = new Blob([JSON.stringify(listActivity(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ebt-activity-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    notify('Activity exported.', 'success')
  }

  const allow = allowlistSummary()

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="The registry, the RPCs, and the guard rails. Everything on this page is enforced in code, not just documented." />

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">Security posture</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['Testnet allowlist', `${allow.length} chain ids — anything else throws before calldata is built.`],
            ['Mainnet block', 'Known mainnet ids are rejected with an explicit error, not silently routed.'],
            ['Contract pinning', 'CCTP and Uniswap targets must equal the address in the registry.'],
            ['Exact approvals', 'ERC-20 approvals are for the exact transfer amount — no infinite allowances.'],
            ['No custody', 'EBT never sees a private key, seed phrase or signature it did not ask the wallet for.'],
            ['Local-only history', 'Activity lives in localStorage. No backend, no analytics, no telemetry.'],
          ].map(([t, d]) => (
            <div key={t} className="panel p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-accent">
                <StatusDot tone="mint" /> {t}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-t2">{d}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Chain registry</h3>
          <span className="text-[11px] text-t3">verified 2026-11-23</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[11px]">
            <thead className="text-t3">
              <tr className="border-b border-line">
                <th className="py-1.5 pr-3 font-medium">Chain</th>
                <th className="py-1.5 pr-3 font-medium">id</th>
                <th className="py-1.5 pr-3 font-medium">CCTP domain</th>
                <th className="py-1.5 pr-3 font-medium">USDC</th>
                <th className="py-1.5 pr-3 font-medium">Uniswap</th>
                <th className="py-1.5 font-medium">RPC</th>
              </tr>
            </thead>
            <tbody>
              {CHAINS.map((c) => {
                const h = health.data?.find((x) => x.id === c.id)
                return (
                  <tr key={c.id} className="border-b border-white/4 text-t1">
                    <td className="py-1.5 pr-3">
                      <span className="flex items-center gap-1.5">
                        <ChainLogo chain={c} size={16} /> {c.short}
                      </span>
                    </td>
                    <td className="mono py-1.5 pr-3">{c.id}</td>
                    <td className="mono py-1.5 pr-3">{c.cctpDomain ?? '—'}</td>
                    <td className="mono py-1.5 pr-3">
                      {c.usdc ? (
                        <span className="flex items-center gap-1">
                          {c.usdc.slice(0, 6)}…{c.usdc.slice(-4)} <CopyButton value={c.usdc} />
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-1.5 pr-3">{c.uniswap ? <Badge tone="blue">v3</Badge> : '—'}</td>
                    <td className="py-1.5">
                      <span className="flex items-center gap-1.5">
                        <StatusDot tone={h?.ok ? 'mint' : health.isLoading ? 'amber' : 'red'} />
                        <span className="mono text-[10px] text-t3">{h?.ok ? `${h.latencyMs}ms` : health.isLoading ? '…' : 'down'}</span>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-[11px] leading-relaxed text-t3">
          RPC endpoints used ({Object.keys(RPC).length}): public chain endpoints, no API key. Override them in{' '}
          <span className="mono">src/lib/wallet.ts</span> if a public endpoint rate-limits you.
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-white">Providers & sources</h3>
          <div className="space-y-2">
            {PROVIDERS.map((p) => (
              <div key={p.id} className="panel p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-t1">{p.name}</span>
                  <Badge tone={p.status === 'live' ? 'mint' : p.status === 'limited' ? 'amber' : 'red'}>{p.status}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-t3">
                  <a href={p.docs} target="_blank" rel="noreferrer" className="hover:text-accent">
                    docs ↗
                  </a>
                  <a href={p.github} target="_blank" rel="noreferrer" className="hover:text-accent">
                    github ↗
                  </a>
                  <span>api key: {p.apiKey}</span>
                  <span>{p.license}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-white">Local data</h3>
          <p className="mb-3 text-[11px] leading-relaxed text-t2">
            {records.length} activity record{records.length === 1 ? '' : 's'} stored in this browser profile.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={exportData} disabled={records.length === 0}>
              <Download size={13} /> Export JSON
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (confirm('Delete all local activity records?')) {
                  clearActivity()
                  notify('Local activity cleared.', 'info')
                }
              }}
            >
              <Trash2 size={13} /> Clear
            </Button>
          </div>
          <div className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-t3">
            Wallet connection is injected-only. WalletConnect support would require a third-party Project ID, which this build
            intentionally does not ask you for.
          </div>
        </Card>
      </div>
    </div>
  )
}

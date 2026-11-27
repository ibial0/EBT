import { useState } from 'react'
import { Download, Search, Trash2 } from 'lucide-react'
import { CHAINS, getChain, type Address } from '../config/chains'
import { DEPRECATED_NETWORKS, NON_EVM_NETWORKS } from '../config/networks'
import { PROVIDERS } from '../config/providers'
import { RPC } from '../lib/wallet'
import { Badge, Button, Card, ChainLogo, CopyButton, NetworkLogo, notify, StatusDot } from '../components/ui'
import { PageHeader } from '../components/Layout'
import { clearActivity, listActivity } from '../lib/activity'
import { useNetworkHealth, useNonEvmHealth } from '../lib/health'
import { allowlistSummary } from '../lib/guard'
import { capabilitiesOf } from '../lib/capabilities'
import { listCustomDexes, removeCustomDex, saveCustomDex, verifyRouter } from '../lib/customDex'

export default function Settings() {
  const health = useNetworkHealth()
  const nonEvmHealth = useNonEvmHealth()
  const [chainQuery, setChainQuery] = useState('')
  const [custom, setCustom] = useState(() => listCustomDexes())
  const [cChain, setCChain] = useState<number>(CHAINS[0].id)
  const [cRouter, setCRouter] = useState('')
  const [cName, setCName] = useState('')
  const [cBusy, setCBusy] = useState(false)
  const [cMsg, setCMsg] = useState<{ ok: boolean; text: string } | null>(null)
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

  async function addCustomDex() {
    setCBusy(true)
    setCMsg(null)
    const result = await verifyRouter(cChain, cRouter.trim() as Address)
    setCBusy(false)
    if (!result.ok) {
      setCMsg({ ok: false, text: result.error })
      return
    }
    const chain = getChain(cChain)
    saveCustomDex({
      chainId: cChain,
      name: cName.trim() || 'Custom DEX',
      router: cRouter.trim() as Address,
      factory: result.factory,
      wrappedNative: result.wrappedNative,
      nativeFnStyle: result.nativeFnStyle,
      addedAt: Date.now(),
    })
    setCustom(listCustomDexes())
    setCRouter('')
    setCName('')
    const label = chain ? chain.short : String(cChain)
    setCMsg({ ok: true, text: 'Verified on chain. ' + result.pairs.toString() + ' pools found. ' + label + ' is now swap-ready.' })
    notify('Custom DEX saved.', 'success')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Registry"
        title="Settings"
        subtitle="The registry, the RPCs, and the guard rails. Everything on this page is enforced in code, not just documented."
      />

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-t1">Security posture</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['Testnet allowlist', `${allow.length} chain ids, anything else throws before calldata is built.`],
            ['Mainnet block', 'Known mainnet ids are rejected with an explicit error, not silently routed.'],
            ['Contract pinning', 'CCTP and Uniswap targets must equal the address in the registry.'],
            ['Exact approvals', 'ERC-20 approvals are for the exact transfer amount, no infinite allowances.'],
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-t1">Custom DEX</h3>
          <Badge tone={custom.length ? 'mint' : 'default'}>{custom.length} saved</Badge>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-t2">
          Point EBT at any Uniswap v2 style router on a chain in the registry. The factory, the wrapped native
          token and the pool count are read from the router and checked on chain before anything is saved.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-t3">Chain</span>
            <select
              value={cChain}
              onChange={(e) => setCChain(Number(e.target.value))}
              className="h-9 rounded-lg border border-line bg-ink-850 px-2.5 text-[12px] text-t1 outline-none focus:border-accent/60"
            >
              {CHAINS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-t3">Label (optional)</span>
            <input
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              placeholder="LineaSwap"
              className="h-9 rounded-lg border border-line bg-ink-850 px-2.5 text-[12px] text-t1 outline-none placeholder:text-t3 focus:border-accent/60"
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[10px] uppercase tracking-wide text-t3">Router address</span>
            <input
              value={cRouter}
              onChange={(e) => setCRouter(e.target.value)}
              placeholder="0x1234...abcd"
              spellCheck={false}
              className="h-9 rounded-lg border border-line bg-ink-850 px-2.5 font-mono text-[12px] text-t1 outline-none placeholder:text-t3 focus:border-accent/60"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" loading={cBusy} disabled={!cRouter.trim()} onClick={addCustomDex}>
            Verify and save
          </Button>
          <span className="text-[10px] text-t3">Checks bytecode, WETH/WAVAX/WSEI, factory() and pool count.</span>
        </div>

        {cMsg ? (
          <p className={cMsg.ok ? 'mt-2 text-[11px] leading-relaxed text-pos' : 'mt-2 text-[11px] leading-relaxed text-neg'}>
            {cMsg.text}
          </p>
        ) : null}

        {custom.length > 0 ? (
          <div className="mt-4 space-y-2 border-t border-line pt-3">
            {custom.map((d) => (
              <div key={d.chainId + ':' + d.router} className="panel flex flex-wrap items-center justify-between gap-2 p-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-t1">{d.name}</span>
                    <Badge tone="blue">{getChain(d.chainId)?.short ?? d.chainId}</Badge>
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[10px] text-t3">
                    router {d.router.slice(0, 10)} factory {d.factory.slice(0, 10)} wrapped {d.wrappedNative.slice(0, 10)}
                  </div>
                </div>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => {
                    removeCustomDex(d.chainId, d.router)
                    setCustom(listCustomDexes())
                    notify('Custom DEX removed.', 'info')
                  }}
                >
                  <Trash2 size={13} /> Remove
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-t1">Chain registry ({CHAINS.length} EVM)</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-line bg-ink-850 px-2.5 py-1">
              <Search size={12} className="text-t3" />
              <input
                value={chainQuery}
                onChange={(e) => setChainQuery(e.target.value)}
                placeholder="Filter registry…"
                className="input w-36 text-[11px]"
              />
            </div>
            <span className="text-[11px] text-t3">verified 2026-11-26</span>
          </div>
        </div>
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[640px] text-left text-[11px]">
            <thead className="sticky top-0 bg-ink-800 text-t3">
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
              {CHAINS.filter((c) => !chainQuery.trim() || `${c.name} ${c.short} ${c.id}`.toLowerCase().includes(chainQuery.trim().toLowerCase())).map((c) => {
                const h = health.data?.find((x) => x.id === c.id)
                return (
                  <tr key={c.id} className="border-b border-white/4 text-t1">
                    <td className="py-1.5 pr-3">
                      <span className="flex items-center gap-1.5">
                        <ChainLogo chain={c} size={16} /> {c.short}
                      </span>
                    </td>
                    <td className="mono py-1.5 pr-3">{c.id}</td>
                    <td className="mono py-1.5 pr-3">{c.cctpDomain ?? '-'}</td>
                    <td className="mono py-1.5 pr-3">
                      {c.usdc ? (
                        <span className="flex items-center gap-1">
                          {c.usdc.slice(0, 6)}…{c.usdc.slice(-4)} <CopyButton value={c.usdc} />
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-1.5 pr-3">{c.uniswap ? <Badge tone="blue">v3</Badge> : c.dexV2?.length ? <Badge tone="blue">v2</Badge> : '-'}</td>
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

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-t1">
            Non-EVM &amp; Deprecated Testnet Registry ({NON_EVM_NETWORKS.length} active · {DEPRECATED_NETWORKS.length} deprecated)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[11px]">
            <thead className="text-t3">
              <tr className="border-b border-line">
                <th className="py-1.5 pr-3 font-medium">Network</th>
                <th className="py-1.5 pr-3 font-medium">Family</th>
                <th className="py-1.5 pr-3 font-medium">Identifier</th>
                <th className="py-1.5 pr-3 font-medium">Native</th>
                <th className="py-1.5 pr-3 font-medium">Status</th>
                <th className="py-1.5 font-medium">Endpoint / Notes</th>
              </tr>
            </thead>
            <tbody>
              {NON_EVM_NETWORKS.map((n) => {
                const h = nonEvmHealth.data?.find((x) => x.id === n.id)
                return (
                  <tr key={n.id} className="border-b border-white/4 text-t1">
                    <td className="py-1.5 pr-3">
                      <span className="flex items-center gap-1.5">
                        <NetworkLogo network={n} size={16} /> {n.name}
                      </span>
                    </td>
                    <td className="mono py-1.5 pr-3">{n.family}</td>
                    <td className="mono py-1.5 pr-3">{n.nativeId.slice(0, 18)}</td>
                    <td className="mono py-1.5 pr-3">{n.nativeCurrency.symbol}</td>
                    <td className="py-1.5 pr-3"><Badge tone="mint">active</Badge></td>
                    <td className="py-1.5">
                      <span className="flex items-center gap-1.5">
                        <StatusDot tone={h?.ok ? 'mint' : nonEvmHealth.isLoading ? 'amber' : 'red'} />
                        <span className="mono text-[10px] text-t3">{h?.ok ? `${h.latencyMs}ms` : nonEvmHealth.isLoading ? '…' : 'down'}</span>
                      </span>
                    </td>
                  </tr>
                )
              })}
              {DEPRECATED_NETWORKS.map((n) => (
                <tr key={n.id} className="border-b border-white/4 text-t3">
                  <td className="py-1.5 pr-3">
                    <span className="flex items-center gap-1.5 opacity-70">
                      <NetworkLogo network={n} size={16} /> {n.name}
                    </span>
                  </td>
                  <td className="mono py-1.5 pr-3">{n.family}</td>
                  <td className="mono py-1.5 pr-3">{n.nativeId}</td>
                  <td className="mono py-1.5 pr-3">{n.nativeCurrency.symbol}</td>
                  <td className="py-1.5 pr-3"><Badge tone="red">deprecated</Badge></td>
                  <td className="py-1.5 text-[10px]">{n.statusNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-1 text-sm font-semibold text-t1">Capability matrix</h3>
        <p className="mb-3 text-[11px] leading-relaxed text-t3">
          Each feature is decided separately. A chain that can receive a bridge but has no swap venue is not
          reported as swap-capable, and the reverse.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[11px]">
            <thead className="text-t3">
              <tr className="border-b border-line">
                <th className="py-1.5 pr-3 font-medium">Chain</th>
                {['Wallet', 'Native', 'ERC-20', 'Swap', 'USDC bridge', 'ETH deposit', 'Orbit ETH', 'Cross-chain', 'Recovery'].map((h) => (
                  <th key={h} className="py-1.5 px-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CHAINS.map((c) => {
                const rows = capabilitiesOf(c)
                return (
                  <tr key={c.id} className="border-b border-white/4 text-t1">
                    <td className="py-1.5 pr-3">
                      <span className="flex items-center gap-1.5">
                        <ChainLogo chain={c} size={16} /> {c.short}
                      </span>
                    </td>
                    {rows.map((r) => (
                      <td key={r.key} className="px-2 py-1.5" title={r.note}>
                        {r.state === 'yes' ? (
                          <span className="text-pos">yes</span>
                        ) : r.state === 'partial' ? (
                          <span className="text-warn" title={r.note}>
                            partial
                          </span>
                        ) : (
                          <span className="text-t3">no</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-t1">Providers & sources</h3>
          <div className="space-y-2">
            {PROVIDERS.map((p) => (
              <div key={p.id} className="panel p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-t1">{p.name}</span>
                  <Badge tone={p.status === 'live' ? 'mint' : p.status === 'limited' ? 'amber' : 'red'}>{p.status}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-t3">
                  <a href={p.docs} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                    docs ↗
                  </a>
                  <a href={p.github} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
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
          <h3 className="mb-2 text-sm font-semibold text-t1">Local data</h3>
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

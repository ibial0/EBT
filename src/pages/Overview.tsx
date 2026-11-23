import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Layers,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import { CCTP_CHAINS, CHAINS, SWAP_CHAINS, explorerTx } from '../config/chains'
import { PROVIDERS, NOT_INTEGRATED } from '../config/providers'
import { TOKENS } from '../config/tokens'
import { Card, Badge, Button, ChainLogo, StatusDot, Spinner } from '../components/ui'
import { PageHeader } from '../components/Layout'
import { useNetworkHealth } from '../lib/health'
import { listActivity } from '../lib/activity'

export default function Overview() {
  const health = useNetworkHealth()
  const okCount = health.data?.filter((h) => h.ok).length ?? 0
  const activity = listActivity()

  const stats = [
    { label: 'Testnets allowlisted', value: CHAINS.length, icon: Layers, hint: 'every chain here was probed live' },
    { label: 'CCTP USDC routes', value: `${CCTP_CHAINS.length} ⇄ ${CCTP_CHAINS.length - 1}`, icon: Zap, hint: 'any pair, any direction' },
    { label: 'Swap-ready chains', value: SWAP_CHAINS.length, icon: Sparkles, hint: 'real Uniswap v3 liquidity' },
    { label: 'Verified tokens', value: TOKENS.length, icon: CheckCircle2, hint: 'symbols + decimals read on-chain' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        subtitle="A single console for testnet money: Circle CCTP for native USDC, Uniswap v3 for same-chain swaps, and OP Stack portals for ETH deposits. No new protocol, no custody, no mainnet."
        right={
          <div className="flex gap-2">
            <Link to="/bridge">
              <Button>
                Bridge <ArrowRight size={15} />
              </Button>
            </Link>
            <Link to="/swap">
              <Button variant="secondary">Swap</Button>
            </Link>
          </div>
        }
      />

      {/* status strip */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <StatusDot tone={health.isLoading ? 'amber' : okCount === CHAINS.length ? 'mint' : 'amber'} />
            <span className="font-medium text-t1">
              {health.isLoading ? 'Probing public RPCs…' : `${okCount}/${CHAINS.length} testnet RPCs responding`}
            </span>
            {health.isLoading && <Spinner size={13} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="mint">CCTP v2 · live</Badge>
            <Badge tone="blue">Uniswap v3 · live</Badge>
            <Badge tone="amber">OP deposit · limited</Badge>
            <Badge tone="red">Mainnet · blocked</Badge>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <s.icon size={16} className="text-accent" />
            <div className="mt-3 text-2xl font-bold tracking-tight text-white">{s.value}</div>
            <div className="text-xs font-medium text-t1">{s.label}</div>
            <div className="mt-0.5 text-[11px] text-t3">{s.hint}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        {/* network grid */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Network coverage</h2>
            <Link to="/settings" className="text-[11px] text-t2 hover:text-accent">
              see allowlist →
            </Link>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {CHAINS.map((c) => {
              const h = health.data?.find((x) => x.id === c.id)
              return (
                <div key={c.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-ink-850">
                  <ChainLogo chain={c} size={22} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-t1">{c.name}</div>
                    <div className="mono text-[10px] text-t3">
                      {h?.ok ? `#${h.blockNumber} · ${h.latencyMs}ms` : health.isLoading ? 'checking…' : h?.error ?? '-'}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {c.bridge === 'cctp' && <span className="chip !px-1.5 !py-0 !text-[9px] !text-accent">CCTP</span>}
                    {c.bridge === 'opstack' && <span className="chip !px-1.5 !py-0 !text-[9px] !text-[#e3c07b]">OP</span>}
                    {c.uniswap && <span className="chip !px-1.5 !py-0 !text-[9px] !text-accent">SWAP</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* providers */}
        <div className="space-y-3">
          {PROVIDERS.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-white">{p.name}</div>
                  <div className="text-[11px] text-t2">{p.tagline}</div>
                </div>
                <Badge tone={p.status === 'live' ? 'mint' : p.status === 'limited' ? 'amber' : 'red'}>{p.status}</Badge>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {p.capabilities.map((c) => (
                  <span key={c} className="chip !text-[10px]">
                    {c}
                  </span>
                ))}
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[10px] text-t3">
                <span>{p.chains}</span>
                <a href={p.docs} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-accent">
                  docs <ArrowUpRight size={10} />
                </a>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* how it works */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">How a transfer runs</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: '1 · Quote', d: 'USDC fee comes from Circle Iris. Swap output comes from an on-chain QuoterV2 call. Nothing is simulated or mocked.' },
            { t: '2 · Sign', d: 'Your wallet approves the exact amount, then sends the burn / swap. EBT never signs and never holds keys.' },
            { t: '3 · Wait', d: 'CCTP: Circle attests the burn. OP deposit: the sequencer includes it (~1–3 min). The timeline explains what is slow.' },
            { t: '4 · Complete', d: 'On the destination you submit receiveMessage, a second click you sign yourself, then the USDC is minted to your address.' },
          ].map((s) => (
            <div key={s.t} className="panel p-3">
              <div className="text-xs font-semibold text-accent">{s.t}</div>
              <p className="mt-1 text-[11px] leading-relaxed text-t2">{s.d}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold text-white">Recent activity</h2>
          <p className="mb-3 text-[11px] text-t3">Stored locally in this browser. Nothing leaves your machine.</p>
          {activity.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-line px-4 py-8 text-center text-xs text-t3">
              No transfers yet. Start with the faucet page, then bridge or swap.
            </div>
          ) : (
            <div className="space-y-1.5">
              {activity.slice(0, 4).map((a) => (
                <Link key={a.id} to={`/activity/${a.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-ink-850">
                  <span className="mono text-t3">{a.kind}</span>
                  <span className="text-t1">
                    {a.amountIn} {a.tokenIn.symbol}
                  </span>
                  <span className="text-t3">→ {a.tokenOut?.symbol ?? 'USDC'}</span>
                  <span className="ml-auto">
                    <Badge tone={a.status === 'complete' ? 'mint' : a.status === 'failed' ? 'red' : 'amber'}>{a.status}</Badge>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-white">
            <ShieldCheck size={14} className="text-accent" /> Deliberately not integrated
          </h2>
          <p className="mb-3 text-[11px] text-t3">Researched, verified unavailable, and left out rather than faked.</p>
          <div className="space-y-2">
            {NOT_INTEGRATED.map((n) => (
              <div key={n.name} className="panel p-2.5">
                <div className="text-[11px] font-semibold text-t1">{n.name}</div>
                <div className="text-[11px] leading-relaxed text-t3">{n.reason}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

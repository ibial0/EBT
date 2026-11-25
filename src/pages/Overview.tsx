import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Droplets,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import { CCTP_CHAINS, CHAINS, SWAP_CHAINS, getChain } from '../config/chains'
import { POOLS, pairsForChain } from '../config/pools'
import { PROVIDERS, NOT_INTEGRATED } from '../config/providers'
import { TOKENS, findToken } from '../config/tokens'
import { Card, Badge, Button, ChainLogo, StatusDot, Spinner, TokenIcon } from '../components/ui'
import { PageHeader } from '../components/Layout'
import { useNetworkHealth } from '../lib/health'
import { listActivity } from '../lib/activity'
import { feeLabel, liquidityLabel, loadLiquidity, type PoolSnapshot } from '../lib/liquidity'
import { buildCoverage, coverageCounts } from '../lib/coverage'
import { fmt } from '../lib/format'

type Level = 'all' | 'active' | 'drained'
type StatusFilter = 'all' | 'active' | 'drained' | 'unreachable'

/** small provider pills used by the coverage matrix */
function Tags({ tags, empty }: { tags: { key: string; label: string }[]; empty: string }) {
  if (tags.length === 0) return <span className="text-t3">{empty}</span>
  const tone: Record<string, string> = {
    cctp: 'border-accent/30 text-accent',
    portal: 'border-[#e3c07b]/30 text-[#e3c07b]',
    orbit: 'border-[#a78bfa]/30 text-[#c4b5fd]',
    swap: 'border-[#4cc38a]/30 text-[#7fd6a8]',
  }
  return (
    <span className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t.key} className={`rounded border px-1 text-[9px] leading-4 ${tone[t.key] ?? 'border-line text-t3'}`}>
          {t.label}
        </span>
      ))}
    </span>
  )
}

export default function Overview() {
  const coverage = useMemo(() => buildCoverage(), [])
  const counts = useMemo(() => coverageCounts(coverage), [coverage])
  const health = useNetworkHealth()
  const [level, setLevel] = useState<Level>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [chainFilter, setChainFilter] = useState<number | 'all'>('all')
  const [tokenFilter, setTokenFilter] = useState('')
  const [dexOnly, setDexOnly] = useState(false)
  const [pools, setPools] = useState<PoolSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    loadLiquidity()
      .then((rows) => {
        if (!alive) return
        setPools(rows)
        setUpdatedAt(Date.now())
      })
      .catch(() => alive && setUpdatedAt(Date.now()))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])
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
        {/* bridge coverage: which chains can move value, and through what */}
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Bridge coverage</h2>
              <p className="mt-0.5 text-[11px] text-t3">
                Which chains can send, which can only receive, and which provider does it. Built from the
                registry, so it cannot drift from what the app will actually let you sign.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge tone="mint">{counts.canSend} send</Badge>
              <Badge tone="blue">{counts.canReceive} receive</Badge>
              <Badge tone={counts.isolated ? 'amber' : 'default'}>{counts.isolated} isolated</Badge>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-ink-800/95 backdrop-blur">
                <tr className="text-left text-[10px] uppercase tracking-wide text-t3">
                  <th className="px-4 py-2 font-medium">Chain</th>
                  <th className="px-2 py-2 font-medium">Can send</th>
                  <th className="px-2 py-2 font-medium">Can receive</th>
                </tr>
              </thead>
              <tbody>
                {coverage.map((row) => (
                  <tr key={row.chain.id} className="border-t border-line/60 hover:bg-ink-850/60">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <ChainLogo chain={row.chain} size={20} />
                        <span className="truncate text-t1">{row.chain.name}</span>
                        <span className="mono shrink-0 text-[10px] text-t3">{row.chain.id}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <Tags tags={row.send} empty="—" />
                    </td>
                    <td className="px-2 py-2">
                      <Tags tags={row.receive} empty="—" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-[11px] leading-5 text-t3">
            A chain with no badge in either column cannot move value yet: no verified provider covers it. Nothing
            is faked to fill the gap.
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


      {/* liquidity overview */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Liquidity by chain</h2>
            <p className="mt-0.5 text-[11px] text-t3">
              Reserves read from the pool contracts, not from an aggregator. Testnet tokens have no market
              price, so depth is shown in tokens, never in dollars.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="mint">{pools.filter((p) => p.status === 'active').length} active</Badge>
            <Badge tone="red">{pools.filter((p) => p.status === 'drained').length} drained</Badge>
            <Badge tone="amber">{pools.filter((p) => p.status === 'unreachable').length} unreachable</Badge>
            <span className="mono text-[11px] text-t3">
              {loading ? 'reading pools…' : updatedAt ? `updated ${new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
          <div className="flex h-9 min-w-[190px] flex-1 items-center gap-2 rounded-lg border border-line bg-ink-850 px-3">
            <Search size={14} className="text-t3" />
            <input
              value={tokenFilter}
              onChange={(e) => setTokenFilter(e.target.value)}
              placeholder="Filter by token symbol"
              className="input text-[13px]"
            />
          </div>
          <Select
            value={String(chainFilter)}
            onChange={(v) => setChainFilter(v === 'all' ? 'all' : Number(v))}
            label="Network"
            options={[
              { value: 'all', label: 'All networks' },
              ...CHAINS.filter((c) => c.uniswap).map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
          <Select
            value={level}
            onChange={(v) => setLevel(v as Level)}
            label="Depth"
            options={[
              { value: 'all', label: 'Any state' },
              { value: 'active', label: 'Active' },
              { value: 'drained', label: 'Drained' },
            ]}
          />
          <Select
            value={status}
            onChange={(v) => setStatus(v as StatusFilter)}
            label="Status"
            options={[
              { value: 'all', label: 'Any status' },
              { value: 'active', label: 'Active' },
              { value: 'drained', label: 'Drained' },
              { value: 'unreachable', label: 'Unreachable' },
            ]}
          />
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line bg-ink-850 px-3 text-[12px] text-t2">
            <input type="checkbox" checked={dexOnly} onChange={(e) => setDexOnly(e.target.checked)} className="h-3.5 w-3.5 accent-[#6aa6ff]" />
            Verified venues only
          </label>
        </div>

        <LiquidityTable pools={pools} loading={loading} chainFilter={chainFilter} tokenFilter={tokenFilter} level={level} status={status} dexOnly={dexOnly} />
      </Card>

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


function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  label: string
}) {
  return (
    <label className="relative flex h-9 items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full appearance-none rounded-lg border border-line bg-ink-850 pl-3 pr-8 text-[12px] text-t1 outline-none transition-colors hover:border-line-strong focus:border-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-ink-800">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 text-t3" />
    </label>
  )
}

function LiquidityTable({
  pools,
  loading,
  chainFilter,
  tokenFilter,
  level,
  status,
  dexOnly,
}: {
  pools: PoolSnapshot[]
  loading: boolean
  chainFilter: number | 'all'
  tokenFilter: string
  level: Level
  status: StatusFilter
  dexOnly: boolean
}) {
  const needle = tokenFilter.trim().toUpperCase()

  const rows = useMemo(() => {
    const filtered = pools.filter((p) => {
      if (chainFilter !== 'all' && p.chainId !== chainFilter) return false
      if (needle && !`${p.symbol0} ${p.symbol1}`.toUpperCase().includes(needle)) return false
      if (level !== 'all' && p.status !== level) return false
      if (status !== 'all' && p.status !== status) return false
      if (dexOnly && !getChain(p.chainId)?.uniswap) return false
      return true
    })
    return filtered.sort((a, b) => {
      const rank = (p: PoolSnapshot) => (p.depth ?? -1)
      const chainDiff = String(getChain(a.chainId)?.short ?? '').localeCompare(String(getChain(b.chainId)?.short ?? ''))
      return rank(b) - rank(a) || chainDiff
    })
  }, [pools, chainFilter, needle, level, status, dexOnly])

  if (loading && pools.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-8 text-[13px] text-t2">
        <Spinner /> Reading {POOLS.length} verified pools
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="px-4 py-8 text-[13px] text-t3">
        No pool matches these filters. Clear them to see every verified pool.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left">
        <thead>
          <tr className="border-b border-line text-[11px] text-t3">
            <th className="px-4 py-2.5 font-medium">Chain</th>
            <th className="px-3 py-2.5 font-medium">Pair</th>
            <th className="px-3 py-2.5 font-medium">Fee</th>
            <th className="px-3 py-2.5 font-medium text-right">Reserve 0</th>
            <th className="px-3 py-2.5 font-medium text-right">Reserve 1</th>
            <th className="px-3 py-2.5 font-medium text-right">Two-sided depth</th>
            <th className="px-3 py-2.5 font-medium text-right">Liquidity L</th>
            <th className="px-4 py-2.5 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const chain = getChain(p.chainId)
            const t0 = findToken(p.chainId, p.token0)
            const t1 = findToken(p.chainId, p.token1)
            return (
              <tr key={`${p.pool}-${p.fee}`} className="border-b border-line/60 text-[13px] transition-colors last:border-0 hover:bg-ink-850">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    {chain && <ChainLogo chain={chain} size={18} />}
                    <span className="text-t1">{chain?.short ?? p.chainId}</span>
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-1.5">
                    <TokenIcon symbol={p.symbol0} size={18} chainId={p.chainId} address={p.token0} />
                    <TokenIcon symbol={p.symbol1} size={18} chainId={p.chainId} address={p.token1} />
                    <span className="text-t1">
                      {p.symbol0}/{p.symbol1}
                    </span>
                    {(!t0 || !t1) && <Badge tone="amber">unlisted token</Badge>}
                  </span>
                </td>
                <td className="px-3 py-2.5 mono text-t2">{feeLabel(p.fee)}</td>
                <td className="px-3 py-2.5 figure text-right text-t1">
                  {p.reserve0 == null ? '-' : fmt(p.reserve0, p.decimals0, 4)}
                  <span className="ml-1 text-[11px] text-t3">{p.symbol0}</span>
                </td>
                <td className="px-3 py-2.5 figure text-right text-t1">
                  {p.reserve1 == null ? '-' : fmt(p.reserve1, p.decimals1, 4)}
                  <span className="ml-1 text-[11px] text-t3">{p.symbol1}</span>
                </td>
                <td className="px-3 py-2.5 figure text-right">
                  <span className={p.status === 'active' ? 'text-t1' : 'text-[#ffb4b6]'}>
                    {p.depth == null ? '-' : p.depth.toFixed(4)}
                  </span>
                </td>
                <td className="px-3 py-2.5 figure text-right text-t2">{liquidityLabel(p.liquidity)}</td>
                <td className="px-4 py-2.5 text-right">
                  {p.status === 'active' ? (
                    <Badge tone="mint">active</Badge>
                  ) : p.status === 'drained' ? (
                    <Badge tone="red">drained</Badge>
                  ) : (
                    <Badge tone="red">unreachable</Badge>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="border-t border-line px-4 py-2.5 text-[11px] leading-5 text-t3">
        Reserves are shown in each token's own units, so the two legs of a pair are not comparable as raw numbers
        (42 WETH against 208,608 USDC is a healthy pool, not an empty one). Depth is the smaller leg, in that leg's
        token. A drained pool still has L &gt; 0 but one leg is down to dust, so a swap into it would fail or return
        almost nothing.
      </div>
    </div>
  )
}

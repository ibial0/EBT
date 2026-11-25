import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Copy, Plus, RefreshCw, Search, Wallet } from 'lucide-react'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import type { Address } from 'viem'
import { CHAINS, explorerAddress, getChain } from '../config/chains'
import { Badge, Button, ChainLogo, CopyButton, Empty, Modal, Spinner, TokenIcon, notify } from '../components/ui'
import { ConnectButton, PageHeader } from '../components/Layout'
import { RecoveryPanel } from '../components/RecoveryPanel'
import { shortAddr, fmt } from '../lib/format'
import { loadPortfolio, nativeHoldingLabel } from '../lib/portfolio'
import { allTokensForChain, saveCustomToken, type TokenCfg } from '../config/tokens'
import { readTokenMeta } from '../lib/tokenImport'
import { loadPrices, priceOf, usd } from '../lib/prices'
import { loadHistory, recordSnapshot, sliceRange } from '../lib/history'

type View = 'overview' | 'tokens' | 'recovery'
type Range = '1D' | '1W' | '1M'

interface Row {
  chainId: number
  symbol: string
  name: string
  amount: bigint | null
  decimals: number
  address: string | null
  verified: boolean
  usdValue: number | null
  error?: string
}

interface Group {
  symbol: string
  name: string
  usd: number | null
  amount: number
  rows: Row[]
}

export default function Portfolio() {
  const { address, isConnected } = useAccount()
  const [network, setNetwork] = useState<number | 'all'>('all')
  const [tab, setTab] = useState<View>('overview')
  const [range, setRange] = useState<Range>('1D')
  const [q, setQ] = useState('')
  const [showEmpty, setShowEmpty] = useState(false)
  const [importFor, setImportFor] = useState<number | null>(null)
  const [pickNetwork, setPickNetwork] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [history, setHistory] = useState(loadHistory)

  const portfolio = useQuery({
    queryKey: ['portfolio', address],
    queryFn: () => loadPortfolio(address as Address),
    enabled: Boolean(address),
    staleTime: 20_000,
    retry: 0,
  })
  const prices = useQuery({ queryKey: ['prices'], queryFn: loadPrices, staleTime: 10 * 60_000, retry: 1 })

  const priceMap = prices.data?.prices ?? {}
  const holdings = portfolio.data ?? []

  const rows: Row[] = useMemo(() => {
    const out: Row[] = []
    for (const chain of holdings) {
      const nat = nativeHoldingLabel(chain.chainId)
      out.push({
        chainId: chain.chainId,
        symbol: nat.symbol,
        name: nat.name,
        amount: chain.native,
        decimals: nat.decimals,
        address: null,
        verified: true,
        usdValue: valueOf(chain.native, nat.decimals, nat.symbol, priceMap),
        error: chain.nativeError,
      })
      for (const t of chain.tokens) {
        out.push({
          chainId: chain.chainId,
          symbol: t.token.symbol,
          name: t.token.name,
          amount: t.balance,
          decimals: t.token.decimals,
          address: t.token.address,
          verified: t.token.verified,
          usdValue: valueOf(t.balance, t.token.decimals, t.token.symbol, priceMap),
          error: t.error,
        })
      }
    }
    return out
  }, [holdings, priceMap])

  const networkTotals = useMemo(() => {
    const m = new Map<number, { usd: number; count: number }>()
    for (const r of rows) {
      const cur = m.get(r.chainId) ?? { usd: 0, count: 0 }
      cur.usd += r.usdValue ?? 0
      if ((r.amount ?? 0n) > 0n) cur.count += 1
      m.set(r.chainId, cur)
    }
    return m
  }, [rows])

  const nonZero = useMemo(() => rows.filter((r) => (r.amount ?? 0n) > 0n), [rows])
  /** only chains that actually hold something, so the header does not claim 31 funded networks */
  const fundedNetworks = useMemo(() => new Set(nonZero.map((r) => r.chainId)).size, [nonZero])
  const scoped = network === 'all' ? nonZero : nonZero.filter((r) => r.chainId === network)
  const scopedUsd = scoped.reduce((s, r) => s + (r.usdValue ?? 0), 0)
  const totalUsd = nonZero.reduce((s, r) => s + (r.usdValue ?? 0), 0)
  const unpriced = nonZero.filter((r) => r.usdValue == null).length
  const selected = network === 'all' ? null : getChain(network)

  // one point per hour, written only when the value is actually known
  useEffect(() => {
    if (!isConnected || portfolio.isLoading || portfolio.isError) return
    if (totalUsd <= 0) return
    setHistory(recordSnapshot(totalUsd))
  }, [isConnected, portfolio.isLoading, portfolio.isError, totalUsd])

  const groups: Group[] = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const bySymbol = new Map<string, Group>()
    for (const r of scoped) {
      const key = r.symbol.toUpperCase()
      const g: Group =
        bySymbol.get(key) ??
        ({ symbol: r.symbol, name: r.name.replace(' (native)', ''), usd: null, amount: 0, rows: [] } as Group)
      g.rows.push(r)
      // a group with no priced asset must stay "—", not become $0.00
      if (r.usdValue != null) g.usd = (g.usd ?? 0) + r.usdValue
      g.amount += r.amount == null ? 0 : Number(formatUnits(r.amount, r.decimals))
      bySymbol.set(key, g)
    }
    let list = [...bySymbol.values()]
    if (needle) {
      list = list.filter(
        (g) =>
          g.symbol.toLowerCase().includes(needle) ||
          g.name.toLowerCase().includes(needle) ||
          g.rows.some((r) => getChain(r.chainId)?.name.toLowerCase().includes(needle)),
      )
    }
    for (const g of list) g.rows.sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0))
    return list.sort((a, b) => (b.usd ?? 0) - (a.usd ?? 0))
  }, [scoped, q])

  const chartPoints = useMemo(() => sliceRange(history, range), [history, range])
  const top = groups.slice(0, 6)

  if (!isConnected) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Wallet view"
          title="Portfolio"
          subtitle="Every testnet balance for one wallet. Values are estimated from mainnet spot prices."
        />
        <RecoveryPanel />
        <div className="card">
          <Empty
            icon={<Wallet size={32} strokeWidth={1.25} />}
            title="Connect a wallet to see its testnet assets"
            hint="Read-only. Balances come straight from each chain, with no account and no backend."
          />
          <div className="mx-auto w-full max-w-[280px] pb-10">
            <ConnectButton full />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dash-2">
      {/* ── left: value + chart ───────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="col-head">Portfolio</div>
          <button
            onClick={() => portfolio.refetch()}
            title="Refresh balances"
            className="grid size-9 place-items-center rounded-full border border-line-strong bg-ink-850 text-t2 transition-colors hover:border-[#3f4a66] hover:text-t1"
          >
            <RefreshCw size={14} className={portfolio.isFetching ? 'spin' : undefined} />
          </button>
        </div>

        <div className="figure mt-4 text-[48px] leading-[56px] font-bold tracking-[-0.035em] text-t1">
          {portfolio.isLoading ? (
            <span className="skeleton inline-block h-12 w-52 align-middle" />
          ) : (
            usd(selected ? scopedUsd : totalUsd)
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="mono text-[12px] uppercase tracking-[0.6px] text-t2">
            {scoped.length} assets · {network === 'all' ? fundedNetworks : 1} networks
          </span>
          {unpriced > 0 && (
            <span className="mono text-[12px] uppercase tracking-[0.6px] text-warn">{unpriced} unpriced</span>
          )}
          <span className="mono flex items-center gap-1.5 text-[12px] uppercase tracking-[0.6px] text-t2">
            <span className={`size-1.5 rotate-45 border ${prices.data?.live ? 'border-pos' : 'border-t3'}`} />
            {prices.data?.live ? 'live prices' : 'estimated'}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-1">
          {(['1D', '1W', '1M'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`mono rounded-md px-2.5 py-1 text-[12px] uppercase tracking-[0.6px] transition-colors ${
                range === r ? 'bg-ink-600 text-t1' : 'text-t2 hover:text-t1'
              }`}
            >
              {r}
            </button>
          ))}
          <button
            onClick={() => setPickNetwork(true)}
            className="ml-auto flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-ink-850 px-2.5 text-[12px] text-t1 transition-colors hover:border-[#3f4a66]"
          >
            {selected ? <ChainLogo chain={selected} size={14} /> : <span className="size-1.5 rotate-45 border border-t3" />}
            {selected ? selected.short : 'All networks'}
            <ChevronDown size={12} className="text-t2" />
          </button>
        </div>

        <div className="mt-3">
          <ValueChart points={chartPoints} />
        </div>
      </div>

      {/* ── right: Overview | Tokens ──────────────────────── */}
      <div className="card flex flex-col overflow-hidden">
        <div className="flex items-center gap-1 border-b border-line-strong px-4">
          {(['overview', 'tokens', 'recovery'] as View[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative -mb-px px-3 py-3 text-[14px] capitalize transition-colors ${
                tab === t ? 'text-t1' : 'text-t2 hover:text-t1'
              }`}
            >
              {t}
              {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
            </button>
          ))}
          {tab === 'tokens' && (
            <span className="mono ml-auto text-[11px] uppercase tracking-[0.6px] text-t2">
              {scoped.length} assets
            </span>
          )}
        </div>

        {portfolio.isLoading && (
          <div className="flex items-center gap-2 px-5 py-8 text-[13px] text-t2">
            <Spinner /> Reading {CHAINS.length} chains
          </div>
        )}
        {portfolio.isError && (
          <div className="px-5 py-6 text-[13px] text-neg">Portfolio failed: {(portfolio.error as Error).message}</div>
        )}

        {tab === 'recovery' ? (
          <div className="p-3">
            <RecoveryPanel compact />
          </div>
        ) : tab === 'overview' ? (
          /* the ring strip: icon wrapped in its share of the portfolio */
          <div className="grid grid-cols-2 gap-x-2 gap-y-5 p-5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {top.length === 0 && !portfolio.isLoading && (
              <div className="col-span-full py-6 text-[13px] text-t2">No funded asset yet.</div>
            )}
            {top.map((g) => {
              const share = scopedUsd > 0 ? ((g.usd ?? 0) / scopedUsd) * 100 : 0
              return (
                <button
                  key={g.symbol}
                  onClick={() => {
                    setTab('tokens')
                    setOpenGroups((prev) => new Set(prev).add(g.symbol.toUpperCase()))
                  }}
                  className="group flex flex-col items-center gap-2 rounded-[10px] py-2 transition-colors hover:bg-ink-700/50"
                >
                  <RingIcon pct={share} symbol={g.symbol} chainId={g.rows[0].chainId} address={g.rows[0].address} verified={g.rows[0].verified} />
                  <span className="display text-[15px] leading-5 text-t1">{g.usd == null ? '—' : usd(g.usd)}</span>
                  {g.rows.length > 1 ? (
                    <span className="flex items-center gap-0.5">
                      {g.rows.slice(0, 3).map((r) => {
                        const c = getChain(r.chainId)
                        return c ? <ChainLogo key={r.chainId} chain={c} size={12} /> : null
                      })}
                      {g.rows.length > 3 && <span className="mono text-[9px] text-t3">+{g.rows.length - 3}</span>}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      {getChain(g.rows[0].chainId) && (
                        <ChainLogo chain={getChain(g.rows[0].chainId)!} size={12} />
                      )}
                      <span className="mono text-[10px] text-t3">{g.symbol}</span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <div className="field flex h-9 w-full max-w-[240px] items-center gap-2 px-2.5">
                <Search size={14} className="text-t2" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search asset or network"
                  className="input text-[13px]"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[12px] text-t2">
                <input
                  type="checkbox"
                  checked={showEmpty}
                  onChange={(e) => setShowEmpty(e.target.checked)}
                  className="size-3.5 accent-[#abb8ff]"
                />
                Empty
              </label>
              <span className="mono ml-auto flex items-center gap-1 text-[11px] text-t3">
                {shortAddr(address, 4)}
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(address ?? '')
                    notify('Address copied', 'success')
                  }}
                  className="hover:text-t1"
                >
                  <Copy size={11} />
                </button>
              </span>
            </div>

            <div className="flex max-h-[560px] overflow-y-auto">
              <div className="min-w-0 flex-1">
                {groups.length === 0 && (
                  <div className="px-5 py-8 text-[13px] text-t2">
                    {showEmpty ? 'Nothing matches this filter.' : 'No funded asset. Turn on empty to see every chain.'}
                  </div>
                )}
                {groups.map((g) => {
                  const open = openGroups.has(g.symbol.toUpperCase())
                  const multi = g.rows.length > 1
                  const first = g.rows[0]
                  const firstChain = getChain(first.chainId)
                  return (
                    <div key={g.symbol} className="border-b border-line last:border-0">
                      <button
                        onClick={() =>
                          multi &&
                          setOpenGroups((prev) => {
                            const next = new Set(prev)
                            const k = g.symbol.toUpperCase()
                            if (next.has(k)) next.delete(k)
                            else next.add(k)
                            return next
                          })
                        }
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                          multi ? 'hover:bg-ink-700/60' : 'cursor-default'
                        }`}
                      >
                        <span className="relative shrink-0">
                          <TokenIcon
                            symbol={g.symbol}
                            size={34}
                            chainId={first.chainId}
                            address={first.address ?? undefined}
                            verified={first.verified}
                          />
                          {!multi && firstChain && (
                            <span className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-ink-800">
                              <ChainLogo chain={firstChain} size={14} />
                            </span>
                          )}
                        </span>
                        {multi && (
                          <span className="flex shrink-0 items-center gap-0.5">
                            {g.rows.slice(0, 3).map((r) => {
                              const c = getChain(r.chainId)
                              return c ? <ChainLogo key={r.chainId} chain={c} size={13} /> : null
                            })}
                            {g.rows.length > 3 && <span className="mono text-[10px] text-t3">+{g.rows.length - 3}</span>}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-t1">{g.symbol}</span>
                          {!multi && (
                            <span className="block truncate text-[12px] leading-4 text-t2">
                              {firstChain?.name ?? g.name}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="display block text-[15px] leading-5 text-t1">
                            {g.usd == null ? '—' : usd(g.usd)}
                          </span>
                          <span className="mono block text-[12px] leading-4 text-t2">
                            {g.amount > 0 ? `${fmtAmount(g.amount)} ${g.symbol}` : '—'}
                          </span>
                        </span>
                        {multi && (
                          <ChevronDown size={14} className={`shrink-0 text-t2 transition-transform ${open ? 'rotate-180' : ''}`} />
                        )}
                      </button>

                      {multi && open && (
                        <div className="pb-2 pl-[3.7rem] pr-4">
                          {g.rows.map((r) => {
                            const c = getChain(r.chainId)
                            const amt = r.amount == null ? null : Number(formatUnits(r.amount, r.decimals))
                            return (
                              <div key={`${r.chainId}-${r.address ?? 'native'}`} className="flex items-center gap-2.5 py-1.5">
                                <span className="relative shrink-0">
                                  <TokenIcon symbol={r.symbol} size={22} chainId={r.chainId} address={r.address ?? undefined} verified={r.verified} />
                                  {c && (
                                    <span className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-ink-800">
                                      <ChainLogo chain={c} size={11} />
                                    </span>
                                  )}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[12px] text-t1">{r.symbol}</span>
                                  <span className="block truncate text-[11px] leading-3 text-t3">{c?.name ?? r.chainId}</span>
                                </span>
                                <span className="mono shrink-0 text-right text-[12px] text-t1">
                                  {r.usdValue == null ? '—' : usd(r.usdValue)}
                                </span>
                                <span className="mono w-24 shrink-0 text-right text-[11px] text-t2">
                                  {amt == null ? '—' : fmtAmount(amt)}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2.5">
              <button
                onClick={() => setImportFor(network === 'all' ? 11155111 : network)}
                className="inline-flex items-center gap-1.5 text-[12px] text-t2 transition-colors hover:text-t1"
              >
                <Plus size={12} /> Import an ERC-20
              </button>
              <span className="mono ml-auto text-[11px] text-t3">
                {prices.data?.at
                  ? `prices ${new Date(prices.data.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · DefiLlama`
                  : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      <NetworkPicker
        open={pickNetwork}
        onClose={() => setPickNetwork(false)}
        value={network}
        onSelect={setNetwork}
        totals={networkTotals}
      />

      {importFor != null && (
        <ImportToken chainId={importFor} onClose={() => setImportFor(null)} onDone={() => portfolio.refetch()} />
      )}
    </div>
  )
}


const assets = (n: number) => `${n} asset${n === 1 ? '' : 's'}`

function fmtAmount(n: number): string {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toPrecision(3)
}

function valueOf(amount: bigint | null, decimals: number, symbol: string, prices: Record<string, number>): number | null {
  if (amount == null) return null
  const p = priceOf(prices, symbol)
  if (p == null) return null
  return Number(formatUnits(amount, decimals)) * p
}

/** the token icon wrapped in its share of the portfolio, as the design draws it */
function RingIcon({
  pct,
  symbol,
  chainId,
  address,
  verified,
}: {
  pct: number
  symbol: string
  chainId: number
  address: string | null
  verified: boolean
}) {
  const r = 26
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <span className="relative grid size-[64px] place-items-center">
      <svg width="64" height="64" viewBox="0 0 64 64" className="absolute -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(171,184,255,0.13)" strokeWidth="3" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * clamped) / 100}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <TokenIcon symbol={symbol} size={38} chainId={chainId} address={address ?? undefined} verified={verified} />
    </span>
  )
}

/** Value over time, built only from the snapshots this browser actually recorded. */
function ValueChart({ points }: { points: { t: number; v: number }[] }) {
  if (points.length === 1) {
    return (
      <div className="relative h-[132px] w-full rounded-[12px] border border-line bg-ink-850/40">
        <svg viewBox="0 0 900 132" preserveAspectRatio="none" className="h-full w-full">
          <line x1="0" y1="66" x2="900" y2="66" stroke="var(--color-accent)" strokeWidth="2" strokeDasharray="6 6" opacity="0.7" />
        </svg>
        <p className="absolute inset-x-0 bottom-2 text-center text-[11px] text-t3">
          one point recorded — the line is flat because nothing has been observed to change yet
        </p>
      </div>
    )
  }
  if (points.length < 2) {
    return (
      <div className="mt-5 grid h-[132px] place-items-center rounded-[12px] border border-dashed border-line">
        <p className="max-w-[46ch] px-4 text-center text-[12px] leading-5 text-t2">
          The chart fills in as you use the app: one point is recorded per hour and kept for 90 days. Nothing is backfilled.
        </p>
      </div>
    )
  }
  const w = 900
  const h = 132
  const pad = 6
  const vs = points.map((p) => p.v)
  const min = Math.min(...vs)
  const max = Math.max(...vs)
  const span = max - min || 1
  const t0 = points[0].t
  const t1 = points[points.length - 1].t
  const tSpan = t1 - t0 || 1
  const xy = points.map((p) => {
    const x = pad + ((p.t - t0) / tSpan) * (w - pad * 2)
    const y = h - pad - ((p.v - min) / span) * (h - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const area = `M0,${h} L${xy.join(' L')} L${w},${h} Z`
  return (
    <div className="mt-5">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-[132px] w-full">
        <defs>
          <linearGradient id="ebt-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#ebt-fill)" />
        <polyline points={xy.join(' ')} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between">
        <span className="mono text-[11px] text-t3">{new Date(points[0].t).toLocaleString()}</span>
        <span className="mono text-[11px] text-t3">{points.length} points</span>
      </div>
    </div>
  )
}

function NetworkPicker({
  open,
  onClose,
  value,
  onSelect,
  totals,
}: {
  open: boolean
  onClose: () => void
  value: number | 'all'
  onSelect: (v: number | 'all') => void
  totals: Map<number, { usd: number; count: number }>
}) {
  const [q, setQ] = useState('')
  useEffect(() => {
    if (open) setQ('')
  }, [open])
  if (!open) return null
  const needle = q.trim().toLowerCase()
  const list = needle ? CHAINS.filter((c) => `${c.name} ${c.short} ${c.id}`.toLowerCase().includes(needle)) : CHAINS
  const pick = (v: number | 'all') => {
    onSelect(v)
    onClose()
  }
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-3 backdrop-blur-[2px]">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="enter relative z-10 flex max-h-[min(80vh,620px)] w-full max-w-[440px] flex-col overflow-hidden rounded-[16px] border border-line-strong bg-ink-800 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 className="display text-[18px] leading-7 text-t1">Network</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-lg text-t2 transition-colors hover:bg-ink-700 hover:text-t1"
          >
            ✕
          </button>
        </div>
        <div className="px-5 pt-3">
          <div className="field flex h-10 items-center gap-2 px-3">
            <Search size={15} className="text-t2" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search chains"
              className="input text-[14px]"
            />
          </div>
        </div>
        <div className="mt-2 flex-1 overflow-y-auto px-2 pb-3">
          <button
            onClick={() => pick('all')}
            className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors ${
              value === 'all' ? 'bg-ink-600' : 'hover:bg-ink-700'
            }`}
          >
            <span className="grid size-[30px] place-items-center">
              <span className="size-2.5 rotate-45 border border-t2" />
            </span>
            <span className="flex-1 text-[14px] text-t1">All chains</span>
            <span className="mono text-[12px] text-t2">{totals.size}</span>
          </button>
          {list.map((c) => {
            const t = totals.get(c.id)
            return (
              <button
                key={c.id}
                onClick={() => pick(c.id)}
                className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors ${
                  value === c.id ? 'bg-ink-600' : 'hover:bg-ink-700'
                }`}
              >
                <ChainLogo chain={c} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-t1">{c.name}</span>
                  <span className="mono block text-[11px] text-t3">{c.id}</span>
                </span>
                <span className="mono shrink-0 text-[12px] text-t2">{t ? usd(t.usd) : '—'}</span>
              </button>
            )
          })}
          {list.length === 0 && <div className="px-4 py-10 text-center text-[13px] text-t2">No chain matches “{q}”.</div>}
        </div>
      </div>
    </div>
  )
}

function ImportToken({ chainId, onClose, onDone }: { chainId: number; onClose: () => void; onDone: () => void }) {
  const [addr, setAddr] = useState('')
  const [busy, setBusy] = useState(false)
  const chain = getChain(chainId)!
  const existing = allTokensForChain(chainId)

  async function doImport() {
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return notify('Enter a 20-byte contract address', 'error')
    if (existing.some((t) => t.address.toLowerCase() === addr.toLowerCase())) return notify('Already listed', 'info')
    setBusy(true)
    try {
      const meta = await readTokenMeta(chainId, addr as Address)
      if (!meta) return notify('No ERC-20 answered at that address', 'error')
      const tk: TokenCfg = {
        chainId,
        address: addr as Address,
        symbol: meta.symbol,
        name: meta.name,
        decimals: meta.decimals,
        kind: 'token',
        color: '#475569',
        verified: false,
      }
      saveCustomToken(tk)
      notify(`${meta.symbol} added`, 'success')
      onDone()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Import ERC-20 on ${chain.name}`}>
      <div className="space-y-3 p-5">
        <p className="text-[12px] leading-5 text-t2">
          Name, symbol and decimals are read from the contract. Imported tokens are marked custom so a look-alike USDC is never
          mistaken for Circle's.
        </p>
        <input
          value={addr}
          onChange={(e) => setAddr(e.target.value.trim())}
          placeholder="0x…"
          className="input mono rounded-lg border border-line-strong bg-ink-850 px-3 py-2.5"
        />
        <Button full variant="primary" loading={busy} onClick={doImport}>
          Read contract and add
        </Button>
      </div>
    </Modal>
  )
}

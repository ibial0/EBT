import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Copy, ExternalLink, Plus, RefreshCw, Search, Wallet } from 'lucide-react'
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

type View = 'overview' | 'tokens'
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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Wallet view"
        title="Portfolio"
        subtitle="One wallet across every allowlisted testnet. Dollar figures are estimates, not withdrawable value."
        right={
          <Button variant="secondary" onClick={() => portfolio.refetch()} loading={portfolio.isFetching}>
            <RefreshCw size={14} /> Refresh
          </Button>
        }
      />

      {/* value + chart */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="col-head">{selected ? `${selected.name} value` : 'Total testnet value'}</div>
            <div className="figure mt-2 text-[44px] leading-[48px] font-bold tracking-[-0.03em] text-t1">
              {portfolio.isLoading ? <span className="skeleton inline-block h-10 w-44 align-middle" /> : usd(selected ? scopedUsd : totalUsd)}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="mono text-[12px] uppercase tracking-[0.6px] text-t2">
                {assets(scoped.length)} / {network === 'all' ? fundedNetworks : 1}{' '}
                {(network === 'all' ? fundedNetworks : 1) === 1 ? 'network' : 'networks'}
              </span>
              <span className="mono flex items-center gap-1.5 text-[12px] uppercase tracking-[0.6px] text-t2">
                <span className={`size-1.5 rotate-45 border ${prices.data?.live ? 'border-pos' : 'border-t3'}`} />
                {prices.data?.live ? 'Live prices' : 'Estimated'}
              </span>
              {unpriced > 0 && (
                <span className="mono text-[12px] uppercase tracking-[0.6px] text-warn">{unpriced} unpriced</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPickNetwork(true)}
              className="flex h-[38px] items-center gap-2 rounded-lg border border-line-strong bg-ink-850 px-3 text-[14px] text-t1 transition-colors hover:border-[#3f4a66] hover:bg-ink-700"
            >
              {selected ? <ChainLogo chain={selected} size={18} /> : <span className="size-1.5 rotate-45 border border-t3" />}
              {selected ? selected.short : 'All networks'}
              <ChevronDown size={13} className="text-t2" />
            </button>
            <div className="flex h-[38px] items-center rounded-lg border border-line-strong bg-ink-850 p-0.5">
              {(['1D', '1W', '1M'] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`mono h-[32px] rounded-md px-3 text-[12px] uppercase tracking-[0.6px] transition-colors ${
                    range === r ? 'bg-accent text-[#111628]' : 'text-t2 hover:text-t1'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ValueChart points={chartPoints} />
      </div>

      {/* tabs */}
      <div className="flex items-center gap-1 border-b border-line-strong">
        {(['overview', 'tokens'] as View[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative -mb-px px-4 py-2.5 text-[14px] capitalize transition-colors ${
              tab === t ? 'text-t1' : 'text-t2 hover:text-t1'
            }`}
          >
            {t}
            {tab === t && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" />}
          </button>
        ))}
      </div>

      <div className="split-rail">
        <div className="split-rail-main space-y-4">
          {/* toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="field flex h-[38px] w-full max-w-[380px] items-center gap-2 px-3">
              <Search size={15} className="text-t2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search asset or network"
                className="input text-[14px]"
              />
            </div>
            <label className="ml-auto flex h-[38px] cursor-pointer items-center gap-2.5 rounded-lg border border-line-strong bg-ink-850 px-3 text-[13px] text-t2">
              <input
                type="checkbox"
                checked={showEmpty}
                onChange={(e) => setShowEmpty(e.target.checked)}
                className="size-3.5 accent-[#abb8ff]"
              />
              Empty networks
            </label>
            <span className="mono flex h-[38px] items-center gap-1.5 rounded-lg border border-line-strong bg-ink-850 px-3 text-[12px] text-t2">
              {shortAddr(address, 4)}
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(address ?? '')
                  notify('Address copied', 'success')
                }}
                className="hover:text-t1"
              >
                <Copy size={12} />
              </button>
            </span>
          </div>

          {portfolio.isLoading && (
            <div className="card flex items-center gap-2 p-5 text-[13px] text-t2">
              <Spinner /> Reading {CHAINS.length} chains, five at a time
            </div>
          )}
          {portfolio.isError && (
            <div className="card p-4 text-[13px] text-neg">Portfolio failed: {(portfolio.error as Error).message}</div>
          )}

          {tab === 'overview' ? (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="display text-[18px] leading-7 text-t1">Top holdings</h2>
                <span className="mono text-[12px] uppercase tracking-[0.6px] text-t2">{top.length} of {groups.length}</span>
              </div>
              <div className="border-t border-line-strong">
                {top.length === 0 && <div className="px-5 py-8 text-[13px] text-t2">No funded asset yet.</div>}
                {top.map((g) => {
                  const share = (scopedUsd > 0 ? (g.usd ?? 0) / scopedUsd : 0) * 100
                  return (
                    <button
                      key={g.symbol}
                      onClick={() => {
                        setTab('tokens')
                        setOpenGroups((prev) => new Set(prev).add(g.symbol.toUpperCase()))
                      }}
                      className="flex w-full items-center gap-3 border-b border-line px-5 py-3.5 text-left transition-colors last:border-0 hover:bg-ink-700/60"
                    >
                      <Ring pct={share} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-t1">{g.symbol}</span>
                        <span className="block truncate text-[12px] leading-4 text-t2">{g.name}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="display block text-[15px] leading-5 text-t1">
                          {g.usd == null ? '—' : usd(g.usd)}
                        </span>
                        <span className="mt-0.5 flex items-center justify-end gap-1">
                          {g.rows.slice(0, 3).map((r) => {
                            const c = getChain(r.chainId)
                            return c ? <ChainLogo key={r.chainId} chain={c} size={13} /> : null
                          })}
                          {g.rows.length > 3 && (
                            <span className="mono text-[10px] text-t3">+{g.rows.length - 3}</span>
                          )}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="display text-[18px] leading-7 text-t1">Tokens</h2>
                <span className="mono text-[12px] uppercase tracking-[0.6px] text-t2">
                  {groups.length} asset{groups.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="border-t border-line-strong">
                {groups.length === 0 && (
                  <div className="px-5 py-8 text-[13px] text-t2">
                    {showEmpty ? 'Nothing matches this filter.' : 'No funded asset. Turn on empty networks to see every chain.'}
                  </div>
                )}
                {groups.map((g) => {
                  const open = openGroups.has(g.symbol.toUpperCase())
                  const multi = g.rows.length > 1
                  return (
                    <div key={g.symbol} className="border-b border-line last:border-0">
                      <button
                        onClick={() =>
                          setOpenGroups((prev) => {
                            const next = new Set(prev)
                            const k = g.symbol.toUpperCase()
                            if (next.has(k)) next.delete(k)
                            else next.add(k)
                            return next
                          })
                        }
                        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-ink-700/60"
                      >
                        <span className="relative">
                          <TokenIcon symbol={g.symbol} size={36} chainId={g.rows[0].chainId} address={g.rows[0].address ?? undefined} verified={g.rows[0].verified} />
                          {multi && (
                            <span className="absolute -bottom-1 -right-1 rounded-full border border-ink-800">
                              <ChainLogo chain={getChain(g.rows[0].chainId)!} size={15} />
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-t1">{g.symbol}</span>
                          <span className="block truncate text-[12px] leading-4 text-t2">
                            {g.name}
                            {multi ? ` · ${g.rows.length} networks` : ` · ${getChain(g.rows[0].chainId)?.short}`}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="display block text-[15px] leading-5 text-t1">{g.usd == null ? '—' : usd(g.usd)}</span>
                          <span className="mono block text-[12px] leading-4 text-t2">
                            {g.amount > 0 ? `${fmtAmount(g.amount)} ${g.symbol}` : '—'}
                          </span>
                        </span>
                        {multi && (
                          <ChevronDown
                            size={15}
                            className={`shrink-0 text-t2 transition-transform ${open ? 'rotate-180' : ''}`}
                          />
                        )}
                      </button>
                      {multi && open && (
                        <div className="pb-2 pl-[4.4rem] pr-5">
                          {g.rows.map((r) => {
                            const c = getChain(r.chainId)
                            const amt = r.amount == null ? null : Number(formatUnits(r.amount, r.decimals))
                            return (
                              <div key={`${r.chainId}-${r.address ?? 'native'}`} className="flex items-center gap-2 py-1.5">
                                {c ? <ChainLogo chain={c} size={15} /> : null}
                                <span className="min-w-0 flex-1 truncate text-[12px] text-t2">{c?.short ?? r.chainId}</span>
                                <span className="mono text-[12px] text-t2">
                                  {amt == null ? '—' : `${fmtAmount(amt)} ${r.symbol}`}
                                </span>
                                <span className="mono w-20 text-right text-[12px] text-t1">
                                  {r.usdValue == null ? '—' : usd(r.usdValue)}
                                </span>
                                {c && (
                                  <a
                                    href={explorerAddress(c.id, address ?? '')}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-t3 hover:text-t1"
                                    title="Open in explorer"
                                  >
                                    <ExternalLink size={11} />
                                  </a>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
                <button
                  onClick={() => setImportFor(network === 'all' ? 11155111 : network)}
                  className="inline-flex items-center gap-1.5 text-[12px] text-t2 transition-colors hover:text-t1"
                >
                  <Plus size={12} /> Import an ERC-20
                </button>
                <span className="mono text-[11px] text-t3">
                  {prices.data?.at
                    ? `prices ${new Date(prices.data.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · DefiLlama`
                    : ''}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* rail */}
        <aside className="space-y-4">
          <RecoveryPanel />
          <div className="card p-4">
            <h2 className="display text-[16px] leading-6 text-t1">How these numbers are made</h2>
            <p className="mt-1 text-[12px] leading-5 text-t2">
              Balances are read from each chain's RPC. Dollar figures use mainnet spot prices and are a reading aid only —
              testnet tokens cannot be withdrawn or sold.
            </p>
          </div>
        </aside>
      </div>

      <NetworkPicker open={pickNetwork} onClose={() => setPickNetwork(false)} value={network} onSelect={setNetwork} totals={networkTotals} />

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

/** share-of-portfolio ring: the arc is the asset's weight, so a glance ranks the list */
function Ring({ pct }: { pct: number }) {
  const r = 15
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <span className="relative grid size-11 shrink-0 place-items-center">
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(171,184,255,0.14)" strokeWidth="3.5" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * clamped) / 100}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <span className="mono absolute text-[9px] text-t2">{Math.round(clamped)}%</span>
    </span>
  )
}

/** Value over time, built only from the snapshots this browser actually recorded. */
function ValueChart({ points }: { points: { t: number; v: number }[] }) {
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
  return (
    <Modal open={open} onClose={onClose} title="Network">
      <div className="p-2">
        <button
          onClick={() => {
            onSelect('all')
            onClose()
          }}
          className={`row w-full ${value === 'all' ? 'bg-ink-700' : ''}`}
        >
          <span className="size-1.5 rotate-45 border border-t3" />
          <span className="flex-1 text-left text-[14px] text-t1">All networks</span>
          <span className="mono text-[12px] text-t3">{totals.size}</span>
        </button>
        {CHAINS.map((c) => {
          const t = totals.get(c.id)
          return (
            <button
              key={c.id}
              onClick={() => {
                onSelect(c.id)
                onClose()
              }}
              className={`row w-full ${value === c.id ? 'bg-ink-700' : ''}`}
            >
              <ChainLogo chain={c} size={22} />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[14px] text-t1">{c.name}</span>
                <span className="mono block text-[11px] text-t3">{c.id}</span>
              </span>
              <span className="mono text-[12px] text-t3">{t ? usd(t.usd) : '—'}</span>
            </button>
          )
        })}
      </div>
    </Modal>
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

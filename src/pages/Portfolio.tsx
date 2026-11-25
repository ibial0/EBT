import { useMemo, useState } from 'react'
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
import { loadPortfolio, nativeHoldingLabel, type ChainHolding, type TokenHolding } from '../lib/portfolio'
import { allTokensForChain, saveCustomToken, type TokenCfg } from '../config/tokens'
import { readTokenMeta } from '../lib/tokenImport'
import { loadPrices, priceOf, usd } from '../lib/prices'

type View = 'usd' | 'token'

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

export default function Portfolio() {
  const { address, isConnected } = useAccount()
  const [network, setNetwork] = useState<number | 'all'>('all')
  const [view, setView] = useState<View>('usd')
  const [q, setQ] = useState('')
  const [showEmpty, setShowEmpty] = useState(false)
  const [importFor, setImportFor] = useState<number | null>(null)
  const [pickNetwork, setPickNetwork] = useState(false)

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

  const nonZero = rows.filter((r) => (r.amount ?? 0n) > 0n)
  const totalUsd = nonZero.reduce((sum, r) => sum + (r.usdValue ?? 0), 0)
  const pricedCount = nonZero.filter((r) => r.usdValue != null).length
  const unpriced = nonZero.length - pricedCount

  const networkTotals = useMemo(() => {
    const m = new Map<number, { usd: number; count: number }>()
    for (const r of nonZero) {
      const cur = m.get(r.chainId) ?? { usd: 0, count: 0 }
      cur.usd += r.usdValue ?? 0
      cur.count += 1
      m.set(r.chainId, cur)
    }
    return m
  }, [nonZero])

  const needle = q.trim().toLowerCase()
  const orderedChains = useMemo(
    () => [...CHAINS].sort((a, b) => (networkTotals.get(b.id)?.usd ?? 0) - (networkTotals.get(a.id)?.usd ?? 0)),
    [networkTotals],
  )
  const visibleChains = (showEmpty ? orderedChains : orderedChains.filter((c) => (networkTotals.get(c.id)?.count ?? 0) > 0))
    .filter((c) => network === 'all' || c.id === network)
    .filter((c) => {
      if (!needle) return true
      if (`${c.name} ${c.short}`.toLowerCase().includes(needle)) return true
      return rows.some((r) => r.chainId === c.id && `${r.symbol} ${r.name} ${r.address ?? ''}`.toLowerCase().includes(needle))
    })

  const scoped = network === 'all' ? nonZero : nonZero.filter((r) => r.chainId === network)
  const scopedUsd = scoped.reduce((s, r) => s + (r.usdValue ?? 0), 0)

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

  const selected = network === 'all' ? null : getChain(network)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Wallet view"
        title="Portfolio"
        subtitle="One wallet across every allowlisted testnet. Dollar figures are estimates, not withdrawable value."
      />

      {/* summary */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="col-head">{selected ? `${selected.name} value` : 'Total testnet value'}</div>
            <div className="figure mt-2 text-[44px] leading-[48px] font-bold tracking-[-0.03em] text-t1">
              {portfolio.isLoading ? <span className="skeleton inline-block h-10 w-44 align-middle" /> : usd(selected ? scopedUsd : totalUsd)}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="mono text-[12px] uppercase tracking-[0.6px] text-t2">
                {assets(scoped.length)} assets / {network === 'all' ? networkTotals.size : 1}{' '}
                {(network === 'all' ? networkTotals.size : 1) === 1 ? 'network' : 'networks'}
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
              {(['usd', 'token'] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`mono h-[32px] rounded-md px-3 text-[12px] uppercase tracking-[0.6px] transition-colors ${
                    view === v ? 'bg-accent text-[#111628]' : 'text-t2 hover:text-t1'
                  }`}
                >
                  {v === 'usd' ? 'USD' : 'Token'}
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={() => portfolio.refetch()} loading={portfolio.isFetching}>
              <RefreshCw size={14} /> Refresh
            </Button>
            <div className="mono w-full text-right text-[12px] uppercase tracking-[0.6px] text-t3">
              {prices.data?.at ? `prices ${new Date(prices.data.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · DefiLlama` : ''}
            </div>
          </div>
        </div>

      </div>

      <RecoveryPanel />

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="field flex h-[38px] w-full max-w-[420px] items-center gap-2 px-3">
          <Search size={15} className="text-t2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search asset or network" className="input text-[14px]" />
        </div>
        <label className="ml-auto flex h-[38px] cursor-pointer items-center gap-2.5 rounded-lg border border-line-strong bg-ink-850 px-3 text-[13px] text-t2">
          <input type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} className="size-3.5 accent-[#abb8ff]" />
          Empty networks
        </label>
        <span className="mono flex h-[38px] items-center gap-1.5 rounded-lg border border-line-strong bg-ink-850 px-3 text-[12px] text-t2">
          {shortAddr(address, 4)}
          <button onClick={() => { navigator.clipboard?.writeText(address ?? ''); notify('Address copied', 'success') }} className="hover:text-t1">
            <Copy size={12} />
          </button>
        </span>
      </div>

      {portfolio.isLoading && (
        <div className="card flex items-center gap-2 p-5 text-[13px] text-t2">
          <Spinner /> Reading {CHAINS.length} chains, five at a time
        </div>
      )}
      {portfolio.isError && <div className="card p-4 text-[13px] text-[#ffb4b4]">Portfolio failed: {(portfolio.error as Error).message}</div>}

      {/* network groups */}
      <div className="space-y-3">
        {visibleChains.map((chain) => {
          const chainRows = rows
            .filter((r) => r.chainId === chain.id)
            .filter((r) => showEmpty || (r.amount ?? 0n) > 0n)
            .filter((r) => !needle || `${r.symbol} ${r.name} ${r.address ?? ''}`.toLowerCase().includes(needle) || `${chain.name}`.toLowerCase().includes(needle))
            .sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0))
          const chainUsd = networkTotals.get(chain.id)?.usd ?? 0
          const holding = holdings.find((h) => h.chainId === chain.id)

          return (
            <section key={chain.id} className="card overflow-hidden">
              <header className="flex items-center gap-3 border-b border-line-strong px-5 py-3.5">
                <ChainLogo chain={chain} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="display text-[16px] leading-6 text-t1">{chain.name}</h2>
                    {chain.nativeIsUsdc && <Badge tone="blue">USDC gas</Badge>}
                    {holding?.nativeError && <Badge tone="amber">RPC error</Badge>}
                  </div>
                  <div className="mono mt-0.5 text-[12px] uppercase tracking-[0.6px] text-t2">
                    chain {chain.id} <span className="text-t3"> · </span> {holding?.ms ?? 0} ms
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={explorerAddress(chain.id, address ?? '')}
                    target="_blank"
                    rel="noreferrer"
                    title="Open in explorer"
                    className="rounded-md p-1.5 text-t3 transition-colors hover:bg-white/5 hover:text-t1"
                  >
                    <ExternalLink size={13} />
                  </a>
                  <button
                    onClick={() => setImportFor(chain.id)}
                    title="Import ERC-20"
                    className="rounded-md p-1.5 text-t3 transition-colors hover:bg-white/5 hover:text-t1"
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <div className="min-w-[92px] text-right">
                  <div className="display text-[18px] leading-7 text-t1">{usd(chainUsd)}</div>
                  <div className="mono text-[12px] uppercase tracking-[0.6px] text-t2">{assets(networkTotals.get(chain.id)?.count ?? 0)}</div>
                </div>
              </header>

              <div className="p-2">
                {chainRows.length === 0 && <div className="px-2 py-3 text-[12px] text-t3">No assets on this network</div>}
                {chainRows.map((r) => (
                  <AssetRow key={`${r.chainId}-${r.address ?? 'native'}-${r.symbol}`} row={r} view={view} />
                ))}
              </div>

            </section>
          )
        })}

        {visibleChains.length === 0 && (
          <div className="card">
            <Empty title="Nothing matches" hint="Clear the search or turn on empty networks." />
          </div>
        )}
      </div>

      <p className="text-[11px] leading-5 text-t3">
        Estimates use mainnet spot prices from DefiLlama and are refreshed every ten minutes. Testnet tokens have no market and
        cannot be withdrawn, so the total is a reading aid, not a balance you own.
      </p>

      <NetworkPicker open={pickNetwork} onClose={() => setPickNetwork(false)} value={network} onSelect={setNetwork} totals={networkTotals} />

      {importFor != null && (
        <ImportToken
          chainId={importFor}
          onClose={() => setImportFor(null)}
          onDone={() => portfolio.refetch()}
        />
      )}
    </div>
  )
}

const assets = (n: number) => `${n} asset${n === 1 ? '' : 's'}`

function valueOf(amount: bigint | null, decimals: number, symbol: string, prices: Record<string, number>): number | null {
  if (amount == null) return null
  const p = priceOf(prices, symbol)
  if (p == null) return null
  return Number(formatUnits(amount, decimals)) * p
}

function AssetRow({ row, view }: { row: Row; view: View }) {
  const chain = getChain(row.chainId)!
  const amountText = row.error ? 'read failed' : row.amount == null ? '-' : fmt(row.amount, row.decimals, 6)
  return (
    <div className="row row-tall ml-2">
      <TokenIcon
        symbol={row.symbol}
        size={36}
        chainId={row.chainId}
        address={row.address ?? undefined}
        verified={row.verified}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-semibold text-t1">{row.symbol}</span>
          {!row.verified && <Badge tone="amber">custom</Badge>}
          {row.usdValue == null && (row.amount ?? 0n) > 0n && <span className="chip !h-5 !px-1.5 !text-[10px]">no price</span>}
        </div>
        <div className="truncate text-[12px] leading-4 text-t2">
          {row.name.replace(' (native)', '')}
          {row.address ? (
            <>
              <span className="text-t3"> · </span>
              <span className="inline-flex items-center gap-0.5">
                <a
                  href={`${chain.viem.blockExplorers?.default?.url}/token/${row.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mono hover:text-t1"
                >
                  {row.address.slice(0, 6)}…{row.address.slice(-4)}
                </a>
                <CopyButton value={row.address} />
              </span>
            </>
          ) : (
            <span className="text-t3"> · native gas token</span>
          )}
        </div>
      </div>
      <div className="min-w-[150px] text-right">
        {view === 'usd' ? (
          <>
            <div className="display text-[15px] leading-5 text-t1">{row.usdValue == null ? '—' : usd(row.usdValue)}</div>
            <div className="mono text-[12px] leading-4 text-t2">
              {amountText} {row.symbol}
            </div>
          </>
        ) : (
          <>
            <div className="display text-[15px] leading-5 text-t1">
              {amountText} {row.symbol}
            </div>
            <div className="mono text-[12px] leading-4 text-t2">{row.usdValue == null ? '—' : usd(row.usdValue)}</div>
          </>
        )}
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
          <span className="dot" style={{ background: '#85858b' }} />
          <span className="flex-1 text-left text-[14px] text-t1">All networks</span>
          <span className="figure text-[12px] text-t3">{totals.size}</span>
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
              <span className="figure text-[12px] text-t3">{t ? usd(t.usd) : '-'}</span>
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
          className="input mono rounded-lg border border-line bg-ink-850 px-3 py-2.5"
        />
        <Button full variant="primary" loading={busy} onClick={doImport}>
          Read contract and add
        </Button>
      </div>
    </Modal>
  )
}

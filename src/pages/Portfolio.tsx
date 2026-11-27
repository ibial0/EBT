import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Copy, Info, Plus, RefreshCw, Search, Wallet, X } from 'lucide-react'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import type { Address } from 'viem'
import { CHAINS, getChain } from '../config/chains'
import { NON_EVM_NETWORKS, getNetwork, type NetworkEntry } from '../config/networks'
import { Badge, Button, ChainLogo, NetworkLogo, Empty, Modal, Spinner, TokenIcon, notify, AllChainsMark } from '../components/ui'
import { ConnectButton } from '../components/Layout'
import { RecoveryPanel } from '../components/RecoveryPanel'
import { ClaimableWithdrawals } from '../components/ClaimableWithdrawals'
import { shortAddr, fmt } from '../lib/format'
import { TokenActions, TokenSheet, tokenRowKey } from '../components/TokenActions'
import { addActivity } from '../lib/activity'
import {
  loadPortfolio,
  loadPortfolioCache,
  nativeHoldingLabel,
  savePortfolioCache,
  type ChainHolding,
} from '../lib/portfolio'
import { loadNonEvmPortfolio, type NonEvmChainHolding } from '../lib/nonEvmPortfolio'
import { WALLET_FAMILIES, openWalletModal, useNonEvmWallets, type NonEvmFamily } from '../lib/walletsMulti'
import { allTokensForChain, saveCustomToken, type TokenCfg } from '../config/tokens'
import { readTokenMeta } from '../lib/tokenImport'
import { loadPrices, priceOf, usd } from '../lib/prices'
import { loadHistory, recordSnapshot, sliceRange } from '../lib/history'
import {
  diffInflows,
  loadInflows,
  mergeInflows,
  saveInflows,
  type FlatHolding,
  type InflowEvent,
} from '../lib/inflows'

type View = 'overview' | 'tokens' | 'recovery'
type Range = '1D' | '1W' | '1M'

interface Row {
  networkKey: string
  chainId: number | null
  chainName: string
  chainShort: string
  network?: NetworkEntry
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

function RowChainLogo({ row, size }: { row: Row; size: number }) {
  if (row.chainId != null) {
    const c = getChain(row.chainId)
    return c ? <ChainLogo chain={c} size={size} /> : null
  }
  return row.network ? <NetworkLogo network={row.network} size={size} /> : null
}

/** Testnet-scope note. Portalled so it opens upward without being clipped by the card. */
function ScopeTip() {
  const ref = useRef<HTMLButtonElement | null>(null)
  const [at, setAt] = useState<{ x: number; y: number } | null>(null)
  const open = () => {
    const r = ref.current?.getBoundingClientRect()
    if (r) setAt({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top) })
  }
  const close = () => setAt(null)
  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label="What this balance covers"
        aria-describedby={at ? 'pf-scope-note' : undefined}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        className="grid size-5 place-items-center rounded-full text-t3 transition-colors hover:text-t2 focus-visible:text-t2 focus-visible:outline-none"
      >
        <Info size={15} strokeWidth={1.9} />
      </button>
      {at &&
        createPortal(
          <span
            id="pf-scope-note"
            role="tooltip"
            style={{ left: at.x, top: at.y - 8 }}
            className="pointer-events-none fixed z-[140] w-[250px] -translate-x-1/2 -translate-y-full rounded-[10px] bg-[#ECEDF2] px-3 py-2.5 text-left text-[12px] font-medium leading-[1.45] tracking-[-0.005em] text-[#171821] shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
          >
            <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-[#ECEDF2]" />
            Testnet only. Balances are read from each testnet chain; mainnet holdings are not shown.
          </span>,
          document.body,
        )}
    </>
  )
}

export default function Portfolio() {
  const { address, isConnected } = useAccount()
  const nonEvmAccounts = useNonEvmWallets()
  const nonEvmFamilies = (Object.keys(nonEvmAccounts) as NonEvmFamily[]).sort()
  const hasNonEvm = nonEvmFamilies.length > 0
  const anyConnected = Boolean((isConnected && address) || hasNonEvm)

  const [network, setNetwork] = useState<string>('all')
  const [tab, setTab] = useState<View>('overview')
  const [range, setRange] = useState<Range>('1D')
  const [q, setQ] = useState('')
  const [showEmpty, setShowEmpty] = useState(false)
  const [importFor, setImportFor] = useState<number | null>(null)
  const [pickNetwork, setPickNetwork] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [history, setHistory] = useState(loadHistory)
  // Token bubbles: on by default, and the choice sticks.
  const [showBubbles, setShowBubbles] = useState(() => {
    try {
      return localStorage.getItem('ebt.chartBubbles') !== 'off'
    } catch {
      return true
    }
  })
  const [inflows, setInflows] = useState<InflowEvent[]>(() => loadInflows())
  const prevRowsRef = useRef<FlatHolding[] | null>(null)
  const [popupGroup, setPopupGroup] = useState<Group | null>(null)
  /** Opened from the Overview for a token that lives on several chains. */
  const [sheetGroup, setSheetGroup] = useState<Group | null>(null)
  const [popupMode, setPopupMode] = useState<'send' | 'receive'>('send')
  /** The chain summary to return to when Back is pressed inside the popup. */
  const [sheetReturn, setSheetReturn] = useState<Group | null>(null)
  /** When set, the popup is pinned to that chain row (Tokens tab drill-down). */
  const [popupLock, setPopupLock] = useState<string | null>(null)
  const [popupRowKey, setPopupRowKey] = useState<string | null>(null)
  const [sendTo, setSendTo] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [sending, setSending] = useState(false)

  // Last snapshot for this wallet, so the page paints balances immediately on reload
  // instead of showing an empty table for the length of a 90-chain scan.
  const cachedSnapshot = useMemo(() => (address ? loadPortfolioCache(address) : undefined), [address])

  // Chains stream in as each RPC answers; these partial rows are merged over the base data.
  const [streamed, setStreamed] = useState<Map<number, ChainHolding>>(new Map())

  const portfolio = useQuery({
    queryKey: ['portfolio', address],
    queryFn: () =>
      loadPortfolio(address as Address, {
        onChain: (holding) =>
          setStreamed((prev) => {
            const next = new Map(prev)
            next.set(holding.chainId, holding)
            return next
          }),
      }),
    enabled: Boolean(address),
    staleTime: 20_000,
    retry: 0,
    initialData: cachedSnapshot?.holdings,
    initialDataUpdatedAt: cachedSnapshot?.at,
  })

  // Streamed rows only exist during a scan; once it settles the full result takes over.
  useEffect(() => {
    if (portfolio.isFetching) return
    setStreamed((prev) => (prev.size === 0 ? prev : new Map()))
  }, [portfolio.isFetching, portfolio.dataUpdatedAt])

  useEffect(() => {
    if (portfolio.data && address) savePortfolioCache(address, portfolio.data)
  }, [portfolio.data, address])
  const nonEvmQuery = useQuery({
    queryKey: ['non-evm-portfolio', nonEvmFamilies.map((f) => `${f}:${nonEvmAccounts[f]?.address ?? ''}`).join(',')],
    queryFn: () => loadNonEvmPortfolio(nonEvmAccounts),
    enabled: hasNonEvm,
    staleTime: 20_000,
    retry: 0,
  })
  const prices = useQuery({ queryKey: ['prices'], queryFn: loadPrices, staleTime: 10 * 60_000, retry: 1 })

  /**
   * Faucet claims and transfers happen in other tabs. Focus refetch is off globally (a full
   * 71-chain scan on every focus would be wasteful), so this page opts in on its own: coming
   * back to the tab re-scans once the data is older than a few seconds, which is what lets the
   * inflow bubbles notice a claim the moment the user looks.
   */
  useEffect(() => {
    if (!address) return
    const reconsider = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - (portfolio.dataUpdatedAt || 0) < 15_000) return
      void portfolio.refetch()
    }
    document.addEventListener('visibilitychange', reconsider)
    window.addEventListener('focus', reconsider)
    return () => {
      document.removeEventListener('visibilitychange', reconsider)
      window.removeEventListener('focus', reconsider)
    }
  }, [address, portfolio, portfolio.dataUpdatedAt])

  const priceMap = prices.data?.prices ?? {}
  const holdings: ChainHolding[] = useMemo(() => {
    const base = portfolio.data ?? []
    if (streamed.size === 0) return base
    const order = new Map<number, number>()
    base.forEach((h, i) => order.set(h.chainId, i))
    const merged = new Map<number, ChainHolding>()
    for (const h of base) merged.set(h.chainId, h)
    for (const [id, h] of streamed) merged.set(id, h)
    return [...merged.values()].sort((a, b) => {
      const ai = order.get(a.chainId) ?? Number.MAX_SAFE_INTEGER
      const bi = order.get(b.chainId) ?? Number.MAX_SAFE_INTEGER
      return ai - bi || a.chainId - b.chainId
    })
  }, [portfolio.data, streamed])
  const nonEvmHoldings: NonEvmChainHolding[] = nonEvmQuery.data ?? []

  const rows: Row[] = useMemo(() => {
    const out: Row[] = []
    for (const chain of holdings) {
      const c = getChain(chain.chainId)
      const nat = nativeHoldingLabel(chain.chainId)
      const netKey = `eip155:${chain.chainId}`
      out.push({
        networkKey: netKey,
        chainId: chain.chainId,
        chainName: c?.name ?? String(chain.chainId),
        chainShort: c?.short ?? String(chain.chainId),
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
          networkKey: netKey,
          chainId: chain.chainId,
          chainName: c?.name ?? String(chain.chainId),
          chainShort: c?.short ?? String(chain.chainId),
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

    for (const h of nonEvmHoldings) {
      const net = h.network
      const natSym = net.nativeCurrency.symbol
      const natDec = net.nativeCurrency.decimals
      out.push({
        networkKey: h.networkId,
        chainId: null,
        chainName: net.name,
        chainShort: net.short,
        network: net,
        symbol: natSym,
        name: net.nativeCurrency.name,
        amount: h.native,
        decimals: natDec,
        address: null,
        verified: true,
        usdValue: valueOf(h.native, natDec, natSym, priceMap),
        error: h.nativeError,
      })
      for (const t of h.tokens) {
        out.push({
          networkKey: h.networkId,
          chainId: null,
          chainName: net.name,
          chainShort: net.short,
          network: net,
          symbol: t.symbol,
          name: t.name,
          amount: t.balance,
          decimals: t.decimals,
          address: t.address,
          verified: t.verified,
          usdValue: valueOf(t.balance, t.decimals, t.symbol, priceMap),
          error: t.error,
        })
      }
    }
    return out
  }, [holdings, nonEvmHoldings, priceMap])

  const networkTotals = useMemo(() => {
    const m = new Map<string, { usd: number; count: number }>()
    for (const r of rows) {
      const cur = m.get(r.networkKey) ?? { usd: 0, count: 0 }
      cur.usd += r.usdValue ?? 0
      if ((r.amount ?? 0n) > 0n) cur.count += 1
      m.set(r.networkKey, cur)
    }
    return m
  }, [rows])

  const nonZero = useMemo(() => rows.filter((r) => (r.amount ?? 0n) > 0n), [rows])
  /** only chains that actually hold something, so the header does not claim 31 funded networks */
  const fundedNetworks = useMemo(() => new Set(nonZero.map((r) => r.networkKey)).size, [nonZero])
  const scoped = network === 'all' ? nonZero : nonZero.filter((r) => r.networkKey === network)
  const scopedUsd = scoped.reduce((s, r) => s + (r.usdValue ?? 0), 0)
  const totalUsd = nonZero.reduce((s, r) => s + (r.usdValue ?? 0), 0)

  /** Counts and logo strips under the headline number: distinct assets, and networks that hold any. */
  const assetCount = useMemo(() => new Set(scoped.map((r) => r.symbol.toUpperCase())).size, [scoped])
  const assetIcons = useMemo(() => {
    // One mark per distinct asset, not per chain position: the count beside it is distinct too.
    const seen = new Map<string, Row>()
    for (const r of [...scoped].sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0))) {
      const k = r.symbol.toUpperCase()
      if (!seen.has(k)) seen.set(k, r)
    }
    return [...seen.values()].slice(0, 3)
  }, [scoped])
  const networkIcons = useMemo(() => {
    const seen = new Map<string, Row>()
    for (const r of nonZero) if (!seen.has(r.networkKey)) seen.set(r.networkKey, r)
    return [...seen.values()]
      .sort(
        (a, b) =>
          (networkTotals.get(b.networkKey)?.usd ?? 0) - (networkTotals.get(a.networkKey)?.usd ?? 0),
      )
      .slice(0, 3)
  }, [nonZero, networkTotals])

  const selectedChain = useMemo(
    () => (network.startsWith('eip155:') ? getChain(Number(network.slice(7))) ?? null : null),
    [network],
  )
  const selectedNonEvm = useMemo(
    () => (!network.startsWith('eip155:') && network !== 'all' ? getNetwork(network) ?? null : null),
    [network],
  )

  const initialLoading =
    rows.length === 0 &&
    ((Boolean(address) && portfolio.isLoading) || (hasNonEvm && nonEvmQuery.isLoading))
  const isFetchingAny = portfolio.isFetching || nonEvmQuery.isFetching
  /** How many EVM chains have answered in the current scan, so the refresh can say so. */
  const scanned = streamed.size

  // one point per hour, written only when the value is actually known
  useEffect(() => {
    if (!anyConnected || initialLoading) return
    // Only a finished scan is a real balance: recording mid-stream partial totals is what
    // made the chart zig-zag against numbers the wallet never actually held.
    if (isFetchingAny) return
    if (totalUsd <= 0) return
    setHistory(recordSnapshot(totalUsd))
  }, [anyConnected, initialLoading, isFetchingAny, totalUsd])

  /**
   * Token bubbles. Same rule as the history line: only a settled scan counts, and a token
   * that we did not see before is not an inflow we can prove — so it produces no bubble.
   */
  useEffect(() => {
    if (!anyConnected || initialLoading || isFetchingAny) return
    const flat: FlatHolding[] = rows.map((r) => ({
      networkKey: r.networkKey,
      address: r.address,
      symbol: r.symbol,
      amount: r.amount,
      decimals: r.decimals,
      chainId: r.chainId,
    }))
    const events = diffInflows(prevRowsRef.current, flat, Date.now(), totalUsd)
    // A balance that rose is an observed receive — record it in the local ledger once.
    for (const e of events) {
      addActivity({
        id: `recv-${e.networkKey}-${e.t}`,
        kind: 'receive',
        provider: 'wallet',
        fromChainId: e.chainId ?? 0,
        toChainId: e.chainId ?? 0,
        owner: address ?? '',
        tokenIn: { symbol: e.symbol, address: e.address ?? undefined, decimals: e.decimals },
        amountIn: formatUnits(BigInt(e.delta), e.decimals),
        status: 'complete',
        steps: [
          {
            key: 'transfer',
            label: `Received ${e.symbol}`,
            status: 'done',
            chainId: e.chainId ?? undefined,
            updatedAt: e.t,
          },
        ],
        meta: { observed: true },
      })
    }
    if (events.length > 0) {
      setInflows((prev) => {
        const next = mergeInflows(prev, events)
        saveInflows(next)
        return next
      })
    }
    prevRowsRef.current = flat
  }, [anyConnected, initialLoading, isFetchingAny, rows, totalUsd])

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
          g.rows.some((r) => r.chainName.toLowerCase().includes(needle)),
      )
    }
    for (const g of list) g.rows.sort((a, b) => (b.usdValue ?? -1) - (a.usdValue ?? -1))
    return list.sort((a, b) => (b.usd ?? -1) - (a.usd ?? -1) || b.amount - a.amount)
  }, [scoped, q])

  /** Source rows for the Tokens tab — includes zero-balance rows when showEmpty is on. */
  const tokenRows = useMemo(
    () => (showEmpty ? (network === 'all' ? rows : rows.filter((r) => r.networkKey === network)) : scoped),
    [showEmpty, network, rows, scoped],
  )

  /** Groups for the Tokens tab (respects showEmpty; Overview always uses `groups`). */
  const tokenGroups: Group[] = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const bySymbol = new Map<string, Group>()
    for (const r of tokenRows) {
      const key = r.symbol.toUpperCase()
      const g: Group =
        bySymbol.get(key) ??
        ({ symbol: r.symbol, name: r.name.replace(' (native)', ''), usd: null, amount: 0, rows: [] } as Group)
      g.rows.push(r)
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
          g.rows.some((r) => r.chainName.toLowerCase().includes(needle)),
      )
    }
    for (const g of list) g.rows.sort((a, b) => (b.usdValue ?? -1) - (a.usdValue ?? -1))
    return list.sort((a, b) => (b.usd ?? -1) - (a.usd ?? -1) || b.amount - a.amount)
  }, [tokenRows, q])

  const chartPoints = useMemo(() => sliceRange(history, range), [history, range])
  const top = groups.slice(0, 12)
  const displayAddr = address ?? (nonEvmFamilies[0] ? nonEvmAccounts[nonEvmFamilies[0]]?.address : '') ?? ''

  if (!anyConnected) {
    return (
      <div className="flex flex-1 flex-col justify-center">
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
    <div className="dash-2 flex-1 lg:h-[calc(100dvh-7rem)] lg:flex-none">
      {/* ── left: value + chart ───────────────────────────── */}
      <div className="card flex h-full min-h-0 flex-col overflow-hidden p-6">
        <div className="relative flex items-center justify-center">
          <div className="flex items-center gap-1.5">
            <span className="head-num text-[17px] leading-6 text-t1" style={{ fontWeight: 750 }}>
              Portfolio
            </span>
            <ScopeTip />
          </div>
          <button
            onClick={() => {
              if (address) portfolio.refetch()
              if (hasNonEvm) nonEvmQuery.refetch()
            }}
            title="Refresh balances"
            className="absolute right-0 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-ink-850 text-t2 transition-colors hover:border-[#3f4a66] hover:text-t1"
          >
            <RefreshCw size={15} strokeWidth={2.4} className={isFetchingAny ? 'spin' : undefined} />
          </button>
        </div>

        {portfolio.isFetching && scanned > 0 && (
          <div className="mt-3 text-center text-[11px] text-t3">
            Scanning chains… {scanned}/{CHAINS.length} answered
          </div>
        )}

        <div className="figure-num mt-4 text-center text-[52px] leading-[58px] font-extrabold text-t1">
          {initialLoading ? (
            <span className="skeleton inline-block h-12 w-52 align-middle" />
          ) : (
            usd(network !== 'all' ? scopedUsd : totalUsd)
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-center gap-7">
          <div
            className="flex items-center gap-2"
            title={`${assetCount} ${assetCount === 1 ? 'asset' : 'assets'} with a balance`}
          >
            <span className="head-num text-[15px] leading-5 text-t1">{assetCount}</span>
            <span className="flex -space-x-1.5">
              {assetIcons.map((r) => (
                <span key={`${r.networkKey}:${r.symbol}:${r.address ?? 'native'}`} className="ring-2 ring-ink-800 rounded-full">
                  <TokenIcon
                    symbol={r.symbol}
                    chainId={r.chainId ?? undefined}
                    address={r.address}
                    verified={r.verified}
                    size={18}
                  />
                </span>
              ))}
            </span>
          </div>
          <span className="h-4 w-px bg-line-strong" aria-hidden />
          <div
            className="flex items-center gap-2"
            title={`${fundedNetworks} ${fundedNetworks === 1 ? 'network' : 'networks'} with a balance`}
          >
            <span className="head-num text-[15px] leading-5 text-t1">{fundedNetworks}</span>
            <span className="flex -space-x-1.5">
              {networkIcons.map((r) =>
                r.network ? (
                  <span key={r.networkKey} className="ring-2 ring-ink-800 rounded-full">
                    <NetworkLogo network={r.network} size={18} />
                  </span>
                ) : r.chainId != null && getChain(r.chainId) ? (
                  <span key={r.networkKey} className="ring-2 ring-ink-800 rounded-full">
                    <ChainLogo chain={getChain(r.chainId)!} size={18} />
                  </span>
                ) : null,
              )}
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-1">
          {(['1D', '1W', '1M'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`head-num rounded-md px-2.5 py-1 text-[12.5px] transition-colors ${
                range === r ? 'bg-ink-600 text-t1' : 'text-t2 hover:text-t1'
              }`}
            >
              {r}
            </button>
          ))}
          <button
            onClick={() => {
              setShowBubbles((v) => {
                const next = !v
                try {
                  localStorage.setItem('ebt.chartBubbles', next ? 'on' : 'off')
                } catch {
                  /* storage is optional */
                }
                return next
              })
            }}
            title={showBubbles ? 'Hide token bubbles' : 'Show token bubbles'}
            aria-pressed={showBubbles}
            className={`head-num ml-1 flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11.5px] transition-colors ${
              showBubbles
                ? 'border-accent/45 bg-accent/10 text-accent'
                : 'border-line bg-ink-850 text-t3 hover:text-t2'
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${showBubbles ? 'bg-accent' : 'bg-t3'}`}
              aria-hidden
            />
            Bubble
          </button>
          <button
            onClick={() => setPickNetwork(true)}
            className="head-num ml-auto flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-ink-850 px-2.5 text-[12.5px] text-t1 transition-colors hover:border-[#3f4a66]"
          >
            {selectedChain ? (
              <ChainLogo chain={selectedChain} size={14} />
            ) : selectedNonEvm ? (
              <NetworkLogo network={selectedNonEvm} size={14} />
            ) : (
              <AllChainsMark size={14} />
            )}
            {selectedChain ? selectedChain.short : selectedNonEvm ? selectedNonEvm.short : 'All networks'}
            <ChevronDown size={12} className="text-t2" />
          </button>
        </div>

        <div className="mt-4 flex min-h-[180px] flex-1 flex-col">
          <ValueChart points={chartPoints} range={range} current={totalUsd} events={inflows} showBubbles={showBubbles} />
        </div>
      </div>

      {/* ── right: Overview | Tokens | Recovery ───────────────── */}
      <div className="card flex h-full min-h-0 flex-col overflow-hidden">
        {/* Full-width tab bar */}
        <div className="grid grid-cols-3 border-b border-line-strong">
          {(['overview', 'tokens', 'recovery'] as View[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative flex items-center justify-center gap-2 px-3 py-3.5 text-[15px] font-semibold capitalize tracking-wide transition-all ${
                tab === t
                  ? 'bg-ink-700/40 text-t1'
                  : 'text-t2 hover:bg-ink-700/20 hover:text-t1'
              }`}
            >
              {t}
              {tab === t && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" />}
            </button>
          ))}
        </div>

        {initialLoading && (
          <div className="flex items-center gap-2 px-5 py-8 text-[13px] text-t2">
            <Spinner /> Reading {CHAINS.length + nonEvmFamilies.length} chains
          </div>
        )}
        {portfolio.isError && !hasNonEvm && (
          <div className="px-5 py-6 text-[13px] text-neg">Portfolio failed: {(portfolio.error as Error).message}</div>
        )}

        {tab === 'recovery' ? (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            <ClaimableWithdrawals />
            <RecoveryPanel compact />
          </div>
        ) : tab === 'overview' ? (
          /* the ring strip: icon wrapped in its share of the portfolio */
          <div className="grid flex-1 grid-cols-3 grid-rows-4 place-items-center px-4 py-3">
            {top.length === 0 && !initialLoading && (
              <div className="col-span-full py-6 text-[13px] text-t2">No funded asset yet.</div>
            )}
            {Array.from({ length: 12 }).map((_, i) => {
              const g = top[i]
              if (!g) {
                return (
                  <div
                    key={`empty-${i}`}
                    aria-hidden="true"
                    className="flex flex-col items-center gap-1.5 px-2 py-2 opacity-20"
                  >
                    <span className="grid size-[88px] place-items-center">
                      <svg width="88" height="88" viewBox="0 0 88 88">
                        <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(171,184,255,0.22)" strokeWidth="2.5" strokeDasharray="4 6" />
                      </svg>
                    </span>
                    <span className="display text-[13px] leading-5 text-t3">—</span>
                  </div>
                )
              }
              const basis = selectedChain || selectedNonEvm ? scopedUsd : totalUsd
              const share = basis > 0 && g.usd != null ? (g.usd / basis) * 100 : 0
              const first = g.rows[0]
              return (
                <button
                  key={g.symbol}
                  type="button"
                  onClick={() => {
                    // one token spread over several chains: show the chain summary first
                    if (g.rows.length > 1) {
                      setSheetGroup(g)
                      return
                    }
                    setPopupRowKey(null)
                    setPopupLock(null)
                    setPopupMode('send')
                    setPopupGroup(g)
                  }}
                  className="group relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-2 py-2 transition-colors duration-200 hover:bg-ink-700/40 focus:outline-none"
                  title={`${g.symbol} across ${g.rows.length} chain${g.rows.length > 1 ? 's' : ''}`}
                  style={{
                    animationDelay: `${i * 55}ms`,
                  }}
                >
                  {/* Token ring icon: float + gentle spin on hover via CSS animation */}
                  <span className="relative block">
                    <span
                      className="block"
                      style={{
                        transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                      }}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLElement).style.transform =
                          'scale(1.13) translateY(-3px) rotate(-3deg)'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLElement).style.transform =
                          'scale(1) translateY(0) rotate(0deg)'
                      }}
                    >
                      <RingIcon
                        pct={share}
                        symbol={g.symbol}
                        chainId={first.chainId ?? undefined}
                        address={first.chainId != null ? first.address : null}
                        verified={first.verified}
                      />
                    </span>
                  </span>
                  <span className="display text-[15px] leading-5 text-t1 transition-colors duration-200 group-hover:text-accent">
                    {g.usd == null ? `${fmtAmount(g.amount)} ${g.symbol}` : usd(g.usd)}
                  </span>
                  {g.rows.length > 1 ? (
                    <span className="flex items-center gap-0.5">
                      {g.rows.slice(0, 3).map((r, ri) => (
                        <span
                          key={r.networkKey}
                          style={{
                            transition: `transform 0.3s cubic-bezier(0.34,1.56,0.64,1) ${ri * 55}ms`,
                          }}
                          onMouseEnter={(e) => {
                            ;(e.currentTarget as HTMLElement).style.transform = 'scale(1.25) translateY(-2px)'
                          }}
                          onMouseLeave={(e) => {
                            ;(e.currentTarget as HTMLElement).style.transform = 'scale(1) translateY(0)'
                          }}
                        >
                          <RowChainLogo row={r} size={13} />
                        </span>
                      ))}
                      {g.rows.length > 3 && <span className="mono text-[9px] text-t3">+{g.rows.length - 3}</span>}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <span
                        style={{ transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
                        onMouseEnter={(e) => {
                          ;(e.currentTarget as HTMLElement).style.transform = 'scale(1.25) translateY(-2px)'
                        }}
                        onMouseLeave={(e) => {
                          ;(e.currentTarget as HTMLElement).style.transform = 'scale(1) translateY(0)'
                        }}
                      >
                        <RowChainLogo row={first} size={13} />
                      </span>
                      <span className="mono text-[11px] text-t3">{g.symbol}</span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
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
                <button
                  type="button"
                  role="switch"
                  aria-checked={showEmpty}
                  onClick={() => setShowEmpty(!showEmpty)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${showEmpty ? 'bg-accent' : 'bg-ink-600'}`}
                >
                  <span className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform duration-200 ${showEmpty ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                </button>
                Empty
              </label>
              {displayAddr && (
                <span className="mono ml-auto flex items-center gap-1 text-[11px] text-t3">
                  {shortAddr(displayAddr, 4)}
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(displayAddr)
                      notify('Address copied', 'success')
                    }}
                    className="hover:text-t1"
                  >
                    <Copy size={11} />
                  </button>
                </span>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="min-w-0 flex-1">
                {tokenGroups.length === 0 && (
                  <div className="px-5 py-8 text-[13px] text-t2">
                    {showEmpty ? 'Nothing matches this filter.' : 'No funded asset. Turn on empty to see every chain.'}
                  </div>
                )}
                {tokenGroups.map((g) => {
                  const open = openGroups.has(g.symbol.toUpperCase())
                  const multi = g.rows.length > 1
                  const first = g.rows[0]
                  return (
                    <div key={g.symbol} className="border-b border-line last:border-0">
                      <button
                        type="button"
                        aria-expanded={multi ? open : undefined}
                        onClick={() => {
                          if (multi) {
                            setOpenGroups((prev) => {
                              const next = new Set(prev)
                              const k = g.symbol.toUpperCase()
                              if (next.has(k)) next.delete(k)
                              else next.add(k)
                              return next
                            })
                            return
                          }
                          setPopupMode('send')
                          setPopupLock(null)
                          setPopupGroup(g)
                          setPopupRowKey(null)
                        }}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-ink-700/60"
                      >
                        <span className="relative shrink-0">
                          <TokenIcon
                            symbol={g.symbol}
                            size={42}
                            chainId={first.chainId ?? undefined}
                            address={first.chainId != null ? (first.address ?? undefined) : undefined}
                            verified={first.verified}
                          />
                          {!multi && (
                            <span className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-ink-800">
                              <RowChainLogo row={first} size={16} />
                            </span>
                          )}
                        </span>
                        {multi && (
                          <span className="flex shrink-0 items-center gap-0.5">
                            {g.rows.slice(0, 3).map((r) => (
                              <RowChainLogo key={r.networkKey} row={r} size={14} />
                            ))}
                            {g.rows.length > 3 && <span className="mono text-[11px] text-t3">+{g.rows.length - 3}</span>}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold text-t1">{g.symbol}</span>
                          {!multi && (
                            <span className="block truncate text-[13px] leading-5 text-t2">
                              {first.chainName}
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-2.5">
                          <span className="text-right">
                            <span className="figure-num block text-[16px] leading-5 text-t1">
                              {g.usd == null ? '—' : usd(g.usd)}
                            </span>
                            <span className="mono block text-[13px] leading-5 text-t2">
                              {g.amount > 0 ? `${fmtAmount(g.amount)} ${g.symbol}` : '—'}
                            </span>
                          </span>
                          {multi ? (
                            <ChevronDown
                              size={15}
                              className="accordion-chevron shrink-0 text-t3"
                              data-open={open ? 'true' : 'false'}
                              aria-hidden="true"
                            />
                          ) : (
                            <span className="w-[15px] shrink-0" aria-hidden="true" />
                          )}
                        </span>
                      </button>

                      {multi && (
                        <div
                          className="accordion-grid"
                          data-open={open ? 'true' : 'false'}
                          aria-hidden={!open}
                          ref={(el) => {
                            if (el) el.inert = !open
                          }}
                        >
                          <div className="accordion-track">
                            <div className="accordion-content pb-2 pl-[4.5rem] pr-4">
                              {g.rows.map((r) => {
                                const amt = r.amount == null ? null : Number(formatUnits(r.amount, r.decimals))
                                return (
                                  <button
                                    key={`${r.networkKey}-${r.address ?? 'native'}`}
                                    type="button"
                                    onClick={() => {
                                      setPopupMode('send')
                                      setPopupLock(tokenRowKey(r))
                                      setPopupGroup(g)
                                      setPopupRowKey(tokenRowKey(r))
                                    }}
                                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-ink-700/60"
                                  >
                                    <span className="relative shrink-0">
                                      <TokenIcon
                                        symbol={r.symbol}
                                        size={28}
                                        chainId={r.chainId ?? undefined}
                                        address={r.chainId != null ? (r.address ?? undefined) : undefined}
                                        verified={r.verified}
                                      />
                                      <span className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-ink-800">
                                        <RowChainLogo row={r} size={12} />
                                      </span>
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-[13px] text-t1">{r.symbol}</span>
                                      <span className="block truncate text-[12px] leading-4 text-t3">{r.chainName}</span>
                                    </span>
                                    <span className="figure-num shrink-0 text-right text-[13px] text-t1">
                                      {r.usdValue == null ? '—' : usd(r.usdValue)}
                                    </span>
                                    <span className="figure-num w-28 shrink-0 text-right text-[12px] text-t2">
                                      {amt == null ? '—' : fmtAmount(amt)}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

            </div>

            {isConnected && (
              <div className="mt-auto flex items-center border-t border-line px-4 py-2.5">
                <button
                  onClick={() => setImportFor(selectedChain ? selectedChain.id : 11155111)}
                  className="inline-flex items-center gap-2 rounded-lg border border-line-strong bg-ink-850 px-3 py-1.5 text-[12px] text-t2 transition-colors hover:border-[#3f4a66] hover:text-t1"
                >
                  <Plus size={14} /> Import ERC-20
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <NetworkPicker
        open={pickNetwork}
        onClose={() => setPickNetwork(false)}
        value={network}
        onSelect={setNetwork}
        totals={networkTotals}
        connectedFamilies={new Set(nonEvmFamilies)}
        onRequireWallet={(net) => {
          setPickNetwork(false)
          if (net.walletFamily === 'evm') return
          const fam = net.walletFamily
          openWalletModal({
            focusFamily: fam,
            networkName: net.name,
            reason: `Connect a ${WALLET_FAMILIES[fam].label} wallet to view your ${net.name} assets.`,
            onConnected: () => setNetwork(net.id),
          })
        }}
      />

      {importFor != null && (
        <ImportToken chainId={importFor} onClose={() => setImportFor(null)} onDone={() => portfolio.refetch()} />
      )}

      {sheetGroup != null && (
        <TokenSheet
          group={sheetGroup}
          onClose={() => setSheetGroup(null)}
          formatUsd={usd}
          onSend={(rk) => {
            setPopupMode('send')
            setPopupLock(null)
            setPopupRowKey(rk ?? null)
            setSheetReturn(sheetGroup)
            setPopupGroup(sheetGroup)
            setSheetGroup(null)
          }}
          onReceive={(rk) => {
            setPopupMode('receive')
            setPopupLock(null)
            setPopupRowKey(rk ?? null)
            setSheetReturn(sheetGroup)
            setPopupGroup(sheetGroup)
            setSheetGroup(null)
          }}
          onPickChain={(rk) => {
            setPopupMode('send')
            setPopupLock(rk)
            setPopupRowKey(rk)
            setSheetReturn(sheetGroup)
            setPopupGroup(sheetGroup)
            setSheetGroup(null)
          }}
        />
      )}

      {popupGroup != null && (
        <TokenActions
          key={`${popupGroup.symbol}-${popupMode}-${popupLock ?? 'any'}`}
          group={popupGroup}
          initialRowKey={popupRowKey}
          initialMode={popupMode}
          lockedRowKey={popupLock}
          onBack={
            sheetReturn
              ? () => {
                  setPopupGroup(null)
                  setPopupRowKey(null)
                  setPopupLock(null)
                  setSheetGroup(sheetReturn)
                  setSheetReturn(null)
                }
              : undefined
          }
          onClose={() => {
            setPopupGroup(null)
            setPopupRowKey(null)
            setPopupLock(null)
            setSheetReturn(null)
          }}
          onSent={() => portfolio.refetch()}
          receiveAddressFor={(r) =>
            r.chainId != null
              ? address ?? ''
              : (r.network?.walletFamily
                  ? nonEvmAccounts[r.network.walletFamily as NonEvmFamily]?.address ?? ''
                  : '')
          }
        />
      )}

    </div>
  )
}


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
  chainId?: number
  address: string | null
  verified: boolean
  parentHovered?: boolean
}) {
  const r = 36
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  const [animKey, setAnimKey] = useState(0)
  const [displayPct, setDisplayPct] = useState(0)

  useEffect(() => {
    const t = requestAnimationFrame(() => setDisplayPct(clamped))
    return () => cancelAnimationFrame(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleMouseEnter() {
    setAnimKey((k) => k + 1)
    setDisplayPct(0)
    requestAnimationFrame(() => requestAnimationFrame(() => setDisplayPct(clamped)))
  }

  const offset = circumference - (circumference * displayPct) / 100

  return (
    <span
      className="relative grid size-[88px] place-items-center"
      onMouseEnter={handleMouseEnter}
    >
      <svg width="88" height="88" viewBox="0 0 88 88" className="absolute -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(171,184,255,0.13)" strokeWidth="3" />
        <circle
          key={animKey}
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: animKey === 0 ? 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)' : 'stroke-dashoffset 800ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full"
        style={{
          transition: 'box-shadow 300ms ease-out',
        }}
      >
        <TokenIcon symbol={symbol} size={52} chainId={chainId} address={address ?? undefined} verified={verified} />
      </span>
    </span>
  )
}

/** Value over time. Every point is a real snapshot this browser recorded — nothing is invented. */
function ValueChart({
  points,
  range,
  current,
  events,
  showBubbles,
}: {
  points: { t: number; v: number }[]
  range: Range
  current: number
  events: InflowEvent[]
  showBubbles: boolean
}) {
  const W = 900
  const H = 220
  // Breathing room on all four sides: a spike must never touch the frame, and the newest
  // point keeps a clear gap from the right border instead of sitting in the corner.
  const padX = 24
  const padY = 32

  const span = range === '1D' ? 24 * 3600_000 : range === '1W' ? 7 * 24 * 3600_000 : 30 * 24 * 3600_000
  const now = Date.now()
  const from = now - span

  // The x axis is the selected window, not the span of whatever was recorded: a single
  // reading therefore sits at its real timestamp instead of stretching across the box.
  const inWindow = points.filter((p) => p.t >= from && p.t <= now)
  const beforeWindow = points.filter((p) => p.t < from).slice(-1)
  let series = [...beforeWindow, ...inWindow].sort((a, b) => a.t - b.t)

  // No reading yet, but we do know the balance right now: show it as the current point
  // instead of an empty box that looks broken.
  if (series.length === 0 && current > 0) series = [{ t: now, v: current }]
  if (series.length === 1) series = [{ t: Math.max(from, series[0].t - 1), v: series[0].v }, series[0]]

  if (series.length === 0) {
    return (
      <div className="grid h-full w-full min-h-[180px] place-items-center rounded-[12px] border border-dashed border-line">
        <p className="max-w-[46ch] px-6 text-center text-[12px] leading-5 text-t2">
          No balance to plot yet. The line follows this wallet&apos;s total on every refresh.
        </p>
      </div>
    )
  }

  const vs = series.map((p) => p.v)
  const rawMin = Math.min(...vs)
  const rawMax = Math.max(...vs)
  const flat = rawMax - rawMin < Math.max(rawMax * 0.0005, 0.01)

  /**
   * A generous, rounded domain. Exact min/max makes a single spike glue the line to the
   * frame, so the window is widened by ~25% and snapped to a 1/2/2.5/5 step: the spike
   * keeps its true height, but sits comfortably inside the plot instead of in the corner.
   */
  const niceStep = (raw: number) => {
    if (!Number.isFinite(raw) || raw <= 0) return 1
    const mag = Math.pow(10, Math.floor(Math.log10(raw)))
    const n = raw / mag
    const mult = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
    return mult * mag
  }

  const span0 = rawMax - rawMin
  const margin = flat
    ? Math.max(rawMax * 0.04, 0.5)
    : Math.max(span0 * 0.28, rawMax * 0.05, 0.5)
  let lo = rawMin - margin
  let hi = rawMax + margin
  const step = niceStep((hi - lo) / 4)
  lo = Math.floor(lo / step) * step
  hi = Math.ceil(hi / step) * step
  if (lo < 0 && rawMin >= 0) lo = 0
  const min = lo
  const max = hi
  const ySpan = max - min || 1

  const xy = series.map((p) => ({
    x: padX + (Math.min(Math.max((p.t - from) / span, 0), 1)) * (W - padX * 2),
    y: H - padY - ((p.v - min) / ySpan) * (H - padY * 2),
  }))

  let line: string
  if (xy.length <= 2) {
    line = `M${xy[0].x.toFixed(1)},${xy[0].y.toFixed(1)} L${xy[xy.length - 1].x.toFixed(1)},${xy[xy.length - 1].y.toFixed(1)}`
  } else {
    const n = xy.length
    const dx: number[] = []
    const dy: number[] = []
    const m: number[] = []
    for (let i = 0; i < n - 1; i++) {
      dx.push(xy[i + 1].x - xy[i].x)
      dy.push(xy[i + 1].y - xy[i].y)
      m.push(dy[i] / (dx[i] || 1))
    }
    const tans = new Array(n).fill(0)
    tans[0] = m[0]
    tans[n - 1] = m[n - 2]
    for (let i = 1; i < n - 1; i++) {
      if (m[i - 1] * m[i] <= 0) tans[i] = 0
      else tans[i] = (m[i - 1] + m[i]) / 2
    }
    for (let i = 0; i < n - 1; i++) {
      if (Math.abs(m[i]) < 1e-10) {
        tans[i] = 0
        tans[i + 1] = 0
      } else {
        const a = tans[i] / m[i]
        const b = tans[i + 1] / m[i]
        const s = a * a + b * b
        if (s > 9) {
          const t = 3 / Math.sqrt(s)
          tans[i] = t * a * m[i]
          tans[i + 1] = t * b * m[i]
        }
      }
    }
    line = `M${xy[0].x.toFixed(1)},${xy[0].y.toFixed(1)}`
    for (let i = 0; i < n - 1; i++) {
      const d = dx[i] / 3
      const cp1x = xy[i].x + d
      const cp1y = xy[i].y + tans[i] * d
      const cp2x = xy[i + 1].x - d
      const cp2y = xy[i + 1].y - tans[i + 1] * d
      line += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${xy[i + 1].x.toFixed(1)},${xy[i + 1].y.toFixed(1)}`
    }
  }

  const last = xy[xy.length - 1]
  const area = `${line} L${last.x.toFixed(1)},${H} L${xy[0].x.toFixed(1)},${H} Z`

  // Change across the window, so the number under the header agrees with the line.
  const windowPoints = series.filter((p) => p.t >= from)
  const firstVal = (windowPoints[0] ?? series[0]).v
  const lastVal = series[series.length - 1].v
  const delta = lastVal - firstVal
  const deltaPct = firstVal > 0 ? (delta / firstVal) * 100 : 0
  const up = delta >= 0

  /**
   * Token bubbles: one per observed inflow, pinned to the time it was seen and the
   * portfolio value at that moment, so each one sits exactly on the line.
   */
  const bubblePoints = showBubbles
    ? events
        .filter((e) => e.t >= from && e.t <= now)
        .map((e) => ({
          ...e,
          x: padX + Math.min(Math.max((e.t - from) / span, 0), 1) * (W - padX * 2),
          y: Math.min(Math.max(H - padY - ((e.v - min) / ySpan) * (H - padY * 2), padY), H - padY),
        }))
        .sort((a, b) => a.x - b.x)
        .map((b, i, arr) => {
          // nudge stacked bubbles so two tokens arriving at once stay readable
          const prev = arr[i - 1]
          if (prev && Math.abs(b.x - prev.x) < 26 && Math.abs(b.y - prev.y) < 24) {
            b.y = Math.min(Math.max(b.y + 26, padY), H - padY)
          }
          return b
        })
    : []

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[12px] border border-line bg-ink-850/40">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="ebt-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.26" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            y1={H * f}
            x2={W}
            y2={H * f}
            stroke="var(--color-line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={area} fill="url(#ebt-area)" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.16"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={line}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={last.x} cy={last.y} r="7" fill="var(--color-accent)" opacity="0.18" />
        <circle cx={last.x} cy={last.y} r="3.4" fill="var(--color-accent)" vectorEffect="non-scaling-stroke" />
      </svg>

      {bubblePoints.length > 0 && (
        <div className="pointer-events-none absolute inset-0">
          {bubblePoints.map((b, i) => (
            <div
              key={`${b.t}-${b.symbol}-${i}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(b.x / W) * 100}%`, top: `${(b.y / H) * 100}%` }}
              title={`${b.symbol} balance rose · ${new Date(b.t).toLocaleString()}`}
            >
              <span className="grid size-[22px] place-items-center rounded-full bg-ink-700 shadow-[0_2px_10px_rgba(0,0,0,0.55)] ring-2 ring-white/25">
                <TokenIcon symbol={b.symbol} size={15} chainId={b.chainId ?? undefined} address={b.address} />
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
        <span
          className="mono rounded-md px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            color: up ? '#6adbb6' : '#ff8f8f',
            background: up ? 'rgba(106,219,182,0.10)' : 'rgba(255,143,143,0.10)',
          }}
        >
          {up ? '+' : ''}
          {deltaPct.toFixed(2)}%
        </span>
        <span className="text-[10px] uppercase tracking-[0.6px] text-t3">{range}</span>
      </div>

      <span className="mono pointer-events-none absolute right-3 top-3 text-[10px] text-t3">
        {series.length > 2 ? `${series.length} readings` : 'live'}
      </span>
    </div>
  )
}

const PORTFOLIO_CORE_EVM_IDS = new Set([11155111, 84532, 421614, 11155420, 1301, 43113, 80002])

function NetworkPicker({
  open,
  onClose,
  value,
  onSelect,
  totals,
  connectedFamilies,
  onRequireWallet,
}: {
  open: boolean
  onClose: () => void
  value: string
  onSelect: (v: string) => void
  totals: Map<string, { usd: number; count: number }>
  connectedFamilies: Set<NonEvmFamily>
  onRequireWallet: (net: NetworkEntry) => void
}) {
  const [q, setQ] = useState('')
  useEffect(() => {
    if (open) setQ('')
  }, [open])
  if (!open) return null
  const needle = q.trim().toLowerCase()
  const evmMatch = (c: (typeof CHAINS)[number]) =>
    !needle || `${c.name} ${c.short} ${c.id}`.toLowerCase().includes(needle)
  const extraMatch = (n: NetworkEntry) =>
    !needle || `${n.name} ${n.short} ${n.family} ${n.nativeCurrency.symbol}`.toLowerCase().includes(needle)

  const coreEvm = CHAINS.filter((c) => PORTFOLIO_CORE_EVM_IDS.has(c.id) && evmMatch(c))
  const restEvm = CHAINS.filter((c) => !PORTFOLIO_CORE_EVM_IDS.has(c.id) && evmMatch(c))
  const matchingNonEvm = NON_EVM_NETWORKS.filter(extraMatch)
  const connectedExtras = matchingNonEvm.filter(
    (n) => n.walletFamily !== 'evm' && connectedFamilies.has(n.walletFamily),
  )
  const unconnectedExtras = matchingNonEvm.filter(
    (n) => n.walletFamily !== 'evm' && !connectedFamilies.has(n.walletFamily),
  )

  const pick = (v: string) => {
    onSelect(v)
    onClose()
  }

  const renderNonEvmRow = (n: NetworkEntry) => {
    const connected = n.walletFamily === 'evm' || connectedFamilies.has(n.walletFamily)
    const t = totals.get(n.id)
    return (
      <button
        key={n.id}
        onClick={() => {
          if (!connected) {
            onRequireWallet(n)
            return
          }
          pick(n.id)
        }}
        className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors ${
          value === n.id ? 'bg-ink-600' : 'hover:bg-ink-700'
        }`}
      >
        <NetworkLogo network={n} size={30} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-t1">{n.name}</span>
          <span className="mono block text-[11px] text-t3">{n.nativeCurrency.symbol}</span>
        </span>
        {connected ? (
          <span className="figure-num shrink-0 text-[12px] text-t2">{t ? usd(t.usd) : '—'}</span>
        ) : (
          <span className="rounded border border-warn/40 bg-warn/10 px-1.5 py-0.5 text-[10px] font-medium text-warn">
            Connect
          </span>
        )}
      </button>
    )
  }

  const renderEvmRow = (c: (typeof CHAINS)[number]) => {
    const k = `eip155:${c.id}`
    const t = totals.get(k)
    return (
      <button
        key={c.id}
        onClick={() => pick(k)}
        className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors ${
          value === k ? 'bg-ink-600' : 'hover:bg-ink-700'
        }`}
      >
        <ChainLogo chain={c} size={30} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-t1">{c.name}</span>
          <span className="mono block text-[11px] text-t3">{c.id}</span>
        </span>
        <span className="figure-num shrink-0 text-[12px] text-t2">{t ? usd(t.usd) : '—'}</span>
      </button>
    )
  }

  const hasAny =
    coreEvm.length > 0 || connectedExtras.length > 0 || unconnectedExtras.length > 0 || restEvm.length > 0

  // Same ordering rule as every other selector: funded networks first, by the value held there.
  const orderedRows = (() => {
    type Row = { kind: 'evm'; chain: (typeof CHAINS)[number] } | { kind: 'extra'; net: NetworkEntry }
    const base: Row[] = [
      ...coreEvm.map((chain) => ({ kind: 'evm' as const, chain })),
      ...connectedExtras.map((net) => ({ kind: 'extra' as const, net })),
      ...unconnectedExtras.map((net) => ({ kind: 'extra' as const, net })),
      ...restEvm.map((chain) => ({ kind: 'evm' as const, chain })),
    ]
    const usdOf = (row: Row) =>
      totals.get(row.kind === 'evm' ? `eip155:${row.chain.id}` : row.net.id)?.usd ?? 0
    if (!base.some((row) => usdOf(row) > 0)) return base
    return base
      .map((row, i) => ({ row, i, usd: usdOf(row) }))
      .sort((a, b) => {
        if ((a.usd > 0) !== (b.usd > 0)) return a.usd > 0 ? -1 : 1
        if (a.usd !== b.usd) return b.usd - a.usd
        return a.i - b.i
      })
      .map((x) => x.row)
  })()

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
              placeholder="Search chains (Sepolia, Solana, Sui, Aptos…)"
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
            <AllChainsMark size={30} />
            <span className="flex-1 text-[14px] text-t1">All chains</span>
            <span className="mono text-[12px] text-t2">{totals.size}</span>
          </button>
          {orderedRows.map((row) =>
            row.kind === 'evm' ? renderEvmRow(row.chain) : renderNonEvmRow(row.net),
          )}
          {!hasAny && (
            <div className="px-4 py-10 text-center text-[13px] text-t2">No chain matches “{q}”.</div>
          )}
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

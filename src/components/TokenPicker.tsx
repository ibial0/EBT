import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, ChevronDown, Search, X } from 'lucide-react'
import clsx from 'clsx'
import { erc20Balance } from '../lib/uniswap'
import { loadPrices, priceOf } from '../lib/prices'
import { formatUnits } from 'viem'
import type { Address } from 'viem'
import type { ChainCfg } from '../config/chains'
import type { NetworkEntry } from '../config/networks'
import { isNativeToken, type TokenCfg } from '../config/tokens'
import { getPublicClient } from 'wagmi/actions'
import { useAccount } from 'wagmi'
import { wagmiConfig } from '../lib/wallet'
import { ChainLogo, NetworkLogo, TokenIcon, AllChainsMark } from './ui'

export interface PickerGroup {
  chain: ChainCfg
  /** When set, this group represents a non-EVM network displayed seamlessly alongside EVM chains. */
  network?: NetworkEntry
  tokens: TokenCfg[]
  /** why a token cannot move, shown inline instead of hiding it */
  notes?: Record<string, string>
  /** optional preloaded non-EVM balances keyed by lowercase token address */
  nonEvmBalances?: Record<string, bigint | null>
  /** whether the wallet ecosystem required for this group is connected */
  walletConnected?: boolean
}

/** Deterministic synthetic negative chainId for non-EVM networks inside unified pickers. */
export function syntheticChainForNetwork(net: NetworkEntry, syntheticId: number): ChainCfg {
  return {
    id: syntheticId,
    key: net.key,
    name: net.name,
    short: net.short,
    viem: {
      id: syntheticId,
      name: net.name,
      nativeCurrency: net.nativeCurrency,
      rpcUrls: { default: { http: [net.rpcUrl] } },
      blockExplorers: net.explorerUrl ? { default: { name: net.name, url: net.explorerUrl } } : undefined,
      testnet: true,
    } as never,
    bridge: 'none',
    color: net.color,
    gradient: net.gradient,
    faucets: net.faucets,
    verifiedAt: net.verifiedAt,
  }
}

/** In-memory chain filter per picker scope: persists across open/close until full page reload. */
const rememberedChainFilters = new Map<string, number | 'all'>()

/**
 * The token chooser used by Swap and Bridge.
 *
 * A full-height dialog with a search field, a network filter in the corner, and one row per
 * asset carrying its real on-chain balance. Balances are read through react-query so reopening
 * the picker is free, and a token with no price simply shows no dollar figure rather than a
 * fabricated one.
 */
export function TokenPicker({
  open,
  onClose,
  title,
  groups,
  value,
  onSelect,
  onBeforeSelectChain,
  multiChain = true,
  chains,
  onChainChange,
  filterKey = 'default',
}: {
  open: boolean
  onClose: () => void
  title: string
  groups: PickerGroup[]
  value?: { chainId: number; address: string } | null
  onSelect: (chain: ChainCfg, token: TokenCfg) => void
  /** Return false to intercept selection (e.g. prompt wallet connection for unconnected non-EVM). */
  onBeforeSelectChain?: (chain: ChainCfg, network?: NetworkEntry, token?: TokenCfg) => boolean
  multiChain?: boolean
  /** every chain the dropdown may offer; defaults to the chains present in `groups` */
  chains?: ChainCfg[]
  /** when set, picking a chain in the dropdown changes the caller's chain instead of filtering */
  onChainChange?: (chainId: number) => void
  /** scope key for remembering the selected chain filter during this browser session */
  filterKey?: string
}) {
  const [q, setQ] = useState('')
  const [chainFilter, setChainFilter] = useState<number | 'all'>(() => rememberedChainFilters.get(filterKey) ?? 'all')
  const [chainQuery, setChainQuery] = useState('')
  const [showChains, setShowChains] = useState(false)
  const { address: account } = useAccount()
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const networkById = useMemo(() => {
    const m = new Map<number, NetworkEntry>()
    for (const g of groups) {
      if (g.network) m.set(g.chain.id, g.network)
    }
    return m
  }, [groups])

  const walletConnectedById = useMemo(() => {
    const m = new Map<number, boolean>()
    for (const g of groups) {
      if (g.walletConnected !== undefined) m.set(g.chain.id, g.walletConnected)
    }
    return m
  }, [groups])

  const selectChainFilter = (next: number | 'all') => {
    rememberedChainFilters.set(filterKey, next)
    setChainFilter(next)
  }

  useEffect(() => {
    if (!open) return
    setQ('')
    setShowChains(false)
    setChainQuery('')
    setChainFilter(rememberedChainFilters.get(filterKey) ?? 'all')
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, filterKey])

  const needle = q.trim().toLowerCase()
  const visible = useMemo(
    () =>
      groups
        .filter((g) => chainFilter === 'all' || g.chain.id === chainFilter)
        .map((g) => ({
          ...g,
          tokens: needle
            ? g.tokens.filter((t) =>
                `${t.symbol} ${t.name} ${t.address}`.toLowerCase().includes(needle),
              )
            : g.tokens,
        }))
        .filter((g) => g.tokens.length > 0),
    [groups, chainFilter, needle],
  )

  const prices = useQuery({ queryKey: ['prices'], queryFn: loadPrices, staleTime: 10 * 60_000, retry: 1 })

  // one balance read per EVM row, batched by react-query and cached between openings
  const rows = useMemo(
    () => visible.flatMap((g) => g.tokens.map((token) => ({ group: g, chain: g.chain, token }))),
    [visible],
  )
  const balances = useQueries({
    queries: rows.map(({ group, chain, token }) => ({
      queryKey: ['picker-balance', chain.id, token.address, account],
      enabled: open && !group.network && Boolean(account),
      staleTime: 30_000,
      retry: 0,
      queryFn: async () => {
        const client = getPublicClient(wagmiConfig, { chainId: chain.id as never })
        if (!client || !account) return null
        if (isNativeToken(token)) return await client.getBalance({ address: account as Address }).catch(() => null)
        return await erc20Balance(client as never, token.address as Address, account as Address).catch(() => null)
      },
    })),
  })

  if (!open) return null

  const chainOptions = chains ?? groups.map((g) => g.chain)
  const totalChains = chainOptions.length

  const renderChainLogo = (c: ChainCfg, size: number) => {
    const net = networkById.get(c.id)
    return net ? <NetworkLogo network={net} size={size} /> : <ChainLogo chain={c} size={size} />
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/60 px-3 py-6 backdrop-blur-[2px] sm:py-10">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        ref={panelRef}
        className="enter relative z-10 flex min-h-[min(84vh,640px)] max-h-[min(88vh,760px)] w-full max-w-[520px] flex-col overflow-hidden rounded-[16px] border border-line-strong bg-ink-800 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >

        {/* chain chooser: a full panel, not a dropdown that the card edge cuts off */}
        {showChains && (
          <div className="absolute inset-0 z-30 flex flex-col rounded-[16px] bg-ink-800">
            <div className="flex items-center justify-between px-4 pt-4">
              <button
                onClick={() => setShowChains(false)}
                aria-label="Back"
                className="grid size-9 place-items-center rounded-lg text-t2 transition-colors hover:bg-ink-700 hover:text-t1"
              >
                <ArrowLeft size={17} />
              </button>
              <h2 className="display text-[17px] leading-7 text-t1">Select chain</h2>
              <span className="size-9" />
            </div>

            <div className="px-4 pt-3">
              <div className="field flex h-11 items-center gap-2 rounded-xl px-3">
                <Search size={16} className="text-t2" />
                <input
                  value={chainQuery}
                  onChange={(e) => setChainQuery(e.target.value)}
                  placeholder="Search chains"
                  className="input text-[14px]"
                />
              </div>
            </div>

            <div className="mt-2 flex-1 overflow-y-auto px-2 pb-8">
              <button
                onClick={() => {
                  if (onChainChange) onChainChange(value?.chainId ?? chainOptions[0]?.id)
                  else selectChainFilter('all')
                  setShowChains(false)
                  setChainQuery('')
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-ink-700"
              >
                <AllChainsMark size={36} />
                <span className="flex-1 text-[14px] text-t1">All chains</span>
                {!onChainChange && chainFilter === 'all' && <Check size={16} className="text-accent" />}
              </button>

              {chainOptions
                .filter((c) =>
                  chainQuery.trim() ? `${c.name} ${c.short}`.toLowerCase().includes(chainQuery.trim().toLowerCase()) : true,
                )
                .map((c) => {
                  const selected = onChainChange ? value?.chainId === c.id : chainFilter === c.id
                  const net = networkById.get(c.id)
                  const needsWallet = net ? walletConnectedById.get(c.id) === false : false
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        if (onBeforeSelectChain && !onBeforeSelectChain(c, net)) {
                          setShowChains(false)
                          setChainQuery('')
                          onClose()
                          return
                        }
                        if (onChainChange) onChainChange(c.id)
                        else selectChainFilter(c.id)
                        setShowChains(false)
                        setChainQuery('')
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-ink-700"
                    >
                      {renderChainLogo(c, 36)}
                      <span className="flex-1 truncate text-[14px] text-t1">{c.name}</span>
                      {needsWallet && (
                        <span className="rounded border border-warn/40 bg-warn/10 px-1.5 py-0.5 text-[10px] font-medium text-warn">
                          Connect
                        </span>
                      )}
                      {selected && !needsWallet && <Check size={16} className="text-accent" />}
                    </button>
                  )
                })}
            </div>
          </div>
        )}

        {/* header */}
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <h2 className="display text-[18px] leading-7 text-t1">{title}</h2>
          <div className="flex items-center gap-1.5">
            {multiChain && totalChains > 1 && (
              <button
                onClick={() => setShowChains(true)}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-ink-850 px-2 text-[13px] text-t1 transition-colors hover:border-[#3f4a66] hover:bg-ink-700"
              >
                {onChainChange ? (
                  (() => {
                    const c = chainOptions.find((x) => x.id === value?.chainId)
                    return c ? renderChainLogo(c, 18) : <AllChainsMark size={18} />
                  })()
                ) : chainFilter === 'all' ? (
                  <AllChainsMark size={18} />
                ) : (
                  (() => {
                    const c = chainOptions.find((x) => x.id === chainFilter)
                    return c ? renderChainLogo(c, 18) : <AllChainsMark size={18} />
                  })()
                )}
                <span className="max-w-[110px] truncate">
                  {onChainChange
                    ? (chainOptions.find((x) => x.id === value?.chainId)?.short ?? 'Network')
                    : chainFilter === 'all'
                      ? 'All chains'
                      : (chainOptions.find((x) => x.id === chainFilter)?.short ?? 'Network')}
                </span>
                <ChevronDown size={13} className="text-t2" />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid size-9 place-items-center rounded-lg text-t2 transition-colors hover:bg-ink-700 hover:text-t1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* search */}
        <div className="px-5 pt-3">
          <div className="field flex h-10 items-center gap-2 px-3">
            <Search size={15} className="text-t2" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, symbol or address"
              className="input text-[14px]"
            />
          </div>
        </div>

        {/* list */}
        <div className="mt-2 flex-1 overflow-y-auto px-2 pb-3">
          {visible.length === 0 && (
            <div className="px-4 py-10 text-center text-[13px] text-t2">No asset matches “{q}”.</div>
          )}
          {visible.map((g) => (
            <div key={g.network ? g.network.id : g.chain.id} className="mb-1">
              <div className="sticky top-0 z-10 flex items-center gap-2 bg-ink-800/95 px-3 py-2 backdrop-blur">
                {g.network ? <NetworkLogo network={g.network} size={16} /> : <ChainLogo chain={g.chain} size={16} />}
                <span className="col-head">{g.chain.name}</span>
                <span className="mono text-[11px] text-t3">
                  {g.network ? g.network.nativeCurrency.symbol : g.chain.id}
                </span>
                {g.network && g.walletConnected === false && (
                  <span className="ml-auto rounded border border-warn/40 bg-warn/10 px-1.5 py-0.5 text-[10px] text-warn">
                    Connect wallet
                  </span>
                )}
              </div>
              {g.tokens.map((t) => {
                const note = g.notes?.[t.address.toLowerCase()]
                const idx = rows.findIndex((r) => r.chain.id === g.chain.id && r.token.address === t.address)
                const raw = g.network
                  ? (g.nonEvmBalances?.[t.address.toLowerCase()] ?? null)
                  : idx >= 0
                    ? (balances[idx]?.data as bigint | null | undefined)
                    : null
                const amount = raw != null ? Number(formatUnits(raw, t.decimals)) : null
                const price = priceOf(prices.data?.prices ?? {}, t.symbol)
                const usd = amount != null && price != null ? amount * price : null
                const active =
                  value?.chainId === g.chain.id && value?.address.toLowerCase() === t.address.toLowerCase()
                return (
                  <button
                    key={`${g.chain.id}-${t.address}-${t.symbol}`}
                    onClick={() => {
                      if (onBeforeSelectChain && !onBeforeSelectChain(g.chain, g.network, t)) {
                        onClose()
                        return
                      }
                      onSelect(g.chain, t)
                      onClose()
                    }}
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors',
                      active ? 'bg-ink-600' : 'hover:bg-ink-700',
                    )}
                  >
                    <span className={note ? 'opacity-50' : undefined}>
                      <TokenIcon
                        symbol={t.symbol}
                        size={34}
                        chainId={g.network ? undefined : g.chain.id}
                        address={g.network || isNativeToken(t) ? undefined : t.address}
                        verified={t.verified}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={clsx('text-[14px] font-semibold', note ? 'text-t2' : 'text-t1')}>{t.symbol}</span>
                        {t.verified && <Check size={11} className="shrink-0 text-accent" />}
                        {note && (
                          <span className="rounded border border-line-strong px-1 text-[9px] uppercase tracking-wide text-t3">
                            no route
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-[12px] leading-4 text-t2">{t.name}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block mono text-[13px] text-t1">
                        {amount == null ? '—' : amount > 0 ? formatAmountShort(amount) : '0'}
                      </span>
                      <span className="block mono text-[11px] text-t3">{usd == null ? '' : `$${usd.toFixed(2)}`}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatAmountShort(n: number): string {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toPrecision(3)
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import clsx from 'clsx'
import { erc20Balance } from '../lib/uniswap'
import { loadPrices, priceOf } from '../lib/prices'
import { formatUnits } from 'viem'
import type { Address } from 'viem'
import type { ChainCfg } from '../config/chains'
import { isNativeToken, type TokenCfg } from '../config/tokens'
import { getPublicClient } from 'wagmi/actions'
import { useAccount } from 'wagmi'
import { wagmiConfig } from '../lib/wallet'
import { TokenIcon } from './ui'

export interface PickerGroup {
  chain: ChainCfg
  tokens: TokenCfg[]
  /** why a token cannot move, shown inline instead of hiding it */
  notes?: Record<string, string>
}

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
  multiChain = true,
  chains,
  onChainChange,
}: {
  open: boolean
  onClose: () => void
  title: string
  groups: PickerGroup[]
  value?: { chainId: number; address: string } | null
  onSelect: (chain: ChainCfg, token: TokenCfg) => void
  multiChain?: boolean
  /** every chain the dropdown may offer; defaults to the chains present in `groups` */
  chains?: ChainCfg[]
  /** when set, picking a chain in the dropdown changes the caller's chain instead of filtering */
  onChainChange?: (chainId: number) => void
}) {
  const [q, setQ] = useState('')
  const [chainFilter, setChainFilter] = useState<number | 'all'>('all')
  const [showChains, setShowChains] = useState(false)
  const { address: account } = useAccount()
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setQ('')
    setChainFilter('all')
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

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

  // one balance read per row, batched by react-query and cached between openings
  const rows = useMemo(
    () => visible.flatMap((g) => g.tokens.map((token) => ({ chain: g.chain, token }))),
    [visible],
  )
  const balances = useQueries({
    queries: rows.map(({ chain, token }) => ({
      queryKey: ['picker-balance', chain.id, token.address, account],
      enabled: open && Boolean(account),
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

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/60 px-3 py-6 backdrop-blur-[2px] sm:py-10">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        ref={panelRef}
        className="enter relative z-10 flex max-h-[min(88vh,760px)] w-full max-w-[520px] flex-col overflow-hidden rounded-[16px] border border-line-strong bg-ink-800 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        {/* header */}
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <h2 className="display text-[18px] leading-7 text-t1">{title}</h2>
          <div className="flex items-center gap-1.5">
            {multiChain && totalChains > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowChains((v) => !v)}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-ink-850 px-2.5 text-[13px] text-t1 transition-colors hover:border-[#3f4a66] hover:bg-ink-700"
                >
                  {onChainChange
                    ? (groups.find((g) => g.chain.id === value?.chainId)?.chain.short ?? 'Network')
                    : chainFilter === 'all'
                      ? 'All chains'
                      : groups.find((g) => g.chain.id === chainFilter)?.chain.short}
                  <ChevronDown size={13} className={clsx('text-t2 transition-transform', showChains && 'rotate-180')} />
                </button>
                {showChains && (
                  <div className="enter absolute right-0 top-[calc(100%+6px)] z-20 max-h-64 w-52 overflow-y-auto rounded-[10px] border border-line-strong bg-ink-800 p-1 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
                    <button
                      onClick={() => {
                        setChainFilter('all')
                        setShowChains(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-t1 hover:bg-ink-700"
                    >
                      <span className="size-4" /> All chains
                    </button>
                    {chainOptions.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          if (onChainChange) onChainChange(c.id)
                          else setChainFilter(c.id)
                          setShowChains(false)
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-t1 hover:bg-ink-700"
                      >
                        <span className="grid size-4 place-items-center">
                          {(onChainChange
                            ? value?.chainId === c.id
                            : chainFilter === c.id) && <Check size={13} className="text-accent" />}
                        </span>
                        <TokenIcon symbol={c.viem.nativeCurrency.symbol} size={16} chainId={c.id} />
                        <span className="truncate">{c.short}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
            <div key={g.chain.id} className="mb-1">
              <div className="sticky top-0 z-10 flex items-center gap-2 bg-ink-800/95 px-3 py-2 backdrop-blur">
                <TokenIcon symbol={g.chain.viem.nativeCurrency.symbol} size={15} chainId={g.chain.id} />
                <span className="col-head">{g.chain.name}</span>
                <span className="mono text-[11px] text-t3">{g.chain.id}</span>
              </div>
              {g.tokens.map((t) => {
                const note = g.notes?.[t.address.toLowerCase()]
                const idx = rows.findIndex((r) => r.chain.id === g.chain.id && r.token.address === t.address)
                const raw = idx >= 0 ? (balances[idx]?.data as bigint | null | undefined) : null
                const amount = raw != null ? Number(formatUnits(raw, t.decimals)) : null
                const price = priceOf(prices.data?.prices ?? {}, t.symbol)
                const usd = amount != null && price != null ? amount * price : null
                const active =
                  value?.chainId === g.chain.id && value?.address.toLowerCase() === t.address.toLowerCase()
                return (
                  <button
                    key={t.address}
                    onClick={() => {
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
                        chainId={g.chain.id}
                        address={isNativeToken(t) ? undefined : t.address}
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

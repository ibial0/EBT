import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Search, ChevronDown } from 'lucide-react'
import type { ChainCfg } from '../config/chains'
import { getChain } from '../config/chains'
import { getNetwork, type NetworkEntry } from '../config/networks'
import { Modal, ChainLogo, NetworkLogo, Badge, Empty } from './ui'
import { useAccount } from 'wagmi'
import { ranksFor, rankChains } from '../lib/ranks'

const CORE_EVM_IDS = new Set([11155111, 84532, 421614, 11155420, 1301, 43113, 80002])

export function ChainSelect({
  open,
  onClose,
  chains,
  extraNetworks,
  value,
  extraValue,
  onSelect,
  onSelectExtra,
  isExtraConnected,
  title = 'Select network',
  subtitle,
}: {
  open: boolean
  onClose: () => void
  chains: ChainCfg[]
  extraNetworks?: NetworkEntry[]
  value?: number
  extraValue?: string | null
  onSelect: (id: number) => void
  /** Return false to cancel closing/selection (caller opens wallet connect instead). */
  onSelectExtra?: (id: string) => boolean | void
  isExtraConnected?: (n: NetworkEntry) => boolean
  title?: string
  subtitle?: string
}) {
  const [q, setQ] = useState('')
  const { address } = useAccount()
  // funded networks first, by wallet balance; unranked lists keep their curated order
  const ranks = ranksFor(address)

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const matchChain = (c: ChainCfg) =>
      !needle ||
      `${c.name} ${c.short} ${c.id} ${c.nativeIsUsdc ? 'USDC' : c.viem.nativeCurrency.symbol}`
        .toLowerCase()
        .includes(needle)
    const matchExtra = (n: NetworkEntry) =>
      !needle ||
      `${n.name} ${n.short} ${n.nativeId} ${n.family} ${n.nativeCurrency.symbol} ${n.aliases.join(' ')}`
        .toLowerCase()
        .includes(needle)

    const coreEvm = chains.filter((c) => CORE_EVM_IDS.has(c.id) && matchChain(c))
    const restEvm = chains.filter((c) => !CORE_EVM_IDS.has(c.id) && matchChain(c))
    const extras = (extraNetworks ?? []).filter(matchExtra)

    // Interleave major L1/L2 EVM + all non-EVM chains in one unified list so Solana/Sui/Aptos are always visible
    const connectedExtras = extras.filter((n) => isExtraConnected?.(n))
    const otherExtras = extras.filter((n) => !isExtraConnected?.(n))

    const unified: Array<{ kind: 'evm'; chain: ChainCfg } | { kind: 'extra'; net: NetworkEntry }> = [
      ...coreEvm.map((chain) => ({ kind: 'evm' as const, chain })),
      ...connectedExtras.map((net) => ({ kind: 'extra' as const, net })),
      ...otherExtras.map((net) => ({ kind: 'extra' as const, net })),
      ...restEvm.map((chain) => ({ kind: 'evm' as const, chain })),
    ]
    return rankChains(unified, (u) => (u.kind === 'evm' ? u.chain.id : -1), ranks)
  }, [chains, extraNetworks, q, isExtraConnected, ranks])

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {subtitle && <div className="px-4 pt-3 text-xs text-t3">{subtitle}</div>}
      <div className="p-3">
        <div className="mb-2 flex items-center gap-2 rounded-[10px] border border-line bg-ink-850 px-3 py-2">
          <Search size={15} className="text-t3" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a testnet (Sepolia, Solana, Sui, Aptos…)"
            className="input text-sm"
          />
        </div>
        <div className="max-h-[54vh] overflow-y-auto">
          {items.length === 0 && <Empty title="No testnet matches that search" />}
          {items.map((item) => {
            if (item.kind === 'evm') {
              const c = item.chain
              const isSelected = !extraValue && value === c.id
              return (
                <button
                  key={`evm-${c.id}`}
                  onClick={() => {
                    onSelect(c.id)
                    onClose()
                    setQ('')
                  }}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition',
                    isSelected ? 'bg-ink-700' : 'hover:bg-ink-700',
                  )}
                >
                  <ChainLogo chain={c} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-t1">{c.name}</span>
                    <span className="mono block text-[11px] text-t3">
                      chain {c.id} · {c.nativeIsUsdc ? 'USDC' : c.viem.nativeCurrency.symbol}
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-1">
                    {c.bridge === 'cctp' && <Badge tone="mint">CCTP</Badge>}
                    {c.bridge === 'opstack' && <Badge tone="amber">OP</Badge>}
                    {c.bridge === 'orbit' && <Badge tone="amber">Orbit</Badge>}
                    {(c.uniswap || (c.dexV2 && c.dexV2.length > 0)) && <Badge tone="blue">Swap</Badge>}
                  </span>
                </button>
              )
            }

            const n = item.net
            const isSelected = extraValue === n.id
            const connected = isExtraConnected ? isExtraConnected(n) : true
            return (
              <button
                key={n.id}
                onClick={() => {
                  onSelectExtra?.(n.id)
                  onClose()
                  setQ('')
                }}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition',
                  isSelected ? 'bg-ink-700' : 'hover:bg-ink-700',
                )}
              >
                <NetworkLogo network={n} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-t1">{n.name}</span>
                  <span className="mono block truncate text-[11px] text-t3">
                    {n.nativeCurrency.symbol}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1">
                  {!connected ? (
                    <Badge tone="amber">Connect</Badge>
                  ) : (
                    <>
                      {n.capabilities.bridge !== 'no' && <Badge tone="mint">CCTP</Badge>}
                      {n.capabilities.swap !== 'no' && <Badge tone="blue">Swap</Badge>}
                    </>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}

/** Compact trigger used inside forms. */
export function ChainChip({
  chainId,
  networkId,
  onClick,
  label,
}: {
  chainId?: number
  networkId?: string
  onClick?: () => void
  label?: string
}) {
  const chain = chainId != null ? getChain(chainId) : undefined
  const net = networkId ? getNetwork(networkId) : undefined
  return (
    <button
      onClick={onClick}
      className="flex h-10 items-center gap-2.5 rounded-lg border border-line bg-ink-700 px-2.5 transition-colors hover:border-line-strong"
    >
      {net ? <NetworkLogo network={net} size={22} /> : chain ? <ChainLogo chain={chain} size={22} /> : null}
      <span className="text-[14px] font-medium text-t1">{net?.short ?? chain?.short ?? 'Select'}</span>
      {label && <span className="text-[11px] text-t3">{label}</span>}
      <ChevronDown size={13} className="text-t3" />
    </button>
  )
}

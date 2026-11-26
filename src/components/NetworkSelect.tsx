import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Search, ChevronDown } from 'lucide-react'
import { ALL_NETWORKS, getNetwork, type NetworkEntry } from '../config/networks'
import { Modal, NetworkLogo, Badge, Empty } from './ui'

type FamilyFilter = 'all' | 'evm' | 'non-evm' | 'deprecated'

export function NetworkSelect({
  open,
  onClose,
  networks = ALL_NETWORKS,
  value,
  onSelect,
  title = 'Select testnet ecosystem',
  subtitle,
  allowAllOption,
}: {
  open: boolean
  onClose: () => void
  networks?: NetworkEntry[]
  value?: string | 'all'
  onSelect: (id: string) => void
  title?: string
  subtitle?: string
  allowAllOption?: boolean
}) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<FamilyFilter>('all')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return networks.filter((n) => {
      if (filter === 'evm' && (n.family !== 'evm' || n.status === 'deprecated')) return false
      if (filter === 'non-evm' && n.family === 'evm') return false
      if (filter === 'deprecated' && n.status !== 'deprecated') return false
      if (!needle) return true
      return `${n.name} ${n.short} ${n.nativeId} ${n.family} ${n.nativeCurrency.symbol} ${n.aliases.join(' ')}`
        .toLowerCase()
        .includes(needle)
    })
  }, [networks, q, filter])

  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-lg">
      {subtitle && <div className="px-4 pt-3 text-xs text-t3">{subtitle}</div>}
      <div className="p-3">
        <div className="mb-2 flex items-center gap-2 rounded-[10px] border border-line bg-ink-850 px-3 py-2">
          <Search size={15} className="text-t3" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search EVM or non-EVM testnet, chain id, alias…"
            className="input text-sm"
          />
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5 text-[11px]">
          {(
            [
              ['all', `All (${networks.length})`],
              ['evm', 'EVM'],
              ['non-evm', 'Non-EVM'],
              ['deprecated', 'Deprecated'],
            ] as const
          ).map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={clsx(
                'rounded-md border px-2.5 py-1 transition',
                filter === k ? 'border-accent/40 bg-ink-700 text-t1' : 'border-line text-t3 hover:text-t1',
              )}
            >
              {lbl}
            </button>
          ))}
        </div>
        <div className="max-h-[54vh] overflow-y-auto">
          {allowAllOption && !q.trim() && filter === 'all' && (
            <button
              onClick={() => {
                onSelect('all')
                onClose()
              }}
              className={clsx(
                'mb-1 flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition',
                value === 'all' ? 'bg-ink-700' : 'hover:bg-ink-700',
              )}
            >
              <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-ink-600 text-[11px] font-semibold text-t1">
                All
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] text-t1">All ecosystems</span>
                <span className="mono block text-[11px] text-t3">{networks.length} tracked networks</span>
              </span>
            </button>
          )}
          {filtered.length === 0 && <Empty title="No testnet matches that filter" />}
          {filtered.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                onSelect(n.id)
                onClose()
                setQ('')
              }}
              className={clsx(
                'flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition',
                value === n.id ? 'bg-ink-700' : 'hover:bg-ink-700',
              )}
            >
              <NetworkLogo network={n} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] text-t1">{n.name}</span>
                <span className="mono block truncate text-[11px] text-t3">
                  {n.family === 'evm' ? `evm · chain ${n.nativeId}` : `${n.family} · ${n.nativeId.slice(0, 16)}`} ·{' '}
                  {n.nativeCurrency.symbol}
                </span>
              </span>
              <span className="flex shrink-0 gap-1">
                {n.status === 'deprecated' && <Badge tone="red">Deprecated</Badge>}
                {n.family !== 'evm' && n.status !== 'deprecated' && <Badge tone="amber">{n.family}</Badge>}
                {n.capabilities.swap === 'yes' && <Badge tone="blue">Swap</Badge>}
                {n.capabilities.bridge === 'yes' && <Badge tone="mint">Bridge</Badge>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export function NetworkChip({ networkId, onClick }: { networkId?: string; onClick?: () => void }) {
  const net = getNetwork(networkId)
  return (
    <button
      onClick={onClick}
      className="flex h-10 items-center gap-2.5 rounded-lg border border-line bg-ink-700 px-2.5 transition-colors hover:border-line-strong"
    >
      {net && <NetworkLogo network={net} size={22} />}
      <span className="text-[14px] font-medium text-t1">{net?.short ?? 'Select'}</span>
      <ChevronDown size={13} className="text-t3" />
    </button>
  )
}

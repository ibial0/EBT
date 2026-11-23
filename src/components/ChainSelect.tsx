import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Search } from 'lucide-react'
import type { ChainCfg } from '../config/chains'
import { getChain } from '../config/chains'
import { Modal, ChainLogo, Badge, Empty } from './ui'

export function ChainSelect({
  open,
  onClose,
  chains,
  value,
  onSelect,
  title = 'Select network',
  subtitle,
}: {
  open: boolean
  onClose: () => void
  chains: ChainCfg[]
  value?: number
  onSelect: (id: number) => void
  title?: string
  subtitle?: string
}) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return chains
    return chains.filter((c) => `${c.name} ${c.short} ${c.id}`.toLowerCase().includes(needle))
  }, [chains, q])

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
            placeholder="Search a testnet…"
            className="input text-sm"
          />
        </div>
        <div className="max-h-[52vh] overflow-y-auto">
          {filtered.length === 0 && <Empty title="No testnet matches that search" />}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onSelect(c.id)
                onClose()
                setQ('')
              }}
              className={clsx(
                'flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition',
                value === c.id ? 'bg-ink-700' : 'hover:bg-ink-700',
              )}
            >
              <ChainLogo chain={c} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] text-t1">{c.name}</span>
                <span className="mono block text-[11px] text-t3">chain {c.id}</span>
              </span>
              <span className="flex shrink-0 gap-1">
                {c.bridge === 'cctp' && <Badge tone="mint">CCTP</Badge>}
                {c.bridge === 'opstack' && <Badge tone="amber">OP</Badge>}
                {c.uniswap && <Badge tone="blue">Swap</Badge>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

/** Compact trigger used inside forms. */
export function ChainChip({
  chainId,
  onClick,
  label,
}: {
  chainId: number
  onClick?: () => void
  label?: string
}) {
  const chain = getChain(chainId)
  return (
    <button
      onClick={onClick}
      className="flex h-10 items-center gap-2.5 rounded-lg border border-line bg-ink-700 px-2.5 transition-colors hover:border-line-strong"
    >
      {chain && <ChainLogo chain={chain} size={22} />}
      <span className="text-[14px] font-medium text-t1">{chain?.short ?? 'Select'}</span>
      {label && <span className="text-[11px] text-t3">{label}</span>}
    </button>
  )
}

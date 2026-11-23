import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { AlertTriangle, Search } from 'lucide-react'
import type { TokenCfg } from '../config/tokens'
import { Modal, TokenIcon, Empty, Spinner, notify } from './ui'

export function TokenSelect({
  open,
  onClose,
  tokens,
  value,
  onSelect,
  chainName,
  chainId,
  allowImport = true,
}: {
  open: boolean
  onClose: () => void
  tokens: TokenCfg[]
  value?: string
  onSelect: (t: TokenCfg) => void
  chainName: string
  chainId: number
  allowImport?: boolean
}) {
  const [q, setQ] = useState('')
  const [importing, setImporting] = useState(false)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return tokens
    return tokens.filter((t) => `${t.symbol} ${t.name} ${t.address}`.toLowerCase().includes(needle))
  }, [tokens, q])

  const looksLikeAddress = /^0x[0-9a-fA-F]{40}$/.test(q.trim())
  const alreadyListed = tokens.some((t) => t.address.toLowerCase() === q.trim().toLowerCase())

  async function importToken() {
    const address = q.trim()
    setImporting(true)
    try {
      const { readTokenMeta } = await import('../lib/tokenImport')
      const meta = await readTokenMeta(chainId, address as `0x${string}`)
      if (!meta) {
        notify('No ERC-20 contract answered at that address on this chain.', 'error')
        return
      }
      const token: TokenCfg = {
        chainId,
        address: address as `0x${string}`,
        symbol: meta.symbol,
        name: meta.name,
        decimals: meta.decimals,
        kind: 'token',
        color: '#475569',
        verified: false,
      }
      onSelect(token)
      onClose()
      notify(`${meta.symbol} imported, quotes will show whether a pool actually exists.`, 'info')
    } catch (e) {
      notify((e as Error).message, 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Select token · ${chainName}`}>
      <div className="p-3">
        <div className="mb-2 flex items-center gap-2 rounded-[10px] border border-line bg-ink-850 px-3 py-2">
          <Search size={15} className="text-t3" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search symbol, name or paste a token address"
            className="input text-sm"
          />
        </div>

        {looksLikeAddress && !alreadyListed && (
          <div className="mb-2 rounded-[10px] border border-[#e3c07b]/30 bg-[#e3c07b]/8 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-[#e3c07b]">
              <AlertTriangle size={13} /> Not in the verified list
            </div>
            <p className="mb-2 text-[11px] leading-relaxed text-[#e3c07b]/70">
              Importing reads the contract directly from the chain. EBT never assumes a token is swappable, the quote engine
              probes real pools first.
            </p>
            <button
              onClick={importToken}
              disabled={importing}
              className="btn btn-ghost w-full px-3 py-2 text-xs"
            >
              {importing ? <Spinner size={13} /> : null} Import {q.trim().slice(0, 6)}…{q.trim().slice(-4)}
            </button>
          </div>
        )}

        <div className="max-h-[50vh] overflow-y-auto">
          {filtered.length === 0 && !looksLikeAddress && <Empty title="No verified token matches" hint="Paste an ERC-20 address to import it manually." />}
          {filtered.map((t) => (
            <button
              key={t.address}
              onClick={() => {
                onSelect(t)
                onClose()
              }}
              className={clsx(
                'flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition',
                value?.toLowerCase() === t.address.toLowerCase()
                  ? 'bg-ink-700'
                  : 'hover:bg-ink-700',
              )}
            >
              <TokenIcon symbol={t.symbol} size={38} chainId={chainId} address={t.address} verified={t.verified} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] text-t1">{t.symbol}</span>
                <span className="block truncate text-[12px] text-t3">{t.name}</span>
              </span>
              <span className="mono shrink-0 text-[10px] text-t3">
                {t.address.slice(0, 6)}…{t.address.slice(-4)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

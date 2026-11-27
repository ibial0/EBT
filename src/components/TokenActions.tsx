import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Check, ChevronDown, ChevronRight, Copy, X } from 'lucide-react'
import { formatUnits } from 'viem'
import type { NetworkEntry } from '../config/networks'
import { getChain } from '../config/chains'
import { ChainLogo, NetworkLogo, TokenIcon, notify } from './ui'
import { shortAddr } from '../lib/format'
import { isEvmAddress, sendToken } from '../lib/sendToken'
import { addActivity, finalizeFromSteps, updateStep } from '../lib/activity'
import { safeParseUnits } from '../lib/format'
import { getPublicClient } from 'wagmi/actions'
import { ensureWalletChain, wagmiConfig } from '../lib/wallet'

export interface TokenRow {
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

export interface TokenGroup {
  symbol: string
  name: string
  usd: number | null
  amount: number
  rows: TokenRow[]
}

const rowKey = (r: TokenRow) => `${r.networkKey}-${r.address ?? 'native'}`

function RowBadge({ row, size = 16 }: { row: TokenRow; size?: number }) {
  if (row.chainId != null) {
    const c = getChain(row.chainId)
    return c ? <ChainLogo chain={c} size={size} /> : null
  }
  return row.network ? <NetworkLogo network={row.network} size={size} /> : null
}

function amountText(r: TokenRow) {
  if (r.amount == null) return '—'
  const n = Number(formatUnits(r.amount, r.decimals))
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toPrecision(3)
}

const byBalance = (a: TokenRow, b: TokenRow) => {
  const av = a.amount == null ? -1 : Number(formatUnits(a.amount, a.decimals))
  const bv = b.amount == null ? -1 : Number(formatUnits(b.amount, b.decimals))
  return bv - av
}

/** One chain row: token mark with its chain badge, chain name, balance on the right. */
function ChainPickerRow({
  row,
  active,
  onSelect,
  size = 34,
}: {
  row: TokenRow
  active: boolean
  onSelect: () => void
  size?: number
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
        active ? 'border-accent/50 bg-accent/10' : 'border-line bg-ink-850 hover:border-line-strong hover:bg-ink-750'
      }`}
    >
      <span className="relative shrink-0">
        <TokenIcon
          symbol={row.symbol}
          size={size}
          chainId={row.chainId ?? undefined}
          address={row.chainId != null ? (row.address ?? undefined) : undefined}
          verified={row.verified}
        />
        <span className="absolute -bottom-1 -left-1 rounded-full ring-2 ring-ink-850">
          <RowBadge row={row} size={15} />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-t1">{row.chainShort}</span>
        <span className="block truncate text-[11.5px] text-t3">{row.chainName}</span>
      </span>
      <span className="mono shrink-0 text-right text-[13px] text-t1">{amountText(row)}</span>
    </button>
  )
}

/**
 * Multi-chain summary shown from the Overview: one token that lives on several chains opens with
 * two actions and the per-chain holdings (largest first) instead of a send form. Send and Receive
 * lead to the popup, where the network itself can be picked.
 */
export function TokenSheet({
  group,
  onClose,
  onSend,
  onReceive,
  onPickChain,
  formatUsd,
}: {
  group: TokenGroup
  onClose: () => void
  onSend: (rowKey?: string) => void
  onReceive: (rowKey?: string) => void
  onPickChain: (rowKey: string) => void
  formatUsd?: (value: number) => string
}) {
  const rows = useMemo(() => group.rows.slice().sort(byBalance), [group.rows])
  const totalText =
    group.amount > 0
      ? `${group.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${group.symbol}`
      : '—'
  const price = (v: number | null) => (v == null ? 'not priced' : formatUsd ? formatUsd(v) : `$${v.toFixed(2)}`)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
      style={{ animation: 'popupBgIn 200ms ease-out both', background: 'rgba(0,0,0,0.62)' }}
    >
      <div
        className="relative mx-4 w-full max-w-[500px] overflow-hidden rounded-2xl border border-line-strong bg-ink-850 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'popupCardIn 280ms cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <TokenIcon
            symbol={group.symbol}
            size={44}
            chainId={rows[0]?.chainId ?? undefined}
            verified={rows[0]?.verified ?? false}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold text-t1">
              {group.symbol}
              <span className="ml-2 text-[12px] font-normal text-t3">{totalText}</span>
            </p>
            <p className="truncate text-[12px] text-t2">
              {rows.length} chains · {price(group.usd)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-t3 transition-colors hover:bg-ink-700 hover:text-t1"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 px-5 pb-4 pt-4">
          <button
            onClick={() => onSend(rows[0] ? rowKey(rows[0]) : undefined)}
            className="flex h-[48px] items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-semibold on-accent transition-opacity hover:opacity-90"
          >
            <ArrowUpRight size={16} /> Send
          </button>
          <button
            onClick={() => onReceive(rows[0] ? rowKey(rows[0]) : undefined)}
            className="flex h-[48px] items-center justify-center gap-2 rounded-xl border border-line-strong bg-ink-800 text-[14px] font-semibold text-t1 transition-colors hover:bg-ink-700"
          >
            <ArrowDownLeft size={16} /> Receive
          </button>
        </div>

        <div className="max-h-[46vh] space-y-1.5 overflow-y-auto px-5 pb-5">
          {rows.map((r) => (
            <button
              key={rowKey(r)}
              type="button"
              onClick={() => onPickChain(rowKey(r))}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-ink-850 px-3.5 py-2.5 text-left transition-all hover:border-line-strong hover:bg-ink-750"
            >
              <span className="relative shrink-0">
                <TokenIcon
                  symbol={r.symbol}
                  size={32}
                  chainId={r.chainId ?? undefined}
                  address={r.chainId != null ? (r.address ?? undefined) : undefined}
                  verified={r.verified}
                />
                <span className="absolute -bottom-1 -left-1 rounded-full ring-2 ring-ink-850">
                  <RowBadge row={r} size={14} />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-t1">{r.chainShort}</span>
                <span className="mono block truncate text-[11px] text-t3">{price(r.usdValue)}</span>
              </span>
              <span className="mono shrink-0 text-right text-[13.5px] text-t1">{amountText(r)}</span>
              <ChevronRight size={15} className="shrink-0 text-t3" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Token actions: send or receive a token from the wallet itself.
 *
 * Sized to be comfortable on a desktop: large tap targets, the sender chain shown as a
 * row with its own logo and balance, and placeholders inside the fields instead of labels
 * floating above them.
 */
export function TokenActions({
  group,
  initialRowKey,
  initialMode = 'send',
  lockedRowKey = null,
  onBack,
  onClose,
  onSent,
  receiveAddressFor,
}: {
  group: TokenGroup
  initialRowKey?: string | null
  initialMode?: 'send' | 'receive'
  lockedRowKey?: string | null
  /** Shown as a back arrow in the header — returns to the previous step (the chain summary). */
  onBack?: () => void
  onClose: () => void
  onSent?: () => void
  receiveAddressFor?: (row: TokenRow) => string
}) {
  const rows = useMemo(() => group.rows.slice().sort(byBalance), [group.rows])
  const sendable = useMemo(() => rows.filter((r) => r.chainId != null), [rows])
  const [mode, setMode] = useState<'send' | 'receive'>(initialMode)
  /** Opened from one chain row: that chain is the only option. */
  const selectable = useMemo(
    () => (lockedRowKey ? rows.filter((r) => rowKey(r) === lockedRowKey) : sendable.length > 0 ? sendable : rows),
    [rows, lockedRowKey, sendable],
  )
  /** More than one network to choose from: the From card opens a picker instead of listing them all. */
  const multi = !lockedRowKey && rows.length > 1
  const [picker, setPicker] = useState(() => initialMode === 'receive' && !lockedRowKey && group.rows.length > 1)
  /** Receive with several networks asks which one first, then shows the QR. */
  const [receivePicked, setReceivePicked] = useState(() => !(initialMode === 'receive' && !lockedRowKey && group.rows.length > 1))

  const [selected, setSelected] = useState<string>(initialRowKey ?? rowKey(rows[0]))
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState<string | null>(null)

  const row = rows.find((r) => rowKey(r) === selected) ?? rows[0]
  // Send signs on the row the sheet is showing, never a different chain's first EVM row.
  const evmRow = row?.chainId != null ? row : undefined

  const parsed = safeParseUnits(amount, evmRow?.decimals ?? 18)
  const over = parsed != null && evmRow?.amount != null && parsed > evmRow.amount
  const canSend = Boolean(evmRow && isEvmAddress(to) && parsed != null && parsed > 0n && !over)

  // QR for the receive tab (testnet address, generated locally — nothing leaves the device)
  useEffect(() => {
    if (mode !== 'receive') return
    const addr = receiveAddress(row)
    if (!addr) return
    let alive = true
    void import('qrcode')
      .then((mod) =>
        mod.toDataURL(addr, {
          margin: 1,
          width: 320,
          errorCorrectionLevel: 'M',
          color: { dark: '#0b0d12ff', light: '#ffffffff' },
        }),
      )
      .then((url) => {
        if (alive) setQr(url)
      })
      .catch(() => setQr(null))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selected])

  function receiveAddress(r: TokenRow | undefined): string {
    if (!r) return ''
    return receiveAddressFor ? receiveAddressFor(r) : ''
  }

  async function copyAddress(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* clipboard can be blocked; the address is still visible */
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  async function doSend() {
    if (!evmRow || evmRow.chainId == null || parsed == null || !canSend) return
    setSending(true)
    const humanAmount = formatUnits(parsed, evmRow.decimals)
    const activity = addActivity({
      kind: 'send',
      provider: 'wallet',
      fromChainId: evmRow.chainId,
      toChainId: evmRow.chainId,
      owner: to.trim(),
      tokenIn: { symbol: evmRow.symbol, address: evmRow.address ?? undefined, decimals: evmRow.decimals },
      amountIn: humanAmount,
      status: 'pending',
      steps: [{ key: 'transfer', label: `Send ${evmRow.symbol}`, status: 'active', chainId: evmRow.chainId }],
    })
    try {
      const hash = await sendToken({
        chainId: evmRow.chainId,
        token: { address: evmRow.address, decimals: evmRow.decimals, symbol: evmRow.symbol },
        to: to.trim() as `0x${string}`,
        amount: parsed,
      })
      updateStep(activity.id, 'transfer', { status: 'active', hash })
      notify(`Sent ${amount} ${evmRow.symbol} · ${shortAddr(hash, 6)}`, 'success')

      // wait for the receipt so the activity entry ends in the right state
      const client = getPublicClient(wagmiConfig, { chainId: evmRow.chainId as never })
      if (client) {
        const receipt = await client.waitForTransactionReceipt({ hash })
        updateStep(activity.id, 'transfer', {
          status: receipt.status === 'success' ? 'done' : 'failed',
          hash,
        })
        if (receipt.status !== 'success') throw new Error('Transaction reverted on-chain.')
      } else {
        updateStep(activity.id, 'transfer', { status: 'done', hash })
      }
      finalizeFromSteps(activity.id)
      onSent?.()
      onClose()
    } catch (e) {
      const msg = (e as Error).message ?? 'Send failed'
      updateStep(activity.id, 'transfer', { status: 'failed', note: msg.slice(0, 120) })
      finalizeFromSteps(activity.id)
      notify(msg.slice(0, 140), 'error')
    } finally {
      setSending(false)
    }
  }

  const addr = receiveAddress(row)
  const totalText =
    group.amount > 0
      ? `${group.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${group.symbol}`
      : '—'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
      style={{ animation: 'popupBgIn 200ms ease-out both', background: 'rgba(0,0,0,0.62)' }}
    >
      <div
        className="relative mx-4 w-full max-w-[500px] overflow-hidden rounded-2xl border border-line-strong bg-ink-850 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'popupCardIn 280ms cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        {/* header */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-4">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              className="rounded-lg p-2 text-t2 transition-colors hover:bg-ink-700 hover:text-t1"
            >
              <ArrowLeft size={17} />
            </button>
          )}
          <TokenIcon
            symbol={group.symbol}
            size={44}
            chainId={row?.chainId ?? undefined}
            address={row?.chainId != null ? (row.address ?? undefined) : undefined}
            verified={row?.verified}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold text-t1">
              {group.symbol}
              <span className="ml-2 text-[12px] font-normal text-t3">{totalText}</span>
            </p>
            <p className="truncate text-[12px] text-t2">
              {lockedRowKey ? row?.chainName : rows.length > 1 ? `${rows.length} chains` : row?.chainName}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-t3 transition-colors hover:bg-ink-700 hover:text-t1"
          >
            <X size={17} />
          </button>
        </div>

        {/* segmented control */}
        <div className="mx-5 mt-4 grid grid-cols-2 gap-1 rounded-xl border border-line bg-ink-900/70 p-1">
          {([
            ['send', 'Send', ArrowUpRight],
            ['receive', 'Receive', ArrowDownLeft],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => {
                setMode(key)
                // several networks: ask which one to receive on before showing an address
                if (key === 'receive' && multi) {
                  setReceivePicked(false)
                  setPicker(true)
                }
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold transition-all ${
                mode === key ? 'bg-accent/15 text-accent ring-1 ring-accent/40' : 'text-t2 hover:text-t1'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {mode === 'send' ? (
          <div className="space-y-3.5 px-5 pb-5 pt-4">
            {/* from: the selected chain only — tap the card to pick another network */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-t3">From</p>
              <button
                type="button"
                disabled={!multi}
                onClick={() => multi && setPicker(true)}
                className={`relative flex w-full items-center gap-3 rounded-xl border border-line bg-ink-850 px-3.5 pt-3 text-left transition-all ${
                  multi ? 'cursor-pointer pb-5 hover:border-line-strong hover:bg-ink-750' : 'pb-3'
                }`}
              >
                <span className="relative shrink-0">
                  <TokenIcon
                    symbol={row.symbol}
                    size={34}
                    chainId={row.chainId ?? undefined}
                    address={row.chainId != null ? (row.address ?? undefined) : undefined}
                    verified={row.verified}
                  />
                  <span className="absolute -bottom-1 -left-1 rounded-full ring-2 ring-ink-850">
                    <RowBadge row={row} size={15} />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-t1">{row.chainShort}</span>
                  <span className="block truncate text-[11.5px] text-t3">{row.chainName}</span>
                </span>
                <span className="mono shrink-0 text-right text-[13px] text-t1">{amountText(row)}</span>
                {multi && (
                  <ChevronDown size={14} className="absolute bottom-1 left-1/2 -translate-x-1/2 text-t3" />
                )}
              </button>
            </div>

            {/* to: single field with the placeholder inside */}
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Paste receiver address"
              spellCheck={false}
              autoComplete="off"
              className="input mono h-[52px] w-full rounded-xl border border-line-strong bg-ink-900 px-4 text-[13px] text-t1 placeholder:text-t3 focus:border-accent/60"
            />
            {to.trim().length > 0 && !isEvmAddress(to) && (
              <p className="text-[11.5px] text-neg">That is not a valid EVM address.</p>
            )}

            {/* amount: one field, MAX inside */}
            <div className="relative">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="Amount"
                inputMode="decimal"
                className="input mono h-[52px] w-full rounded-xl border border-line-strong bg-ink-900 px-4 pr-20 text-[15px] text-t1 placeholder:text-t3 focus:border-accent/60"
              />
              <button
                onClick={() => evmRow?.amount != null && setAmount(formatUnits(evmRow.amount, evmRow.decimals))}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-ink-700 px-2.5 py-1 text-[11px] font-semibold text-t1 hover:bg-ink-600"
              >
                MAX
              </button>
            </div>
            {over && <p className="text-[11.5px] text-neg">More than the balance on this chain.</p>}

            <button
              disabled={!canSend || sending}
              onClick={() => void doSend()}
              className="h-[52px] w-full rounded-xl bg-accent text-[15px] font-semibold on-accent transition-opacity disabled:opacity-40"
            >
              {sending ? 'Waiting for wallet…' : `Send ${group.symbol}`}
            </button>
          </div>
        ) : (
          <div className="space-y-3.5 px-5 pb-5 pt-4">
            {multi && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-t3">Network</p>
                <button
                  type="button"
                  onClick={() => setPicker(true)}
                  className="relative flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-ink-850 px-3.5 pb-5 pt-3 text-left transition-all hover:border-line-strong hover:bg-ink-750"
                >
                  <span className="relative shrink-0">
                    <TokenIcon
                      symbol={row.symbol}
                      size={32}
                      chainId={row.chainId ?? undefined}
                      address={row.chainId != null ? (row.address ?? undefined) : undefined}
                      verified={row.verified}
                    />
                    <span className="absolute -bottom-1 -left-1 rounded-full ring-2 ring-ink-850">
                      <RowBadge row={row} size={14} />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-t1">{row.chainShort}</span>
                    <span className="block truncate text-[11.5px] text-t3">{row.chainName}</span>
                  </span>
                  <span className="mono shrink-0 text-right text-[13px] text-t1">{amountText(row)}</span>
                  <ChevronDown size={14} className="absolute bottom-1 left-1/2 -translate-x-1/2 text-t3" />
                </button>
              </div>
            )}
            {!receivePicked ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line px-4 py-10 text-center">
                <p className="text-[12.5px] leading-5 text-t2">
                  Choose a network to receive {group.symbol} on.
                </p>
                <button
                  onClick={() => setPicker(true)}
                  className="h-11 rounded-xl bg-accent px-5 text-[13px] font-semibold on-accent"
                >
                  Select network
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
              {qr ? (
                <img
                  src={qr}
                  alt="Receive QR"
                  className="size-[190px] rounded-xl border border-line bg-white p-1.5"
                />
              ) : (
                <div className="grid size-[190px] place-items-center rounded-xl border border-dashed border-line text-[11px] text-t3">
                  QR unavailable
                </div>
              )}
              <p className="text-[11.5px] text-t2">
                Send {group.symbol} on {row?.chainName} to
              </p>
              <p className="mono break-all rounded-xl border border-line bg-ink-900 px-3 py-2.5 text-center text-[11.5px] text-t1">
                {addr || 'Connect a wallet to get an address.'}
              </p>
              <button
                onClick={() => void copyAddress(addr)}
                disabled={!addr}
                className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-[13px] font-semibold transition-all ${
                  copied
                    ? 'border-pos/50 bg-pos/15 text-pos'
                    : 'border-line-strong bg-ink-800 text-t1 hover:bg-ink-700'
                }`}
              >
                {copied ? <Check size={15} /> : <Copy size={14} />}
                {copied ? 'Address copied' : 'Copy address'}
              </button>
              </div>
            )}
          </div>
        )}

        {/* network picker: slides over the popup so the previous step stays behind it */}
        {picker && (
          <div
            className="absolute inset-0 z-20 flex flex-col bg-ink-850"
            style={{ animation: 'popupCardIn 220ms cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            <div className="flex items-center gap-2 border-b border-line px-3 py-3">
              <button
                onClick={() => setPicker(false)}
                aria-label="Back"
                className="rounded-lg p-2 text-t2 transition-colors hover:bg-ink-700 hover:text-t1"
              >
                <ArrowLeft size={17} />
              </button>
              <p className="text-[14px] font-semibold text-t1">Select network</p>
              <button
                onClick={onClose}
                aria-label="Close"
                className="ml-auto rounded-lg p-2 text-t3 transition-colors hover:bg-ink-700 hover:text-t1"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[60vh] space-y-1.5 overflow-y-auto p-4">
              {rows.map((r) => (
                <div key={rowKey(r)} className={r.chainId == null ? 'opacity-55' : undefined}>
                  <ChainPickerRow
                    row={r}
                    active={rowKey(r) === rowKey(row)}
                    onSelect={() => {
                      setSelected(rowKey(r))
                      setPicker(false)
                      setReceivePicked(true)
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Small helper used by Portfolio to open this modal for a specific chain row. */
export function tokenRowKey(r: TokenRow): string {
  return rowKey(r)
}

/** Keeps the signer chain in step with the modal before any transaction is built. */
export async function prepareChain(chainId: number) {
  await ensureWalletChain(chainId)
}

import { useEffect, useState, useSyncExternalStore, type ButtonHTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'
import { ArrowLeft, Check, Copy, Loader2, X } from 'lucide-react'
import { copy as doCopy } from '../lib/format'
import { getChain, type ChainCfg } from '../config/chains'
import { chainLogoById, chainLogoFile, tokenLogoFile } from '../config/logos'
import type { NetworkEntry } from '../config/networks'

/* ───────────────────────── toast ───────────────────────── */

export type ToastTone = 'info' | 'success' | 'error'
interface ToastItem {
  id: number
  msg: string
  tone: ToastTone
  leaving?: boolean
}
let toasts: ToastItem[] = []
let toastId = 0
const toastListeners = new Set<() => void>()
const emitToasts = () => toastListeners.forEach((l) => l())

export function notify(msg: string, tone: ToastTone = 'info') {
  const id = ++toastId
  toasts = [...toasts, { id, msg, tone }]
  emitToasts()
  setTimeout(
    () => {
      // fade/slide out before unmounting so the toast never just vanishes
      toasts = toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t))
      emitToasts()
      setTimeout(() => {
        toasts = toasts.filter((t) => t.id !== id)
        emitToasts()
      }, 220)
    },
    tone === 'error' ? 7000 : 4200,
  )
}

export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => {
      toastListeners.add(cb)
      return () => toastListeners.delete(cb)
    },
    () => toasts,
    () => toasts,
  )
  return (
    <div className="fixed bottom-24 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2 md:bottom-6">
      {list.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'rounded-[10px] border px-4 py-3 text-[13px] leading-5',
            t.leaving ? 'toast-leave' : 'enter',
            t.tone === 'error'
              ? 'border-[#ff8f8f]/40 bg-[#241519] text-[#ffb4b4]'
              : t.tone === 'success'
                ? 'border-[#6adbb6]/40 bg-[#121d1a] text-[#a8ecd6]'
                : 'border-line-strong bg-ink-800 text-t1',
          )}
        >
          {t.msg}
        </div>
      ))}
    </div>
  )
}

/* ───────────────────────── primitives ───────────────────────── */

/**
 * The EBT mark: a hairline diamond with the Xi glyph inside.
 *
 * Drawn as an SVG with the exact geometry the favicon uses, so the sidebar mark and the browser
 * tab can never drift apart again. Colour comes from `currentColor` — wrap it in `text-accent`.
 */
export function EbtMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/ebt-logo.png"
      width={size}
      height={size}
      alt="EBT"
      className={clsx('shrink-0 select-none object-contain', className)}
      style={{ width: size, height: size }}
    />
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('card', className)}>{children}</div>
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  full?: boolean
}

export function Button({ variant = 'secondary', size = 'md', loading, full, className, children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={clsx(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'secondary' && 'btn-secondary',
        variant === 'quiet' && 'btn-quiet',
        size === 'sm' && 'h-8 rounded-lg px-3 text-[13px]',
        size === 'lg' && 'btn-lg',
        full && 'w-full',
        className,
      )}
    >
      {loading && <Loader2 size={15} className="spin" />}
      {children}
    </button>
  )
}

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode
  tone?: 'default' | 'mint' | 'amber' | 'red' | 'blue'
  className?: string
}) {
  return (
    <span
      className={clsx(
        'chip',
        tone === 'mint' && 'border-[#6adbb6]/35 text-[#6adbb6]',
        tone === 'amber' && 'border-[#e6c17a]/35 text-[#e6c17a]',
        tone === 'red' && 'border-[#ff8f8f]/35 text-[#ff8f8f]',
        tone === 'blue' && 'border-[#abb8ff]/40 text-[#abb8ff]',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="spin text-t2" />
}

export function Row({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-[13px] text-t2" title={hint}>
        {label}
      </span>
      <span className="figure text-right text-[13px] text-t1">{value}</span>
    </div>
  )
}

export function CopyButton({ value, label }: { value: string; label?: string }) {
  return (
    <button
      onClick={() => {
        doCopy(value)
        notify('Copied', 'success')
      }}
      className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-t3 transition-colors hover:text-t1"
      title="Copy"
    >
      <Copy size={12} />
      {label && <span className="text-[11px]">{label}</span>}
    </button>
  )
}

/* ───────────────────────── logos (real assets) ───────────────────────── */

function initials(name: string) {
  // wrapped-BTC tokens carry the generic bitcoin glyph, which reads correctly and claims no brand
  if (/btc/i.test(name)) return '₿'
  const parts = name.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function LogoShell({ src, size, label }: { src?: string; size: number; label: string }) {
  const [brokenFor, setBrokenFor] = useState<string | null>(null)
  const broken = brokenFor != null && brokenFor === src
  if (!src || broken) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-ink-600 text-t2"
        style={{ width: size, height: size, fontSize: Math.max(9, size * 0.34), fontWeight: 500 }}
        aria-hidden
      >
        {initials(label)}
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setBrokenFor(src)}
      className="shrink-0 rounded-full object-cover ring-1 ring-white/10"
      style={{ width: size, height: size }}
      aria-hidden
    />
  )
}


/**
 * "All chains" mark: four real chain logos in a 2x2 grid, the way wallet pickers draw it.
 * Same component everywhere a chain filter appears so the language stays consistent.
 */
export function AllChainsMark({ size = 18 }: { size?: number }) {
  const ids = [11155111, 84532, 46630, 11155420]
  const cell = Math.floor((size - 1) / 2)
  return (
    <span
      className="grid shrink-0 grid-cols-2 overflow-hidden rounded-[4px]"
      style={{ width: size, height: size, gap: 1 }}
      aria-hidden="true"
    >
      {ids.map((id) => {
        const chain = getChain(id)
        const file = chain ? chainLogoFile(chain.key, chain.id) : undefined
        return (
          <span
            key={id}
            className="overflow-hidden rounded-[2px] bg-ink-700"
            style={{ width: cell, height: cell }}
          >
            {file && (
              <img src={`/logos/chains/${file}`} alt="" className="h-full w-full object-cover" />
            )}
          </span>
        )
      })}
    </span>
  )
}

export function ChainLogo({ chain, size = 24 }: { chain: ChainCfg; size?: number }) {
  const file = chainLogoFile(chain.key, chain.id)
  return <LogoShell src={file ? `/logos/chains/${file}` : undefined} size={size} label={chain.short} />
}

export function NetworkLogo({
  network,
  size = 24,
}: {
  network: Pick<NetworkEntry, 'logoFile' | 'key' | 'evmChainId' | 'short'>
  size?: number
}) {
  const file = network.logoFile ?? chainLogoFile(network.key, network.evmChainId)
  return <LogoShell src={file ? `/logos/chains/${file}` : undefined} size={size} label={network.short} />
}

/**
 * Token icon. Pass chainId + address whenever they are known: the address decides
 * which logo is used, so an imported token named USDC cannot borrow Circle's mark.
 */
export function TokenIcon({
  symbol,
  size = 24,
  chainId,
  address,
  verified = true,
  color,
}: {
  symbol: string
  size?: number
  chainId?: number
  address?: string | null
  verified?: boolean
  color?: string
}) {
  const file = tokenLogoFile(chainId, address ?? undefined, symbol, verified)
  // A native gas token carries its chain's mark when no symbol logo exists — that is what the
  // token *is*, so it is not a guess. Non-native tokens with no mark keep the monogram.
  const nativeish = !address || /^0x0{40}$/i.test(address)
  const chainMark =
    !file && nativeish && chainId != null ? chainLogoById(chainId) : undefined
  const src = file ? `/logos/tokens/${file}` : chainMark ? `/logos/chains/${chainMark}` : undefined
  return <LogoShell src={src} size={size} label={symbol} />
}

/* ───────────────────────── modal ───────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-md',
  onBack,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  width?: string
  onBack?: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        className={clsx(
          'enter relative z-10 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-b-none border border-line bg-ink-800 sm:rounded-[14px]',
          width,
        )}
      >
        <div className="grid grid-cols-[28px_1fr_28px] items-center border-b border-line px-4 py-3.5">
          <div>
            {onBack && (
              <button
                onClick={onBack}
                aria-label="Back"
                className="rounded-full p-1 text-t2 transition-colors hover:bg-ink-700 hover:text-t1"
              >
                <ArrowLeft size={17} />
              </button>
            )}
          </div>
          <div className="text-center text-[14px] font-medium text-t1">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="justify-self-end rounded-full p-1 text-t3 transition-colors hover:bg-ink-700 hover:text-t1"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

/* ───────────────────────── misc ───────────────────────── */

export function Empty({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      {icon && <div className="text-t3">{icon}</div>}
      <div className="text-[14px] text-t1">{title}</div>
      {hint && <div className="max-w-sm text-[12px] leading-5 text-t2">{hint}</div>}
    </div>
  )
}

export function StatusDot({ tone, live }: { tone: 'mint' | 'amber' | 'red' | 'slate'; live?: boolean }) {
  const c = tone === 'mint' ? '#6adbb6' : tone === 'amber' ? '#e6c17a' : tone === 'red' ? '#ff8f8f' : '#85858b'
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="dot" style={{ background: c, boxShadow: live ? `0 0 0 3px ${c}1a` : undefined }} />
    </span>
  )
}

export function CheckLine({ ok }: { ok: boolean }) {
  return ok ? <Check size={14} className="text-[#6adbb6]" /> : <X size={14} className="text-[#ff8f8f]" />
}

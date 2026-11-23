import { useEffect, useState, useSyncExternalStore, type ButtonHTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'
import { Check, Copy, Loader2, X } from 'lucide-react'
import { copy as doCopy } from '../lib/format'
import type { ChainCfg } from '../config/chains'

/* ───────────────────────── toast ───────────────────────── */

export type ToastTone = 'info' | 'success' | 'error'
interface ToastItem {
  id: number
  msg: string
  tone: ToastTone
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
      toasts = toasts.filter((t) => t.id !== id)
      emitToasts()
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
            'enter rounded-[10px] border px-4 py-3 text-[13px] leading-5',
            t.tone === 'error'
              ? 'border-[#e5484d]/40 bg-[#1b1113] text-[#ffb4b6]'
              : t.tone === 'success'
                ? 'border-[#4cc38a]/35 bg-[#111a15] text-[#c7ebd8]'
                : 'border-line bg-ink-800 text-t1',
          )}
        >
          {t.msg}
        </div>
      ))}
    </div>
  )
}

/* ───────────────────────── primitives ───────────────────────── */

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
        tone === 'mint' && 'border-[#4cc38a]/30 text-[#a8e5c4]',
        tone === 'amber' && 'border-[#e3c07b]/30 text-[#e3c07b]',
        tone === 'red' && 'border-[#e5484d]/30 text-[#ffb4b6]',
        tone === 'blue' && 'border-[#6aa6ff]/30 text-[#b7d3ff]',
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

const CHAIN_LOGO: Record<string, string> = {
  sepolia: 'tw_ethereum.png',
  baseSepolia: 'tw_base.png',
  arbitrumSepolia: 'tw_arbitrum.png',
  optimismSepolia: 'tw_optimism.png',
  polygonAmoy: 'tw_polygon.png',
  avalancheFuji: 'avalanche.webp',
  unichainSepolia: 'unichain.webp',
  lineaSepolia: 'linea.webp',
  worldchainSepolia: 'worldchain.webp',
  monadTestnet: 'monad.webp',
  seiTestnet: 'sei.webp',
  inkSepolia: 'ink.webp',
  plasmaTestnet: 'plasma.webp',
  xLayerTestnet: 'xlayer.webp',
  arcTestnet: 'arc.webp',
  codexTestnet: 'codex.webp',
  injectiveTestnet: 'injective.webp',
  giwaSepolia: 'giwa.png',
}

const TOKEN_LOGO: Record<string, string> = {
  USDC: 'usdc.png',
  USDT: 'usdt.png',
  DAI: 'dai.png',
  WETH: 'weth.png',
  ETH: 'eth.png',
  UNI: 'uni.png',
  LINK: 'link.png',
  WBTC: 'wbtc.png',
  EURC: 'eurc.png',
}

function initials(name: string) {
  const parts = name.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function LogoShell({ src, size, label }: { src?: string; size: number; label: string }) {
  const [broken, setBroken] = useState(false)
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
      onError={() => setBroken(true)}
      className="shrink-0 rounded-full object-contain ring-1 ring-white/10"
      style={{ width: size, height: size }}
      aria-hidden
    />
  )
}

export function ChainLogo({ chain, size = 24 }: { chain: ChainCfg; size?: number }) {
  const file = CHAIN_LOGO[chain.key]
  return <LogoShell src={file ? `/logos/chains/${file}` : undefined} size={size} label={chain.short} />
}

export function TokenIcon({ symbol, size = 24 }: { symbol: string; color?: string; size?: number }) {
  const file = TOKEN_LOGO[symbol.toUpperCase()]
  return <LogoShell src={file ? `/logos/tokens/${file}` : undefined} size={size} label={symbol} />
}

/* ───────────────────────── modal ───────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-md',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  width?: string
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
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="text-[14px] font-medium text-t1">{title}</div>
          <button onClick={onClose} className="rounded-md p-1 text-t3 transition-colors hover:bg-ink-700 hover:text-t1">
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
  const c = tone === 'mint' ? '#4cc38a' : tone === 'amber' ? '#e3c07b' : tone === 'red' ? '#e5484d' : '#85858b'
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="dot" style={{ background: c, boxShadow: live ? `0 0 0 3px ${c}1a` : undefined }} />
    </span>
  )
}

export function CheckLine({ ok }: { ok: boolean }) {
  return ok ? <Check size={14} className="text-[#4cc38a]" /> : <X size={14} className="text-[#e5484d]" />
}

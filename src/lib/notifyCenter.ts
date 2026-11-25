/**
 * Notification centre: a red count of transactions that are genuinely in flight, plus a
 * one-shot alert when one of them finishes.
 *
 * "In flight" means an activity record that has begun a transaction (a hash exists) and is
 * not finished. Quotes and validation errors never create records, so they can never show up
 * here. One-shot alerts are persisted per record so a refresh does not replay them.
 */
import { useEffect, useRef, useState } from 'react'
import type { ActivityItem } from './activity'
import { listActivity, updateActivity } from './activity'
import { getChain } from '../config/chains'
import { fmt } from './format'

export interface PendingView {
  id: string
  fromChainId: number
  toChainId: number
  symbol: string
  amount: string
  stage: string
  hash?: string
  elapsedMs: number
  provider: string
  etaMs: number
  remainingMs: number
}

/** Rough expected duration per provider, used when a record has no explicit eta. */
export function etaFor(item: ActivityItem): number {
  const explicit = Number(item.meta?.etaMs)
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  if (item.provider === 'cctp') return 150_000
  if (item.provider === 'orbit') return 600_000
  if (item.provider === 'opstack') return 180_000
  return 90_000
}

/** 95s -> "1:35", 12s -> "0:12" */
export function clock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** 95s -> "1m 35s" */
export function duration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function pendingFrom(items: ActivityItem[]): PendingView[] {
  return items
    // anything still in flight belongs here, signed or not - the row shows its real percentage
    .filter((i) => i.status === 'pending' && i.steps.length > 0)
    .map((i) => {
      const active = i.steps.find((s) => s.status === 'active') ?? i.steps.find((s) => s.status === 'pending')
      const firstHash = i.steps.find((s) => s.hash)?.hash
      const etaMs = etaFor(i)
      return {
        id: i.id,
        fromChainId: i.fromChainId,
        toChainId: i.toChainId,
        symbol: i.tokenOut?.symbol ?? i.tokenIn.symbol,
        amount: i.amountIn,
        stage: active?.label ?? 'Waiting for confirmation',
        hash: firstHash,
        elapsedMs: Date.now() - i.createdAt,
        provider: i.provider,
        etaMs,
        remainingMs: Math.max(0, etaMs - (Date.now() - i.createdAt)),
      }
    })
}

export function labelFor(p: PendingView): string {
  const from = getChain(p.fromChainId)?.short ?? p.fromChainId
  const to = getChain(p.toChainId)?.short ?? p.toChainId
  return `${from} to ${to}`
}

export function elapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}

export interface Flash {
  key: string
  tone: 'done' | 'failed'
  title: string
  detail: string
}

/** Watches the activity store and emits one flash per finished transaction. */
export function useFinishFlash(): [Flash | null, () => void] {
  const [flash, setFlash] = useState<Flash | null>(null)
  const seen = useRef<Set<string>>(new Set())
  const timer = useRef<number | null>(null)

  useEffect(() => {
    const check = () => {
      for (const item of listActivity()) {
        if (item.status === 'complete' && !item.meta?.notified) {
          updateActivity(item.id, { meta: { ...(item.meta ?? {}), notified: true } })
          if (seen.current.has(item.id)) continue
          seen.current.add(item.id)
          const from = getChain(item.fromChainId)?.short ?? ''
          const to = getChain(item.toChainId)?.short ?? ''
          emit({
            key: item.id,
            tone: 'done',
            title: 'Completed',
            detail: `${item.amountIn} ${item.tokenIn.symbol} ${from && to && from !== to ? `${from} to ${to}` : `on ${from}`}`,
          })
        } else if (item.status === 'failed' && !item.meta?.failedNotified) {
          updateActivity(item.id, { meta: { ...(item.meta ?? {}), failedNotified: true } })
          if (seen.current.has(item.id)) continue
          seen.current.add(item.id)
          emit({
            key: item.id,
            tone: 'failed',
            title: 'Failed',
            detail: `${item.amountIn} ${item.tokenIn.symbol}`,
          })
        }
      }
    }

    const emit = (f: Flash) => {
      setFlash(f)
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setFlash(null), 1300)
    }

    const id = window.setInterval(check, 2500)
    const t = window.setTimeout(check, 800)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(t)
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  return [flash, () => setFlash(null)]
}

export function shortAmount(v: string, max = 8): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return v
  return fmt(BigInt(Math.round(n * 1e6)), 6, 4)
}

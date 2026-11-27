/**
 * Local activity store, the "transaction centre" survives refresh because it is
 * persisted in localStorage (no backend, no database, no custody).
 */
import { useSyncExternalStore } from 'react'

export type StepStatus = 'pending' | 'active' | 'done' | 'failed' | 'skipped'
export type ActivityKind = 'bridge' | 'swap' | 'deposit' | 'send' | 'receive'
export type ActivityStatus = 'draft' | 'pending' | 'complete' | 'failed' | 'cancelled'
export type ProviderId = 'cctp' | 'uniswap' | 'opstack' | 'orbit' | 'across' | 'stargate' | 'dexv2' | 'wallet'

export interface TxStep {
  key: string
  label: string
  status: StepStatus
  hash?: string
  chainId?: number
  note?: string
  updatedAt?: number
}

export interface ActivityItem {
  id: string
  kind: ActivityKind
  provider: ProviderId
  createdAt: number
  updatedAt: number
  fromChainId: number
  toChainId: number
  owner: string
  tokenIn: { symbol: string; address?: string; decimals: number }
  tokenOut?: { symbol: string; address?: string; decimals: number }
  amountIn: string
  amountOut?: string
  status: ActivityStatus
  steps: TxStep[]
  meta?: Record<string, string | number | boolean | null>
  error?: string
}

const KEY = 'ebt.activity.v1'
const MAX = 200
let items: ActivityItem[] = []
let loaded = false
const listeners = new Set<() => void>()

function load() {
  if (loaded) return
  loaded = true
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) items = parsed.filter((x) => x && typeof x.id === 'string')
    }
  } catch {
    items = []
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)))
  } catch {
    /* storage full / disabled */
  }
}

function emit() {
  for (const l of listeners) l()
}

export function listActivity(): ActivityItem[] {
  load()
  return [...items].sort((a, b) => b.createdAt - a.createdAt)
}

export function getActivity(id: string): ActivityItem | undefined {
  load()
  return items.find((i) => i.id === id)
}

export function addActivity(item: Omit<ActivityItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): ActivityItem {
  load()
  const now = Date.now()
  const full: ActivityItem = {
    ...item,
    id: item.id ?? `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  }
  items = [full, ...items.filter((i) => i.id !== full.id)].slice(0, MAX)
  persist()
  emit()
  return full
}

export function updateActivity(id: string, patch: Partial<ActivityItem>) {
  load()
  let changed = false
  items = items.map((i) => {
    if (i.id !== id) return i
    changed = true
    return { ...i, ...patch, updatedAt: Date.now() }
  })
  if (changed) {
    persist()
    emit()
  }
}

export function updateStep(id: string, stepKey: string, patch: Partial<TxStep>) {
  load()
  items = items.map((i) => {
    if (i.id !== id) return i
    return {
      ...i,
      updatedAt: Date.now(),
      steps: i.steps.map((s) => (s.key === stepKey ? { ...s, ...patch, updatedAt: Date.now() } : s)),
    }
  })
  persist()
  emit()
}

/** Adds a step (used when an older record predates a step the code now expects). */
export function appendStep(id: string, key: string, step: Omit<TxStep, 'key' | 'updatedAt'> & { updatedAt?: number }) {
  load()
  items = items.map((i) => {
    if (i.id !== id) return i
    if (i.steps.some((s) => s.key === key)) {
      return {
        ...i,
        updatedAt: Date.now(),
        steps: i.steps.map((s) => (s.key === key ? { ...s, ...step, updatedAt: Date.now() } : s)),
      }
    }
    return { ...i, updatedAt: Date.now(), steps: [...i.steps, { ...step, key, updatedAt: Date.now() }] }
  })
  persist()
  emit()
}

/** Anything on chain? Used to tell a plan from a real transaction. */
export function hasChainActivity(item: ActivityItem): boolean {
  return item.steps.some((s) => Boolean(s.hash))
}

export function finalizeFromSteps(id: string) {
  const item = getActivity(id)
  if (!item) return
  if (!hasChainActivity(item) && item.status !== 'cancelled') {
    updateActivity(id, { status: 'draft' })
    return
  }
  const failed = item.steps.some((s) => s.status === 'failed')
  const allDone = item.steps.every((s) => s.status === 'done' || s.status === 'skipped')
  if (failed) updateActivity(id, { status: 'failed' })
  else if (allDone) updateActivity(id, { status: 'complete' })
  else updateActivity(id, { status: 'pending' })
}

export function clearActivity() {
  items = []
  persist()
  emit()
}

/** Stop pretending a transfer is still running: mark it cancelled and freeze its steps. */
export function cancelActivity(id: string) {
  load()
  items = items.map((i) =>
    i.id === id
      ? {
          ...i,
          status: 'cancelled' as ActivityStatus,
          updatedAt: Date.now(),
          steps: i.steps.map((st) =>
            st.status === 'done' || st.status === 'failed' || st.status === 'skipped'
              ? st
              : { ...st, status: 'skipped' as StepStatus },
          ),
        }
      : i,
  )
  persist()
  emit()
}

export function removeActivity(id: string) {
  load()
  items = items.filter((i) => i.id !== id)
  persist()
  emit()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useActivity(): ActivityItem[] {
  load()
  return useSyncExternalStore(subscribe, () => items, () => items)
}

export function useActivityItem(id: string | undefined): ActivityItem | undefined {
  load()
  return useSyncExternalStore(
    subscribe,
    () => (id ? items.find((i) => i.id === id) : undefined),
    () => undefined,
  )
}

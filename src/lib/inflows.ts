/**
 * Observed token inflows.
 *
 * There is no indexer behind this app, so an inflow is only recorded when *this browser*
 * saw a balance rise between two completed scans. A token we have never seen before is
 * discovery finishing, not a receive, so it never draws a bubble by itself.
 *
 * One bubble per token per hour: the first arrival draws it immediately, and any further
 * arrivals push the hour forward, so a bubble only appears again after a full quiet hour
 * followed by a new arrival. Different tokens get their own bubbles.
 */
const KEY = 'ebt.chartInflows.v2'
const MAX_EVENTS = 400
/** A token needs a full hour since its previous arrival before it earns another bubble. */
const MERGE_MS = 60 * 60_000

export interface InflowEvent {
  /** when the bubble was drawn */
  t: number
  /** when this token last arrived — the hourly gate is measured from here */
  anchor?: number
  /** portfolio value at that moment, so the bubble can sit on the line */
  v: number
  symbol: string
  /** ERC-20 address, or null for a native balance */
  address: string | null
  networkKey: string
  chainId: number | null
  /** raw amount added, for the tooltip */
  delta: string
  decimals: number
}

export interface FlatHolding {
  networkKey: string
  address: string | null
  symbol: string
  amount: bigint | null
  decimals: number
  chainId?: number | null
}

const keyOf = (h: FlatHolding) => `${h.networkKey}:${(h.address ?? 'native').toLowerCase()}`

export function loadInflows(): InflowEvent[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return []
    return (arr as InflowEvent[]).filter(
      (e) => e && typeof e.t === 'number' && typeof e.v === 'number' && typeof e.symbol === 'string',
    )
  } catch {
    return []
  }
}

export function saveInflows(events: InflowEvent[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX_EVENTS)))
  } catch {
    /* storage is optional */
  }
}

/** Balances that strictly rose since the previous completed scan, timestamped now. */
export function diffInflows(
  prev: FlatHolding[] | null,
  next: FlatHolding[],
  at: number,
  valueNow: number,
): InflowEvent[] {
  if (!prev || prev.length === 0) return []
  const before = new Map<string, bigint>()
  for (const h of prev) {
    if (h.amount != null) before.set(keyOf(h), h.amount)
  }

  const out: InflowEvent[] = []
  for (const h of next) {
    if (h.amount == null || h.amount <= 0n) continue
    const previous = before.get(keyOf(h))
    // A key we never read before is discovery catching up, not a receive: no bubble.
    if (previous == null) continue
    if (h.amount <= previous) continue
    out.push({
      t: at,
      anchor: at,
      v: valueNow,
      symbol: h.symbol,
      address: h.address,
      networkKey: h.networkKey,
      chainId: h.chainId ?? null,
      delta: (h.amount - previous).toString(),
      decimals: h.decimals,
    })
  }
  return out
}

/**
 * Appends events, keeping one bubble per token per hour.
 *
 * The key is the symbol alone: the same token arriving on five chains inside an hour is one
 * arrival, so it stays one bubble. A repeat inside the hour draws nothing and only moves the
 * gate forward, so bubbles cannot pile up while a user keeps claiming.
 */
export function mergeInflows(existing: InflowEvent[], incoming: InflowEvent[]): InflowEvent[] {
  const merged = [...existing].sort((a, b) => a.t - b.t)
  for (const e of incoming) {
    const same = merged.filter((m) => m.symbol.toUpperCase() === e.symbol.toUpperCase())
    const last = same[same.length - 1]
    if (!last) {
      merged.push({ ...e, anchor: e.t })
      continue
    }
    // The same scan can report the same arrival twice; keep one.
    if (last.t === e.t) continue
    const gate = last.anchor ?? last.t
    if (e.t - gate < MERGE_MS) {
      const idx = merged.indexOf(last)
      merged[idx] = { ...last, anchor: e.t }
      continue
    }
    merged.push({ ...e, anchor: e.t })
  }
  return merged.sort((a, b) => a.t - b.t).slice(-MAX_EVENTS)
}

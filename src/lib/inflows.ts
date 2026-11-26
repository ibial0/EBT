/**
 * Observed token inflows.
 *
 * There is no indexer behind this app, so an inflow is only recorded when *this browser*
 * saw a balance rise between two completed scans. That is a real observation, never a
 * guess: first sightings are ignored (a token that appears for the first time could just
 * be discovery finishing), and increases are timestamped at the moment they were seen.
 *
 * The chart uses these to draw a token bubble at the point in time the balance moved.
 */
const KEY = 'ebt.chartInflows.v1'
const MAX_EVENTS = 400
/** Same token within this window is one event, updated in place. */
const MERGE_MS = 6 * 60_000

export interface InflowEvent {
  /** when the change was observed */
  t: number
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

/** Balances that rose since the previous completed scan, timestamped now. */
export function diffInflows(
  prev: FlatHolding[] | null,
  next: FlatHolding[],
  at: number,
  valueNow: number,
): InflowEvent[] {
  if (!prev || prev.length === 0) return []
  const before = new Map<string, bigint>()
  for (const h of prev) if (h.amount != null) before.set(keyOf(h), h.amount)

  const out: InflowEvent[] = []
  for (const h of next) {
    if (h.amount == null) continue
    const previous = before.get(keyOf(h))
    // Unknown before this scan → not an inflow we can prove.
    if (previous == null) continue
    if (h.amount <= previous) continue
    out.push({
      t: at,
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

/** Appends events, merging repeats of the same token seen minutes apart. */
export function mergeInflows(existing: InflowEvent[], incoming: InflowEvent[]): InflowEvent[] {
  const merged = [...existing]
  for (const e of incoming) {
    const idx = merged.findIndex(
      (m) => m.symbol === e.symbol && m.networkKey === e.networkKey && Math.abs(m.t - e.t) < MERGE_MS,
    )
    if (idx >= 0) merged[idx] = e
    else merged.push(e)
  }
  return merged.sort((a, b) => a.t - b.t).slice(-MAX_EVENTS)
}

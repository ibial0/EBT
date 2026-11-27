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
/** Same token within this window is one bubble, whichever chain it landed on. */
const MERGE_MS = 60 * 60_000

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
  const chainsSeen = new Set<string>()
  for (const h of prev) {
    chainsSeen.add(h.networkKey)
    if (h.amount != null) before.set(keyOf(h), h.amount)
  }

  const out: InflowEvent[] = []
  for (const h of next) {
    if (h.amount == null || h.amount <= 0n) continue
    const previous = before.get(keyOf(h))
    // A row we have never seen is normally discovery catching up, not a receive. The exception
    // is a token that shows up on a chain we had already scanned: that is a faucet claim or a
    // transfer landing while the app was open, and it is exactly what the bubble is for.
    const firstSighting = previous == null
    if (firstSighting && !chainsSeen.has(h.networkKey)) continue
    if (!firstSighting && h.amount <= previous!) continue
    out.push({
      t: at,
      v: valueNow,
      symbol: h.symbol,
      address: h.address,
      networkKey: h.networkKey,
      chainId: h.chainId ?? null,
      delta: (firstSighting ? h.amount : h.amount - (previous as bigint)).toString(),
      decimals: h.decimals,
    })
  }
  return out
}

/**
 * Appends events, keeping one bubble per token per hour.
 *
 * The key is the symbol alone: the same token claimed on five chains inside an hour is one
 * arrival, so it stays one bubble. The earliest sighting anchors the bubble; a repeat of the
 * exact same token on the same chain adds its amount so the tooltip total stays honest.
 */
export function mergeInflows(existing: InflowEvent[], incoming: InflowEvent[]): InflowEvent[] {
  const merged = [...existing].sort((a, b) => a.t - b.t)
  for (const e of incoming) {
    const idx = merged.findIndex(
      (m) => m.symbol.toUpperCase() === e.symbol.toUpperCase() && Math.abs(m.t - e.t) < MERGE_MS,
    )
    if (idx < 0) {
      merged.push(e)
      continue
    }
    const m = merged[idx]
    const sameToken = m.networkKey === e.networkKey && (m.address ?? '') === (e.address ?? '')
    if (!sameToken) continue
    let delta = e.delta
    try {
      delta = (BigInt(m.delta) + BigInt(e.delta)).toString()
    } catch {
      /* keep the newer delta if either side is not an integer */
    }
    merged[idx] = { ...m, delta, v: e.v }
  }
  return merged.sort((a, b) => a.t - b.t).slice(-MAX_EVENTS)
}

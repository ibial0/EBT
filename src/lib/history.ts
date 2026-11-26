/**
 * Portfolio value history.
 *
 * There is no backend and no indexer, so the only honest chart is one built from the wallet's
 * own visits: every time the portfolio loads we append one point to localStorage (at most one
 * per hour). The chart therefore starts empty and fills in as the app is used — it never invents
 * a past it did not observe.
 */
export interface HistoryPoint {
  t: number
  v: number
}

const KEY = 'ebt.portfolioHistory'
const HOUR = 3_600_000
const KEEP_DAYS = 90
/** Five minutes: fine enough to look alive, coarse enough to keep storage tiny. */
const BUCKET = 5 * 60_000
const MAX_POINTS = 4_000

export function loadHistory(): HistoryPoint[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return []
    const cutoff = Date.now() - KEEP_DAYS * 24 * HOUR
    return (arr as HistoryPoint[])
      .filter((p) => p && typeof p.t === 'number' && typeof p.v === 'number' && p.t >= cutoff)
      .sort((a, b) => a.t - b.t)
  } catch {
    return []
  }
}

export function recordSnapshot(value: number, at = Date.now()): HistoryPoint[] {
  const points = loadHistory()
  const last = points[points.length - 1]
  let next: HistoryPoint[]
  if (last && at - last.t < BUCKET) {
    // Same five-minute bucket: move the point to the newest value so the right edge of
    // the chart tracks the wallet instead of freezing the first reading of the window.
    next = [...points.slice(0, -1), { t: at, v: value }]
  } else {
    next = [...points, { t: at, v: value }]
  }
  if (next.length > MAX_POINTS) next = next.slice(-MAX_POINTS)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage is optional */
  }
  return next
}

export function sliceRange(points: HistoryPoint[], range: '1D' | '1W' | '1M'): HistoryPoint[] {
  const span = range === '1D' ? 24 * HOUR : range === '1W' ? 7 * 24 * HOUR : 30 * 24 * HOUR
  const from = Date.now() - span
  const kept = points.filter((p) => p.t >= from)
  // keep one trailing point from before the window so the line reaches the left edge
  const before = points.filter((p) => p.t < from).slice(-1)
  return [...before, ...kept]
}

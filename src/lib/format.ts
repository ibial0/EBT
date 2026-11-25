import { formatUnits, parseUnits } from 'viem'

export function shortAddr(a?: string | null, n = 4): string {
  if (!a) return ''
  return `${a.slice(0, 2 + n)}…${a.slice(-n)}`
}

export function fmt(raw: bigint | undefined, decimals = 18, maxFrac = 6): string {
  if (raw == null) return '-'
  const s = formatUnits(raw, decimals)
  const [w, f = ''] = s.split('.')
  if (!f) return w
  const firstSig = f.search(/[1-9]/)
  if (firstSig === -1) return w
  // Keep at least four significant digits, so a small amount never collapses to
  // "0.000001" and never rounds away to zero.
  const keep = Math.max(maxFrac, firstSig + 4)
  const t = f.slice(0, keep).replace(/0+$/, '')
  return t ? `${w}.${t}` : w
}

export function safeParseUnits(value: string, decimals: number): bigint {
  if (!value || !/^\d*\.?\d*$/.test(value)) return 0n
  try {
    return parseUnits(value as `${number}`, decimals)
  } catch {
    return 0n
  }
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function clock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function pct(bps: number | null | undefined, digits = 2): string {
  if (bps == null) return '-'
  return `${(bps / 100).toFixed(digits)}%`
}

export function bpsLabel(fee: number): string {
  return `${fee / 10000}%`
}

export function copy(text: string) {
  try {
    void navigator.clipboard.writeText(text)
  } catch {
    /* clipboard unavailable */
  }
}


import { CHAINS } from '../src/config/chains'
const out: any[] = []
const queue = [...CHAINS]
async function worker() {
  for (;;) {
    const c = queue.shift(); if (!c) return
    const base = c.viem.blockExplorers?.default?.url
    if (!base) { out.push({ id: c.id, name: c.name, base: null, hits: [] }); continue }
    const hits: any[] = []
    for (const q of ['UniswapV3Factory', 'UniswapV2Factory', 'PancakeFactory', 'QuickSwapFactory']) {
      try {
        const r = await fetch(`${base.replace(/\/$/, '')}/api/v2/search?q=${q}`, { signal: AbortSignal.timeout(12000) })
        if (!r.ok) continue
        const j: any = await r.json()
        for (const it of (j.items ?? []).slice(0, 3)) {
          if (it.type === 'contract' || it.address) hits.push({ q, name: it.name, address: it.address })
        }
      } catch {}
    }
    out.push({ id: c.id, name: c.name, base, hits })
  }
}
await Promise.all(Array.from({ length: 8 }, worker))
console.log(JSON.stringify(out))

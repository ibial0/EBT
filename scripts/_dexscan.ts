
import { CHAINS } from '../src/config/chains'
import { createPublicClient, http } from 'viem'
const FACTORIES: Record<string, `0x${string}`> = {
  uniV3: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  uniV2: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
  sushiV2: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
  pancaV2: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
}
const out: any[] = []
const queue = [...CHAINS]
async function worker() {
  for (;;) {
    const c = queue.shift(); if (!c) return
    const rpc = c.viem.rpcUrls.default.http[0]
    const client = createPublicClient({ transport: http(rpc, { timeout: 12000, retryCount: 0 }) })
    const found: string[] = []
    let block: number | null = null
    try { block = Number(await client.getBlockNumber()) } catch {}
    for (const [name, addr] of Object.entries(FACTORIES)) {
      try {
        const code = await client.getCode({ address: addr })
        if (code && code !== '0x') found.push(name)
      } catch {}
    }
    if (c.uniswap?.factory) found.push('cfgV3')
    if (c.dexV2?.length) found.push('cfgV2')
    out.push({ id: c.id, name: c.name, rpc, block, factories: found, cfgUniswap: !!c.uniswap })
  }
}
await Promise.all(Array.from({ length: 8 }, worker))
out.sort((a,b)=>a.id-b.id)
console.log(JSON.stringify(out, null, 0))

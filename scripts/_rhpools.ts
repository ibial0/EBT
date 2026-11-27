
import { createPublicClient, http, parseAbi } from 'viem'
const c = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com', { timeout: 20000 }) })
const F = '0x911b4000D3422F482F4062a913885f7b035382Df'
const toks = {
  USDG: '0x8F9231B0F448bA9AD045348437458721676c23BC',
  WETH: '0x33e4191705c386532ba27cBF171Db86919200B94',
  USDC: '0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F',
  LINK: '0xD610B8f58689de7755947C05342A2DFaC30ebD57',
  SYN:  '0xC5124C846c6e6307986988dFb7e743327aA05F19',
}
const abi = parseAbi(['function getPool(address,address,uint24) view returns (address)'])
const P = parseAbi(['function liquidity() view returns (uint128)'])
const E = parseAbi(['function balanceOf(address) view returns (uint256)'])
const n = Object.keys(toks)
for (const a of n) for (const b of n) {
  if (a >= b) continue
  for (const fee of [100, 500, 3000, 10000]) {
    try {
      const pool = await c.readContract({ address: F, abi, functionName: 'getPool', args: [toks[a], toks[b], fee] })
      if (pool === '0x0000000000000000000000000000000000000000') continue
      const liq = await c.readContract({ address: pool, abi: P, functionName: 'liquidity' }).catch(()=>0n)
      const ba = await c.readContract({ address: toks[a], abi: E, functionName: 'balanceOf', args: [pool] }).catch(()=>0n)
      const bb = await c.readContract({ address: toks[b], abi: E, functionName: 'balanceOf', args: [pool] }).catch(()=>0n)
      console.log(`${a}/${b} fee=${fee} pool=${pool} liq=${liq} ${a}=${ba} ${b}=${bb}`)
    } catch {}
  }
}


import { createPublicClient, http, parseAbi, formatUnits } from 'viem'
const c = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com', { timeout: 15000 }) })
const A = parseAbi(['function symbol() view returns (string)','function name() view returns (string)','function decimals() view returns (uint8)','function totalSupply() view returns (uint256)'])
const addr = '0x8F9231B0F448bA9AD045348437458721676c23BC'
for (const f of ['symbol','name','decimals','totalSupply'] as const) {
  try {
    const v = await c.readContract({ address: addr, abi: A, functionName: f })
    console.log(f, v?.toString())
  } catch (e) { console.log(f, 'ERR', (e.shortMessage||e.message).slice(0,80)) }
}

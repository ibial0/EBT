
import { createPublicClient, http, parseAbi } from 'viem'
const chains = {
  sepolia: { rpc: 'https://ethereum-sepolia-rpc.publicnode.com', usdcPool: '0x4985b8fcEA3659FD801a5b857dA1D00e985863F0' },
  arbSep: { rpc: 'https://sepolia-rollup.arbitrum.io/rpc', usdcPool: '0x543BdA7c6cA4384FE90B1F5929bb851F52888983' },
  opSep: { rpc: 'https://sepolia.optimism.io', usdcPool: '0x314B753272a3C79646b92A87dbFDEE643237033a' },
}
const abi = parseAbi(['function token() view returns (address)', 'function sharedDecimals() view returns (uint8)'])
for (const [k, c] of Object.entries(chains)) {
  const cl = createPublicClient({ transport: http(c.rpc, { timeout: 15000 }) })
  try {
    const t = await cl.readContract({ address: c.usdcPool, abi, functionName: 'token' })
    const sd = await cl.readContract({ address: c.usdcPool, abi, functionName: 'sharedDecimals' }).catch(()=> '?')
    console.log(k, 'usdc token', t, 'sharedDecimals', String(sd))
  } catch (e) { console.log(k, 'ERR', (e.shortMessage||e.message).slice(0,80)) }
}

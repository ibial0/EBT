
import { createPublicClient, http, formatEther } from 'viem'
const c = createPublicClient({ transport: http('https://sepolia-rollup.arbitrum.io/rpc', { timeout: 15000 }) })
console.log('arbSep balance', formatEther(await c.getBalance({ address: '0x4f619f3e940C75DE719719B7A0638d2C7dadF0a5' })))

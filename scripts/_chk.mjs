
import { createPublicClient, http, formatEther } from 'viem'
const A='0x4f619f3e940C75DE719719B7A0638d2C7dadF0a5'
const c = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const bal = await c.getBalance({ address: A })
const nonce = await c.getTransactionCount({ address: A })
console.log('robinhood balance', formatEther(bal), 'nonce', nonce)

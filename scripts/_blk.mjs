
import { createPublicClient, http } from 'viem'
const l2 = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const b = await l2.getBlock({ blockHash: '0x037f3b6089600e6a57a38429f7d940d3dbb60fffc55388bf60ba71f5ceef1a37' })
console.log(Object.keys(b).join(','))
console.log('sendCount', b.sendCount, 'sendRoot', b.sendRoot, 'l1BlockNumber', b.l1BlockNumber)
const raw = await l2.request({ method: 'eth_getBlockByHash', params: [b.hash, false] })
console.log('extra keys', Object.keys(raw).filter(k => !['transactions','uncles','withdrawals'].includes(k)).join(','))
console.log('raw sendCount', raw.sendCount, 'raw sendRoot', raw.sendRoot)

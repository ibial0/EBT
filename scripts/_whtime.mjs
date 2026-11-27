
import { createPublicClient, http } from 'viem'
const c = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const tx = await c.getTransaction({ hash: '0x2450bcb3263cd61c016771fb7e172ab41b5155d6bd9a188b6291cf36efd4d227' })
const b = await c.getBlock({ blockNumber: tx.blockNumber })
console.log('block', tx.blockNumber.toString(), 'ts', b.timestamp.toString(), new Date(Number(b.timestamp)*1000).toISOString())
console.log('now', new Date().toISOString())

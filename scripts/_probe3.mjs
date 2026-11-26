
import { createPublicClient, http, parseAbi } from 'viem'
const l1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const ROLLUP = '0xdc5F8E399DBd8a9F5F87AeC4C23Beb12431b386D'
const sigs = ['function outbox() view returns (address)','function outboxAddress() view returns (address)','function challengeManager() view returns (address)','function owner() view returns (address)','function sequencerInbox() view returns (address)','function inbox() view returns (address)','function rollupOwner() view returns (address)']
for (const s of sigs) {
  try { const r = await l1.readContract({ address: ROLLUP, abi: parseAbi([s]), functionName: s.split(' ')[1].split('(')[0] }); console.log(s, '→', r) } catch(e){ console.log(s, 'x', (e.shortMessage||e.message).slice(0,60)) }
}

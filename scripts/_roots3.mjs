
import { createPublicClient, http, parseAbi } from 'viem'
const l1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const OUTBOX = '0x8D180Caf588f3Da027BEf1F42a106Da93F90b166'
const ROLLUP = '0xdc5F8E399DBd8a9F5F87AeC4C23Beb12431b386D'
const abi = parseAbi([
  'function roots(bytes32) view returns (bytes32)',
  'function rollup() view returns (address)',
  'function bridge() view returns (address)',
  'function isSpent(uint256) view returns (bool)',
])
const roots = ['0x8a833d22' , '0x9684c9a5', '0x37369616']
for (const r of roots) {
  const full = r.padEnd(66, '0')
  console.log(r, '->', await l1.readContract({ address: OUTBOX, abi, functionName: 'roots', args: [full] }))
}
for (const fn of ['rollup', 'bridge']) {
  try { console.log(fn, await l1.readContract({ address: OUTBOX, abi, functionName: fn })) } catch (e) { console.log(fn, 'ERR', e.message.slice(0,60)) }
}
const code = await l1.getCode({ address: OUTBOX })
console.log('outbox code bytes', (code.length - 2) / 2)
const rollupAbi = parseAbi(['function outbox() view returns (address)', 'function bridge() view returns (address)', 'function latestConfirmed() view returns (bytes32)'])
console.log('rollup.outbox', await l1.readContract({ address: ROLLUP, abi: rollupAbi, functionName: 'outbox' }))
console.log('rollup.bridge', await l1.readContract({ address: ROLLUP, abi: rollupAbi, functionName: 'bridge' }))

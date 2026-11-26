
import { createPublicClient, http, parseAbi } from 'viem'
const l1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const ROLLUP = '0xdc5F8E399DBd8a9F5F87AeC4C23Beb12431b386D'
const abi = parseAbi(['function bridge() view returns (address)', 'function latestConfirmed() view returns (bytes32)'])
let bridge
try { bridge = await l1.readContract({ address: ROLLUP, abi, functionName: 'bridge' }); console.log('bridge', bridge) } catch(e){ console.log('bridge fail', e.shortMessage) }
if (bridge) {
  const bAbi = parseAbi(['function activeOutbox() view returns (address)', 'function rollup() view returns (address)'])
  for (const fn of ['activeOutbox','rollup']) {
    try { console.log(fn, await l1.readContract({ address: bridge, abi: bAbi, functionName: fn })) } catch(e){ console.log(fn,'fail', e.shortMessage) }
  }
}
try { console.log('latestConfirmed', await l1.readContract({ address: ROLLUP, abi, functionName: 'latestConfirmed' })) } catch(e){ console.log('lc fail', e.shortMessage) }

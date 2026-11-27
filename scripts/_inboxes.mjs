
import { createPublicClient, http, parseAbi } from 'viem'
const PARENT_RPC = {
  11155111: 'https://ethereum-sepolia-rpc.publicnode.com',
  84532: 'https://sepolia.base.org',
  421614: 'https://sepolia-rollup.arbitrum.io/rpc',
}
// chainId, parentId, inbox
const rows = [
 [46630,11155111,'0xF2939afA86F6f933A3CE17fCAB007907B6b0B7a4'],
 [79479957,11155111,'0x46C42Cf5127ffd6dE2d9f231173C6d81E5010726'],
 [7080969,11155111,'0x5AAa02fa6A405329CAe9b7F6D744f73CB20bFe2e'],
 [98867,11155111,'0xb48cdff890199f5De31514024B95F8664F8Af222'],
 [1962,11155111,'0xCb47f0bb29f44e00fbb00324f0E104330Ee1072F'],
 [843843,11155111,'0xb0579056c22aD1fF85a1288f82089B1205447613'],
 [181228,11155111,'0xAAD45a7bF65b43E56767CdE3Ab84A5433c714Afc'],
 [681,11155111,'0x574DB42697C40492ED620441AA5Ca633E06d1B47'],
 [704852,11155111,'0xb78614a722431f15F47bCd873e48A5B1cf9983b1'],
 [4221,11155111,'0x0f76cf640B349bA9D66DB844CF420c138C43d49A'],
 [323432,84532,'0xa5099f144FA1ed4A74a6E6dFc6Bb1B4E514FD061'],
 [37714555429,421614,'0x6396825803B720bc6A43c63caa1DcD7B31EB4dd0'],
 [33431,421614,'0x784702Ec0D8E1CA4B3a062230F2cf748841560F7'],
]
const abi = parseAbi(['function nativeToken() view returns (address)', 'function bridge() view returns (address)'])
for (const [cid, pid, inbox] of rows) {
  const c = createPublicClient({ transport: http(PARENT_RPC[pid], { timeout: 15000 }) })
  try {
    const nt = await c.readContract({ address: inbox, abi, functionName: 'nativeToken' }).catch(e => 'ERR')
    console.log(cid, 'nativeToken', nt, typeof nt === 'string' && nt !== 'ERR' && nt !== '0x0000000000000000000000000000000000000000' ? 'ERC20-INBOX (no ETH deposit)' : 'ETH inbox?')
  } catch (e) { console.log(cid, 'ERR', e.message.slice(0,60)) }
}

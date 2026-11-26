
import { createPublicClient, http, parseAbi } from 'viem'
const PARENT_RPC = {
  11155111: 'https://ethereum-sepolia-rpc.publicnode.com',
  84532: 'https://sepolia.base.org',
  421614: 'https://sepolia-rollup.arbitrum.io/rpc',
}
const entries = [
  [46630, 11155111, '0xdc5F8E399DBd8a9F5F87AeC4C23Beb12431b386D'],
  [79479957, 11155111, '0x82332BE0ef83A2b7Df91DCDCF481c393455E0D31'],
  [7080969, 11155111, '0x627E5adAA60F15Ed29e16F4e18e481F878d76376'],
  [98867, 11155111, '0x3B37BeD1c38c6283A56E60340FE813C0BBA031C3'],
  [1962, 11155111, '0x82ea947bB006690667225099cDf87D03A2dd56dC'],
  [843843, 11155111, '0x2A419230ACA266F4BCddE349936871C6e622529d'],
  [181228, 11155111, '0x537F6A3606cb000aE568005bebAF8bd1Ea2DE3b6'],
  [681, 11155111, '0xb4d897FFc6b163414C36A470E5c3B9AE8a4e784E'],
  [704852, 11155111, '0xdc57101751220C05f401b9C7982B183A11B7D173'],
  [4221, 11155111, '0x96cb416A3defB4Ec596e23806581Eb02f6def71a'],
  [323432, 84532, '0xEE0e953FEF4733e93E228207a1DdFDcEDFD650F6'],
  [37714555429, 421614, '0xeedE9367Df91913ab149e828BDd6bE336df2c892'],
  [33431, 421614, '0x244935dedb20c68df097abd384b4eff531457867'],
]
const abi = parseAbi([
  'function outbox() view returns (address)',
  'function inbox() view returns (address)',
  'function bridge() view returns (address)',
])
const outboxAbi = parseAbi(['function OUTBOX_VERSION() view returns (uint128)', 'function rollup() view returns (address)'])
for (const [chainId, parentId, rollup] of entries) {
  const rpc = PARENT_RPC[parentId]
  if (!rpc) { console.log(chainId, 'no rpc for parent', parentId); continue }
  const c = createPublicClient({ transport: http(rpc) })
  try {
    const ob = await c.readContract({ address: rollup, abi, functionName: 'outbox' })
    const code = await c.getCode({ address: ob })
    const ver = code && code !== '0x' ? await c.readContract({ address: ob, abi: outboxAbi, functionName: 'OUTBOX_VERSION' }).catch(() => '?') : 'no-code'
    const r2 = code && code !== '0x' ? await c.readContract({ address: ob, abi: outboxAbi, functionName: 'rollup' }).catch(() => '?') : '?'
    console.log(chainId, 'parent', parentId, 'outbox', ob, 'ver', String(ver), 'rollupMatches', String(r2).toLowerCase() === rollup.toLowerCase())
  } catch (e) {
    console.log(chainId, 'parent', parentId, 'ERR', e.message.slice(0, 70))
  }
}

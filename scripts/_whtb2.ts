
import { createPublicClient, http, parseAbi } from 'viem'
const TB = parseAbi(['function chainId() view returns (uint16)','function bridge() view returns (address)','function isWrappedAsset(address) view returns (bool)','function fee() view returns (uint256)'])
const rows = [
  ['sepolia', 'https://ethereum-sepolia-rpc.publicnode.com', '0xDB5492265f6038831E89f495670FF909aDe94bd9', '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', '0x779877A7B0D9E8603169DdbD7836e478b4624789'],
  ['arbSep', 'https://sepolia-rollup.arbitrum.io/rpc', '0xC7A204bDBFe983FCD8d8E61D02b475D4073fF97e', '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', '0xb1D4538B4571d411F07960EF2838Ce337FE1E80E'],
  ['baseSep', 'https://sepolia.base.org', '0x86F55A04690fd7815A3D802bD587e83eA888B239', '0x036CbD53842c5426634e7929541eC2318f3dCF7e', '0xE4aB69C077896252FAFBD49EFD26B5D171A32410'],
  ['opSep', 'https://sepolia.optimism.io', '0x99737Ec4B815d816c49A385943baf0380e75c0Ac', '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', '0xE4aB69C077896252FAFBD49EFD26B5D171A32410'],
]
for (const [n, rpc, tb, usdc, link] of rows) {
  const c = createPublicClient({ transport: http(rpc, { timeout: 15000 }) })
  const out: any = {}
  for (const [k, fn, arg] of [['chainId','chainId',null],['fee','fee',null],['usdcWrapped','isWrappedAsset',usdc],['linkWrapped','isWrappedAsset',link]] as const) {
    try {
      out[k] = String(await c.readContract({ address: tb as `0x${string}`, abi: TB, functionName: fn, args: arg ? [arg] : [] }))
    } catch (e) { out[k] = 'ERR:' + ((e as any).shortMessage || '').slice(0,30) }
  }
  console.log(n, JSON.stringify(out))
}

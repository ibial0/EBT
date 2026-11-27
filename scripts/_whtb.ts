
import { createPublicClient, http, parseAbi } from 'viem'
const TB = parseAbi(['function chainId() view returns (uint16)','function bridge() view returns (address)','function isWrappedAsset(address) view returns (bool)','function fee() view returns (uint256)'])
const rows = [
  ['sepolia', 'https://ethereum-sepolia-rpc.publicnode.com', '0x9517F0164c1d089ad72E669E57b9088790966dBd', '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', '0x779877A7B0D9E8603169DdbD7836e478b4624789'],
  ['arbSep', 'https://sepolia-rollup.arbitrum.io/rpc', '0x81b65A48DCAccBA04aCa3C055C4112b0715b90c0', '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', '0xb1D4538B4571d411F07960EF2838Ce337FE1E80E'],
  ['baseSep', 'https://sepolia.base.org', '0x720A59128B96Eda6EC2940c7899406E4dc56d0DC', '0x036CbD53842c5426634e7929541eC2318f3dCF7e', '0xE4aB69C077896252FAFBD49EFD26B5D171A32410'],
  ['opSep', 'https://sepolia.optimism.io', '0xcE1DE1eA4b040D324a07719043A6234C94fd0b5d', '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', '0xE4aB69C077896252FAFBD49EFD26B5D171A32410'],
]
for (const [n, rpc, tb, usdc, link] of rows) {
  const c = createPublicClient({ transport: http(rpc, { timeout: 15000 }) })
  const out: any = {}
  for (const [k, fn, arg] of [['chainId','chainId',null],['bridge','bridge',null],['fee','fee',null],['usdcWrapped','isWrappedAsset',usdc],['linkWrapped','isWrappedAsset',link]] as const) {
    try {
      // @ts-ignore
      out[k] = String(await c.readContract({ address: tb as `0x${string}`, abi: TB, functionName: fn, args: arg ? [arg] : [] }))
    } catch (e) { out[k] = 'ERR' }
  }
  console.log(n, JSON.stringify(out))
}

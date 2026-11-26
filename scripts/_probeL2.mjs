
import { createPublicClient, http, parseAbi } from 'viem'
const RPCS = {"79479957": "https://rpc-rollup.toronto.sx.technology", "7080969": "https://humanity-testnet.g.alchemy.com/public", "98867": "https://testnet-rpc.plume.org", "1962": "https://testnetrpc.trex.xyz", "843843": "https://galactica-cassiopeia.g.alchemy.com/public", "181228": "https://sepolia.hpp.io", "681": "https://jasmy-chain-testnet.alt.technology", "704852": "https://testnet-rpc.mars-chain.io", "4221": "https://rpc.testnet-chain.genlayer.com", "323432": "https://worldmobile-testnet.g.alchemy.com/public", "37714555429": "https://testnet-v2.xai-chain.net/rpc", "33431": "https://edge-testnet.g.alchemy.com/public", "46630": "https://rpc.testnet.chain.robinhood.com"}
const NODE = '0x00000000000000000000000000000000000000C8'
const ARBSYS = '0x0000000000000000000000000000000000000064'
const nodeAbi = parseAbi(['function constructOutboxProof(uint64 size, uint64 leaf) view returns (bytes32 send, bytes32 root, bytes32[] proof)'])
for (const [id, url] of Object.entries(RPCS)) {
  const c = createPublicClient({ transport: http(url, { timeout: 12000 }) })
  try {
    const chainId = await c.getChainId()
    const code = await c.getCode({ address: ARBSYS })
    let proof = 'n/a'
    try {
      const r = await c.readContract({ address: NODE, abi: nodeAbi, functionName: 'constructOutboxProof', args: [1n, 0n] })
      proof = 'ok len ' + r[2].length
    } catch (e) { proof = 'ERR ' + e.message.slice(0, 40) }
    console.log(id, 'chainId', chainId, 'arbSys', code && code !== '0x' ? 'yes' : 'NO', 'nodeInterface', proof)
  } catch (e) {
    console.log(id, 'UNREACHABLE', e.message.slice(0, 60))
  }
}

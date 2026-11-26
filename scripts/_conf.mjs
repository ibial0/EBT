
import { createPublicClient, http, parseAbi } from 'viem'
const l2 = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const NODE='0x00000000000000000000000000000000000000C8'
const abi = parseAbi(['function getL1Confirmations(bytes32 blockHash) view returns (uint64)'])
for (const h of ['0x037f3b6089600e6a57a38429f7d940d3dbb60fffc55388bf60ba71f5ceef1a37']) {
  console.log(h.slice(0,10), 'conf', (await l2.readContract({ address: NODE, abi, functionName: 'getL1Confirmations', args: [h] })).toString())
}
const head = await l2.getBlockNumber()
console.log('L2 head', head.toString())

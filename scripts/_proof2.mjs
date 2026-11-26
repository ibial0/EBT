
import { createPublicClient, http, parseAbi } from 'viem'
const l2 = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const NODE='0x00000000000000000000000000000000000000C8'
const abi = parseAbi(['function constructOutboxProof(uint64 size, uint64 leaf) view returns (bytes32 send, bytes32 root, bytes32[] proof)'])
for (const size of [294976n, 295100n, 295000n]) {
  try {
    const r = await l2.readContract({ address: NODE, abi, functionName: 'constructOutboxProof', args: [size, 294975n] })
    console.log(size.toString(), 'send', r[0].slice(0,10), 'root', r[1].slice(0,10), 'len', r[2].length)
  } catch (e) { console.log(size.toString(), 'err', (e.shortMessage||e.message).slice(0,80)) }
}

/**
 * Stargate V2 quote probe (read-only): proves the native pool answers for a destination eid.
 *   node --experimental-strip-types scripts/stargate-quote.mjs
 */
import { createPublicClient, http, parseEther, formatEther } from 'viem'
import { stargatePoolAbi, stargateSendParam, STARGATE_CHAINS } from '../src/lib/stargate.ts'

const RPC = 'https://ethereum-sepolia-rpc.publicnode.com'
const client = createPublicClient({ transport: http(RPC) })
const pool = STARGATE_CHAINS[11155111].nativePool
const to = '0x4f619f3e940C75DE719719B7A0638d2C7dadF0a5'
for (const dst of [421614, 11155420]) {
  const fee = await client.readContract({
    address: pool,
    abi: stargatePoolAbi,
    functionName: 'quoteSend',
    args: [stargateSendParam(STARGATE_CHAINS[dst].eid, to, parseEther('0.0005'), 0n), false],
  })
  console.log('Sepolia ->', dst, 'nativeFee', formatEther(fee.nativeFee), 'ETH')
}

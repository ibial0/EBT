
import { createPublicClient, http, parseAbi, pad } from 'viem'
const sepolia = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const POOL = '0x9Cc7e185162Aa5D1425ee924D97a87A0a34A0706'
const abi = parseAbi([
  'function quoteSend((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd) _sendParam, bool _payInLzToken) view returns ((uint256 nativeFee, uint256 lzTokenFee))',
  'function token() view returns (address)',
  'function sharedDecimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
])
const to = pad('0x4f619f3e940C75DE719719B7A0638d2C7dadF0a5', { size: 32 })
for (const dstEid of [40231, 40232]) {
  try {
    const fee = await sepolia.readContract({
      address: POOL, abi, functionName: 'quoteSend',
      args: [{ dstEid, to, amountLD: 10n ** 15n, minAmountLD: 0n, extraOptions: '0x', composeMsg: '0x', oftCmd: '0x' }, false],
    })
    console.log('dst', dstEid, 'nativeFee', fee[0].toString(), 'lzFee', fee[1].toString())
  } catch (e) { console.log('dst', dstEid, 'ERR', (e.shortMessage || e.message).slice(0, 110)) }
}
console.log('token', await sepolia.readContract({ address: POOL, abi, functionName: 'token' }).catch(() => '?'))
console.log('sharedDecimals', await sepolia.readContract({ address: POOL, abi, functionName: 'sharedDecimals' }).catch(() => '?'))
console.log('pool balance', (await sepolia.getBalance({ address: POOL })).toString())

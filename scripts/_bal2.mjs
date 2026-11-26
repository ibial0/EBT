
import { createPublicClient, http, formatEther, formatUnits, parseAbi } from 'viem'
const rh = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com') })
const se = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const A = '0x4f619f3e940C75DE719719B7A0638d2C7dadF0a5'
const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
const erc = parseAbi(['function balanceOf(address) view returns (uint256)'])
console.log('robinhood ETH', formatEther(await rh.getBalance({ address: A })))
console.log('sepolia ETH  ', formatEther(await se.getBalance({ address: A })))
console.log('sepolia USDC ', formatUnits(await se.readContract({ address: USDC, abi: erc, functionName: 'balanceOf', args: [A] }), 6))

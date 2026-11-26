
import { createPublicClient, http, formatEther, formatUnits, erc20Abi } from 'viem'
const A = process.env.ADDR
const nets = [
  ['Robinhood', 'https://rpc.testnet.chain.robinhood.com', 46630],
  ['Sepolia', 'https://ethereum-sepolia-rpc.publicnode.com', 11155111],
]
const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
for (const [name, url, id] of nets) {
  const c = createPublicClient({ transport: http(url) })
  const bal = await c.getBalance({ address: A })
  let usdc = 0n
  try { usdc = await c.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [A] }) } catch {}
  console.log(name, id, 'ETH', formatEther(bal), 'USDC', formatUnits(usdc, 6))
}

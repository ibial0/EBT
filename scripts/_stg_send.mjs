
import { readFileSync } from 'node:fs'
import { mnemonicToAccount } from 'viem/accounts'
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem'
import { stargatePoolAbi, stargateSendParam, STARGATE_CHAINS } from '../src/lib/stargate.ts'

const w = JSON.parse(readFileSync(new URL('../.test-wallet.json', import.meta.url), 'utf8'))
const account = mnemonicToAccount(w.mnemonic)
const RPC = 'https://ethereum-sepolia-rpc.publicnode.com'
const client = createPublicClient({ transport: http(RPC) })
const wallet = createWalletClient({ account, transport: http(RPC) })

const pool = STARGATE_CHAINS[11155111].nativePool
const dstEid = STARGATE_CHAINS[421614].eid
const amount = parseEther('0.0005')

const fee = await client.readContract({ address: pool, abi: stargatePoolAbi, functionName: 'quoteSend', args: [stargateSendParam(dstEid, account.address, amount, 0n), false] })
console.log('fee', formatEther(fee.nativeFee), 'balance', formatEther(await client.getBalance({ address: account.address })))

const hash = await wallet.writeContract({
  address: pool, abi: stargatePoolAbi, functionName: 'send',
  args: [stargateSendParam(dstEid, account.address, amount, 0n), { nativeFee: fee.nativeFee, lzTokenFee: 0n }, account.address],
  value: amount + fee.nativeFee, chain: null,
})
console.log('send tx', hash)
const rc = await client.waitForTransactionReceipt({ hash })
console.log('status', rc.status, 'gas', rc.gasUsed.toString())

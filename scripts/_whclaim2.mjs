
import { readFileSync } from 'node:fs'
import { mnemonicToAccount } from 'viem/accounts'
import { createPublicClient, createWalletClient, http, parseAbi, formatUnits, formatEther } from 'viem'
const w = JSON.parse(readFileSync(new URL('../.test-wallet.json', import.meta.url), 'utf8'))
const account = mnemonicToAccount(w.mnemonic)
const DST='https://sepolia.base.org'
const TB='0x86F55A04690fd7815A3D802bD587e83eA888B239'
const USDC='0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const EM='0xdb5492265f6038831e89f495670ff909ade94bd9'
const SEQ='344396'
const d = createPublicClient({ transport: http(DST) })
const wc = createWalletClient({ account, transport: http(DST) })
console.log('base eth', formatEther(await d.getBalance({address: account.address})))
const res = await fetch(`https://api.testnet.wormholescan.io/api/v1/vaas/10002/${EM}/${SEQ}`)
console.log('vaa', res.status)
const j = await res.json()
const raw = j?.data?.vaa
const hex = '0x' + Buffer.from(raw, 'base64').toString('hex')
console.log('vaa bytes', (hex.length-2)/2)
const abi = parseAbi(['function completeTransfer(bytes)'])
try {
  const hash = await wc.writeContract({ address: TB, abi, functionName: 'completeTransfer', args: [hex], chain: null })
  console.log('claim tx', hash)
  const rc = await d.waitForTransactionReceipt({ hash })
  console.log('claim status', rc.status)
  const bal = await d.readContract({ address: USDC, abi: parseAbi(['function balanceOf(address) view returns (uint256)']), functionName: 'balanceOf', args: [account.address] })
  console.log('base usdc', formatUnits(bal, 6))
} catch (e) { console.log('ERR', (e.shortMessage||e.message).slice(0,200)) }


import { readFileSync } from 'node:fs'
import { mnemonicToAccount } from 'viem/accounts'
import { createPublicClient, createWalletClient, http, parseAbi, parseUnits, formatUnits, pad } from 'viem'

const w = JSON.parse(readFileSync(new URL('../.test-wallet.json', import.meta.url), 'utf8'))
const account = mnemonicToAccount(w.mnemonic)
const SRC = 'https://ethereum-sepolia-rpc.publicnode.com'
const DST = 'https://sepolia.base.org'
const TB_SRC = '0xDB5492265f6038831E89f495670FF909aDe94bd9'
const TB_DST = '0x86F55A04690fd7815A3D802bD587e83eA888B239'
const USDC_SRC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
const USDC_DST = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const AMOUNT = parseUnits('0.5', 6)

const src = createPublicClient({ transport: http(SRC) })
const dst = createPublicClient({ transport: http(DST) })
const walletSrc = createWalletClient({ account, transport: http(SRC) })
const walletDst = createWalletClient({ account, transport: http(DST) })

const ERC20 = parseAbi(['function approve(address,uint256) returns (bool)','function allowance(address,address) view returns (uint256)','function balanceOf(address) view returns (uint256)'])
const TB = parseAbi(['function transferTokens(address,uint256,uint16,bytes32,uint256,uint32) payable returns (uint64)','function completeTransfer(bytes)'])

console.log('base usdc before', formatUnits(await dst.readContract({ address: USDC_DST, abi: ERC20, functionName: 'balanceOf', args: [account.address] }), 6))

const allowance = await src.readContract({ address: USDC_SRC, abi: ERC20, functionName: 'allowance', args: [account.address, TB_SRC] })
if (allowance < AMOUNT) {
  const h = await walletSrc.writeContract({ address: USDC_SRC, abi: ERC20, functionName: 'approve', args: [TB_SRC, AMOUNT], chain: null })
  console.log('approve', h)
  await src.waitForTransactionReceipt({ hash: h })
}

const nonce = Math.floor(Math.random() * 0xffffffff)
const hash = await walletSrc.writeContract({
  address: TB_SRC, abi: TB, functionName: 'transferTokens',
  args: [USDC_SRC, AMOUNT, 10004, pad(account.address, { size: 32 }), 0n, nonce], chain: null,
})
console.log('transfer tx', hash)
const rc = await src.waitForTransactionReceipt({ hash })
console.log('status', rc.status, 'gas', rc.gasUsed.toString())

// poll VAA
for (let i = 0; i < 120; i++) {
  await new Promise(r => setTimeout(r, 15000))
  const res = await fetch(`https://api.testnet.wormholescan.io/api/v1/transactions/${hash}`)
  if (!res.ok) { console.log('scan', res.status); continue }
  const j = await res.json()
  const raw = j?.vaa?.raw || j?.data?.vaa?.raw
  if (!raw) { console.log('#' + i, 'no vaa yet'); continue }
  const hex = raw.startsWith('0x') ? raw : '0x' + Buffer.from(raw, 'base64').toString('hex')
  console.log('#', i, 'VAA', hex.length, 'chars')
  const h2 = await walletDst.writeContract({ address: TB_DST, abi: TB, functionName: 'completeTransfer', args: [hex], chain: null })
  console.log('claim tx', h2)
  const rc2 = await dst.waitForTransactionReceipt({ hash: h2 })
  console.log('claim status', rc2.status)
  console.log('base usdc after', formatUnits(await dst.readContract({ address: USDC_DST, abi: ERC20, functionName: 'balanceOf', args: [account.address] }), 6))
  break
}

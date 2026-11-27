
import { readFileSync } from 'node:fs'
import { mnemonicToAccount } from 'viem/accounts'
import { createPublicClient, createWalletClient, http, parseAbi, formatUnits } from 'viem'
const w = JSON.parse(readFileSync(new URL('../.test-wallet.json', import.meta.url), 'utf8'))
const account = mnemonicToAccount(w.mnemonic)
const SRC = 'https://ethereum-sepolia-rpc.publicnode.com'
const DST = 'https://sepolia.base.org'
const TB_DST = '0x86F55A04690fd7815A3D802bD587e83eA888B239'
const USDC_DST = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const HASH = '0x2450bcb3263cd61c016771fb7e172ab41b5155d6bd9a188b6291cf36efd4d227'
const src = createPublicClient({ transport: http(SRC) })
const dst = createPublicClient({ transport: http(DST) })
const walletDst = createWalletClient({ account, transport: http(DST) })
const ERC20 = parseAbi(['function balanceOf(address) view returns (uint256)'])
const TB = parseAbi(['function completeTransfer(bytes)'])
const TOPIC = '0x6eb224fb001ed210e379b335e35efe88672a8ce935d981a6896b27ffdf52a3b2'
const rc = await src.getTransactionReceipt({ hash: HASH })
const log = rc.logs.find(l => l.topics[0] === TOPIC)
const emitter = '0x' + log.topics[1].slice(26)
const seq = BigInt(log.data.slice(0, 66)).toString()
console.log('emitter', emitter, 'seq', seq)
for (let i = 0; i < 150; i++) {
  const res = await fetch(`https://api.testnet.wormholescan.io/api/v1/vaas/10002/${emitter}/${seq}`)
  if (res.ok) {
    const j = await res.json()
    const raw = j?.data?.vaa ?? j?.vaa
    const hex = typeof raw === 'string' ? (raw.startsWith('0x') ? raw : '0x' + Buffer.from(raw, 'base64').toString('hex')) : null
    console.log('VAA ready len', hex && hex.length)
    if (hex) {
      const h2 = await walletDst.writeContract({ address: TB_DST, abi: TB, functionName: 'completeTransfer', args: [hex], chain: null })
      console.log('claim tx', h2)
      const rc2 = await dst.waitForTransactionReceipt({ hash: h2 })
      console.log('claim status', rc2.status)
      console.log('base usdc', formatUnits(await dst.readContract({ address: USDC_DST, abi: ERC20, functionName: 'balanceOf', args: [account.address] }), 6))
      break
    }
  } else {
    console.log('#' + i, res.status)
  }
  await new Promise(r => setTimeout(r, 20000))
}

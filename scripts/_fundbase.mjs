
import { readFileSync } from 'node:fs'
import { mnemonicToAccount } from 'viem/accounts'
import { createPublicClient, createWalletClient, http, parseEther, formatEther, parseAbi } from 'viem'
const w = JSON.parse(readFileSync(new URL('../.test-wallet.json', import.meta.url), 'utf8'))
const account = mnemonicToAccount(w.mnemonic)
const SRC='https://ethereum-sepolia-rpc.publicnode.com'
const DST='https://sepolia.base.org'
const PORTAL='0x49f53e41452C74589E85cA1677426Ba426459e85' // OP PortalProxy on Sepolia (standard)
const c = createPublicClient({ transport: http(SRC) })
const wc = createWalletClient({ account, transport: http(SRC) })
const d = createPublicClient({ transport: http(DST) })
console.log('sepolia', formatEther(await c.getBalance({address: account.address})), 'base', formatEther(await d.getBalance({address: account.address})))
const abi = parseAbi(['function depositTransaction(address _to, uint256 _value, uint64 _gasLimit, bool _isCreation, bytes _data) payable'])
const value = parseEther('0.0015')
try {
  const hash = await wc.writeContract({ address: PORTAL, abi, functionName: 'depositTransaction', args: [account.address, value, 120000n, false, '0x'], value, chain: null })
  console.log('deposit tx', hash)
  const rc = await c.waitForTransactionReceipt({ hash })
  console.log('status', rc.status)
} catch (e) { console.log('ERR', (e.shortMessage || e.message).slice(0, 160)) }

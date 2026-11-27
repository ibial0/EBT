
import { readFileSync } from 'node:fs'
import { mnemonicToAccount } from 'viem/accounts'
import { createPublicClient, http } from 'viem'
const w = JSON.parse(readFileSync(new URL('../.test-wallet.json', import.meta.url), 'utf8'))
const me = mnemonicToAccount(w.mnemonic).address
const L1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const OUTBOX = '0x8D180Caf588f3Da027BEf1F42a106Da93F90b166'
const TARGETS = [
  '0xbd4bfcf4efc752f343262993d93c0d021040fdc78e87a9d808e4b0b3bb88dd59',
  '0x1b3dc319cc77f502da95db29e04dd73e3b9c0c1c73d97690b7791c97eae1389c',
  '0xc1e3feab91c9bec909562ee08e86ef225bf1c7079e9808af73b523f055413df9',
]
const outboxSim = {
  abi: [{ name:'executeTransaction', type:'function', stateMutability:'nonpayable', inputs:[{type:'bytes32[]'},{type:'uint256'},{type:'address'},{type:'address'},{type:'uint256'},{type:'uint256'},{type:'uint256'},{type:'uint256'},{type:'bytes'}], outputs:[] }],
} as const
for (const tx of TARGETS) {
  const rc = await L1.getTransactionReceipt({ hash: tx as `0x${string}` })
  console.log(tx.slice(0,10), 'l1?', rc.status)
}

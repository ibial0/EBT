
import { createPublicClient, http } from 'viem'
const l1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const OUTBOX='0x8D180Caf588f3Da027BEf1F42a106Da93F90b166'
const code = await l1.getCode({ address: OUTBOX })
const hex = code.slice(2)
const sels = new Set()
for (let i = 0; i < hex.length - 10; i += 2) {
  if (hex.slice(i, i+2) === '63') { // PUSH4
    sels.add('0x' + hex.slice(i+2, i+10))
  }
}
console.log(JSON.stringify([...sels]))

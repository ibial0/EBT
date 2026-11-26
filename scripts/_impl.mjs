
import { createPublicClient, http } from 'viem'
const l1 = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const PROXY='0x8D180Caf588f3Da027BEf1F42a106Da93F90b166'
const SLOT='0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
const raw = await l1.getStorageAt({ address: PROXY, slot: SLOT })
const impl = '0x' + raw.slice(26)
console.log('impl', impl)
const code = await l1.getCode({ address: impl })
const hex = code.slice(2)
const sels = new Set()
for (let i = 0; i < hex.length - 10; i += 2) if (hex.slice(i, i+2) === '63') sels.add('0x' + hex.slice(i+2, i+10))
console.log('codebytes', hex.length/2)
console.log(JSON.stringify([...sels]))

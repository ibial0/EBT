/**
 * Regression test for the Arbitrum Orbit deposit path.
 *
 * The calldata is executed with eth_call against the live parent chain before anything is
 * wired into the UI, so this check fails if the Orbit deployment or the value formula
 * drifts. It also re-derives the formula that was read off real deposits.
 *
 *   npm run test:orbit
 */
import { createPublicClient, http, encodeFunctionData, parseAbi, type Address } from 'viem'
import { getChain } from '../src/config/chains'
import { ORBIT_BRIDGES } from '../src/config/orbit'
import { buildOrbitEthDeposit, buildOrbitErc20Deposit, orbitGasParams } from '../src/lib/arbitrumOrbit'
import { encodeAbiParameters } from 'viem'

const RPC = 'https://ethereum-sepolia-rpc.publicnode.com'
const l1 = createPublicClient({ transport: http(RPC, { timeout: 30000, retryCount: 1 }) })
const l2 = createPublicClient({ transport: http('https://rpc.testnet.chain.robinhood.com', { timeout: 30000, retryCount: 1 }) })

const cfg = ORBIT_BRIDGES[46630]
const ME = '0x17078d3B7F67f7207719B7E0f91656644425E58e' as Address
const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address

let pass = 0
const failures: string[] = []

if (!cfg) failures.push('Robinhood Chain testnet Orbit config missing')
else {
  const from = getChain(cfg.parentChainId)!
  const to = getChain(cfg.chainId)!
  void from
  void to

  // 1. every deployed contract has bytecode
  const contracts: Array<[string, Address]> = [
    ['rollup', cfg.rollup],
    ['inbox', cfg.inbox],
    ['bridge', cfg.bridge],
    ['outbox', cfg.outbox],
    ['l1GatewayRouter', cfg.l1GatewayRouter],
    ['l1Erc20Gateway', cfg.l1Erc20Gateway],
    ['l1WethGateway', cfg.l1WethGateway],
  ]
  let codeOk = 0
  for (const [name, addr] of contracts) {
    const code = (await l1.getBytecode({ address: addr })) ?? '0x'
    if ((code.length - 2) / 2 > 0) codeOk++
    else failures.push(`${name} ${addr} has no bytecode on ${getChain(cfg.parentChainId)!.short}`)
  }
  if (codeOk === contracts.length) pass++

  // 2. gas params and the value formula
  const p = await orbitGasParams(l1, l2)
  const amount = 10n ** 16n
  const eth = buildOrbitEthDeposit(cfg, ME, amount, p)
  if (eth.value === amount + p.maxSubmissionCost + p.maxGas * p.gasPriceBid) pass++
  else failures.push(`ETH deposit value ${eth.value} != amount + submission + gas*fee`)

  // 3. the ETH calldata actually executes
  let simError: string | null = null
  const sim = await l1
    .call({ account: ME, to: eth.to, data: eth.data, value: eth.value })
    .then(() => true)
    .catch((e: { shortMessage?: string }) => {
      simError = e?.shortMessage ?? 'reverted'
      return false
    })
  if (sim) pass++
  else failures.push(`ETH deposit simulation reverted: ${simError ?? 'unknown'}`)

  // 4. ERC-20 calldata shape (value is fees only, user data encodes the submission cost)
  const erc = buildOrbitErc20Deposit(cfg, USDC, ME, 1_000_000n, p)
  if (erc.value === p.maxSubmissionCost + p.maxGas * p.gasPriceBid) pass++
  else failures.push('ERC-20 deposit value should be fees only')
  const userData = encodeAbiParameters([{ type: 'uint256' }, { type: 'bytes' }], [p.maxSubmissionCost, '0x'])
  if (encodeFunctionData({ abi: parseAbi(['function outboundTransfer(address,address,uint256,uint256,uint256,bytes)']), functionName: 'outboundTransfer', args: [USDC, ME, 1_000_000n, p.maxGas, p.gasPriceBid, userData] }) === erc.data) pass++
  else failures.push('ERC-20 calldata does not match the expected encoding')

  // 5. the gateway is registered for USDC on this Orbit chain
  const gateway = await l1.readContract({ address: cfg.l1GatewayRouter, abi: parseAbi(['function getGateway(address) view returns (address)']), functionName: 'getGateway', args: [USDC] })
  if (gateway !== '0x0000000000000000000000000000000000000000') pass++
  else failures.push('USDC has no gateway registered on the Robinhood router')

  console.log('=== Arbitrum Orbit bridge ===')
  console.log(`chain            : ${cfg.chainId} (parent ${cfg.parentChainId})`)
  console.log(`contracts w/code : ${codeOk}/${contracts.length}`)
  console.log(`ETH value        : ${eth.value} wei`)
  console.log(`ETH simulation   : ${sim ? 'ok' : 'REVERTED'}`)
  console.log(`USDC gateway     : ${gateway}`)
}

console.log(`\n=== ${pass}/6 orbit checks passed ===`)
if (failures.length) {
  console.log('FAILED: ' + failures.join(' | '))
  process.exit(1)
}

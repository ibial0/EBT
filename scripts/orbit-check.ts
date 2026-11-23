/**
 * Regression test for every Arbitrum Orbit deployment the app knows about.
 *
 * Two distinct inbox families exist and they are not interchangeable:
 *
 *   ETH-native Orbit chains (Robinhood, T-Rex, HPP Sepolia, Edge) deploy the standard
 *   EthInbox signature. The native ETH deposit calldata is executed with eth_call here and
 *   must succeed — a drifted address or value formula fails the build.
 *
 *   Every other Orbit chain deploys an ERC20Inbox whose createRetryableTicket takes an extra
 *   `tokenTotalFeeAmount` argument and prices the ticket in that chain's own gas token, so a
 *   plain ETH deposit does not exist there. Those chains must NOT be offered one.
 *
 *   npm run test:orbit
 */
import { createPublicClient, http, type Address } from 'viem'
import { ORBIT_BRIDGES, ORBIT_ETH_NATIVE } from '../src/config/orbit'
import { buildOrbitEthDeposit, buildOrbitErc20Deposit, orbitGasParams } from '../src/lib/arbitrumOrbit'

const PARENT_RPC: Record<number, string> = {
  11155111: 'https://ethereum-sepolia-rpc.publicnode.com',
  84532: 'https://sepolia.base.org',
  421614: 'https://sepolia-rollup.arbitrum.io/rpc',
}
const CHILD_RPC: Record<number, string> = {
  46630: 'https://rpc.testnet.chain.robinhood.com',
  79479957: 'https://rpc-rollup.toronto.sx.technology',
  7080969: 'https://humanity-testnet.g.alchemy.com/public',
  98867: 'https://testnet-rpc.plume.org',
  1962: 'https://testnetrpc.trex.xyz',
  843843: 'https://galactica-cassiopeia.g.alchemy.com/public',
  181228: 'https://sepolia.hpp.io',
  681: 'https://jasmy-chain-testnet.alt.technology',
  704852: 'https://testnet-rpc.mars-chain.io',
  4221: 'https://rpc.testnet-chain.genlayer.com',
  323432: 'https://worldmobile-testnet.g.alchemy.com/public',
  37714555429: 'https://testnet-v2.xai-chain.net/rpc',
  33431: 'https://edge-testnet.g.alchemy.com/public',
}

const ME = '0x17078d3B7F67f7207719B7E0f91656644425E58e' as Address
const USDC_SEP = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address

let pass = 0
const failures: string[] = []

const cfgs = Object.values(ORBIT_BRIDGES)
console.log('=== Arbitrum Orbit deployments ===')
for (const cfg of cfgs) {
  const parentRpc = PARENT_RPC[cfg.parentChainId]
  const childRpc = CHILD_RPC[cfg.chainId]
  if (!parentRpc || !childRpc) {
    failures.push(`${cfg.chainId}: no RPC configured for parent ${cfg.parentChainId} / child`)
    continue
  }
  const l1 = createPublicClient({ transport: http(parentRpc, { timeout: 30000, retryCount: 1 }) })
  const l2 = createPublicClient({ transport: http(childRpc, { timeout: 30000, retryCount: 1 }) })
  const ethNative = ORBIT_ETH_NATIVE.has(cfg.chainId)

  // 1. every contract we rely on must have bytecode on the parent chain
  const contracts: Array<[string, Address]> = [
    ['rollup', cfg.rollup],
    ['inbox', cfg.inbox],
    ['bridge', cfg.bridge],
    ['l1GatewayRouter', cfg.l1GatewayRouter],
    ['l1Erc20Gateway', cfg.l1Erc20Gateway],
  ]
  let codeOk = 0
  for (const [name, addr] of contracts) {
    const code = (await l1.getBytecode({ address: addr })) ?? '0x'
    if ((code.length - 2) / 2 > 0) codeOk++
    else failures.push(`${cfg.chainId} ${name} ${addr} has no bytecode on parent ${cfg.parentChainId}`)
  }
  if (codeOk === contracts.length) pass++

  const p = await orbitGasParams(l1, l2)
  const amount = 10n ** 15n

  // 2. ERC-20 deposits charge fees only; the token moves through an approval
  const erc = buildOrbitErc20Deposit(cfg, USDC_SEP, ME, 1_000_000n, p)
  if (erc.value === p.maxSubmissionCost + p.maxGas * p.gasPriceBid) pass++
  else failures.push(`${cfg.chainId}: ERC-20 deposit value should be fees only`)

  // 3. the native deposit path must match the inbox family
  const built = buildOrbitEthDeposit(cfg, ME, amount, p)
  const sim = await l1.call({ account: ME, to: built.to, data: built.data, value: built.value }).then(
    () => true,
    () => false,
  )
  if (ethNative) {
    if (built.value !== amount + p.maxSubmissionCost + p.maxGas * p.gasPriceBid) {
      failures.push(`${cfg.chainId}: ETH deposit value formula wrong`)
    }
    if (sim) pass++
    else failures.push(`${cfg.chainId}: ETH deposit simulation reverted but the chain is marked ETH-native`)
  } else {
    // an ERC20Inbox must reject the plain ETH ticket; offering it would strand funds
    if (!sim) pass++
    else failures.push(`${cfg.chainId}: plain ETH deposit unexpectedly succeeds on an ERC20Inbox chain`)
  }

  console.log(
    `${String(cfg.chainId).padEnd(12)} parent=${String(cfg.parentChainId).padEnd(8)} code=${codeOk}/${contracts.length} ethNative=${ethNative ? 'yes' : 'no '} ethSim=${sim ? 'ok' : 'revert'}`,
  )
}

const expected = cfgs.length * 3
console.log(`\n=== ${pass}/${expected} orbit checks passed across ${cfgs.length} chains ===`)
if (failures.length) {
  console.log('FAILED:\n' + failures.map((f) => ' - ' + f).join('\n'))
  process.exit(1)
}

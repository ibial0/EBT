
import { createPublicClient, http, encodeFunctionData, parseAbi } from 'viem'
const PARENT_RPC = { 84532: 'https://sepolia.base.org', 421614: 'https://sepolia-rollup.arbitrum.io/rpc' }
const rows = [
 [323432,84532,'0xa5099f144FA1ed4A74a6E6dFc6Bb1B4E514FD061'],
 [37714555429,421614,'0x6396825803B720bc6A43c63caa1DcD7B31EB4dd0'],
 [33431,421614,'0x784702Ec0D8E1CA4B3a062230F2cf748841560F7'],
]
const SENDER = '0x4f619f3e940C75DE719719B7A0638d2C7dadF0a5'
const inboxAbi = parseAbi(['function createRetryableTicket(address to, uint256 l2CallValue, uint256 maxSubmissionCost, address excessFeeRefundAddress, address callValueRefundAddress, uint256 gasLimit, uint256 maxFeePerGas, bytes data) payable returns (uint256)'])
const amount = 10n ** 15n, sub = 2n * 10n ** 14n, maxGas = 1000000n, gasPrice = 10n ** 9n
for (const [cid, pid, inbox] of rows) {
  const c = createPublicClient({ transport: http(PARENT_RPC[pid], { timeout: 15000 }) })
  const data = encodeFunctionData({ abi: inboxAbi, functionName: 'createRetryableTicket', args: [SENDER, amount, sub, SENDER, SENDER, maxGas, gasPrice, '0x'] })
  try {
    await c.call({ account: SENDER, to: inbox, data, value: amount + sub + maxGas * gasPrice, stateOverride: [{ address: SENDER, balance: 10n ** 19n }] })
    console.log(cid, 'ETH-DEPOSIT OK (with balance override)')
  } catch (e) {
    console.log(cid, 'revert —', (e.shortMessage || e.message).slice(0, 90))
  }
}

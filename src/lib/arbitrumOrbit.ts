/**
 * Arbitrum Orbit canonical bridge: deposits from a parent chain into an Orbit chain.
 *
 * An Orbit chain is not an OP Stack chain, so the OP portal does not apply. Deposits go
 * through the Arbitrum gateway set deployed on the parent chain:
 *
 *   ETH    Inbox.createRetryableTicket{value: amount + maxSubmissionCost + gasLimit*maxFeePerGas}
 *          native ETH retryable ticket; one signature; no wrapped asset required.
 *   ERC-20 L1GatewayRouter.outboundTransfer{value: maxSubmissionCost + maxGas*gasPriceBid}
 *          one token approval plus one deposit. The user data encodes the submission cost.
 *
 * Both value formulas were confirmed against real deposits on the parent chain, and the
 * ETH calldata was executed successfully in an eth_call simulation before being wired in.
 *
 * Withdrawals require the 7-day challenge period and are deliberately not offered.
 */
import { encodeAbiParameters, encodeFunctionData, parseAbi } from 'viem'
import type { Address, ChainCfg } from '../config/chains'
import { getChain } from '../config/chains'
import { ORBIT_BRIDGES, orbitBridgeFor, type OrbitBridgeCfg } from '../config/orbit'
import type { TokenCfg } from '../config/tokens'

export const orbitInboxAbi = parseAbi([
  'function createRetryableTicket(address to, uint256 l2CallValue, uint256 maxSubmissionCost, address excessFeeRefundAddress, address callValueRefundAddress, uint256 gasLimit, uint256 maxFeePerGas, bytes data) payable returns (uint256)',
])

export const orbitRouterAbi = parseAbi([
  'function outboundTransfer(address _token, address _to, uint256 _amount, uint256 _maxGas, uint256 _gasPriceBid, bytes _data) payable returns (bytes)',
  'function getGateway(address l1Token) view returns (address)',
  'function defaultGateway() view returns (address)',
])

export const orbitGatewayAbi = parseAbi(['function calculateL2TokenAddress(address l1Token) view returns (address)'])

const erc20ApproveAbi = parseAbi(['function approve(address spender, uint256 amount) returns (bool)'])

export interface OrbitGasParams {
  /** L1 cost of submitting the retryable ticket, refunded if overestimated */
  maxSubmissionCost: bigint
  /** L2 gas limit offered for the redemption */
  maxGas: bigint
  /** L2 gas price offered for the redemption */
  gasPriceBid: bigint
}

/** Deposit cost parameters. Overestimating is safe: the excess is refunded on L2. */
export async function orbitGasParams(l1: { getGasPrice: () => Promise<bigint> }, l2: { getGasPrice: () => Promise<bigint> }): Promise<OrbitGasParams> {
  const [l1Price, l2Price] = await Promise.all([l1.getGasPrice(), l2.getGasPrice()])
  const floor = 10n ** 8n // 0.1 gwei
  return {
    maxSubmissionCost: l1Price * 200_000n,
    maxGas: 300_000n,
    gasPriceBid: l2Price > floor ? l2Price : floor,
  }
}

export function buildOrbitEthDeposit(cfg: OrbitBridgeCfg, to: Address, amount: bigint, p: OrbitGasParams) {
  const data = encodeFunctionData({
    abi: orbitInboxAbi,
    functionName: 'createRetryableTicket',
    args: [to, amount, p.maxSubmissionCost, to, to, p.maxGas, p.gasPriceBid, '0x'],
  })
  return {
    to: cfg.inbox,
    data,
    value: amount + p.maxSubmissionCost + p.maxGas * p.gasPriceBid,
  }
}

export function buildOrbitErc20Deposit(
  cfg: OrbitBridgeCfg,
  token: Address,
  to: Address,
  amount: bigint,
  p: OrbitGasParams,
) {
  // the gateway reads (maxSubmissionCost, callHookData) out of the user data
  const userData = encodeAbiParameters([{ type: 'uint256' }, { type: 'bytes' }], [p.maxSubmissionCost, '0x'])
  const data = encodeFunctionData({
    abi: orbitRouterAbi,
    functionName: 'outboundTransfer',
    args: [token, to, amount, p.maxGas, p.gasPriceBid, userData],
  })
  return {
    to: cfg.l1GatewayRouter,
    data,
    value: p.maxSubmissionCost + p.maxGas * p.gasPriceBid,
  }
}

/** The gateway an Orbit chain registered for an L1 token (zero when it is not bridgeable). */
export async function orbitGateway(cfg: OrbitBridgeCfg, token: Address, client: { readContract: (a: never) => Promise<Address> }): Promise<Address | null> {
  const gateway = await (client.readContract as (a: never) => Promise<Address>)({
    address: cfg.l1GatewayRouter,
    abi: orbitRouterAbi,
    functionName: 'getGateway',
    args: [token],
  } as never)
  return gateway && gateway !== '0x0000000000000000000000000000000000000000' ? gateway : null
}

/** L2 representation of an L1 token on an Orbit chain (computed by the gateway). */
export async function orbitL2TokenAddress(
  cfg: OrbitBridgeCfg,
  gateway: Address,
  l1Token: Address,
  client: { readContract: (a: never) => Promise<Address> },
): Promise<Address | null> {
  const l2 = await (client.readContract as (a: never) => Promise<Address>)({
    address: gateway,
    abi: orbitGatewayAbi,
    functionName: 'calculateL2TokenAddress',
    args: [l1Token],
  } as never)
  return l2 && l2 !== '0x0000000000000000000000000000000000000000' ? l2 : null
}

export function approveCalldata(spender: Address, amount: bigint) {
  return encodeFunctionData({ abi: erc20ApproveAbi, functionName: 'approve', args: [spender, amount] })
}

/** Orbit chains that can be deposited into from `parentChainId`, with a name for the UI. */
export function orbitTargets(parentChainId: number): Array<{ cfg: OrbitBridgeCfg; chain: ChainCfg }> {
  return Object.values(ORBIT_BRIDGES)
    .filter((c) => c.parentChainId === parentChainId)
    .map((cfg) => ({ cfg, chain: getChain(cfg.chainId)! }))
    .filter((x) => Boolean(x.chain))
}

/** True when the destination is an Orbit chain settling to the source chain. */
export function orbitRouteExists(fromId: number, toId: number): boolean {
  const cfg = orbitBridgeFor(toId)
  return Boolean(cfg) && cfg!.parentChainId === fromId
}

export type { OrbitBridgeCfg }
export type { TokenCfg }

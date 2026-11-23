/**
 * Arbitrum Orbit canonical bridge deployments.
 *
 * An Orbit chain is an Arbitrum Nitro L2/L3 that settles to a parent chain. Its bridge is
 * NOT the Optimism OP Stack portal: deposits go through the Arbitrum gateway set deployed
 * on the parent chain. Every address below was read from the chain (bytecode present) and
 * cross-checked against the chain's own documentation.
 *
 * Two deposit paths exist and both are used here:
 *
 *   ETH    Inbox.createRetryableTicket{value: amount + submission + gas*fee}(...)
 *          a native ETH retryable ticket, one signature, no wrapped asset needed.
 *   ERC-20 L1GatewayRouter.outboundTransfer{value: submission + gas*fee}(token, ...)
 *          one approval plus one deposit.
 *
 * Withdrawals take the 7-day challenge period and are not offered.
 */
import type { Address } from './chains'

export interface OrbitBridgeCfg {
  /** the Orbit chain itself */
  chainId: number
  /** the chain the Orbit chain settles to */
  parentChainId: number
  rollup: Address
  inbox: Address
  bridge: Address
  outbox: Address
  l1GatewayRouter: Address
  l1Erc20Gateway: Address
  l1WethGateway: Address
  l1Weth: Address
  l2GatewayRouter: Address
  l2Weth: Address
  /** short note on where the addresses came from */
  source: string
}

export const ORBIT_BRIDGES: Record<number, OrbitBridgeCfg> = {
  // Robinhood Chain Testnet — Arbitrum Orbit chain settling to Ethereum Sepolia.
  // https://docs.robinhood.com/chain/protocol-contracts/
  46630: {
    chainId: 46630,
    parentChainId: 11155111,
    rollup: '0xdc5F8E399DBd8a9F5F87AeC4C23Beb12431b386D',
    inbox: '0xF2939afA86F6f933A3CE17fCAB007907B6b0B7a4',
    bridge: '0x96295BDad104eaD97cC08797b3dC68efF59CcF30',
    outbox: '0x8D180Caf588f3Da027BEf1F42a106Da93F90b166',
    l1GatewayRouter: '0xF6F11aAEE80875776C264d93B37B34cE437382D1',
    l1Erc20Gateway: '0x52C2976cbDEf48BcC51d07d3c523769F76ECBd09',
    l1WethGateway: '0x8f8A6799F2b1978c6586318543c73D8Fb12f218f',
    l1Weth: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    l2GatewayRouter: '0x77bF00A6A90c600f214b34BAFBB7918c0cF113A8',
    l2Weth: '0x7943e237c7F95DA44E0301572D358911207852Fa',
    source: 'https://docs.robinhood.com/chain/protocol-contracts/',
  },
}

/** Every Orbit chain that can be deposited into from `parentChainId`. */
export function orbitDepositTargets(parentChainId: number): OrbitBridgeCfg[] {
  return Object.values(ORBIT_BRIDGES).filter((c) => c.parentChainId === parentChainId)
}

export function orbitBridgeFor(chainId: number): OrbitBridgeCfg | null {
  return ORBIT_BRIDGES[chainId] ?? null
}

/** True when `fromId` is the parent of an Orbit chain and the deployment is usable. */
export function orbitBridgeAvailable(fromId: number, toId: number): boolean {
  const cfg = ORBIT_BRIDGES[toId]
  return Boolean(cfg) && cfg.parentChainId === fromId
}

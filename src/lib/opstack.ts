/**
 * OP Stack canonical bridge — ETH/ERC-20 deposits into any Superchain testnet whose
 * OptimismPortal is defined in viem's chain config (Base, OP, Unichain, Ink, World
 * Chain, GIWA …). This is the real, canonical L1→L2 deposit path — no extra protocol.
 *
 * Withdrawals need the 7-day challenge period, so v1 supports deposits only.
 */
import { parseAbi } from 'viem'
import type { Address, ChainCfg } from '../config/chains'
import { CHAINS, getChain } from '../config/chains'

export const L2_GAS_LIMIT = 1_000_000n

export function getPortalAddress(chain: ChainCfg): Address | null {
  const parent = chain.opStackParent
  if (!parent) return null
  const contracts = chain.viem.contracts as { portal?: Record<number, { address?: Address }> } | undefined
  return (contracts?.portal?.[parent]?.address as Address) ?? null
}

/** Every allowlisted chain that accepts a canonical deposit from `fromId`. */
export function opDepositTargets(fromId: number): ChainCfg[] {
  return CHAINS.filter((c) => c.opStackParent === fromId && getPortalAddress(c))
}

export function opStackBridgeAvailable(fromId: number, toId: number): boolean {
  const to = getChain(toId)
  if (!to) return false
  return to.opStackParent === fromId && Boolean(getPortalAddress(to))
}

export function depositArgs(to: string, mint: bigint) {
  return [to as Address, mint, L2_GAS_LIMIT, false, '0x' as `0x${string}`] as const
}

export const portalAbi = parseAbi([
  'function depositTransaction(address _to, uint256 _value, uint64 _gasLimit, bool _isCreation, bytes _data) payable',
])

/** L2 deposit transactions appear on the L2 ~1-3 min after L1 inclusion. */
export const DEPOSIT_ETA = '≈1–3 min after the L1 transaction is included'

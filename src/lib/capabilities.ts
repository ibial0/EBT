/**
 * Per-chain capability registry.
 *
 * A chain is not "supported" or "unsupported". Each feature is decided on its own
 * evidence, because the app keeps running into the opposite mistake: a chain that
 * can receive a bridge but has no swap venue, or a chain with a swap venue but no
 * bridge into it.
 *
 *   wallet      injected EVM wallet, true for every allowlisted chain
 *   native      native gas balance readable
 *   erc20       ERC-20 balances readable
 *   swap        a verified Uniswap deployment with at least one pool that holds liquidity
 *   bridgeUsdc  Circle CCTP v2 route in either direction
 *   bridgeEth   canonical OP Stack deposit from this chain's L1 parent
 *   crossChain  can be the destination of a bridge *and* has a swap venue for the second hop
 *   recovery    CCTP messages on this chain can be checked with usedNonces and finished
 */
import { CHAINS, getChain, type ChainCfg } from '../config/chains'
import { pairsForChain } from '../config/pools'
import { getPortalAddress } from './opstack'

export type Capability =
  | 'wallet'
  | 'native'
  | 'erc20'
  | 'swap'
  | 'bridgeUsdc'
  | 'bridgeEth'
  | 'crossChain'
  | 'recovery'

export type CapabilityState = 'yes' | 'partial' | 'no'

export interface CapabilityRow {
  key: Capability
  label: string
  state: CapabilityState
  note: string
}

const LABELS: Record<Capability, string> = {
  wallet: 'Wallet connection',
  native: 'Native balance',
  erc20: 'ERC-20 balances',
  swap: 'Same-chain swap',
  bridgeUsdc: 'USDC bridge (CCTP)',
  bridgeEth: 'ETH deposit (OP Stack)',
  crossChain: 'Cross-chain swap',
  recovery: 'Transfer recovery',
}

/** Chains that can be a CCTP counterpart, i.e. have a domain and a USDC deployment. */
const CCTP_COUNTERPART = new Set(CHAINS.filter((c) => c.cctpDomain != null && c.usdc).map((c) => c.id))

export function capabilitiesOf(chain: ChainCfg): CapabilityRow[] {
  const hasPools = pairsForChain(chain.id).length > 0
  const cctpPeer = chain.cctpDomain != null && chain.usdc
  const portal = chain.opStackParent != null ? getPortalAddress(chain) : null
  const canDepositEth = Boolean(portal) && chain.opStackParent != null
  const isL1Source = CHAINS.some((c) => c.opStackParent === chain.id && getPortalAddress(c))

  return [
    { key: 'wallet', label: LABELS.wallet, state: 'yes', note: 'Any injected EVM wallet. No separate account.' },
    { key: 'native', label: LABELS.native, state: 'yes', note: `Reads the chain's own gas token (${chain.viem.nativeCurrency.symbol}).` },
    {
      key: 'erc20',
      label: LABELS.erc20,
      state: 'yes',
      note: chain.nativeIsUsdc
        ? 'Arc USDC is the gas token; the 6-decimal ERC-20 view is read for display.'
        : 'Multicall3 where deployed, single reads otherwise.',
    },
    {
      key: 'swap',
      label: LABELS.swap,
      state: chain.uniswap ? (hasPools ? 'yes' : 'partial') : 'no',
      note: chain.uniswap
        ? hasPools
          ? `${pairsForChain(chain.id).length} verified pair${pairsForChain(chain.id).length === 1 ? '' : 's'} with real liquidity.`
          : 'Deployment verified, no pool currently holds liquidity.'
        : 'No Uniswap deployment with a bound router and liquidity was found.',
    },
    {
      key: 'bridgeUsdc',
      label: LABELS.bridgeUsdc,
      state: cctpPeer ? 'yes' : 'no',
      note: cctpPeer
        ? `CCTP domain ${chain.cctpDomain}, USDC ${chain.usdc?.slice(0, 10)}…`
        : 'Not a Circle CCTP chain, so USDC cannot be bridged here.',
    },
    {
      key: 'bridgeEth',
      label: LABELS.bridgeEth,
      state: canDepositEth ? 'yes' : isL1Source ? 'partial' : 'no',
      note: canDepositEth
        ? `Deposit through the canonical OptimismPortal on ${getChain(chain.opStackParent!)?.short}.`
        : isL1Source
          ? `Acts as the L1 source for ${CHAINS.filter((c) => c.opStackParent === chain.id).length} OP Stack testnet(s). Deposits out are not offered.`
          : 'No canonical portal on this chain and it is not an L1 source for any allowlisted chain.',
    },
    {
      key: 'crossChain',
      label: LABELS.crossChain,
      state: chain.uniswap && hasPools && CCTP_COUNTERPART.has(chain.id) ? 'yes' : chain.uniswap ? 'partial' : 'no',
      note:
        chain.uniswap && hasPools && CCTP_COUNTERPART.has(chain.id)
          ? 'Can receive USDC by CCTP and swap it locally.'
          : chain.uniswap
            ? 'Has a swap venue but no CCTP route, so it can only be a destination for assets that already exist here.'
            : 'No swap venue, so a cross-chain swap cannot finish here.',
    },
    {
      key: 'recovery',
      label: LABELS.recovery,
      state: cctpPeer ? 'yes' : 'no',
      note: cctpPeer
        ? 'usedNonces can be checked on chain and an attested message can be finished.'
        : 'Not a CCTP chain, there is nothing to recover.',
    },
  ]
}

export function capabilityMap(chain: ChainCfg): Record<Capability, CapabilityRow> {
  return Object.fromEntries(capabilitiesOf(chain).map((r) => [r.key, r])) as Record<Capability, CapabilityRow>
}

export function allCapabilities(): Array<{ chain: ChainCfg; rows: CapabilityRow[] }> {
  return CHAINS.map((chain) => ({ chain, rows: capabilitiesOf(chain) }))
}

/** Short badge list used by selectors. */
export function badgesFor(chain: ChainCfg): string[] {
  const caps = capabilityMap(chain)
  const out: string[] = []
  if (caps.swap.state === 'yes') out.push('SWAP')
  if (caps.bridgeUsdc.state === 'yes') out.push('CCTP')
  if (caps.bridgeEth.state === 'yes') out.push('ETH DEPOSIT')
  return out
}

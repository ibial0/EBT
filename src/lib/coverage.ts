/**
 * Bridge coverage matrix.
 *
 * Pure configuration, no RPC and no backend: "can something leave this chain, can something
 * arrive, and through which provider". It is the question the Overview page should answer,
 * and unlike a live pool scan it costs nothing to render.
 */
import { CHAINS, getChain, type ChainCfg } from '../config/chains'
import { ORBIT_BRIDGES, ORBIT_ETH_NATIVE } from '../config/orbit'
import { getPortalAddress } from './opstack'
import { ACROSS_SPOKE_POOLS } from './across'

export interface ProviderTag {
  key: 'cctp' | 'across' | 'portal' | 'orbit' | 'swap'
  label: string
}

const TAG: Record<ProviderTag['key'], string> = {
  cctp: 'CCTP',
  across: 'Across',
  portal: 'OP portal',
  orbit: 'Orbit',
  swap: 'Swap',
}

export interface ChainCoverage {
  chain: ChainCfg
  /** providers that can move an asset OUT of this chain */
  send: ProviderTag[]
  /** providers that can bring an asset INTO this chain */
  receive: ProviderTag[]
}

export function buildCoverage(): ChainCoverage[] {
  return CHAINS.map((c) => {
    const send: ProviderTag[] = []
    const receive: ProviderTag[] = []

    // Circle CCTP: USDC both ways, when the chain is on Circle's list with a USDC deployment
    if (c.cctpDomain != null && c.usdc) {
      send.push({ key: 'cctp', label: TAG.cctp })
      receive.push({ key: 'cctp', label: TAG.cctp })
    }

    // OP Stack canonical deposit, only from the L1 parent into its own L2
    if (c.opStackParent != null && getPortalAddress(c)) receive.push({ key: 'portal', label: TAG.portal })
    if (CHAINS.some((l2) => l2.opStackParent === c.id && getPortalAddress(l2))) {
      send.push({ key: 'portal', label: TAG.portal })
    }

    // Arbitrum Orbit deposit, only from the parent into an ETH-native Orbit chain
    if (ORBIT_ETH_NATIVE.has(c.id)) receive.push({ key: 'orbit', label: TAG.orbit })
    if (Object.values(ORBIT_BRIDGES).some((o) => o.parentChainId === c.id && ORBIT_ETH_NATIVE.has(o.chainId))) {
      send.push({ key: 'orbit', label: TAG.orbit })
    }

    // Across Protocol v3 fast relayer intents
    if (ACROSS_SPOKE_POOLS[c.id]) {
      send.push({ key: 'across', label: TAG.across })
      receive.push({ key: 'across', label: TAG.across })
    }

    // Verified same-chain DEX (Uniswap V3 / Synthra V3 / V2 AMM)
    if (c.uniswap || c.dexV2?.length) send.push({ key: 'swap', label: TAG.swap })

    return { chain: c, send, receive }
  })
}

/** Chains that can only be looked at: no provider moves value in or out. */
export function isolatedChains(rows: ChainCoverage[]): ChainCoverage[] {
  return rows.filter((r) => r.send.length === 0 && r.receive.length === 0)
}

export function coverageCounts(rows: ChainCoverage[]) {
  const canSend = rows.filter((r) => r.send.length > 0).length
  const canReceive = rows.filter((r) => r.receive.length > 0).length
  const both = rows.filter((r) => r.send.length > 0 && r.receive.length > 0).length
  return { total: rows.length, canSend, canReceive, both, isolated: rows.length - (canSend + canReceive - both) }
}

/** Chains that are the parent of an OP Stack or Orbit testnet, i.e. real L1 sources. */
export function parentChains(): number[] {
  const ids = new Set<number>()
  for (const c of CHAINS) {
    if (c.opStackParent != null) ids.add(c.opStackParent)
    const o = ORBIT_BRIDGES[c.id]
    if (o) ids.add(o.parentChainId)
  }
  return [...ids].filter((id) => Boolean(getChain(id)))
}

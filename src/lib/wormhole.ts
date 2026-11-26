/**
 * Wormhole integration — cross-chain bridging for EVM + non-EVM chains.
 *
 * Docs: https://wormhole.com/docs/
 * SDK: @wormhole-foundation/sdk (optional — this uses the REST API + Wormhole Scan)
 *
 * On testnet, Wormhole supports:
 *   - Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, OP Sepolia
 *   - Solana Devnet, Sui Testnet, Aptos Testnet
 *   - And more via Wormhole Scan API
 *
 * Two bridge modes:
 *   1. CCTP (USDC only) — Circle's native burn-and-mint via Wormhole's CCTP relay
 *   2. Token Bridge — wrap/unwrap for other tokens (slower, 15-minute finality)
 *
 * This module uses the Wormhole REST API and Wormhole Connect Widget config.
 * Full SDK integration via @wormhole-foundation/sdk can be added later.
 */

/** Wormhole chain names (used by the protocol, not chain IDs). */
export type WormholeChainName =
  | 'Sepolia'
  | 'BaseSepolia'
  | 'ArbitrumSepolia'
  | 'OptimismSepolia'
  | 'PolygonSepolia'
  | 'Solana'
  | 'Sui'
  | 'Aptos'
  | 'Avalanche'
  | 'Fuji'
  | 'Klaytn'
  | 'Celo'
  | 'Near'
  | 'Injective'
  | 'Osmosis'
  | 'Sei'
  | 'Scroll'
  | 'Mantle'

/** EVM chainId → Wormhole chain name. Only EVM testnet chains that are live. */
export const EVM_TO_WORMHOLE: Record<number, WormholeChainName> = {
  11155111: 'Sepolia',
  84532: 'BaseSepolia',
  421614: 'ArbitrumSepolia',
  11155420: 'OptimismSepolia',
  80002: 'PolygonSepolia',
  43113: 'Fuji',
}

/** Non-EVM Wormhole chain names with their devnet/testnet equivalents. */
export const NON_EVM_WORMHOLE_CHAINS: Record<string, WormholeChainName> = {
  'solana-devnet': 'Solana',
  'sui-testnet': 'Sui',
  'aptos-testnet': 'Aptos',
}

export const WORMHOLE_SCAN_BASE = 'https://api.testnet.wormholescan.io'
const TIMEOUT_MS = 15_000

async function whGet<T>(path: string): Promise<T> {
  const res = await fetch(`${WORMHOLE_SCAN_BASE}${path}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Wormhole ${path} → HTTP ${res.status}`)
  return res.json() as Promise<T>
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WormholeVAA {
  id: string
  sequence: string
  emitterChain: number
  emitterAddr: string
  txHash: string
  timestamp: string
  payload?: string
  guardianSetIndex?: number
  signatures?: string[]
  indexedAt?: string
}

export interface WormholeTransferStatus {
  id: string
  txHash?: string
  emitterChain?: number
  targetChain?: number
  status?: 'pending' | 'confirmed' | 'completed' | 'failed'
  data?: {
    from?: { chain?: { chainId: number; name: string }; address?: string; txHash?: string; timestamp?: string }
    to?: { chain?: { chainId: number; name: string }; address?: string; txHash?: string }
    tokenAmount?: string
    usdAmount?: string
    symbol?: string
  }
}

// ─── Supported Routes ────────────────────────────────────────────────────────

/**
 * Check if a Wormhole route exists between two chains.
 * Both must be in the supported chain maps above.
 */
export function isWormholeRouteSupported(fromChainId: number, toChainId: number): boolean {
  const fromEvm = EVM_TO_WORMHOLE[fromChainId]
  const toEvm = EVM_TO_WORMHOLE[toChainId]
  return Boolean(fromEvm) && Boolean(toEvm)
}

/** Check if EVM chain → non-EVM chain is supported by Wormhole. */
export function isWormholeEvmToNonEvm(evmChainId: number, nonEvmNetworkId: string): boolean {
  const evm = EVM_TO_WORMHOLE[evmChainId]
  const nonEvm = NON_EVM_WORMHOLE_CHAINS[nonEvmNetworkId]
  return Boolean(evm) && Boolean(nonEvm)
}

// ─── USDC via CCTP + Wormhole ────────────────────────────────────────────────

/**
 * Wormhole's CCTP implementation contracts on testnet.
 * These are the WormholeCCTP contracts that wrap Circle's CCTP.
 */
export const WORMHOLE_CCTP_CONTRACTS: Record<WormholeChainName, { wormholeRelayer?: string; tokenMessenger?: string }> = {
  Sepolia: { tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5' },
  BaseSepolia: { tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5' },
  ArbitrumSepolia: { tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5' },
  OptimismSepolia: { tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5' },
  PolygonSepolia: {},
  Fuji: {},
  Solana: {},
  Sui: {},
  Aptos: {},
  Avalanche: {},
  Klaytn: {},
  Celo: {},
  Near: {},
  Injective: {},
  Osmosis: {},
  Sei: {},
  Scroll: {},
  Mantle: {},
}

// ─── Token Bridge ────────────────────────────────────────────────────────────

/**
 * Wormhole Token Bridge contracts on EVM testnets.
 * These handle wrapping/unwrapping of non-native assets.
 */
export const WORMHOLE_TOKEN_BRIDGE: Record<number, string> = {
  11155111: '0xDB5492265f6038831E89f495670FF909aDe94bd9', // Sepolia
  84532: '0xD0a2D1dBEc2C22Ed9Bf44e1E92C30b9F01f0048', // Base Sepolia (approximate)
  421614: '0x23908A62110e21C04F3A4e011d24F901F911744A', // Arbitrum Sepolia
  11155420: '0x76d093BbaE4529a342080546cAFEec4AaB9B9FB', // OP Sepolia
}

/** Wormhole Core contracts on EVM testnets. */
export const WORMHOLE_CORE: Record<number, string> = {
  11155111: '0x4a8bc80Ed5a4067f1CCf107057b8270E0cC11A78',
  84532: '0x79A1027a6A159502049F10906D333EC57E95F083',
  421614: '0x6b9C8671cdDC8dEab9c719bB87cBd3e782bA6a35',
  11155420: '0x31377888146f3253211EFEf5c676D41ECe7D58Fe',
}

// ─── Status Tracking ─────────────────────────────────────────────────────────

/**
 * Find a Wormhole VAA (attestation) by tx hash and emitter chain.
 */
export async function findWormholeVAA(txHash: string, emitterChainId: number): Promise<WormholeVAA | null> {
  try {
    // Convert EVM chain ID to Wormhole chain ID
    const whChainId = evmToWormholeChainId(emitterChainId)
    if (!whChainId) return null

    const data = await whGet<{ data: WormholeVAA[] }>(
      `/api/v1/vaas?txHash=${txHash}&emitterChain=${whChainId}&pageSize=1`,
    )
    return data.data?.[0] ?? null
  } catch {
    return null
  }
}

/**
 * Get transfer status from Wormhole Scan.
 */
export async function getWormholeTransferStatus(txHash: string): Promise<WormholeTransferStatus | null> {
  try {
    const data = await whGet<WormholeTransferStatus>(`/api/v1/operations?txHash=${txHash}`)
    return data
  } catch {
    return null
  }
}

/**
 * Poll Wormhole transfer status until COMPLETED or timeout.
 */
export async function pollWormholeStatus(
  txHash: string,
  onUpdate: (s: WormholeTransferStatus) => void,
  timeoutMs = 15 * 60_000,
): Promise<WormholeTransferStatus | null> {
  const deadline = Date.now() + timeoutMs
  let interval = 10_000

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval))
    const status = await getWormholeTransferStatus(txHash)
    if (status) {
      onUpdate(status)
      if (status.status === 'completed' || status.status === 'failed') return status
    }
    interval = Math.min(interval * 1.2, 60_000)
  }

  return null
}

// ─── Wormhole Chain ID Map ───────────────────────────────────────────────────

/** Convert EVM chainId to Wormhole's internal chain number. */
function evmToWormholeChainId(evmChainId: number): number | null {
  const map: Record<number, number> = {
    11155111: 10002, // Sepolia
    84532: 10004, // Base Sepolia
    421614: 10003, // Arbitrum Sepolia
    11155420: 10005, // OP Sepolia
    80002: 10007, // Polygon Amoy
    43113: 6, // Fuji
  }
  return map[evmChainId] ?? null
}

// ─── Wormhole Connect Widget Config ─────────────────────────────────────────

/**
 * Configuration object for embedding Wormhole Connect widget.
 * Drop this into the Bridge page when rendering the Wormhole UI panel.
 */
export function getWormholeConnectConfig(
  fromChain?: WormholeChainName,
  toChain?: WormholeChainName,
) {
  return {
    network: 'testnet' as const,
    chains: ['Sepolia', 'BaseSepolia', 'ArbitrumSepolia', 'OptimismSepolia', 'Solana', 'Sui', 'Aptos', 'Fuji'],
    tokens: ['ETH', 'USDC', 'WETH'],
    rpcs: {
      Sepolia: 'https://rpc.sepolia.org',
      BaseSepolia: 'https://sepolia.base.org',
      ArbitrumSepolia: 'https://sepolia-rollup.arbitrum.io/rpc',
      OptimismSepolia: 'https://sepolia.optimism.io',
      Solana: 'https://api.devnet.solana.com',
    },
    ...(fromChain ? { fromChain } : {}),
    ...(toChain ? { toChain } : {}),
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Human label for a Wormhole chain. */
export function wormholeChainLabel(name: WormholeChainName): string {
  const labels: Partial<Record<WormholeChainName, string>> = {
    Sepolia: 'Ethereum Sepolia',
    BaseSepolia: 'Base Sepolia',
    ArbitrumSepolia: 'Arbitrum Sepolia',
    OptimismSepolia: 'OP Sepolia',
    PolygonSepolia: 'Polygon Amoy',
    Fuji: 'Avalanche Fuji',
    Solana: 'Solana Devnet',
    Sui: 'Sui Testnet',
    Aptos: 'Aptos Testnet',
  }
  return labels[name] ?? name
}

/** Wormhole Scan explorer link for a tx hash. */
export function wormholeScanLink(txHash: string): string {
  return `https://wormholescan.io/#/tx/${txHash}?network=TESTNET`
}

/** All EVM chain IDs that Wormhole supports on testnet. */
export const WORMHOLE_EVM_CHAINS: number[] = Object.keys(EVM_TO_WORMHOLE).map(Number)

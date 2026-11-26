import { NON_EVM_NETWORKS, type NetworkEntry } from '../config/networks'
import { CHAINS, type ChainCfg } from '../config/chains'
import { IRIS_BASE, type CctpFees } from './cctp'

export interface NonEvmBridgeEndpoint {
  network: NetworkEntry
  cctpDomain?: number
  usdcAssetId: string
  tokenMessengerProgramOrAddr?: string
  acrossChainId?: string
  recipientHint: string
  recipientPattern: RegExp
  explorerUrl: string
  notes: string[]
}

export const NON_EVM_BRIDGE_ENDPOINTS: NonEvmBridgeEndpoint[] = [
  {
    network: NON_EVM_NETWORKS.find((n) => n.key === 'solanaDevnet')!,
    cctpDomain: 5,
    usdcAssetId: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    acrossChainId: '133268194659241',
    recipientHint: 'Solana Devnet base58 address (e.g. 9xQe...)',
    recipientPattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    explorerUrl: 'https://explorer.solana.com/?cluster=devnet',
    notes: [
      'Circle CCTP v2 Domain 5 is live on Iris Sandbox (/v2/burn/USDC/fees 200 OK in both directions with EVM testnets).',
      'Across Protocol v3 lists Devnet USDC <-> Sepolia/Base/Arb/OP/Amoy/Unichain (chainId 133268194659241); quote API is intermittently returning 500 on devnet intents.',
    ],
  },
  {
    network: NON_EVM_NETWORKS.find((n) => n.key === 'starknetSepolia')!,
    cctpDomain: 25,
    usdcAssetId: '0x0512feAc6339Ff7889822cb5aA2a86C848e9D392bB0E3E237C008674feeD8343',
    recipientHint: 'Starknet Sepolia hex address (0x... up to 64 hex chars)',
    recipientPattern: /^0x[0-9a-fA-F]{1,64}$/,
    explorerUrl: 'https://sepolia.starkscan.co',
    notes: [
      'Circle CCTP v2 Domain 25 is live on Iris Sandbox (/v2/burn/USDC/fees 200 OK with EVM testnets).',
      'Uses Cairo TokenMessengerV2 / MessageTransmitterV2 contracts paired with Circle Native USDC on Starknet Sepolia.',
    ],
  },
  {
    network: NON_EVM_NETWORKS.find((n) => n.key === 'aptosTestnet')!,
    cctpDomain: 9,
    usdcAssetId: '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832',
    recipientHint: 'Aptos account address (0x... up to 64 hex chars)',
    recipientPattern: /^0x[0-9a-fA-F]{1,64}$/,
    explorerUrl: 'https://explorer.aptoslabs.com/?network=testnet',
    notes: [
      'Circle CCTP v2 Domain 9 is live on Iris Sandbox (/v2/burn/USDC/fees 200 OK with EVM testnets).',
      'Aptos USDC is a Fungible Asset (FA) metadata object on Aptos Testnet.',
    ],
  },
  {
    network: NON_EVM_NETWORKS.find((n) => n.key === 'stellarTestnet')!,
    cctpDomain: 27,
    usdcAssetId: 'USDC-GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    recipientHint: 'Stellar public key (G..., 56 chars)',
    recipientPattern: /^G[A-Z2-7]{55}$/,
    explorerUrl: 'https://stellar.expert/explorer/testnet',
    notes: [
      'Circle CCTP v2 Domain 27 is live on Iris Sandbox (/v2/burn/USDC/fees 200 OK with EVM testnets).',
      'Stellar destination accounts must hold a USDC trustline to issuer GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5.',
    ],
  },
]

export const NON_EVM_BRIDGE_BLOCKED = [
  {
    name: 'Sui Testnet (CCTP Domain 8)',
    reason: 'Circle Iris Sandbox /v2/burn/USDC/fees currently returns HTTP 400 (Invalid source/destination domain id) for Domain 8.',
  },
  {
    name: 'Noble Testnet (CCTP Domain 4)',
    reason: 'Noble uses legacy CCTP v1 rather than CCTP v2 (Iris v2 returns HTTP 400) and its Circle testnet faucet is in maintenance.',
  },
]

export interface NonEvmBridgeQuote {
  sourceName: string
  destName: string
  sourceDomain: number
  destDomain: number
  amountIn: number
  fastFeeBps: number
  standardFeeBps: number
  fastOut: number
  standardOut: number
  irisFeesUrl: string
  irisAttestationPattern: string
}

/** Live read-only CCTP v2 Sandbox quote between any two CCTP v2 domains (EVM <-> Non-EVM or Non-EVM <-> Non-EVM). */
export async function quoteNonEvmCctp(params: {
  sourceDomain: number
  destDomain: number
  sourceName: string
  destName: string
  amountDecimal: string
}): Promise<NonEvmBridgeQuote> {
  const amt = Number(params.amountDecimal)
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new Error('Enter a valid USDC amount greater than 0.')
  }
  const irisFeesUrl = `${IRIS_BASE}/v2/burn/USDC/fees/${params.sourceDomain}/${params.destDomain}`
  const res = await fetch(irisFeesUrl, { headers: { accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`Circle Iris Sandbox returned HTTP ${res.status} for domain ${params.sourceDomain} -> ${params.destDomain}.`)
  }
  const rows = (await res.json()) as Array<{ finalityThreshold: number; minimumFee: number }>
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Circle Iris returned an empty fee table.')
  }
  const fast = rows.find((r) => r.finalityThreshold === 1000)
  const std = rows.find((r) => r.finalityThreshold === 2000)
  const fastFeeBps = Number(fast?.minimumFee ?? 0)
  const standardFeeBps = Number(std?.minimumFee ?? 0)
  const fastOut = Math.max(0, amt * (1 - fastFeeBps / 10_000))
  const standardOut = Math.max(0, amt * (1 - standardFeeBps / 10_000))

  return {
    sourceName: params.sourceName,
    destName: params.destName,
    sourceDomain: params.sourceDomain,
    destDomain: params.destDomain,
    amountIn: amt,
    fastFeeBps,
    standardFeeBps,
    fastOut,
    standardOut,
    irisFeesUrl,
    irisAttestationPattern: `${IRIS_BASE}/v2/messages/${params.sourceDomain}?transactionHash=<BURN_TX>&cctpVersion=2`,
  }
}

export function getCctpEvmChains(): ChainCfg[] {
  return CHAINS.filter((c) => c.cctpDomain != null && Boolean(c.usdc))
}

export type { CctpFees }

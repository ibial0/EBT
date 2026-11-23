/** Provider matrix, one row per provider we actually ship (not just researched). */
export interface ProviderInfo {
  id: 'cctp' | 'uniswap' | 'opstack'
  name: string
  tagline: string
  website: string
  docs: string
  github: string
  license: string
  apiKey: 'none' | 'optional' | 'required'
  status: 'live' | 'limited' | 'unavailable'
  capabilities: string[]
  chains: string
  notes: string[]
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'cctp',
    name: 'Circle CCTP v2',
    tagline: 'Native USDC burn-and-mint across testnets',
    website: 'https://www.circle.com/cross-chain-transfer-protocol',
    docs: 'https://developers.circle.com/cctp',
    github: 'https://github.com/circlefin/evm-cctp-contracts',
    license: 'Circle developer terms',
    apiKey: 'none',
    status: 'live',
    capabilities: ['Bridge USDC', 'Fast transfer', 'Attestation tracking'],
    chains: '17 verified EVM testnets',
    notes: [
      'TokenMessengerV2 0x8FE6…2DAA and MessageTransmitterV2 0xE737…E275 share the same address on every testnet (CREATE2).',
      'Attestation via the public Iris sandbox API, no API key, CORS open.',
      'Only native USDC moves. It cannot bridge ETH or arbitrary ERC-20s.',
    ],
  },
  {
    id: 'uniswap',
    name: 'Uniswap v3 (on-chain)',
    tagline: 'Same-chain swaps quoted directly from the pool contracts',
    website: 'https://app.uniswap.org',
    docs: 'https://developers.uniswap.org',
    github: 'https://github.com/Uniswap/v3-periphery',
    license: 'GPL-2.0 / BUSL (protocol contracts)',
    apiKey: 'none',
    status: 'live',
    capabilities: ['Same-chain swap', 'Exact-input quotes', 'Slippage + min received'],
    chains: 'Ethereum Sepolia, Base Sepolia, Unichain Sepolia',
    notes: [
      'Quotes come from QuoterV2 eth_call, real pool state, no Uniswap API key needed.',
      'Execution goes through the canonical SwapRouter02 deployment.',
      'Uniswap’s hosted Trading API needs a key and is intentionally not a dependency here.',
    ],
  },
  {
    id: 'opstack',
    name: 'OP Stack native bridge',
    tagline: 'Canonical ETH deposits from Sepolia into Superchain testnets',
    website: 'https://giwa.zone',
    docs: 'https://docs.giwa.io/get-started/bridging/eth',
    github: 'https://github.com/ethereum-optimism/optimism',
    license: 'MIT',
    apiKey: 'none',
    status: 'limited',
    capabilities: ['Deposit ETH (L1 → L2)', 'Base / OP / Unichain / Ink / World / GIWA'],
    chains: 'Sepolia → 6 Superchain testnets',
    notes: [
      'Uses each chain’s own OptimismPortal, the same canonical deposit path the chains document.',
      'Deposits land in ~1–3 minutes. L2→L1 withdrawals take the 7-day challenge period, so v1 ships deposits only.',
      'GIWA is not a CCTP chain, USDC cannot be bridged there, but ETH can.',
    ],
  },
]

export const NOT_INTEGRATED = [
  {
    name: 'LI.FI',
    reason: 'Testnet integration support has been discontinued by the provider.',
  },
  {
    name: '0x Swap API',
    reason: 'The 0x swap API does not serve testnets.',
  },
  {
    name: 'Wormhole Connect',
    reason:
      'The hosted Connect widget resolves routes from a mainnet-oriented remote config; testnet routes need per-route manual configuration that we could not verify end-to-end. Documented as researched, not shipped.',
  },
  {
    name: 'Uniswap Trading API',
    reason: 'Works on Sepolia/Base Sepolia/Unichain Sepolia but requires a developer API key, replaced with direct on-chain quotes.',
  },
]

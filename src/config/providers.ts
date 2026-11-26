/** Provider matrix, one row per provider we actually ship (not just researched). */
export interface ProviderInfo {
  id: 'cctp' | 'across' | 'uniswap' | 'dexv2' | 'opstack' | 'orbit'
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
    chains: '24 verified EVM + 4 non-EVM quote domains',
    notes: [
      'TokenMessengerV2 0x8FE6…2DAA and MessageTransmitterV2 0xE737…E275 verified on-chain across 24 EVM testnets (including Cronos, Edge, HyperEVM, Morph Hoodi, Pharos, Plume, XDC).',
      'Attestation & live fees via public Iris sandbox API, no API key, CORS open (including Solana, Starknet, Aptos, Stellar non-EVM domains).',
      'Only native USDC moves. Sui (d8) and Noble (d4) v2 Iris fees remain disabled (HTTP 400).',
    ],
  },
  {
    id: 'across',
    name: 'Across Protocol v3',
    tagline: 'Fast intent-based ETH, WETH & USDC bridging across major testnets',
    website: 'https://across.to',
    docs: 'https://docs.across.to',
    github: 'https://github.com/across-protocol/contracts',
    license: 'GPL-3.0 / MIT',
    apiKey: 'none',
    status: 'live',
    capabilities: ['Fast L1↔L2 & L2↔L2 bridge', 'Single-signature deposit', 'Relayer fill tracking'],
    chains: 'Sepolia, Base, Arbitrum, OP, Unichain, Polygon Amoy (+ Solana Devnet route listed)',
    notes: [
      'Uses verified testnet SpokePool contracts with the public open-CORS Across Testnet API (/api/suggested-fees).',
      'Fills typically complete in ~10–30s with no second destination signature required.',
      'Subject to live testnet relayer pool liquidity caps.',
    ],
  },
  {
    id: 'uniswap',
    name: 'Uniswap v3, Pancake V3, SaucerSwap V2 & Synthra',
    tagline: 'Same-chain swaps quoted directly from verified QuoterV2 / Router contracts',
    website: 'https://app.uniswap.org',
    docs: 'https://developers.uniswap.org',
    github: 'https://github.com/Uniswap/v3-periphery',
    license: 'GPL-2.0 / BUSL',
    apiKey: 'none',
    status: 'live',
    capabilities: ['Same-chain swap', 'On-chain QuoterV2', 'Slippage + min received'],
    chains: 'Sepolia, Base, Arbitrum, OP, Unichain, Abstract, BNB, Hedera, Robinhood, Arc',
    notes: [
      'Quotes come directly from QuoterV2 eth_call against live pool liquidity with zero API keys.',
      'Execution dispatches SwapRouter02, Synthra, SaucerSwap V2, or PancakeSwap V3 router bytecode verified on-chain.',
      'Solana Devnet (Raydium API) and Stellar Testnet (Horizon SDEX) provide live read-only DEX quotes.',
    ],
  },
  {
    id: 'dexv2',
    name: 'V2 AMMs (PancakeSwap / Uniswap / DragonSwap / TraderJoe / Sushi)',
    tagline: 'Constant-product on-chain swaps via getAmountsOut & native routers',
    website: 'https://pancakeswap.finance',
    docs: 'https://docs.uniswap.org/contracts/v2/overview',
    github: 'https://github.com/Uniswap/v2-periphery',
    license: 'GPL-2.0 / MIT',
    apiKey: 'none',
    status: 'live',
    capabilities: ['V2 pair routing', 'Direct + 2-hop quotes', 'Native gas swaps'],
    chains: 'BNB Testnet (Pancake V2), Abstract (Uniswap V2), Sei (DragonSwap), Fuji (TraderJoe + Sushi)',
    notes: [
      'Uses verified factory getPair + pair reserves checked live on-chain.',
      'Dispatches chain-specific native selectors (swapExactSEIForTokens, swapExactAVAXForTokens, swapExactETHForTokens).',
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
    capabilities: ['Deposit native gas (L1 → L2)', '12 Sepolia L2s + BNB→opBNB'],
    chains: 'Sepolia → 12 L2s & BNB Testnet → opBNB Testnet',
    notes: [
      'Uses each chain’s own verified OptimismPortal contract on Sepolia or BNB Chain Testnet.',
      'Deposits land in ~1–3 minutes. L2→L1 withdrawals take 7 days; Across v3 covers fast exits on Base/OP/Unichain.',
    ],
  },
  {
    id: 'orbit',
    name: 'Arbitrum Orbit native bridge',
    tagline: 'Canonical retryable-ticket ETH deposits via verified Arbitrum Inboxes',
    website: 'https://portal.arbitrum.io',
    docs: 'https://docs.arbitrum.io/build-decentralized-apps/cross-chain-messaging',
    github: 'https://github.com/OffchainLabs/nitro-contracts',
    license: 'Apache-2.0',
    apiKey: 'none',
    status: 'limited',
    capabilities: ['Retryable ETH deposit', 'Arrival tracking'],
    chains: 'Sepolia / Arbitrum Sepolia → 12 Orbit testnets',
    notes: [
      'Calls Inbox.createRetryableTicket on the parent chain for verified ETH-native Orbit chains.',
      'Covers Arbitrum Sepolia, Robinhood Chain Testnet, Plume, Xai, Humanity, T-Rex, HPP, JASMY, Edge, and more.',
    ],
  },
]

export const NOT_INTEGRATED = [
  {
    name: 'Gas.zip',
    reason: 'Live quotes API returns 400 Source: Chain Unsupported for testnet origins (supports mainnet→testnet gas refueling only).',
  },
  {
    name: 'Hyperlane Warp Routes',
    reason: 'Requires deploying or curating per-token custom Warp Route contracts; no single permissionless native/USDC bridge spans our testnets.',
  },
  {
    name: 'LayerZero V2 / Stargate',
    reason: 'Requires per-application OFT contracts or account-configured messaging channels rather than a shared zero-key testnet token bridge.',
  },
  {
    name: 'LI.FI & 0x Swap API',
    reason: 'Both providers discontinued or omitted public testnet routing APIs.',
  },
  {
    name: 'Wormhole Connect',
    reason: 'Requires manual per-route testnet token configuration; covered instead by native CCTP v2 + Across v3.',
  },
]

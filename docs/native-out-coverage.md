# Token → native coverage (research pass, 2026-11-27)

Question: on chains where the app has no swap, can a token still be sold into that chain's native gas coin?

Short answer: only where a DEX is deployed **and** a pool exists for that token against the wrapped native
coin. A swap is a call to a contract on that chain; without a pool there is nothing to trade against.

## What was probed

- 70 EVM chains from `src/config/chains.ts`, against six UniswapV2-family router addresses that are shared
  across ecosystems (Sushi, Uniswap v2, Pancake v2, QuickSwap, Trader Joe v1, Pancake testnet).
- A hit required all three of: router bytecode present, `WETH()` returns an address, `factory().allPairsLength() > 0`.
- Uniswap v3 official deployments table (`developers.uniswap.org/deployments.json`) for the v3 chains.

## Result

| Outcome | Chains |
| --- | --- |
| Swap already supported (Uniswap v3 or a configured V2 DEX) | Sepolia, OP Sepolia, Arbitrum Sepolia, Base Sepolia, Unichain Sepolia, Arc, Robinhood, Abstract, BNB testnet, Hedera, Sei testnet, Avalanche Fuji |
| V2 DEX found on a chain that was not supported | none |
| No standard DEX at a known address | the other 58 chains (Linea Sepolia, Plasma, Plume, Ink, X Layer, opBNB, Monad, MegaETH, zkSync Sepolia, Soneium, Ronin, Berachain, Kaia, Mantle, Morph, Mode, Metis …) |

### Case study: MegaETH testnet (6343)

Kumbaya runs a bytecode-verified Uniswap v3 fork there (factory `0x53447989…1355`, QuoterV2 `0xfb230b93…c38d`,
SwapRouter02 `0x8268DC93…4023`, WETH9 `0x4200…0006`). LINK is deployed and handed out by the Chainlink faucet
(`0xAd165247…4243`). Both contracts return bytecode on `https://carrot.megaeth.com/rpc`.

But `factory.getPool(LINK, WETH9, fee)` returns the zero address for **every** fee tier (100 / 500 / 3000 /
10000). There is no LINK/WETH pool, so LINK cannot be sold into ETH there. A DEX is not enough; the pool is
the missing piece, and the app cannot create liquidity it does not own.

### Aggregators (no key / keyed)

`https://li.quest/v1/chains` lists 14 of our chains, but every one of them carries `dexes: []` — LI.FI only
sees bridge routes there, so it cannot quote a swap on any of them. 1inch, 0x, Odos and OpenOcean all need an
API key (free developer tier with rate limits, paid tiers above it) and their testnet coverage is thin.
Paying for a key would not unlock these chains.

## What the app does now

- `src/lib/poolDiscovery.ts` asks the factory directly (v3: `getPool` × 4 fee tiers + `liquidity()`;
  v2: `getPair` + `getReserves()`), cached 10 minutes per chain and token.
- Swap merges those results into the token picker and the tradeable set, so a token that is missing from
  `config/pools.ts` but has a live pool still appears and quotes.

Verified with real quotes: LINK → ETH on Sepolia (1 LINK ≈ 0.000625 ETH, 0.3% pool) and USDC → AVAX on
Avalanche Fuji through Sushi (1 USDC = 0.00927 AVAX).

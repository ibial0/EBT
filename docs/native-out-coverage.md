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


## Batch 1 verification (Linea Sepolia, Plasma, Ink, Plume, opBNB)

Each chain was probed with `eth_getCode` on the router/factory addresses published for the DEXes that run on
the same ecosystem's mainnet, plus the canonical Uniswap addresses:

| Chain | Probed | Found |
| --- | --- | --- |
| Linea Sepolia (59141) | Lynex router/factory, Algebra factory/router, Uniswap v3 factory, iZUMi factory, Uniswap v2, Sushi, Pancake | only Permit2 + Multicall3 |
| Plasma (9746) | Uniswap v3 factory, Uniswap v2, Sushi, Pancake, QuickSwap | only Permit2 + Multicall3 |
| Ink Sepolia (763373) | Uniswap v3 factory, Uniswap v2, Sushi, Pancake, QuickSwap | only Permit2 + Multicall3 |
| Plume (98867) | Uniswap v3 factory, Uniswap v2, Sushi, Pancake, QuickSwap, Rooster lens | Multicall3 + WPLUME token; the DEX lens address did not resolve |
| opBNB testnet (5611) | Pancake v2 (BSC and opBNB-mainnet addresses), Pancake v3, Uniswap v2/v3, Sushi, QuickSwap | only Permit2 + Multicall3 |

What those chains actually have, from their own docs:

- **Linea**: Lynex (Algebra) is deployed on Linea **mainnet** only (`0x610D2f07…`, `0xBc7695Fd…`).
- **Plasma**: Uniswap v3 is listed on Plasma **mainnet** only.
- **Ink**: the flagship venue is Nado, a central-limit order book, not an AMM; no AMM router on Sepolia.
- **Plume**: Rooster (Maverick v2) is live on testnet, but Maverick's router/pool ABI is not Uniswap-compatible.
- **opBNB**: Pancake runs on opBNB **mainnet** (`0x02a84c1b…`), not at that address on testnet.

Conclusion: none of the five can be added with the Uniswap v2/v3 adapters the app has. Adding one of them means
writing a new adapter for that DEX family (Algebra, Maverick, iZiSwap) and it still needs a pool for the exact
token against the native coin.

Also checked: **Zora Sepolia** has a full Uniswap v3 stack (official deployment) but no token list entry in
`config/tokens.ts`, so there is nothing to quote against yet.


## Batch 2 look (Monad, Berachain, Ronin, Zora)

| Chain | What the docs say | Why it is not usable with the current adapters |
| --- | --- | --- |
| Monad testnet (10143) | Uniswap's own deployments table lists a v3 factory at `0x9612…4276`, but that address returns `0x` on `testnet-rpc.monad.xyz` (chain id verified as 10143) | deployment cannot be verified, so it is not enabled |
| Berachain Bepolia | BEX is live, but it is a **Balancer v2** fork (Vault `0x4Be0…E80B`) | Balancer swap math is not Uniswap v2/v3; needs a Balancer adapter |
| Ronin Saigon (202601) | Katana V2/V3 exist on Ronin (V3 is a Uniswap v3 fork) | no published router/factory address for Saigon, so nothing to point at |
| Zora Sepolia | full Uniswap v3 stack from the official deployment table | `config/tokens.ts` has no tokens for 999999999, nothing to quote |

Pattern: every remaining testnet either has no AMM, or runs a DEX family whose math differs from Uniswap
(Balancer, Algebra, Maverick, iZiSwap, or a CLOB). Each of those is a separate adapter, and even a finished
adapter only helps if that exact token has a pool against the chain's native coin.

## Proposal

Coverage can stop being a code problem. Add a **Custom DEX** entry in Settings: chain, router, factory, wrapped
native. The app validates it on chain (router bytecode, `WETH()`, `factory().allPairsLength() > 0`) and then
treats it like any other V2 venue. Any testnet DEX the owner finds can then be enabled in a minute, without a
code change or a rebuild.

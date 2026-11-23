# SWAP NETWORK DISCOVERY

Rule: a chain appears in Swap only when a **verified deployment + bound router + bound quoter + a pool
that holds liquidity** all exist, and the page derives its list from that registry rather than from a
hardcoded five-item list.

## Verified swap-capable chains

| Chain | id | Factory | Router | Quoter | Live pair (fee) | 1 USDC quote |
| --- | --- | --- | --- | --- | --- | --- |
| Ethereum Sepolia | 11155111 | `0x0227628f…DaC1c` | `0x3bFA4769…e48E` | `0xEd1f6473…2FB3` | USDC/WETH at 0.01/0.05/0.30/1.00% | live |
| Base Sepolia | 84532 | `0x4752ba5D…aD24` | `0x94cC0AaC…2bc4` | `0xC5290058…5E27` | USDC/WETH at 0.01/0.05/0.30/1.00% | live |
| Unichain Sepolia | 1301 | `0x1F98431c…F984` | `0xd1AAE392…B166` | `0x6Dd37329…BF89` | USDC/WETH at 0.01/0.05/0.30/1.00% | live |
| OP Sepolia | 11155420 | `0x4752ba5D…aD24` | `0x94cC0AaC…2bc4` | `0xC5290058…5E27` | USDC/WETH at 0.05% (81.51 USDC / 0.1414 WETH) | 0.001594436053642098 WETH |
| Arc Testnet | 5042002 | `0xcF768f25…B152` | `0x60828cc4…7328` (deadline style) | `0xf4DDb368…07C5` | USDC/EURC at 0.01/0.30/1.00% | 0.927591 EURC |

Every address above was read from the chain: `factory()` on the quoter and the router returns the
same factory, `getPool()` returns a pool, and `liquidity()` is non-zero.

## Chains investigated and deliberately not offered

| Chain | Evidence | Verdict |
| --- | --- | --- |
| Ink Sepolia (763373) | 16 SwapRouter candidates, 6 QuoterV2, 13 factories. `getPool(USDC, WETH)` returns 0 across all of them and there are zero `PoolCreated` logs for the app's USDC. Its only v4 pool has `getLiquidity() = 0`. | no USDC pair exists |
| World Chain Sepolia (4801) | one verified `UniswapV3Factory` `0xE4A6C401…c110` with a single `PoolCreated`, liquidity 0, slot0 all zero. No QuoterV2, no SwapRouter02. | not executable |
| GIWA Sepolia (91342) | a live v3 pool exists but only against an **unverified mock USDC**, and no quoter maps to that factory | not verifiable |
| Robinhood Chain Testnet (46630) | the three canonical factories have **no code**; the WETH predeploy has no code | no deployment |
| Avalanche Fuji, Arbitrum Sepolia, Polygon Amoy, Linea, Codex, Monad, Sei, Plasma, X Layer, Injective | sweep in progress | see the run log |

## How the UI gets its list

`SWAP_CHAINS = CHAINS.filter(c => c.uniswap)` in `src/config/chains.ts`. Adding a venue is a data
change: register the deployment, then add its pools by running `scripts/pools.ts`. There is no second
list anywhere.

Token lists are then narrowed twice:

1. sell list = tokens that appear in a verified pool on that chain (native maps to WETH);
2. buy list = tokens actually pooled with the selected sell token.

## Robinhood Chain Testnet

Verified live: chain id 46630, native ETH, explorer and RPC reachable, official faucet exists. The
logo now comes from `public/logos/chains/robinhood.png`. Balances, wallet switching and the faucet
entry all work. It is **not** offered in Swap because there is no DEX deployment, and **not** offered in
Bridge because Circle does not document the chain and no Circle-issued USDC can be verified there.

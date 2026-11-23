# BRIDGE / SWAP AUDIT

Date: 2026-11-23 · App: EBT at `C:\Testnet web`.

## What was actually wrong

| # | Symptom | Root cause | Fix |
| --- | --- | --- | --- |
| 1 | Bridge forced a manual choice between "USDC · CCTP" and "ETH · OP Stack" | Two radio cards, no route model | `src/lib/routes.ts` route engine; the protocol is chosen, not the user |
| 2 | USDC looked like the universal bridge asset | The old code picked the asset from a wallet balance heuristic, not from route availability | Source list = `usableSourceTokens(from, to)`; destination list = `reachableDestTokens(from, to, source)` |
| 3 | Selecting an unsupported pair silently kept the old token | No validation after a chain change | Invalid selections are cleared, and a pair with no route shows an explanation instead of a default |
| 4 | Only direct routes existed | No composite model | Composite routes built from verified legs: swap, CCTP, portal |
| 5 | No distinction between direct and bridge-plus-swap | Feature absent | Route type is explicit in the UI, the estimate, and the activity record |
| 6 | Swap listed every token on a chain | Token registry, not pool discovery | Sell list = tokens in a verified pool; buy list = tokens pooled with the selected sell token |
| 7 | Swap had five networks, all hardcoded | `SWAP_CHAINS` was derived but the token/pool path was not | Swap networks come from the verified deployment + pool registry; no separate hardcoded list |
| 8 | Arc cirBTC missing from view | It is in the registry but has no Arc pool, so pool-driven selectors never showed it | It shows in Portfolio; it is deliberately absent from Swap/Bridge because there is no route |
| 9 | Robinhood Chain had a monogram instead of a logo | No asset was ever fetched | `public/logos/chains/robinhood.png` from the official favicon, wired into the registry |

## Why the engine is built from legs

A route is only emitted when every step is a verified operation:

| Leg | Evidence required | Direction |
| --- | --- | --- |
| `cctp` | both chains on Circle's domain list and with a registered USDC | either |
| `portal` | destination's `opStackParent` is the source and the portal has code | L1 → L2 only |
| `swap` | a pool in `src/config/pools.ts` that held liquidity at discovery | either |

The search runs over `(chain, token)` states, so a route like Arc EURC → GIWA ETH is found as
`swap(EURC→USDC on Arc) → cctp(Arc→Sepolia) → swap(USDC→WETH on Sepolia) → portal(Sepolia→GIWA)`.
Each leg is a real contract interaction, and the UI shows the whole chain with its transaction count.

## Honest limits

- A **direct** route suppresses the composite alternatives for the same pair; they are noise.
- `usedSourceTokens` only lists assets with at least one route, so an unsupported pair can never be the default.
- Composite execution is sequential: one signature per leg, and the CCTP mint is a separate later signature. Nothing is presented as one transaction.
- Nothing is inferred from token symbols. Identity is `chainId + address`, with the native asset and its wrapped form treated as one money for routing (the swap router wraps and unwraps between them).

## Files

- `src/lib/routes.ts` — engine (legs, search, selector helpers)
- `src/pages/Bridge.tsx` — route-aware selectors, route card, composite executor
- `scripts/routes-check.ts` — the bridge test matrix (`npm run test:routes`)

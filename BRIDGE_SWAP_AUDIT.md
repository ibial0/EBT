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
| `arbitrum` | an Arbitrum Orbit deployment in `src/config/orbit.ts` settling to the source | parent → Orbit chain |

The search runs over `(chain, token)` states, so a route like Arc EURC → GIWA ETH is found as
`swap(EURC→USDC on Arc) → cctp(Arc→Sepolia) → swap(USDC→WETH on Sepolia) → portal(Sepolia→GIWA)`.
Each leg is a real contract interaction, and the UI shows the whole chain with its transaction count.

## Honest limits

- A **direct** route suppresses the composite alternatives for the same pair; they are noise.
- `usedSourceTokens` only lists assets with at least one route, so an unsupported pair can never be the default.
- Composite execution is sequential: one signature per leg, and the CCTP mint is a separate later signature. Nothing is presented as one transaction.
- Nothing is inferred from token symbols. Identity is `chainId + address`, with the native asset and its wrapped form treated as one money for routing (the swap router wraps and unwraps between them).

## Arbitrum Orbit chains

An Orbit chain is an Arbitrum Nitro chain, not an OP Stack chain, so it needs a third leg.
Robinhood Chain Testnet (46630) settles to Sepolia through the Arbitrum gateway set:

| contract | Sepolia address |
| --- | --- |
| Rollup | `0xdc5F8E399DBd8a9F5F87AeC4C23Beb12431b386D` |
| Inbox (delayed) | `0xF2939afA86F6f933A3CE17fCAB007907B6b0B7a4` |
| Bridge | `0x96295BDad104eaD97cC08797b3dC68efF59CcF30` |
| L1 Gateway Router | `0xF6F11aAEE80875776C264d93B37B34cE437382D1` |
| L1 ERC-20 Gateway | `0x52C2976cbDEf48BcC51d07d3c523769F76ECBd09` |
| L1 WETH Gateway | `0x8f8A6799F2b1978c6586318543c73D8Fb12f218f` |

The native-asset deposit is `Inbox.createRetryableTicket`, one signature, value
`amount + maxSubmissionCost + gasLimit*maxFeePerGas` — a formula confirmed against a real
deposit (`0xad7ae936…`, value `1320001650660061600` = `1320000000000000000` call value +
`61600` submission + `27511*60000000` gas). `npm run test:orbit` re-executes the calldata
with `eth_call` on the live chain.

## Files

- `src/lib/routes.ts` — engine (legs, search, selector helpers)
- `src/config/orbit.ts` — verified Orbit deployments
- `src/lib/arbitrumOrbit.ts` — calldata builders and gas parameters
- `src/lib/orbitTrack.ts` — retryable-ticket arrival tracking
- `src/pages/Bridge.tsx` — route-aware selectors, route card, composite executor
- `scripts/routes-check.ts` — the bridge test matrix (`npm run test:routes`)

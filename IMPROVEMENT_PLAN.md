# IMPROVEMENT PLAN (and what shipped)

Priority order follows the owner's list: critical correctness → functionality → experience.

## P1 — Critical (done)

| Item | Approach | State |
| --- | --- | --- |
| Base→Arc mint failure | Explicit gas estimate + Arc fee floor (20 gwei), preflight `eth_call`, `usedNonces` guard, precise error text, retry without re-burn | shipped |
| Arc USDC balance | Register Arc (native USDC = gas, 18 dp; ERC-20 view 6 dp), read the ERC-20 view, never sum both | shipped |
| Transaction recovery | New `/recover` page: burn hash → Iris attestation → decode → verify unused → mint; also a Retry button on every recorded transfer | shipped |

## P2 — Functionality (done)

| Item | Approach | State |
| --- | --- | --- |
| More token support | USDC on all 17 CCTP chains, USDC/EURC/cirBTC on Arc, 7 Sepolia tokens, WETH on Base/Unichain; custom ERC-20 import persisted locally | shipped |
| ETH bridge routes | Canonical OP Stack deposits from Sepolia into **Base, OP, Unichain, Ink, World Chain, GIWA** (6 real targets) | shipped |
| Cross-chain swap | Kept the honest 2-hop composition; added a plain-language explainer (bridge vs swap vs cross-chain) and a step-by-step runner | shipped |
| Portfolio | `/portfolio`: per-chain native + ERC-20, contract addresses, decimals, explorer links, search, refresh, import, no fake USD totals | shipped |

## P3 — Experience (done)

| Item | Approach | State |
| --- | --- | --- |
| Logos | Local SVG mark set: 18 chain marks + 9 token marks, one grid, team colours, gradient fallback | shipped |
| Performance | Multicall3 batching, bounded concurrency (5), fee caching, explicit gas, `usedNonces` short-circuit, fewer polls on inactive data | shipped |
| UI polish | Route chips, gas-readiness warnings on both ends, decoded error cards, connected-state gating, mobile-safe labels | shipped |

## Deliberately not done

| Item | Why |
| --- | --- |
| Atomic cross-chain swap | No verified testnet provider offers one; faking it would be worse than the honest composition |
| L2→L1 withdrawals | 7-day challenge period on OP Stack; a "withdraw" button that cannot complete in one session is a trap |
| WalletConnect | Requires a third-party Project ID; injected wallets already cover the use case |
| Held-token price totals | Testnet assets have no reliable price; summing them would be fiction |
| Plume / Cronos / Sonic chains | Public RPCs dead or chain-id ambiguity (see `RESEARCH_REPORT.md`) |

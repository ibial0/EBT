# IMPLEMENTATION PLAN (and what actually happened)

## Phase 1 — Research ✅
- Circle docs (addresses, interfaces, fees), USDC address table, Uniswap supported-chains + SDK
  deployment map, GIWA docs, viem chain definitions.
- Live probes: `eth_chainId` + USDC `symbol()/decimals()` on 20 candidate chains (17 passed),
  QuoterV2 quotes across all fee tiers on 3 chains, Iris fee + attestation endpoints, CORS headers.
- Outcome: `RESEARCH_REPORT.md`, `PROVIDER_MATRIX.md`.

## Phase 2 — Preflight checklist ✅
- Result: **no mandatory user action**. No API key, no account, no registration.
- Only human steps are the unavoidable ones: install a browser wallet, use a faucet, sign
  transactions. See `USER_ACTION_REQUIRED.md`.

## Phase 3 — Planning ✅
- `PRD.md`, `ARCHITECTURE.md`, `PROVIDER_MATRIX.md`, `RESEARCH_REPORT.md`, `SECURITY_PLAN.md`.

## Phase 4 — Build ✅
- Scaffold: Vite + React 18 + TS + Tailwind 4 + wagmi/viem + TanStack Query.
- Registries: `config/chains.ts` (allowlist, CCTP domains, Uniswap deployments, faucets),
  `config/tokens.ts`, `config/providers.ts`.
- Libs: `guard`, `cctp`, `uniswap`, `opstack`, `swapExec`, `bridgeExec`, `tracker`, `activity`,
  `health`, `tokenImport`, `wallet`.
- UI: Layout+wallet, ChainSelect, TokenSelect, Timeline, ui kit; 7 pages.

## Phase 5 — Integration (one provider at a time) ✅
1. **CCTP** — fee API → approve → burn → attestation → receive.
2. **Uniswap** — quoter scan → calldata → approve → swap (native in/out included).
3. **OP Stack / GIWA** — portal deposit.

## Phase 6 — Testing ✅
- `tsc --noEmit` clean; `vite build` clean (6941 modules).
- `npm run test:sim` — 14 live checks, all green:
  guards (mainnet/unknown/GIWA-not-CCTP), Iris fee API, CCTP burn calldata reaching USDC,
  CCTP burn succeeding with funded state, Uniswap quotes on 3 chains, native ETH swap **executing**,
  USDC approval calldata, USDC→ETH swap **executing**, GIWA deposit **accepted**, pair coverage 36/46.

Bugs found and fixed by these tests (this is why the harness exists):
1. `multicall` + explicit `wrapETH` broke native-input swaps (`STF`) — fixed by sending
   `exactInputSingle` directly with `value`.
2. Price impact read `slot0` without inverting for `token1` — reported a fake 99.99% impact.
3. Unnamed tuple ABI made viem encode zeros for the quoter params — every pair looked dead.

## Phase 7 — UI review ✅
- Real browser (Chromium, CDP) at 1440×950 and 375×800, all 7 routes, checked for console errors,
  `undefined`/`NaN` leakage, overlap and clipping. Fixes applied: clipped "domain N" label, approval
  row showing "already approved" while disconnected.

## Phase 8 — Delivery ✅ (local)
- README with install/run/verification, docs set, no deployment (explicitly deferred until asked).

## Remaining / next
- Owner confirms one live bridge and one live swap with a funded wallet (the only step a key is
  needed for — EBT never holds it).
- Optional: L2→L1 GIWA withdrawal (7-day challenge), more swap chains once pools have liquidity,
  WalletConnect if a Project ID is provided.
- Deployment: static host (Vercel/Netlify/Cloudflare Pages) — no server needed.

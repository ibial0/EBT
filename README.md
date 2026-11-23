# EBT — Testnet Bridge & Swap

A personal, **testnet-only** multi-chain bridge and swap interface. EBT does not implement any new
protocol: it wires existing, verified infrastructure into one UI.

| Layer | Provider | Status |
| --- | --- | --- |
| USDC bridging (17 testnets) | Circle **CCTP v2** (burn-and-mint + Iris attestation) | live |
| Same-chain swaps (4 testnets) | **Uniswap v3** QuoterV2 + router, called on-chain | Sepolia, Base, Unichain, Arc |
| ETH bridging | **OP Stack** canonical deposit via OptimismPortal | Sepolia → Base / OP / Unichain / Ink / World / GIWA |
| Cross-chain swap | composition of CCTP + Uniswap (two hops, user-signs each) | live as a composition |
| Portfolio | per-chain native + ERC-20 balances with estimated USD totals | 18 testnets |
| Recovery | burn hash → attestation → mint, no re-burn | live |

No API keys. No backend. No custody. No mainnet path anywhere in the code.

---

## Quick start

```bash
cd "C:\Testnet web"
npm install
npm run dev          # http://localhost:5178
```

Other commands:

```bash
npm run build        # typecheck + production bundle into dist/
npm run preview      # serve the production build
npm run test:sim     # live integration simulation against real testnet RPCs
```

Requires Node 20+. Built and verified on Node 24.19 / Windows 11.

**Local only.** Nothing is deployed anywhere yet — deployment is an explicit, separate step.

---

## What you can actually do

1. **Faucets** — get testnet gas + USDC (official links only, each one probed for liveness).
2. **Bridge** — send native USDC from any of 17 CCTP testnets to any other. Fast or Standard
   transfer, real fee from Circle's Iris API, live attestation tracking, and the second
   `receiveMessage` signature on the destination.
3. **Swap** — swap tokens on Sepolia / Base Sepolia / Unichain Sepolia against real Uniswap v3
   pools. Quotes are `eth_call`s to QuoterV2 across all fee tiers; if no pool has liquidity the
   pair is simply not offered.
4. **Cross-chain** — plan `USDC on A → token on B` as a two-hop composition, executed step by step.
5. **Activity** — every transfer persists in `localStorage` with a step timeline, hashes, explorer
   links, and resumed attestation polling after a refresh.
6. **GIWA deposit** — ETH from Ethereum Sepolia into GIWA Sepolia through GIWA's own OP Stack portal.

---

## Project layout

```
public/logos/  real chain and token logos (Trust Wallet + DefiLlama), served locally
src/
  config/     chains.ts (testnet allowlist + CCTP/Uniswap deployments), tokens.ts, providers.ts
  lib/        cctp.ts, uniswap.ts, opstack.ts, swapExec.ts, bridgeExec.ts, guard.ts,
              tracker.ts, activity.ts, health.ts, wallet.ts, tokenImport.ts
  components/ Layout (nav + wallet), ChainSelect, TokenSelect, Timeline, ui kit
  pages/      Overview, Portfolio, Bridge, Swap, CrossChain, Faucets, ActivityPage, Recover, Settings
  lib/        + prices.ts (portfolio valuation), portfolio.ts (multicall balances), tx.ts (gas/fee prep)
scripts/
  simulate.ts / simulate.mjs   on-chain simulation harness (eth_call + state override)
  simulation-report.json       latest results
docs (root): RESEARCH_REPORT.md, PROVIDER_MATRIX.md, PRD.md, ARCHITECTURE.md,
             IMPLEMENTATION_PLAN.md, SECURITY_PLAN.md, USER_ACTION_REQUIRED.md, WORK_LOG.md
```

---

## Testnet enforcement (how it is actually enforced)

* `src/config/chains.ts` is the only place chains exist; `TESTNET_IDS` is derived from it.
* `src/lib/guard.ts` `assertTestnet()` runs before **every** transaction build. Known mainnet ids
  get an explicit "Blocked: 1 is a mainnet" error; unknown ids throw.
* Contract targets are pinned: CCTP must equal `0x8FE6…2DAA` / `0xE737…E275`, Uniswap must equal
  the registry's quoter/router; a mismatch throws before signing.
* No mainnet toggle exists in the UI or the config.

---

## Known limitations (deliberate, documented, not hidden)

* **CCTP moves native USDC only.** ETH and arbitrary ERC-20s cannot cross chains through it.
* **Cross-chain swap is two hops, not atomic.** No verified provider offers an atomic testnet
  cross-chain swap; EBT shows the real composition with separate signatures.
* **ETH is deposit-only.** L2→L1 withdrawals need the 7-day OP Stack challenge period.
* **Arc is stablecoin-native.** USDC is the gas token (18 dp native) with a 6 dp ERC-20 view at
  `0x3600…0000`; gas on Arc is paid in USDC, and the mempool requires ≥20 gwei.
* **Four swap chains.** Uniswap v3 with real liquidity was verified on Sepolia, Base Sepolia,
  Unichain Sepolia and Arc Testnet (USDC/EURC, router `0x6082…7328`). Other testnets have no
  verified deployment bound to a router, so they are not offered.
* **Thin testnet liquidity.** A 0.001 ETH swap can move a Sepolia pool's price by a lot. Price
  impact is shown from real pool state; large orders can revert on slippage.
* **Excluded chains:** Plume Testnet and Cronos Testnet (public RPCs did not respond during
  verification), Sonic (chain-id discrepancy between Circle's docs and viem). See
  `RESEARCH_REPORT.md`.
* **WalletConnect is not enabled** — it needs a third-party Project ID that this build deliberately
  does not ask for. Injected wallets (MetaMask/Rabby/Coinbase extension) work.

## Verification status

`npm run test:sim` runs 26 live checks (see `scripts/simulation-report.json`). It proves guards,
Circle's fee API, CCTP burn calldata acceptance, Uniswap quotes, the native-ETH swap path, the
ERC-20 swap path, and the GIWA deposit path against the real chains. A funded wallet is still
required for the final end-to-end confirmation, because EBT never holds keys.

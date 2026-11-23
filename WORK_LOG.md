# WORK LOG

## 2026-11-23 — v2: audit, fixes, features

### Investigated with real chain data
- Pulled the owner's burn from Blockscout (Base Sepolia), the attestation from Circle Iris, the
  `usedNonces` state and the tx history from the Arc explorer, and simulated `receiveMessage` on Arc.
- Result: message valid + unused, mint never broadcast, Arc floor 20 gwei → wallet-side rejection.
- Read the Arc token list for the owner's address; found 91,280.61 USDC at `0x3600…0000` (ERC-20 view,
  6 dp) matching the native balance ÷ 10¹², plus a look-alike "USDC" at `0x4F3b…D20c2` (impostor, not
  registered).

### Fixed
1. Mint path: explicit gas + Arc fee floor, `eth_call` preflight, `usedNonces` guard, decoded errors,
   retry without re-burn, and a dedicated `/recover` page (verified against the real hash).
2. Arc balances: `nativeIsUsdc`, 18/6 decimal split, Arc tokens registered, portfolio avoids double count.
3. Rewrote `messageNonce()` (bytes 12..44, was 8..40 — every message looked unused before this).
4. ETH bridging: 6 OP Stack deposit targets from Sepolia (Base, OP, Unichain, Ink, World, GIWA).
5. Portfolio page, SVG logo set, richer token registry, custom token import.
6. Error layer (`lib/errors.ts`), `prepareTx()` shared by all writes, gas-readiness checks both ends.
7. UI: route chips, gas warnings, decoded error cards, disconnected-state gating, mobile nav labels.

### Verified
- `npm run test:sim` → 23/23, now including Arc domain/decimals/gas-floor, 6 OP portals, real Base→Arc
  message decode and a successful Arc mint simulation.
- Portfolio loader run against the owner's address in Node: 18 chains, 5 positions, Arc 91,280.6058 USDC.
- Browser pass over 8 routes at desktop + mobile widths; no console errors, no overflow.

### Left alone on purpose
- No atomic cross-chain swap (no verified provider), no L2→L1 withdrawals (7-day window), no
  WalletConnect (Project ID), no USD valuation of testnet assets.

---

## 2026-11-23

### Research
- Fetched Circle CCTP contract addresses/interfaces/fees docs, USDC address table, Uniswap
  supported-chains + official SDK deployment map, GIWA docs (chain params, contracts, bridging),
  viem chain definitions.
- Probed 20 candidate chains for `eth_chainId`; 17 confirmed and their native USDC verified by
  reading `symbol()`/`decimals()` on-chain (all USDC/6).
- Probed QuoterV2 across fee tiers on Sepolia, Base Sepolia, Unichain Sepolia — real liquidity found.
- Confirmed Iris sandbox endpoints: fee table (bps), attestation 404-until-indexed, CORS `*`.
- Rejected: Plume (RPC dead), Cronos (RPC dead), Sonic (chain-id ambiguity), plus Morph/HyperEVM/
  EDGE/Pharos/XDC (no verified viem chain definition).

### Decisions
- Ship Vite SPA, not Next.js — no SSR/server routes needed since Iris has open CORS.
- Skip the Uniswap Trading API (needs a key); quote on-chain instead.
- Manual `receiveMessage` instead of Circle Forwarding — one less third party, explicit signature.
- Injected wallets only; no WalletConnect Project ID dependency.
- Cross-chain swap = honest 2-hop composition, not a fake atomic route.

### Build
- Registries + 10 lib modules + 7 pages + shared components. Typecheck and production build clean.

### Testing (and the three real bugs it caught)
1. **Native-input swaps reverted with `STF`.** Cause: `SwapRouter02.multicall` delegatecalls, so
   wrapping ETH inside the multicall left the WETH owned by the router while `pay()` pulled from the
   user. Fix: send `exactInputSingle` directly with `value`; `pay()` wraps internally. Re-simulated:
   returns 30,998,802 USDC-units for 0.001 ETH.
2. **Price impact showed 99.99%.** Cause: `slot0.sqrtPriceX96` is `sqrt(token1/token0)`; not
   inverting when selling token1. Fix: read `token0()` and invert; clamp implausible values to "—".
3. **Every pair looked dead** in an early probe. Cause: unnamed tuple components in the QuoterV2 ABI
   made viem encode zero addresses. Fix: named tuple components (also the reason the app's ABI is
   written with names).

Final `npm run test:sim`: **14/14 green** (guards, fee API, CCTP burn acceptance, CCTP burn with
funded state, quotes ×3 chains, native swap execution, ERC-20 approve, ERC-20 swap execution, GIWA
deposit acceptance, pair coverage 36/46).

### UI review
- Chromium via CDP at 1440×950 and 375×800 on all 7 routes. No console errors, no `undefined`/`NaN`
  in rendered text. Fixed: clipped "domain N" label on Bridge, and Approval row claiming "already
  approved" while disconnected.

### Notes / open items
- Plume/Cronos/Sonic remain excluded; if their RPCs return, re-verify and add.
- Live end-to-end bridge + swap still needs the owner's wallet (by design — no keys here).
- Deployment intentionally not done; will be a separate step when requested.

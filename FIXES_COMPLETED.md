# FIXES COMPLETED

Every change below is in the existing project; nothing was rebuilt from scratch.

## 1. Mint failure (Base Sepolia → Arc Testnet)

**Files**: `src/lib/bridgeExec.ts`, `src/lib/tx.ts`, `src/lib/errors.ts`, `src/pages/Bridge.tsx`,
`src/pages/ActivityPage.tsx`, `src/pages/Recover.tsx`

1. `prepareTx()` estimates gas with our own RPC and, on chains with a mempool floor (Arc = 20 gwei),
   sets `maxFeePerGas`/`maxPriorityFeePerGas` explicitly (25 gwei + 20% headroom).
2. `submitReceiveMessage()` now, in order: `usedNonces` → gas balance check → `eth_call` simulation →
   explicit-gas send → receipt check. Each failure becomes a named error.
3. `lib/errors.ts` maps wallet rejections, insufficient gas, "nonce already used", invalid attestation,
   fee-too-low, RPC failures and the generic wallet "Transaction failed" into a title + explanation + hint.
4. A failed mint no longer kills the transfer: the step is marked failed, the record stays retryable, and
   the button becomes **Retry mint** (never re-burns).
5. New `/recover` page recovers a transfer from a burn hash even if the local record is gone.

## 2. Arc USDC balance

**Files**: `src/config/chains.ts`, `src/config/tokens.ts`, `src/lib/portfolio.ts`

- Added `nativeIsUsdc` + `minGasPriceGwei` to the chain registry; Arc native decimals are read as 18,
  ERC-20 view as 6.
- Registered Arc USDC (`0x3600…0000`), EURC (`0x89B5…D72a`) and cirBTC (`0xf0C4…32BF`, verified against
  the explorer) — plus USDC on all remaining CCTP testnets so bridge balances work everywhere.
- Portfolio skips the ERC-20 USDC row on Arc to avoid double counting the same money.

## 3. ETH bridging (new routes)

**Files**: `src/lib/opstack.ts`, `src/lib/bridgeExec.ts`, `src/pages/Bridge.tsx`, `src/config/chains.ts`

- `opStackParent` added to Base Sepolia, OP Sepolia, Unichain Sepolia, Ink Sepolia, World Chain Sepolia
  and GIWA Sepolia; `opDepositTargets()` derives them from viem's chain config.
- Bridge shows route chips when both USDC (CCTP) and ETH (OP Stack) exist for a pair.

## 4. Portfolio

**Files**: `src/lib/portfolio.ts`, `src/pages/Portfolio.tsx`, `src/App.tsx`, `src/components/Layout.tsx`

- 18 chains, native + ERC-20, Multicall3 batched, 5-way concurrency, per-chain latency, explicit error
  states (never a fake 0), search, refresh, custom-token import, copy + explorer links.

## 5. Logos

**Files**: `src/components/Logos.tsx`, `src/components/ui.tsx`

- 18 hand-drawn chain marks and 9 token marks on one 24×24 grid with brand gradients, rim light and a
  text fallback for unknown assets. No hotlinks, no external CDN, no licensing question.

## 6. Cross-chain clarity

**Files**: `src/pages/CrossChain.tsx`

- Explicit "bridge vs swap vs cross-chain" block, signature count, and a note that no verified provider
  does atomic testnet cross-chain swaps.

## 7. Performance / robustness

- Multicall3 batching for balances; bounded concurrency; fee cache 60 s; quotes 8 s.
- Explicit gas on every write path (swap, approve, burn, mint, deposit).
- `usedNonces` short-circuit in tracker and mint.
- Disconnected-state gating for balances and error notices.

## Verification

`npm run test:sim` → **23/23**, including a real Base→Arc message decode and a successful Arc
`receiveMessage` simulation. Details in `TEST_RESULTS.md`.

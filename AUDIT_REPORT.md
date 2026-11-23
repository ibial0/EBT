# AUDIT REPORT — EBT v1 → v2

Date: 2026-11-23 · Scope: the existing app at `C:\Testnet web` (not a rewrite)

## 1. What the app is (as found)

Vite + React 18 + TypeScript SPA. No backend. Providers wired directly:

| Layer | Provider | Files |
| --- | --- | --- |
| USDC bridge | Circle CCTP v2 (burn + Iris attestation + `receiveMessage`) | `lib/cctp.ts`, `lib/bridgeExec.ts`, `lib/tracker.ts` |
| Same-chain swap | Uniswap v3 QuoterV2 + SwapRouter02, raw calldata | `lib/uniswap.ts`, `lib/swapExec.ts` |
| ETH deposit | OP Stack OptimismPortal (GIWA only, v1) | `lib/opstack.ts` |
| Wallet | wagmi injected connectors | `lib/wallet.ts`, `components/Layout.tsx` |
| State | localStorage activity store | `lib/activity.ts` |
| Guard | testnet allowlist + contract pinning | `lib/guard.ts`, `config/chains.ts` |

18 testnets allowlisted, 17 with CCTP, 3 with Uniswap liquidity, 1 with an OP deposit.

## 2. Findings

### F1 — Bridge mint step failed after a successful burn (critical)
Evidence from the owner's screenshots + independent chain checks:
- Burn on Base Sepolia `0xacf7316b…7be19`: 20 USDC, `destinationDomain` 26 (Arc), `maxFee` 825, fast.
- Circle Iris: attestation **complete**, message valid.
- Arc `usedNonces(nonce)` = **0** → the mint never happened; funds are recoverable.
- Arc explorer: **zero transactions today** from the owner's address → the mint tx never reached the chain.
- `eth_call` and `estimateGas` for `receiveMessage(message, attestation)` on Arc both **succeed**.
- Arc enforces a **20 gwei `maxFeePerGas` floor**; live baseFee is 20 gwei, gasPrice 25 gwei.

Conclusion: the burn and the message were fine. The failure was **wallet-side, before broadcast**, on a
chain whose mempool rejects under-priced transactions. The app asked the wallet to both estimate gas and
choose the fee for a chain the wallet does not know well, and the wallet returned a generic
`"Transaction failed"` (viem surface). Contributing factors in our code:
- no preflight simulation, so no explicable error;
- no explicit gas/fee, so the wallet's defaults decided;
- no `usedNonces` check, so "already minted" could not be distinguished;
- the failure marked the whole record failed with no retry affordance (though the message was kept).

### F2 — Arc USDC balance showed nothing (critical)
Two independent causes:
1. `config/tokens.ts` had no entry for Arc → `USDC_OF(5042002)` was `undefined` → the balance query was
   disabled and the UI fell back to `0`.
2. Arc is a **stablecoin-native chain**: the gas token *is* USDC (18 decimals natively) with an ERC-20
   view at `0x3600…0000` that reports **6 decimals**. Both views share one balance, so any naive
   "native + token" sum over-counts by 10¹².

Verified live: owner holds **91,280.605806 USDC** (ERC-20 view) and an identical native balance ÷ 10¹².
Also present: EURC 480.0 and cirBTC 0.0019. A **different** token also named `USDC`
(`0x4F3b8005…D20c2`, 165,747.23) sits at the same address — an impostor that must never be treated as
Circle's.

### F3 — Bridge offered only USDC (functionality gap)
v1's `Bridge` hard-coded the CCTP asset. ETH routes existed (GIWA portal) but only for one chain pair, and
the UI exposed no way to see or pick them.

### F4 — No portfolio view
No page aggregated balances; users had to check each chain elsewhere. Nothing showed native + ERC-20 with
contract addresses, decimals and explorer links.

### F5 — Token/network icons were flat initials
`ChainLogo`/`TokenIcon` drew text initials in a gradient circle. No recognisable marks anywhere.

### F6 — Cross-chain swap was functional but unexplained
The implementation was a real two-hop composition, but the UI did not state what it did, what it costs,
why it needs 4–5 signatures, or why it is not atomic.

### F7 — Recovery was implicit
A failed mint left a "failed" record with the message stored, but there was no explicit recovery entry
point (and no way to recover a transfer whose local record was lost).

### F8 — Performance/robustness details
- Balances fetched one `eth_call` per token; no Multicall3 batching.
- No explicit gas on writes (wallet default → F1 class of failures on chains with a floor).
- Attestation polling had no `usedNonces`/already-minted short-circuit.
- Error messages were raw viem strings.

## 3. Preserved on purpose

Architecture, provider set, guard rails, activity model, testnet allowlist, no-backend stance, and every
working v1 feature (swap, CCTP bridge, GIWA deposit, faucets, activity, settings) were kept and extended.

## 4. Verification performed

- Live chain reads for every claim above (Arc RPC + Blockscout + Circle Iris).
- `npm run test:sim` extended to 23 checks — see `TEST_RESULTS.md`.
- Recovery flow exercised against the owner's real burn hash: decodes to 20 USDC → Arc, `not minted`,
  and the mint call simulates successfully.

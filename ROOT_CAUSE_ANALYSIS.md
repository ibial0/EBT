# ROOT CAUSE ANALYSIS

Date: 2026-11-23 · App: EBT (C:\Testnet web)

## 1. "No pool returned for USDC/EURC on Arc" for a 23 USDC swap

**Reported:** the pair quotes fine for 1 USDC, then 23 USDC shows no route.

**Investigated:** read the three Arc pools directly, then quoted 1, 1.5, 2, 3, 4, 5, 10, 20, 23 and 100 USDC at every fee tier.

| Pool (fee) | USDC in pool | EURC in pool | Fills |
| --- | --- | --- | --- |
| 0.01% (100) | 4.64 | 1.00 | up to ~1 USDC |
| 0.30% (3000) | 3.72 | 0.54 | ~0.5 USDC |
| 1.00% (10000) | 28.68 | 1.27 | ~5.5 USDC |

**Root cause:** two separate faults, one in the chain, one in our quote engine.

1. *Chain:* the Arc pools are tiny. Above roughly 1 USDC the 0.01% pool cannot fill an order and QuoterV2 reverts, which the app reported as "no pool".
2. *App:* for the two thinner tiers QuoterV2 does **not** revert, it returns a **partial fill**: 1.5, 5, 23 and 100 USDC all quoted the *same* 1.254022 EURC on the 1% tier. Our `quoteBest` took the largest amount out and would have offered that as a great rate. Signing it would have burned the full input for a fraction of the output.

**Fix:**
- `quoteBest` now probes every tier at a quarter of the requested size. A quote is only accepted when the output **grows with size** and the marginal rate **does not improve** with size. Flat or improving curves are rejected as partial fills.
- `maxFillable()` bisects the largest honestly fillable size per tier (parallel, cached 60s) and the Swap page turns "no route" into "this pool can fill about 5.56 USDC right now" with a button that sets that amount.
- Quotes above 15% price impact now carry a red warning before the CTA.

**Verified:** 0.5, 0.9 and 1 USDC quote on the 0.01% tier; 23 USDC is rejected; `maxFillable` returns 5.563281 USDC at the 1% tier in ~3.6s (cached afterwards).

## 2. Bridge stuck at "Mint on Arc"

**Root cause:** the burn and the attestation were fine (`usedNonces = 0`, message valid, `eth_call` succeeds). The mint transaction never reached Arc. Arc's mempool enforces a **20 gwei `maxFeePerGas` floor** and the app let the wallet choose the fee, so the wallet rejected it before broadcast and surfaced a generic "Transaction failed".

**Fix:** `prepareTx()` estimates gas with our RPC and sets `maxFeePerGas`/`maxPriorityFeePerGas` explicitly on chains with a floor (25 gwei at 20 gwei base), plus a `usedNonces` check, a dry run, and a decoded error. Recovery page can finish the transfer without burning again.

## 3. Arc USDC balance showed nothing

**Root cause:** no Arc entry in the token registry, so the balance query never ran; and Arc's USDC is the native gas token (18 dp) that also has a 6 dp ERC-20 view, which the balance code did not distinguish.

**Fix:** `nativeIsUsdc` flag, Arc USDC/EURC/cirBTC registered, portfolio reads the ERC-20 view once and never sums both views.

## 4. Cross-chain page created a "pending" record before any transaction

**Root cause:** the plan record was written on "Build route plan" with status `pending`.

**Fix:** new `draft` state. A record only becomes `pending` once a transaction hash exists. Wallet rejections become `cancelled`, not `failed`, so a rejected signature is never reported as an on-chain failure.

## 5. Sidebar left dead space and small targets

**Root cause:** fixed 232px rail with 30px rows and 16px icons, no collapse.

**Fix:** 256px expanded / 76px collapsed with a toggle persisted in `localStorage`, 34px rows, 16/18px icons, titles on collapsed items.

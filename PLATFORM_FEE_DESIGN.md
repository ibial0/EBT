# PLATFORM FEE DESIGN

## Current state

**EBT collects no fee.** There is no treasury address, no fee parameter and no extra transfer in
any flow. Every number the UI shows is one of:

| Shown as | What it actually is | Who receives it |
| --- | --- | --- |
| Protocol fee (CCTP) | Circle's fast-transfer fee in basis points, capped by `maxFee` | Circle, deducted at mint |
| Pool fee | Uniswap v3 tier (0.01 / 0.05 / 0.30 / 1.00%) | liquidity providers |
| Price impact | not a fee, a result of pool depth | nobody |
| Network gas | the chain's own gas, estimated locally | validators |
| ETH deposit | L1 gas only | validators |

The code contains no `feeRecipient`, no `platformFeeBps` and no transfer to any address other than
the user, the pool, the bridge or the portal.

## What each provider can support later

| Route | Integrator fee possible? | Mechanism | Risk |
| --- | --- | --- | --- |
| Uniswap v3 `exactInputSingle` | **not directly** | the router has no fee parameter. A fee would require a second `transferFrom` after the swap, or a wrapper contract | a second transaction that can fail after the swap already happened |
| Uniswap Universal Router | yes, on some deployments | `V3_SWAP` with a fee-taking wrapper, or a custom command | deployment-specific, must be verified per chain |
| CCTP v2 `depositForBurn` | **no** | the protocol charges its own fee; there is no integrator hook | none, because it is impossible |
| OP Stack deposit | **no** | the portal takes exactly `value` | none |

## If a fee is ever enabled

1. **Where.** Only on the swap path, and only if the router deployment exposes a supported fee
   mechanism. Never by inserting an extra transfer into a bridge.
2. **How it is charged.** Compute the fee in the *output* token: `feeAmount = amountOut * bps /
   10_000`, taken from the swap result in the same transaction when the router supports it. Otherwise
   do not charge, rather than charging in a second transaction.
3. **Disclosure.** Show it as its own line labelled "Platform fee" above the confirm button, next to
   "Pool fee" and "Network gas", never folded into another number.
4. **Config shape** (not enabled):

```ts
interface PlatformFeeConfig {
  enabled: boolean
  recipient: `0x${string}`
  bpsByChain: Record<number, number>
  bpsByOperation: Record<'swap' | 'crosschain', number>
  maxBps: number // hard ceiling enforced in code, e.g. 50
}
```

5. **Rounding.** Round down, in the output token's own decimals. Never take a fee that rounds to
   zero but never round a user's amount up either.
6. **Failure and refunds.** If the swap reverts, no fee exists because nothing moved. If the fee is
   taken in the same transaction, it is atomic with the swap. If it were ever taken separately, the
   swap must be considered incomplete until the fee transaction confirms, and the UI must say so.
7. **Accounting.** Store `feeBps`, `feeAmount`, `feeToken` and `feeRecipient` on the activity record
   so the history can be reconciled against the treasury.
8. **Consent.** The confirm step must state the exact fee amount in the token being received, not a
   percentage only.

Nothing in this design is active. It exists so a future switch is a configuration change with a
clear audit trail, not a rewrite.

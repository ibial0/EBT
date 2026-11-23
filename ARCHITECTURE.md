# ARCHITECTURE

## Shape

Static SPA (Vite + React + TypeScript) talking directly to public testnet RPCs, Circle's sandbox
Iris API, and the user's injected wallet. **No backend, no database, no server-side secrets.**

```
        ┌──────────────────────────── EBT (browser) ────────────────────────────┐
        │  pages/  Overview · Bridge · Swap · CrossChain · Faucets · Activity   │
        │  components/  Layout+wallet · ChainSelect · TokenSelect · Timeline    │
        │  ─────────────────────────────  lib/  ─────────────────────────────  │
        │  guard.ts ── testnet allowlist + contract pinning (throws)           │
        │  cctp.ts      domains, ABIs, Iris fees, attestation polling          │
        │  uniswap.ts   QuoterV2 quotes, fee-tier best-of, price impact        │
        │  opstack.ts   OptimismPortal deposit for GIWA                        │
        │  swapExec.ts / bridgeExec.ts   exact calldata builders + send        │
        │  tracker.ts   attestation polling, resume after refresh              │
        │  activity.ts  localStorage store (useSyncExternalStore)              │
        └───────┬──────────────────────┬─────────────────────┬─────────────────┘
                │ eth_call / eth_send  │ HTTPS               │ wallet RPC
                ▼                      ▼                     ▼
          testnet RPCs           iris-api-sandbox        MetaMask/Rabby/…
      (sepolia, base, giwa, …)   .circle.com             (user signs)
```

## Adapter principle

Each provider is independent and exposes only what it genuinely supports:

| Adapter | Capability | Chain set |
| --- | --- | --- |
| `cctp` | burn-and-mint USDC + attestation | 17 EVM testnets |
| `uniswap` | exact-input single-hop swaps | 3 testnets |
| `opstack` | L1→L2 ETH deposit | Sepolia → GIWA |

Pages never call a provider directly for a *write*; they always go through `lib/*Exec.ts`, which
enforces `guard.ts` first. Reads (quotes, balances, fees) are plain viem reads wrapped in TanStack
Query.

## Data flow — a CCTP transfer

1. `fetchCctpFees(srcDomain, dstDomain)` → `minimumFee` in bps → `maxFeeFor(amount, bps)` (+25%).
2. `executeCctpBridge()` → allowance check → `approve(exact)` → `depositForBurn(7 args)`.
3. `addActivity()` writes the record with 4 steps (approve, burn, attestation, receive).
4. `startTracking()` polls `/v2/messages/{domain}` with backoff (6s → 30s cap, 40min ceiling) and
   stores `message`/`attestation` in the record.
5. `submitReceiveMessage()` on the destination MessageTransmitter completes the mint.

Because the record lives in `localStorage`, closing the tab does not lose the transfer: on load,
`resumeTracking()` restarts polling for anything unfinished.

## Data flow — a swap

1. `quoteBest()` → parallel `eth_call` to QuoterV2 for fee tiers 100/500/3000/10000, best amount out.
2. `priceImpactBps()` → factory `getPool` → `slot0()` + `token0()` → mid price, inverted when selling
   token1.
3. `buildSwapCalldata()` → single `exactInputSingle` (native in: sent with `value`; native out:
   `multicall([swap→ADDRESS_THIS, unwrapWETH9])`).
4. `executeSwap()` → allowance check → approve(exact) if needed → send → wait for receipt.

## Design decisions & why

- **No Uniswap Trading API**: it needs an API key; on-chain quotes need nothing and are the same
  source of truth. Cost: we implement the fee-tier scan ourselves (20 lines).
- **Manual `receiveMessage`** instead of Circle's Forwarding Service: one fewer third party, no
  extra fee, and the user sees exactly which transaction mints their USDC. Cost: one extra signature.
- **`localStorage` instead of a DB**: single-user tool, durable enough, zero infrastructure, easy to
  export/clear.
- **Vite instead of Next.js**: no SSR needed, no server routes needed (Iris has open CORS), much
  smaller attack surface and faster local iteration. Deploys as static files later.
- **Injected connectors only**: WalletConnect requires a Project ID; a single-user tool should not
  depend on a third-party account.

## Failure handling

| Failure | Behaviour |
| --- | --- |
| RPC down / rate limited | chain shows as down in Settings/Overview; quote query retries then surfaces the error |
| No pool liquidity | pair simply not offered, with an explicit message |
| Quote stale | re-fetched every 8–15s; min-out recomputed from the latest quote |
| Fee API down | fee field shows `fee API error`; bridging still possible with a standard (0 fee) transfer |
| Attestation slow | timeline says "pending" with the real status text, never a fake countdown |
| Wallet rejects | toast "You rejected the request in your wallet" |
| Destination tx reverts | step marked failed, record kept for inspection |

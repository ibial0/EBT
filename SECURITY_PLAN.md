# SECURITY PLAN

Threat model: a single user running a personal testnet tool, in their own browser, with their own
wallet. Funds are worthless by design; the damage we care about is *wrong-chain execution*, *over-
approval*, *fake routes*, and *tooling that could be repurposed against mainnet*.

## 1. Testnet-only enforcement (hard)

| Control | Implementation |
| --- | --- |
| Single source of truth | `config/chains.ts` — `TESTNET_IDS` derived from the registry |
| Pre-transaction guard | `guard.assertTestnet()` called inside every `*Exec` function before calldata is built |
| Mainnet detection | known mainnet ids (1, 10, 137, 8453, 42161, …) produce an explicit "Blocked: N is a mainnet" error |
| Unknown chains | any id not in the registry throws |
| No mainnet toggle | the setting does not exist in code or UI |
| Contract pinning | CCTP targets must equal `0x8FE6…2DAA` / `0xE737…E275`; Uniswap targets must equal the registry router/quoter |
| Route gating | CCTP routes require both chains to have a domain + USDC; GIWA is explicitly not a CCTP chain |

## 2. Transaction safety

- **Exact approvals**: `approve(spender, amount)` — never `MaxUint256`.
- **Destination verification**: recipient must be a 20-byte EVM address; `mintRecipient` is encoded
  as a left-padded bytes32.
- **Slippage & minimum received**: `amountOutMinimum = quote * (1 - slippage)`; slippage is bounded
  to 0–50% in the UI.
- **Quote freshness**: quotes are refetched every 8–15s and recomputed after every change; expired
  states cannot be submitted because execution re-quotes the destination leg.
- **Fee cap**: `maxFee` sent with `depositForBurn` is the API fee + 25% buffer; a larger real fee
  reverts on the source chain instead of silently over-charging.
- **Duplicate submission**: buttons are disabled while a step is in flight; each step's hash is
  recorded once.
- **No silent signing**: every write is `eth_sendTransaction` from the user's wallet — EBT builds
  calldata only and never has access to a key.
- **Native input correctness**: `msg.value` is only attached on the native-in path; the router wraps
  it internally (`pay()`), verified by simulation.

## 3. Secrets

There are none. No API keys, no `.env` requirements, no server. `.env.example` exists only to
document that nothing is required. If an optional key is ever added (e.g. WalletConnect Project ID),
it must be a public client-side identifier, never a private secret.

## 4. Data

- Activity history → `localStorage`, per browser profile. Exportable, clearable.
- No analytics, no telemetry, no third-party scripts beyond the RPCs and Circle's API.
- RPC providers see the user's IP and the contracts they read — inherent to any dApp; documented in
  Settings (which host each RPC belongs to).

## 5. Supply chain

- Only official packages: `viem`, `wagmi`, `@tanstack/react-query`, `react`, `tailwindcss`,
  `lucide-react`. `@uniswap/sdk-core` was used **only** as a dev-time source of official addresses,
  not shipped.
- No unofficial forks or clones. Provider repos recorded in `PROVIDER_MATRIX.md`.
- Verified contract addresses come from provider docs and are cross-checked on-chain (symbol/decimals
  reads, portal deposit simulation).

## 6. Abuse paths considered

| Path | Result |
| --- | --- |
| Malicious dApp prompts a mainnet tx through EBT | impossible — guard throws, no mainnet transport configured in wagmi |
| Infinite approval drains a wallet later | not possible — exact approvals |
| Fake quote to bait a swap | quotes are read-only `eth_call`s to the pool's Quoter; a pair without liquidity yields no route |
| Phishing faucet link | every faucet URL is the chain's own / Circle's, and HTTP-checked |
| Stored XSS via activity data | activity is self-generated JSON rendered as text, no `dangerouslySetInnerHTML` |

## 7. Residual risks (accepted, documented)

- Testnet RPCs are public and can rate-limit or go down — mitigated with per-chain status display.
- Circle's sandbox attestation API has no SLA.
- Thin testnet liquidity can make a swap revert — surfaced as a real revert, not hidden.
- The wallet itself (extension) is outside EBT's trust boundary.

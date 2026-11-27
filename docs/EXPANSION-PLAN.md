# Bridge / swap expansion — market scan and staged plan

Date: 2026-11-27. Scope: EBT (testnet-only, frontend-only, no backend, no API keys).

The rule that decides everything below: **a provider can only be integrated if it is live on testnets we
already support and can be driven entirely from the browser.** Anything that needs a paid API key, a
backend relayer, or exists only on mainnet is out — no matter how good it looks on paper.

## What the app already covers

| Path | Mechanism | Chains |
|---|---|---|
| USDC | Circle CCTP v2 (burn + attest + mint) | Sepolia, Base Sepolia, Arbitrum Sepolia, OP Sepolia, Amoy, Fuji … |
| Native / WETH / USDC | Across v3 intents | Sepolia ↔ L2s |
| ETH into OP Stack L2s | OP portal deposits | OP, Base, Zora, … |
| ETH into 4 Orbit chains | Arbitrum Inbox retryable ticket | Robinhood, T-Rex, HPP, Edge |
| Orbit → parent | **canonical withdrawal (ArbSys + Outbox)** | all 13 Orbit chains in the registry |
| Swaps | Uniswap V3 + V2 on the source chain | wherever those factories exist |

## What the market offers (verified, not marketing)

| Protocol | Testnets? | Key needed? | What it would add | Verdict |
|---|---|---|---|---|
| **Stargate V2 (LayerZero OFT)** | **Yes, funded** — Sepolia eid 40161, Arbitrum Sepolia 40231, OP Sepolia 40232, BNB 40102 | No | ETH + USDC transfers between Sepolia / Arb Sepolia / OP Sepolia (3 chains, 6 directed pairs), single signature | **Stage 1** |
| **Wormhole Token Bridge** | Yes — Sepolia, Base, Arb, OP, Amoy, Fuji + **Solana devnet, Sui, Aptos** | No (public guardian API) | arbitrary ERC-20s across EVM testnets, and later non-EVM | **Stage 2 (EVM) / Stage 4 (non-EVM)** |
| OP Stack withdrawals (L2→L1) | Yes | No | Base/OP/Zora → Sepolia | Stage 5 — 7-day challenge, low value |
| Hyperlane Warp Routes | Yes, but only for tokens somebody deployed a route for | No | depends on which warp routes exist; not general-purpose | Skip unless a route we need shows up |
| LI.FI / Relay / Across API / deBridge / Squid(Axelar) / 1inch / 0x / Paraswap | mostly mainnet-only or key-gated | **Yes** | — | Out of scope for a keyless testnet app |

### Stargate V2, verified on-chain (2026-11-27)
- Sepolia native pool `0x9Cc7e185162Aa5D1425ee924D97a87A0a34A0706`, holds **~458 ETH** → liquidity is real.
- `quoteSend` from Sepolia → Arb Sepolia returns `nativeFee 0.000108 ETH`; → OP Sepolia `0.000102 ETH`.
  (Same-chain quote reverts with `0xf6ff4fb7`, as expected.)
- USDC pools exist on the same three chains; BNB testnet only has USDT.
- Send path: `StargatePool.send(SendParam{dstEid,to,amountLD,minAmountLD,extraOptions,composeMsg,oftCmd},
  MessagingFee{nativeFee,lzTokenFee}, refundAddress)` payable — one signature, no approval for the native pool.

## Staged plan (one at a time, each fully verified before the next)

1. **Stargate V2 — ETH.** Config: three pools + eids. Quote → `send` → track by `LayerZero Scan`
   (`https://scan-testnet.layerzero-api.com/v1/messages/tx/<hash>`), activity steps `send` → `arrive`.
   New pairs: Sepolia↔Arb Sepolia, Sepolia↔OP Sepolia, Arb Sepolia↔OP Sepolia (ETH).
2. **Stargate V2 — USDC.** Same pools, ERC-20 variant: `approve` + `send` with `sharedDecimals 6`.
   Verify the destination pool mints rather than credits before promising an amount.
3. **Wormhole Token Bridge (EVM).** `transferTokens`/`wrapAndTransferETH` on the source, poll
   `api.testnet.wormholescan.io` for the VAA, `completeTransfer` on the destination (second signature,
   ~15 min for token-bridge mode). Adds arbitrary ERC-20 pairs across the four EVM testnets.
4. **Wormhole to Solana devnet.** Reuses stage 3's VAA flow; needs the Solana wallet path the app already
   has for non-EVM balances. This is the only honest way to answer "ETH → non-EVM".
5. **OP Stack withdrawals.** Prove + finalize against the FaultDisputeGame; 7-day delay makes it a
   completeness feature, not a UX feature.

## Rules for each stage
- Never advertise a pair until a real quote comes back from the live contract.
- Track every leg in the local activity ledger with the provider name, so a failed leg is visible.
- Keep the existing conflict-free paths: CCTP wins for USDC where it is cheaper, Across wins for fast L2 hops.
- One provider per commit, with a `scripts/_<provider>.mjs` probe that proves the quote/send path.

## Swap coverage audit (2026-11-27, on-chain)

Every chain in `src/config/chains.ts` was checked against the canonical Uniswap V2/V3 factory
addresses, the project's own configured deployments, and Uniswap's official `deployments.json`
feed (`docs.uniswap.org/deployments.json`, generated 2026-11-09).

- **71 chains** in the allowlist, **12 with swaps** (17%).
- Official Uniswap v3 testnet deployments that intersect our chains: Sepolia, OP Sepolia,
  Arb Sepolia, Base Sepolia, Unichain Sepolia (all wired), plus Monad and Zora Sepolia.
  Monad's factory `0x961235a9…` and Zora's `0x4324A677…` return **no bytecode** on their public
  testnet RPCs today, so there is nothing to call.
- The other 7 swap chains run deployments that were verified on chain and configured locally:
  Robinhood (83 v3 pools), Arc (10), BNB (9 v3 + 36 v2 pairs), Hedera (4), Abstract (3 + 1),
  Avalanche Fuji (3 v2), Sei (1 v2).
- **The remaining 59 chains return no code at any canonical factory** and have no official
  Uniswap deployment. Most are Orbit / app-specific testnets (T-Rex, SX, HPP, Plume, Humanity,
  Edge, MegaETH, Monad, Plasma, Tempo, Pharos, …) where no AMM exists. A swap there would mean
  inventing a route, which we do not do.
- Swap UI now states this plainly: "No AMM is deployed on <chain>. … Bridge the token to a
  chain that has a pool instead." (previously the form rendered silently empty).

## Wormhole Token Bridge — verified, and why the route is off (2026-11-27)

- Token Bridge contracts confirmed by `chainId()`: Sepolia `0xDB54…bd9` (10002), Arb Sepolia
  `0xC7A2…97e` (10003), Base Sepolia `0x86F5…239` (10004), OP Sepolia `0x9973…0Ac` (10005).
- `isWrappedAsset(native USDC) == false` on all four — which looked like native USDC both ends.
- Full flow executed on testnet:
  - send `0x2450bcb3…4d227` (0.5 USDC, Sepolia, gas 128,299)
  - guardians signed the VAA (256 bytes, ~15 min)
  - claim `0x56fcc08f…09fe2` (Base Sepolia, success)
- **The claim minted `0x3f872340b6a75397aa9b0a463000349962a8795d` ("USDC", from address(0)) — a
  Wormhole-wrapped USDC, not the Circle USDC (`0x036C…CF7e`) the app holds.** `isWrappedAsset`
  only says the native token is not itself a wrapped asset; it does not mean this bridge maps
  Sepolia USDC onto the native destination token.
- Consequence: the route is disabled (`WORMHOLE_USDC_ROUTE = false` in `routes.ts`). The library,
  VAA polling, resume-on-reopen and claim path stay in the repo, verified, for the day Wormhole
  registers native testnet USDC (or for an explicit "wrapped asset" surface).

# RESEARCH REPORT — provider discovery & verification

Date of all live checks: **2026-11-23**. Everything below was verified from official sources and/or
by direct RPC/API calls from this machine. Anything unverified is labelled as such.

---

## 1. Circle CCTP v2

**Sources**
- Contract addresses: https://developers.circle.com/cctp/references/contract-addresses.md
- Contract interfaces (`depositForBurn`, `receiveMessage`): https://developers.circle.com/cctp/references/contract-interfaces.md
- Fees (basis points, `maxFee` semantics): https://developers.circle.com/cctp/concepts/fees.md
- USDC addresses: https://developers.circle.com/stablecoins/usdc-contract-addresses.md
- GitHub: https://github.com/circlefin/evm-cctp-contracts (official org, active)

**Verified facts**
- `TokenMessengerV2` = `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA` on **every** testnet (CREATE2).
- `MessageTransmitterV2` = `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275` on every testnet.
- `depositForBurn(amount, destinationDomain, mintRecipient, burnToken, destinationCaller, maxFee, minFinalityThreshold)` — 7 args, confirmed by an on-chain `eth_call` that returned
  `Mint recipient must be nonzero` for a zero recipient (proves the signature and argument order decode).
- V1 is legacy; V2 is current. Noble/Sui/Aptos still need V1 (not integrated — EVM only).
- Fee API: `GET https://iris-api-sandbox.circle.com/v2/burn/USDC/fees/{srcDomain}/{dstDomain}`
  → live response for 0→6: `[{finalityThreshold:1000, minimumFee:1}, {finalityThreshold:2000, minimumFee:0}]`.
  `minimumFee` is in **basis points**, so fast = 0.01% on that route, standard = 0.
- Attestation: `GET /v2/messages/{domain}?transactionHash=0x…&cctpVersion=2`. Returns 404 with
  `{"error":"Message not found…"}` until indexed. CORS header `Access-Control-Allow-Origin: *` —
  safe to call from the browser, no proxy and no key needed.
- Fast transfer fee is deducted **at mint**; `maxFee` is a cap, so we add a 25% buffer to avoid a
  revert if the fee ticks up (docs suggest 10–20%; we use 25% for thin-margin safety).
- No API key on any of the above endpoints.

**Chains verified live (chainId probed + USDC `symbol()`/`decimals()` read on-chain)**
Sepolia 11155111 (domain 0), Fuji 43113 (1), OP Sepolia 11155420 (2), Arbitrum Sepolia 421614 (3),
Base Sepolia 84532 (6), Polygon Amoy 80002 (7), Unichain Sepolia 1301 (10), Linea Sepolia 59141 (11),
Codex Testnet 812242 (12), World Chain Sepolia 4801 (14), Monad Testnet 10143 (15), Sei Testnet 1328 (16),
Ink Sepolia 763373 (21), Arc Testnet 5042002 (26), Injective Testnet 1439 (29), Plasma Testnet 9746 (33),
X Layer Testnet 1952 (37). All returned `USDC / 6`.

**Rejected during research**
- **Plume Testnet** (domain 22) — `testnet-rpc.plumenetwork.xyz` timed out; viem's definition is marked
  "Legacy" with a different id. Excluded rather than shipped broken.
- **Cronos Testnet** (domain 32) — `evm-t3.cronos.org` did not respond.
- **Sonic** (domain 13) — Circle lists "Sonic Testnet"; viem's `sonicTestnet` id (64165) does not match
  the Blaze testnet ids Circle also lists. Chain-id ambiguity → excluded until resolved.
- **Morph Hoodi, HyperEVM, EDGE, Pharos, XDC** — CCTP domains exist but viem has no verified chain
  definition in this version; skipped to avoid hand-typing RPC/chain data.

---

## 2. Uniswap v3 (on-chain, not the Trading API)

**Sources**
- Official deployment addresses: `@uniswap/sdk-core` → `CHAIN_TO_ADDRESSES_MAP` (official npm package).
- Uniswap API supported chains: https://developers.uniswap.org/docs/trading/swapping-api/supported-chains
- GitHub: https://github.com/Uniswap/v3-periphery (GPL-2.0), https://github.com/Uniswap/v3-core (BUSL-1.1)

**Verified facts**
- Uniswap's **Trading API supports testnets** (Sepolia 11155111, Base Sepolia 84532, Unichain Sepolia
  1301) but requires a developer API key → deliberately not a dependency.
- Their **web app** only exposes Sepolia and Unichain Sepolia in testnet mode; API support ≠ UI support
  (exactly as the brief warned).
- QuoterV2 `quoteExactInputSingle` returns live amounts on all three chains (checked 2026-11-23):
  Sepolia WETH→USDC 0.001 ETH → 30,966,764 (6dp) at the 0.05% tier.
- Sepolia has **real liquidity across 7 tokens** (USDC, WETH, UNI, DAI, LINK, USDT, WBTC) and roughly
  a dozen live pairs across fee tiers; Base Sepolia and Unichain Sepolia are USDC/WETH only.
- Deployment addresses used (from the official SDK):
  - Sepolia: factory `0x0227…DaC1c`, quoter `0xEd1f…2FB3`, router02 `0x3bFA…e48E`
  - Base Sepolia: factory `0x4752…aD24`, quoter `0xC529…5E27`, router02 `0x94cC…2bc4`
  - Unichain Sepolia: factory `0x1F98…F984`, quoter `0x6Dd3…BF89`, router02 `0xd1AA…b166`

**Calldata bug found and fixed during verification (important)**
`SwapRouter02.multicall` **delegatecalls**, so `msg.sender` stays the user for every inner call. My first
implementation wrapped ETH with an explicit `wrapETH()` call inside the multicall, which left the WETH
owned by the router while `pay()` pulled from the user → `STF` (SafeTransferFrom failed) on-chain.
Correct approach, now implemented: for native input, send `exactInputSingle` **directly** with
`value = amountIn`; `SwapRouter02.pay()` detects `tokenIn == WETH9 && address(this).balance >= value`
and wraps on the fly. Native output still uses `multicall([exactInputSingle(recipient=ADDRESS_THIS), unwrapWETH9])`.

**Price-impact formula bug found and fixed**
Uniswap's `slot0.sqrtPriceX96` is `sqrt(token1/token0)`. Comparing quote vs. spot without inverting
when selling `token1` produced a bogus 99.99% impact. Now the pool's `token0()` decides whether to
invert, and implausible values (>90%) are reported as "unknown" rather than displayed.

---

## 3. GIWA Sepolia (OP Stack)

**Sources**: https://docs.giwa.io/get-started/connect-to-giwa.md, /get-started/bridging/eth.md,
/network-information/contracts.md; viem ships a `giwaSepolia` chain definition.

**Verified facts**
- chainId **91342**, RPC `https://sepolia-rpc.giwa.io`, explorer `https://sepolia-explorer.giwa.io`,
  native ETH, 1s blocks, OP Stack L2 on Ethereum Sepolia.
- `OptimismPortal` (L1, for Sepolia) = `0x956962C34687A954e611A83619ABaA37Ce6bC78A` (from viem's chain
  config; matches the address the docs describe for deposits).
- `L2StandardBridge` = `0x4200…0010`, `WETH9` = `0x4200…0006`.
- Deposit path simulated successfully: `eth_call` to the portal with `depositTransaction(to, value,
  1e6 gasLimit, false, 0x)` from a state-funded address returned success.
- **GIWA is not a CCTP chain.** Not in Circle's domain list — USDC cannot be bridged there.
- Withdrawals require the 7-day challenge period → not implemented in v1.

---

## 4. Providers researched and deliberately not integrated

| Provider | Finding | Decision |
| --- | --- | --- |
| LI.FI | Provider documents that testnet integration support has ended | not integrated |
| 0x Swap API | Does not serve testnets | not integrated |
| Wormhole Connect | Testnet routes need explicit per-route configuration against a remote, mainnet-oriented config; could not verify a route end-to-end from this environment | not integrated, documented |
| Uniswap Trading API | Works on 3 testnets but requires an API key | replaced with direct on-chain quotes (no key) |
| Stargate / Across / Relay / Squid / Rango / deBridge / Router / Axelar / LayerZero | No verifiable, publicly usable **testnet** bridge route without keys/registration found in the time box | not integrated |

This is the honest list: a route is only offered if a verified provider can actually execute it.

---

## 5. Repositories / packages checked

| Package | Owner | Version used | Licence | Notes |
| --- | --- | --- | --- | --- |
| `viem` | wevm | 2.58 | MIT | chain definitions + all contract I/O |
| `wagmi` | wevm | 2.x | MIT | wallet connection only (injected connector) |
| `@tanstack/react-query` | TanStack | 5.x | MIT | quote/fee caching |
| `@uniswap/sdk-core` | Uniswap (dev dependency of the probe only, not shipped) | latest | MIT | source of official deployment addresses |
| `react`, `react-dom` | Meta | 18.3 | MIT | UI |
| `tailwindcss` | Tailwind Labs | 4.x | MIT | styling |
| `lucide-react` | Lucide | 0.468 | ISC | icons |

No unofficial forks, no abandoned SDKs, no unverified contract addresses.

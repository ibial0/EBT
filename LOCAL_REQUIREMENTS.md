# LOCAL REQUIREMENTS

Every requirement from the task instruction, with its state and the evidence. Statuses:
Verified (tested in the running app or against chain state), Partial (works with a documented
limitation), Unsupported (no verified provider exists), Blocked (needs something from the owner).

## Platform and scope

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| GEN-001 | Work only in the existing local project | Verified | All edits under `C:\Testnet web`; no deploy, no remote |
| GEN-002 | Do not replace real functionality with placeholders | Verified | Every quote, balance and reserve is an on-chain read; no mock data added |
| GEN-003 | Keep the app testnet-only | Verified | `src/lib/guard.ts` rejects non-allowlisted chain ids before calldata is built; no mainnet toggle |
| GEN-004 | Never bypass wallet approval | Verified | All sends go through `wallet.sendTransaction`; no key handling anywhere |
| GEN-005 | Create a recoverable checkpoint before changing | Verified | Git commit + `known-good-v0.4` tag before the first edit of the previous pass; new commit after |

## Portfolio

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| PORT-001 | Hide zero balances, show tiny positives | Verified | `Portfolio.tsx` filters `amount > 0`; an "Empty networks" toggle is opt-in |
| PORT-002 | Sort by comparable value | Verified | Rows sort by USD value; chain groups sort by chain total |
| PORT-003 | RPC error is never a zero balance | Verified | Errors stored per holding and badged "RPC error"; `nativeError` separate from `native` |
| PORT-004 | Logo, symbol, amount, chain, contract, copy, explorer, refresh | Verified | `AssetRow` renders all; copy added this pass |
| PORT-005 | Network selector rescopes total and list | Verified | `network` state scopes both the headline and the groups |
| PORT-006 | USD / amount toggle | Verified | `View` toggle |
| PORT-007 | No invented testnet USD value | Verified | Prices labelled as mainnet estimates from DefiLlama; unpriced assets counted |

## Swap and liquidity

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| SWAP-001 | Offer every chain with a real swap route | Verified | 5 chains: Sepolia, Base, Unichain, OP Sepolia, Arc. Ink Sepolia (16 routers, zero pools), World Chain (one uninitialized pool, no bound router) and GIWA (only a mock-USDC pool, no bound quoter) were each investigated and are not offered |
| SWAP-002 | Pair support from pool discovery, not assumption | Verified | `src/config/pools.ts` (23 pools) + buy list narrowed to pooled pairs |
| SWAP-003 | Quote, rate, min received, slippage, impact, fee, gas, balance checks | Verified | `Swap.tsx` quote panel and `maxFillable` depth check |
| SWAP-004 | No partial-fill quotes accepted | Verified | `quoteBest` probes at half size and rejects flat or improving curves |
| SWAP-005 | Honest "no pool" message | Verified | "This pool can fill about X right now" with a Use button |
| LIQ-001 | Liquidity overview grouped by chain | Verified | Overview "Liquidity by chain" |
| LIQ-002 | Ranking and filtering | Verified | Sorted by depth; filters for network, token, status, venue |
| LIQ-003 | No invented USD TVL | Verified | Reserves in token units, with an explicit note |

## Bridge

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| BRIDGE-001 | Automatic asset and route selection | Verified | `autoKind` from actual holdings |
| BRIDGE-002 | USDC vs native gas kept separate | Verified | CCTP for USDC, portal for native; a native token is never sent through CCTP |
| BRIDGE-003 | Base Sepolia to GIWA investigated | Verified | No direct route exists; the UI says exactly why and offers the L1 path |
| BRIDGE-004 | No misspelled or misleading provider labels | Verified | Labels checked: CCTP, OP Stack, burn and mint, GIWA |
| BRIDGE-005 | Arc gas handled correctly | Verified | 20 gwei floor, explicit fees, decoded errors (previous pass) |

## Cross-chain

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| CROSS-001 | "Find available routes" language | Verified | Button renamed |
| CROSS-002 | Only real destination pairs | Verified | USDC-pool backed list |
| CROSS-003 | Explain unsupported routes | Verified | cirBTC to ETH explained; destination without a venue explained |
| CROSS-004 | No activity record before a transaction | Verified | Records are created at execution |

## Transactions, notifications, recovery

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| TX-001 | Draft state, no false failed records | Verified | `draft` until a hash exists; wallet rejection is `cancelled` |
| TX-002 | Persistence across refresh | Verified | localStorage, hydrated on load |
| TX-003 | No duplicate submissions | Verified | `busy` guard on every action |
| NOTIF-001 | Red badge only for pending with a hash | Verified | `NotificationBell` counts unfinished records that have a hash |
| NOTIF-002 | Completion and failure alerts, no replay | Verified | Flash + `notified` flag |
| RECOVERY-001 | Detect genuinely recoverable transfers | Verified | `usedNonces` checked on chain at display time |
| RECOVERY-002 | Recover and Recover all, per-item result | Verified | `RecoveryPanel`; sequential, one signature each |
| RECOVERY-003 | Manual recovery by burn hash kept | Verified | `/recover` page |

## UI, logos, fees, security

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| UI-001 | Logo toggles the sidebar, collapsed rail | Verified | Click tested in the browser |
| UI-002 | Bigger nav targets and icons | Verified | 40px rows, 18px icons |
| UI-003 | Faucet links work and show requirements | Verified | Every URL re-checked and read. Docs/marketing links replaced for Linea, World Chain, Sei, Monad and Avalanche. Two 403s and one 429 are bot walls / rate limits and are labelled as such; Superchain is genuinely under maintenance and the Alchemy entry is given as the working path |
| UI-004 | Plain copy, no em dashes or filler | Verified | Swept this pass |
| LOGO-001 | Central asset registry, address-keyed | Verified | `src/config/logos.ts` |
| LOGO-002 | cirBTC logo | Unsupported | No verified official asset found; a neutral monogram is shown instead of a wrong mark |
| FEE-001 | Fee audit, platform fee inactive | Verified | `PLATFORM_FEE_DESIGN.md`; no fee code path exists |
| SECURITY-001 | Contract pinning, exact approvals, testnet guard | Verified | `guard.ts`, `tx.ts`; Robinhood mainnet (4663) added to the blocklist |
| ROBIN-001 | Robinhood Chain investigated | Verified | Testnet 46630 verified live (RPC, explorer, faucet, chain id) and added with only wallet/native/ERC-20/faucet/explorer. Swap and USDC bridge are not offered because no Uniswap deployment exists and no Circle-issued USDC can be verified |

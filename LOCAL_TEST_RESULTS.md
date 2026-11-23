# LOCAL TEST RESULTS

## Simulation harness (`npm run test:sim`)

Runs the app's own calldata builders against live chain state with `eth_call` and
`stateOverride`. No signature is bypassed and nothing is broadcast.

| Check | Result |
| --- | --- |
| guard: mainnet rejected | PASS |
| guard: unknown chain rejected | PASS |
| guard: GIWA has no CCTP route | PASS |
| cctp: Iris fee API (0 to 6) | PASS, fast=1bps standard=0bps |
| cctp: burn reaches token transfer | PASS (revert decoded as allowance) |
| cctp: depositForBurn with funds | PASS |
| swap: quote WETH to USDC on Sepolia | PASS, impact 30bps |
| swap: native ETH to USDC executes | PASS |
| swap: quote USDC to WETH on Sepolia | PASS |
| swap: USDC.approve(router, exact) | PASS |
| swap: USDC to ETH executes with funds | PASS |
| swap: quote USDC to WETH on Base Sepolia | PASS |
| swap: quote USDC to WETH on OP Sepolia | PASS, out=1594436053642098 fee=500 |
| swap: USDC to WETH executes on OP Sepolia | PASS |
| swap: executable pair coverage | PASS, 36 live pairs / 46 probed |
| swap: quote USDC to EURC on Arc | PASS, out=927591 fee=100 impact=235bps |
| swap: Arc router accepts calldata | PASS (STF, decoded) |
| swap: Arc empty tier rejected | PASS (SPL) |
| arc: MessageTransmitter localDomain | PASS, domain=26 |
| arc: USDC ERC-20 view is 6dp | PASS |
| arc: gas floor at least 20 gwei | PASS, 25 gwei |
| cctp: message decoder (real message) | PASS, amount=20000000 to domain 26 |
| cctp: Arc mint simulation | PASS |
| opstack: GIWA deposit accepted | PASS |
| opstack: ETH deposit targets from Sepolia | PASS, 6 targets |
| opstack: portal has code (OP/Base/Unichain) | PASS |

**28 of 28 checks pass.**

## Browser verification (`http://localhost:5178`)

| Page | Check | Result |
| --- | --- | --- |
| Any | Build version in sidebar | build 0.4.0 (read from package.json) |
| Any | Brand mark | `/logos/ebt.svg` loads, 150x150, full colour |
| Any | Nav items | Overview, Portfolio, Bridge, Swap, Cross-chain, Faucets, Activity, Settings |
| Overview | Liquidity table renders live reserves | 23 verified pools, ranked by depth, status badges |
| Overview | Filters | network, token, status, venue |
| Bridge | Base Sepolia to GIWA | explains the 7-day withdrawal reason, offers Sepolia to GIWA |
| Bridge | Route details | disclosure with TokenMessenger / MessageTransmitter / OptimismPortal |
| Faucets | Direct link + Requirements modal | 70 anchors, modal shows access, cooldown, note, URL, check date |
| Swap | Base Sepolia buy list with ETH selected | only USDC offered (the only token pooled against WETH) |
| Portfolio | Recovery panel | detects the real unattested transfer and offers Recover |

## Robinhood Chain Testnet (added 2026-11-23)

| Check | Result |
| --- | --- |
| `eth_chainId` on rpc.testnet.chain.robinhood.com | `0xb626` = 46630, matching the official docs |
| Block number | 157,027,478 (chain responds) |
| Explorer | explorer.testnet.chain.robinhood.com returns 200 |
| Official faucet | faucet.testnet.chain.robinhood.com returns 429 (rate-limited, not dead) |
| Uniswap v3 factories | no code at 0x0227628f…, 0x1F98431c…, 0x4752ba5D… |
| WETH predeploy | no code |
| CCTP contracts | exist at the canonical address, `localDomain()` = 35, Iris returns a fee schedule |
| Circle USDC issuance | **not verifiable**; several USDC-named tokens, none documented by Circle |
| Offered in the UI | wallet, native balance, ERC-20 balance, faucet, explorer only |

## Full-site interaction sweep (after the Bridge modal fix)

Every page visited, then its primary controls exercised.

| Page | Renders | Stray overlays at rest | Clickable controls | Console errors |
| --- | --- | --- | --- | --- |
| Overview | yes | 0 | 5 | none |
| Portfolio | yes | 0 | 4 | none |
| Bridge | yes | 0 | 9 | none |
| Swap | yes | 0 | 9 | none |
| Cross-chain | yes | 0 | 6 | none |
| Faucets | yes | 0 | 46 | none |
| Activity | yes | 0 | 6 | none |
| Recover | yes | 0 | 5 | none |
| Settings | yes | 0 | 4 | none |

Bridge interactions: send/receive asset pickers open and close, chain switching recomputes the route,
direction flip recomputes (OP Sepolia to Sepolia correctly becomes a composite because the portal is
one-way), amount entry produces a live estimate, recipient input works, connected balance is read
from the chain (0.81368 ETH on Sepolia) and the CTA reads "Bridge ETH".

Modal close paths verified for backdrop, X and Escape.

Mobile (390x844): no horizontal scroll, bottom navigation present.

## Not verified by automation

Anything that needs a real signature: the actual mint on Arc, an actual swap, a real
recovery. Calldata, gas, simulation and on-chain eligibility are verified; the signature
is the owner's.


## OP Stack deposit tracker (v0.5.2)

Found from a real user report: a 0.1 ETH Sepolia -> GIWA Sepolia deposit sat at "pending" for
3 hours. The deposit had in fact been included on GIWA 59 seconds after the L1 transaction
(L2 tx `0x81f9c9d4c9e8ec03375bb0588e56b8a7fab209241b1307f98ddd3fa31415a2a6`, block 42084947).
The app had no way to resolve an OP Stack deposit: the tracker only handled Circle CCTP attestations.

A canonical deposit is derived by the sequencer from the L1 `TransactionDeposited` log, so the
destination transaction hash is computable locally:

- `sourceHash = keccak256(bytes32(uint256(0)), keccak256(l1BlockHash, bytes32(uint256(l1LogIndex))))`
- `depositTx  = keccak256(0x7E || rlp([sourceHash, from, to, mint, value, gas, isSystemTx, data]))`

`src/lib/depositTrack.ts` implements this and polls the destination chain. Verified end to end:
the derived hash equals the hash the destination chain reports, and a record seeded in the exact
shape of the user's stuck entry flips to `complete` on page load with both hashes recorded.

`npm run test:deposit` re-derives the hash for that real deposit and asserts the destination reports
it successful, so a regression cannot silently strand another deposit.


## Arbitrum Orbit bridge (v0.6.0)

| check | result |
| --- | --- |
| `tsc --noEmit` | clean |
| `vite build` | ok |
| `test:sim` | 28/28 |
| `test:routes` | 14/14 (new: Sepolia ETH → Robinhood ETH direct, Base ETH → Robinhood ETH composite) |
| `test:deposit` | 5/5 |
| `test:orbit` | 6/6, including a live `eth_call` of the ETH deposit calldata |
| browser: Bridge Sepolia → Robinhood | route card renders, Direct, 1 signature |

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

## Not verified by automation

Anything that needs a real signature: the actual mint on Arc, an actual swap, a real
recovery. Calldata, gas, simulation and on-chain eligibility are verified; the signature
is the owner's.

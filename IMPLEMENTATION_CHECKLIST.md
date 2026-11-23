# IMPLEMENTATION CHECKLIST

Status of every step in the task, with the evidence that closed it.

## Phase 1 — understand the existing implementation

- [x] All configured networks, chain ids, names, native currencies read from `src/config/chains.ts`
- [x] Token registry, addresses, decimals, logos read from `src/config/tokens.ts` and `src/config/logos.ts`
- [x] Bridge providers (`src/lib/cctp.ts`, `src/lib/opstack.ts`) and swap provider (`src/lib/uniswap.ts`) audited
- [x] Route logic, RPC config, selectors, transaction preparation, balance fetching audited
- [x] Bridge and Swap exercised in the running app
- [x] Root causes recorded → `BRIDGE_SWAP_AUDIT.md`

## Phase 2 — token inventory

- [x] Per-chain registry with chain id, address, symbol, name, decimals, logo, verified flag
- [x] Sepolia majors verified on chain (USDC, WETH, UNI, DAI, LINK, USDT, WBTC)
- [x] Arc: native USDC (18dp) / ERC-20 USDC (6dp) / EURC / cirBTC all read from the contracts
- [x] cirBTC restored to visibility (Portfolio); absent from Swap/Bridge because it has no pool
- [x] Native vs ERC-20 identity separated, native has its own id
- [x] Address-keyed logo registry; symbol fallback suppressed for imported tokens
- [x] Inventory written → `TOKEN_COMPATIBILITY_MATRIX.md`

## Phase 3 — route compatibility engine

- [x] Seven concepts kept separate (exists / visible / provider-supported / destination-supported / has representation / has a route / convertible through a swap)
- [x] Type A direct same-asset routes: CCTP for USDC, portal for native ETH
- [x] Type B composite routes, labelled "Bridge + swap"
- [x] Route candidate carries chains, tokens, provider, type, steps, approvals, fees, received amount, duration
- [x] No hardcoded "USDC everywhere"; the engine only emits verified legs
- [x] Asset mapping explicit per leg; both directions checked independently (portal is one-way and says so)
- [x] Automatic best-route selection (direct first, then fewest transactions)
- [x] Alternative routes listed when more than one exists
- [x] No-route case clears the selection, explains why, lists what does work

## Phase 4 — required scenarios

All twelve run green in `npm run test:routes`:

| Scenario | Result |
| --- | --- |
| Sepolia ETH → Base ETH | direct, 1 tx |
| Sepolia USDC → Base USDC | direct CCTP, 2 tx |
| Sepolia USDC → Base ETH | composite, 2 tx |
| Sepolia USDC → Arc USDC | direct CCTP, 2 tx |
| Sepolia ETH → Arc USDC | composite, 2 tx |
| Arc USDC → GIWA ETH | composite, 3 tx |
| Arc EURC → GIWA ETH | composite, 4 tx |
| Arc cirBTC → GIWA ETH | no route (no pool) |
| Base ETH → GIWA ETH | composite, 4 tx |
| Base USDC → GIWA ETH | composite, 3 tx |
| Sepolia ETH → GIWA ETH | direct portal, 1 tx |
| Robinhood → GIWA | no route (no provider) |

## Phase 5 — Bridge UI

- [x] From/To selectors kept
- [x] Source and destination asset selectors, both route-aware
- [x] Chain change recalculates routes, keeps valid selections, resets invalid ones
- [x] Token item shows logo, name, symbol, balance, chain, contract
- [x] Incompatible pair message with a plain-language reason and the working alternatives
- [x] Recommended route card: assets, chains, provider, type, received amount, fees, tx count, ETA

## Phase 6 — provider validation

- [x] CCTP: domains, USDC, TokenMessengerV2, MessageTransmitterV2, attestation, destination execution
- [x] OP Stack: network type, portal address has code, direction, destination gas, one-way limit
- [x] GIWA: only the Sepolia → GIWA path is offered; Base → GIWA is explained, not faked
- [x] Route matrix → `TOKEN_COMPATIBILITY_MATRIX.md`

## Phase 7 — swap network discovery

- [x] Every configured network inspected
- [x] Verified venues added (OP Sepolia this pass)
- [x] Unsupported networks documented, not advertised
- [x] One registry drives the Swap list; no hardcoded five-item list
- [x] Robinhood verified and correctly excluded (no deployment)
- [x] All remaining chains swept: 9 with no canonical deployment, Ink with a live DEX that has no pool for our USDC (see `SWAP_NETWORK_DISCOVERY.md`)

## Phase 8 — token and pool discovery per chain

- [x] Chain logo, token list, native balance, ERC-20 balances, logos, amounts, contract details
- [x] Pool-driven pair availability on both selectors
- [x] Real quotes, no fabricated output; no-pool and low-liquidity handled honestly

## Phase 9 — automatic behaviour

- [x] Best route chosen automatically; user can inspect alternatives
- [x] Changing source/destination recalculates; valid selections preserved
- [x] USDC is never forced as a default

## Phase 10 — test matrix

- [x] Bridge matrix automated (`scripts/routes-check.ts`)
- [x] Swap matrix automated (`scripts/simulate.ts`, 28 checks)
- [x] Browser pass on Bridge, Swap, Portfolio, Cross-chain, Activity, Recovery, Settings, Faucets

## Arbitrum Orbit provider (v0.6.0)

- [x] Diagnosed why Robinhood Chain could not be bridged: the app only had Circle CCTP and the
      OP Stack portal; Robinhood is an Arbitrum Orbit chain and needs Arbitrum's gateway set
- [x] Verified the full Robinhood Chain Testnet deployment on Sepolia (7 contracts with bytecode,
      official Robinhood docs as source)
- [x] Confirmed the native ETH deposit formula against a real deposit transaction
- [x] `Inbox.createRetryableTicket` calldata executed successfully with `eth_call`
- [x] ERC-20 path implemented (approval + `L1GatewayRouter.outboundTransfer`), gateway lookup and
      L2 token address derivation available
- [x] Route engine extended with an `arbitrum` leg, wired into selectors, execution, steps and
      capabilities
- [x] Retryable-ticket arrival tracking (balance comparison against the pre-deposit balance)
- [x] `npm run test:orbit` regression check (6/6, includes a live simulation)
- [x] Withdrawals still not offered (7-day challenge period)

### Orbit testnet coverage (v0.7.0)

- [x] 13 verified Arbitrum Orbit deployments added; every address re-checked for bytecode on its parent chain
- [x] 4 ETH-native chains offer a native ETH deposit (Robinhood, T-Rex, HPP Sepolia, Edge), each calldata simulated live
- [x] 9 ERC20Inbox chains deliberately excluded from ETH deposits, with the reason surfaced in the UI
- [x] 12 new testnets added to the allowlist (SX Toronto, Humanity, Plume, Galactica, HPP, JASMY, Mars, GenLayer, WorldMobile, Xai, Edge; Mandala rejected — RPC unreachable)
- [x] `npm run test:orbit` covers all 13 (39 checks)

## Phase 12 — regressions

- [x] `tsc --noEmit`, `vite build`, `npm run test:sim` (28/28), `npm run test:routes` (12/12) all green
- [x] Direct bridge routes unchanged in behaviour (same executors, same calldata builders)
- [x] Git checkpoint before the rewrite: `known-good-v0.4.2`; `git reset --hard known-good-v0.4.2` restores it

## Not verified by automation

- A real composite execution end to end. Calldata, quotes and gas are verified per leg; the
  signatures are the owner's, and a composite needs one per leg.

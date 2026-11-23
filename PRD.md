# PRD — EBT Testnet Bridge & Swap

## 1. Problem

Testnet activity is scattered: faucets on one site, a bridge UI per chain, a DEX per ecosystem, and
no single place to see whether a transfer actually completed. For a person running testnet work
(airdrop positioning, integration testing), the job is: get funds, move them, swap them, and know
exactly what happened.

## 2. Goal

One local web app that can:
- bridge native USDC between every major CCTP testnet,
- swap tokens on testnets with real liquidity,
- show an honest, resumable status for every transaction,
- never offer a route that a verified provider cannot execute,
- never touch mainnet.

## 3. Non-goals

- No new protocol, bridge, AMM, relayer or smart contract.
- No mainnet support, no mainnet toggle, no "advanced mode".
- No custody, no private keys, no server-side signing.
- No backend service, no database, no user accounts.
- No fabricated data: no fake balances, no placeholder quotes, no invented routes.

## 4. Users

Primary: the owner (personal tool). Single user, own wallet, own browser.

## 5. Functional requirements

| # | Requirement | Status |
| --- | --- | --- |
| F1 | Connect an injected EVM wallet, show address + chain, switch chains | done |
| F2 | Bridge native USDC from any CCTP testnet to any other, fast or standard | done |
| F3 | Show real CCTP fee (bps from Circle Iris) and the max fee actually sent | done |
| F4 | Track attestation and let the user sign `receiveMessage` on the destination | done |
| F5 | Same-chain swap with on-chain quote, price impact, slippage, min received | done |
| F6 | Only offer pairs that return a real quote | done |
| F7 | Approvals for the exact amount, never unlimited | done |
| F8 | Cross-chain swap as an explicit two-hop composition | done |
| F9 | ETH deposit into GIWA Sepolia via its OP Stack portal | done |
| F10 | Faucet directory with live-verified official links | done |
| F11 | Transaction centre with timeline, hashes, explorer links, resume after refresh | done |
| F12 | Reject mainnet and unknown chains before building calldata | done |
| F13 | Token import by address (reads metadata on-chain) | done |
| F14 | Local-only persistence, export/clear | done |

## 6. Non-functional

- First paint < 2s locally; quotes cached 8–15s and debounced 350ms.
- Mobile: usable at 375px, bottom nav, modals as sheets.
- No secret ever shipped to the client: there are no secrets.
- Every claim in the UI about a route must be backed by a provider call (quote or fee API).

## 7. Success criteria (v1)

- `npm run build` and `npm run typecheck` clean.
- `npm run test:sim` green against live RPCs (guards, fee API, CCTP burn acceptance, native swap
  execution, ERC-20 swap execution, GIWA deposit acceptance).
- UI inspected in a real browser at desktop and mobile widths with no console errors.
- A funded wallet completes one real bridge and one real swap — the only step that needs the owner.

## 8. Out of scope for v1 (with reasons)

- L2→L1 withdrawals from GIWA (7-day challenge period).
- Non-EVM chains (Solana/Sui CCTP v1) — different wallet stack.
- WalletConnect (requires a third-party Project ID).
- Multi-hop swap routing (only single-hop, single-pool routes are quoted).

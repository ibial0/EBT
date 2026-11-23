# LOCAL AUDIT

Date: 2026-11-23 · App: EBT at `C:\Testnet web` · Stack: Vite + React + TypeScript + wagmi + viem.
Scope: the existing local app only. Nothing was deployed, published or moved to a remote repository.

## How the audit was run

- Read every page, config, lib and component in `src/`.
- Ran the app at `http://localhost:5178` in a real browser and interacted with it.
- Read pool state, router bindings and reserves directly from the chains with `eth_call`.
- Re-ran the simulation harness (`npm run test:sim`) after every change batch.
- Two independent research passes ran in parallel on DEX deployment discovery and faucet
  verification; their findings are recorded in `NETWORK_CAPABILITIES.md` and
  `FAUCET_VERIFICATION.md`.

## Defects found and fixed in this pass

| # | Defect | Root cause | Fix |
| --- | --- | --- | --- |
| A1 | Sidebar showed `build 0.3.0` while the app was at v0.4 | Version hardcoded in `Layout.tsx`; `package.json` said 0.1.0 | Single source: `package.json`, read by the sidebar |
| A2 | Sidebar brand was a generic grey glyph | The original mark existed only as the favicon | `public/logos/ebt.svg` (the real mint-on-dark mark) and the logo now toggles the rail |
| A3 | Nav rows were 34px with 16px icons | Original sizing | 40px rows, 18px icons at 1.9 stroke, larger gap |
| A4 | Bridge forced a manual choice between "USDC · CCTP" and "ETH · OP Stack" | Two radio cards | Route is chosen automatically from what the wallet actually holds; the technical choice is a compact Asset switch and the protocol details live in a Route details disclosure |
| A5 | Base Sepolia to GIWA showed a bare "no verified route" | No explanation of why | Explains that GIWA is not a CCTP chain, that ETH can only be deposited from its own L1, that a two-hop path needs the 7-day withdrawal, and offers Sepolia to GIWA instead |
| A6 | Overview had no liquidity view | Feature absent | Live reserves per verified pool, ranked, with network/token/status filters and a status badge per pool |
| A7 | Liquidity "drained" was computed as a ratio between the two legs | 42 WETH vs 208,608 USDC was flagged drained | The legs are never compared. Status is dust-based: a leg below 0.01 token with the other above 1 token |
| A8 | Swap listed every token on a chain, including tokens with no pool | Token registry, not pool discovery | Sell list = tokens in a verified pool; buy list = tokens actually pooled with the selected sell token |
| A9 | Cross-chain said "Build route plan" | Old label | "Find available routes" |
| A10 | Cross-chain offered destination assets with no pool | Token registry | Only tokens with a verified USDC pool on the destination |
| A11 | Cross-chain source was a bare USDC label with no balance | Feature absent | Shows the live USDC balance on the source and states that CCTP is the only bridge, so a cirBTC to ETH route does not exist |
| A12 | Portfolio chain groups were in allowlist order | No sorting | Sorted by value, richest first |
| A13 | Portfolio rows had no copy action | Feature absent | Copy button on each contract address |
| A14 | Faucets: clicking a row did nothing | `detail` state was set but no modal was rendered | Direct Open link plus a Requirements modal with asset, access, cooldown, note, raw URL and check date |
| A15 | Token logos keyed by symbol only | Symbol map | `src/config/logos.ts`: identity is chain + address; symbol is a fallback and is suppressed for user-imported tokens |
| A16 | No per-feature capability view | One implicit "supported" flag | `src/lib/capabilities.ts` plus a capability matrix in Settings |
| A17 | Robinhood Chain missing | No public testnet was ever verified | Added with only the capabilities that were proven: wallet, native, ERC-20, faucet, explorer. No swap, no bridge (see below) |
| A18 | Faucet links pointed at docs or marketing pages | Not re-checked since they were added | Linea, World Chain, Sei, Monad, Avalanche replaced with the real faucet pages; Superchain marked as under maintenance with Alchemy as the working path |

## Robinhood Chain Testnet, and why it has no swap or bridge

Verified live on 2026-11-23: chain id **46630** (`eth_chainId` → `0xb626`), native ETH, explorer
`explorer.testnet.chain.robinhood.com`, public RPC `rpc.testnet.chain.robinhood.com`, official faucet
`faucet.testnet.chain.robinhood.com`, and the official docs list mainnet as 4663 and testnet as 46630.

- **No swap.** The three canonical Uniswap v3 factories (`0x0227628f…`, `0x1F98431c…`,
  `0x4752ba5D…`) have no code on this chain, and the WETH predeploy has no code either. Nothing to
  quote against.
- **No USDC bridge.** `TokenMessengerV2` and `MessageTransmitterV2` *do* exist at the canonical
  CREATE2 address, `localDomain()` returns **35**, and the Iris sandbox returns a fee schedule for
  domain 35. But Circle's supported-chain table does not list Robinhood, and the explorer shows
  several USDC-named tokens with no verifiable Circle issuance. Burning against the wrong one would
  be a fund-loss trap, so no route is exposed. Mainnet id 4663 was added to the blocklist so the app
  can never route there.

## Not fixed, and why

See `BUGS_REMAINING.md`. The honest list: Arc pool depth, chains with no verified swap venue,
Robinhood Chain (no verifiable public testnet), OP Stack withdrawals, WalletConnect (needs a
third-party Project ID), cirBTC logo (no verified source file).

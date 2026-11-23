# PROVIDER MATRIX

Verified **2026-11-23** by direct RPC/API calls from this machine. `—` = not offered because it is
not verifiable, never because it is "coming soon".

## Provider-level

| | Circle CCTP v2 | Uniswap v3 (on-chain) | OP Stack (GIWA) |
| --- | --- | --- | --- |
| Website | circle.com/cross-chain-transfer-protocol | app.uniswap.org | giwa.zone |
| Docs | developers.circle.com/cctp | developers.uniswap.org | docs.giwa.io |
| Repo | github.com/circlefin/evm-cctp-contracts | github.com/Uniswap/v3-periphery | github.com/ethereum-optimism/optimism |
| Licence | Circle developer terms | GPL-2.0 (periphery) / BUSL (core) | MIT |
| SDK / package | none (raw ABI + Iris REST) | none (raw ABI, viem) | viem `op-stack` actions |
| API key | **not required** | not required (on-chain) | not required |
| Backend needed | no | no | no |
| Wallet | any EVM (injected) | any EVM (injected) | any EVM (injected) |
| Transfer types | USDC burn-and-mint | exact-input swaps | ETH/ERC-20 L1→L2 deposit |
| Same-chain swap | — | ✅ | — |
| Cross-chain swap | — (bridge only) | — | — |
| Fees | fast: route bps from Iris; standard: 0 | pool fee 0.01 / 0.05 / 0.30 / 1.00% | L1 gas only |
| Duration | fast ~15s–2min, standard ~13–19min + dest tx | ~5–20s (one block) | ~1–3 min |
| Keys/registration | none | none | none |

## Chain-level (only what is actually offered)

| Chain | id | CCTP domain | Native USDC | Uniswap v3 | OP deposit | RPC verified |
| --- | --- | --- | --- | --- | --- | --- |
| Ethereum Sepolia | 11155111 | 0 | 0x1c7D…7238 | ✅ quote+exec | ✅ (portal) | ✅ |
| Avalanche Fuji | 43113 | 1 | 0x5425…Bc65 | — | — | ✅ |
| OP Sepolia | 11155420 | 2 | 0x5fd8…30D7 | — | — | ✅ |
| Arbitrum Sepolia | 421614 | 3 | 0x75fa…AA4d | — | — | ✅ |
| Base Sepolia | 84532 | 6 | 0x036C…CF7e | ✅ quote+exec | — | ✅ |
| Polygon Amoy | 80002 | 7 | 0x41E9…7582 | — | — | ✅ |
| Unichain Sepolia | 1301 | 10 | 0x31d0…768F | ✅ quote+exec | — | ✅ |
| Arc Testnet | 5042002 | 26 | 0x3600…0000 (native USDC, 6dp view) | ✅ USDC⇄EURC (v1-style router) | — | ✅ |
| Linea Sepolia | 59141 | 11 | 0xFEce…d9B7 | — | — | ✅ |
| Codex Testnet | 812242 | 12 | 0x6d7f…0F8f | — | — | ✅ |
| World Chain Sepolia | 4801 | 14 | 0x6614…eA88 | — | — | ✅ |
| Monad Testnet | 10143 | 15 | 0x534b…43A3 | — | — | ✅ |
| Sei Testnet | 1328 | 16 | 0x4fCF…eaED | — | — | ✅ |
| Ink Sepolia | 763373 | 21 | 0xFaba…00Ac | — | — | ✅ |
| Arc Testnet | 5042002 | 26 | 0x3600…0000 | — | — | ✅ |
| Injective Testnet | 1439 | 29 | 0x0C38…4C5d | — | — | ✅ |
| Plasma Testnet | 9746 | 33 | 0xE67F…0D9D | — | — | ✅ |
| X Layer Testnet | 1952 | 37 | 0xDec9…b9B3 | — | — | ✅ |
| GIWA Sepolia | 91342 | — (not a CCTP chain) | — | — | ✅ deposit | ✅ |

### ETH deposits (OP Stack, from Ethereum Sepolia)

| Destination | chainId | OptimismPortal (Sepolia) |
| --- | --- | --- |
| Base Sepolia | 84532 | 0x49f53e41452c74589e85ca1677426ba426459e85 |
| OP Sepolia | 11155420 | 0x16Fc5058F25648194471939df75CF27A2fdC48BC |
| Unichain Sepolia | 1301 | 0x0d83dab629f0e0F9d36c0Cbc89B69a489f0751bD |
| World Chain Sepolia | 4801 | 0xFf6EBa109271fe6d4237EeeD4bAb1dD9A77dD1A4 |
| Ink Sepolia | 763373 | 0x5c1d29c6c9c8b0800692acc95d700bcb4966a1d7 |
| GIWA Sepolia | 91342 | 0x956962C34687A954e611A83619ABaA37Ce6bC78A |

All six portals were confirmed to hold code, and a deposit was simulated successfully. Withdrawals
(L2→L1) require the 7-day challenge period and are intentionally not exposed.

CCTP routes: **17 × 16 = 272 distinct directed USDC routes**, every one executable (same contract
address on every chain, mint on destination). No route matrix exceptions were found because the
TokenMessengerV2 deployment is identical everywhere.

Uniswap token coverage (verified pairs, live quotes):

| Chain | tokens | live pairs probed |
| --- | --- | --- |
| Sepolia | USDC, WETH, UNI, DAI, LINK, USDT, WBTC | 36 of 46 ordered pairs (10 have no pool/liquidity) |
| Base Sepolia | USDC, WETH | both directions |
| Unichain Sepolia | USDC, WETH | both directions |
| Arc Testnet | USDC, EURC | USDC⇄EURC at 0.01% / 0.30% / 1.00% (live quote verified) |

## Explicitly NOT in the matrix

| Provider | Why not |
| --- | --- |
| LI.FI | provider states testnet support has ended |
| 0x Swap API | no testnets |
| Wormhole Connect | testnet routes need manual per-route config against a mainnet-oriented remote config; not verifiable end-to-end here |
| Uniswap Trading API | key required → replaced by direct on-chain quotes |
| Stargate, Across, Relay, Squid, Rango, deBridge, Router, Axelar, LayerZero | no verifiable keyless testnet route found in the time box |
| Solana / Sui / Noble (CCTP v1 only) | non-EVM wallet stacks; out of scope for v1 |

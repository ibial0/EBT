# PROVIDER CAPABILITY MATRIX

Verified 2026-11-23 against live RPCs, Circle's API and Blockscout. "Swap" means a verified
Uniswap v3 deployment with a router bound to the same factory and a quote that passes the fill check.

| Chain | id | Swap | Bridge USDC (CCTP) | ETH deposit | Cross-chain swap | Explorer | Faucet |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ethereum Sepolia | 11155111 | yes (7 tokens) | yes | source only | yes | etherscan | Google, QuickNode, PoW, Alchemy, Circle |
| Base Sepolia | 84532 | yes (USDC/WETH) | yes | yes | yes | blockscout | CDP, Alchemy, QuickNode, Circle |
| Unichain Sepolia | 1301 | yes (USDC/WETH) | yes | yes | yes | blockscout | Superchain, Alchemy, Circle |
| Arc Testnet | 5042002 | yes (USDC/EURC, thin) | yes | no | yes (to swap chains) | blockscout | Circle |
| OP Sepolia | 11155420 | no | yes | yes | destination swap only | blockscout | Superchain, Circle |
| Arbitrum Sepolia | 421614 | no | yes | no | destination swap only | arbiscan | Alchemy, Circle |
| Polygon Amoy | 80002 | no | yes | no | destination swap only | polygonscan | Polygon, Circle |
| Avalanche Fuji | 43113 | no | yes | no | destination swap only | snowtrace | Avalanche, Circle |
| Linea Sepolia | 59141 | no | yes | no | destination swap only | lineascan | docs (host blocked) |
| Ink Sepolia | 763373 | no | yes | yes | destination swap only | blockscout | Ink |
| World Chain Sepolia | 4801 | no | yes | yes | destination swap only | worldscan | docs |
| GIWA Sepolia | 91342 | no | no (not a CCTP chain) | yes | no | blockscout | GIWA, Nodit |
| Monad Testnet | 10143 | no | yes | no | destination swap only | monadexplorer | Monad, Circle |
| Sei Testnet | 1328 | no | yes | no | destination swap only | seiscan | docs |
| Plasma Testnet | 9746 | no | yes | no | destination swap only | plasmascan | Circle |
| X Layer Testnet | 1952 | no | yes | no | destination swap only | okx explorer | Circle |
| Codex Testnet | 812242 | no | yes | no | destination swap only | codex explorer | explorer |
| Injective Testnet | 1439 | no | yes | no | destination swap only | blockscout | Circle |

## Why the "no swap" chains have no swap

Uniswap v3 is officially deployed only on Sepolia, Base Sepolia and Unichain Sepolia in the
official SDK address map. Arc has community deployments; the one used here is the only one whose
QuoterV2 and SwapRouter share a factory **and** whose pools return a fillable quote.

For OP/Arbitrum/Polygon/Linea/Ink/World/Monad/Sei/Plasma/X Layer/Codex/Injective no verified
factory+router pair with liquidity was found, so Swap is not offered there instead of failing on
submit. A bridge into those chains still works, and the cross-chain page will only offer a
destination swap where a swap venue exists.

## Providers

| Provider | Requirement | Used for |
| --- | --- | --- |
| Circle CCTP v2 + Iris sandbox | none | USDC bridge, attestation |
| Uniswap v3 (on-chain) | none | same-chain swaps |
| OP Stack portals | none | ETH deposits into 6 chains |
| DefiLlama prices | none | portfolio valuation (estimates) |
| Public testnet RPCs | none | everything |

## Missing network investigated: Robinhood Chain

No public EVM testnet RPC, chain id, explorer or bridge deployment could be verified from an
official source during this audit. It is therefore **not** in the allowlist. Adding it on a rumour
would violate the testnet allowlist rule; if an official chain id and RPC are published, it can be
added in `src/config/chains.ts` and every capability (CCTP domain, swap venue, portal) has to be
checked before it appears in a selector.

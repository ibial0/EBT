# NETWORK CAPABILITIES

Generated from `src/lib/capabilities.ts` on 2026-11-23. Each feature is decided separately: a chain that can receive a bridge but has no swap venue is never reported as swap-capable, and a chain with CCTP contracts but no verified Circle USDC is never reported as bridgeable.

| Chain | id | Wallet | Native | ERC-20 | Swap | USDC bridge | ETH deposit | Cross-chain | Recovery |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ethereum Sepolia | 11155111 | yes | yes | yes | yes | yes | partial | yes | yes |
| Avalanche Fuji | 43113 | yes | yes | yes | no | yes | no | no | yes |
| OP Sepolia | 11155420 | yes | yes | yes | yes | yes | yes | yes | yes |
| Arbitrum Sepolia | 421614 | yes | yes | yes | no | yes | no | no | yes |
| Base Sepolia | 84532 | yes | yes | yes | yes | yes | yes | yes | yes |
| Polygon Amoy | 80002 | yes | yes | yes | no | yes | no | no | yes |
| Unichain Sepolia | 1301 | yes | yes | yes | yes | yes | yes | yes | yes |
| Linea Sepolia | 59141 | yes | yes | yes | no | yes | no | no | yes |
| Codex Testnet | 812242 | yes | yes | yes | no | yes | no | no | yes |
| World Chain Sepolia | 4801 | yes | yes | yes | no | yes | yes | no | yes |
| Monad Testnet | 10143 | yes | yes | yes | no | yes | no | no | yes |
| Sei Testnet | 1328 | yes | yes | yes | no | yes | no | no | yes |
| Ink Sepolia | 763373 | yes | yes | yes | no | yes | yes | no | yes |
| Arc Testnet | 5042002 | yes | yes | yes | yes | yes | no | yes | yes |
| Injective Testnet | 1439 | yes | yes | yes | no | yes | no | no | yes |
| Plasma Testnet | 9746 | yes | yes | yes | no | yes | no | no | yes |
| X Layer Testnet | 1952 | yes | yes | yes | no | yes | no | no | yes |
| Robinhood Chain Testnet | 46630 | yes | yes | yes | no | no | no | no | no |
| GIWA Sepolia | 91342 | yes | yes | yes | no | no | yes | no | no |

## Notes per chain

### Ethereum Sepolia (11155111)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (ETH).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: yes — 16 verified pairs with real liquidity.
- **USDC bridge (CCTP)**: yes — CCTP domain 0, USDC 0x1c7D4B19…
- **ETH deposit (OP Stack)**: partial — Acts as the L1 source for 6 OP Stack testnet(s). Deposits out are not offered.
- **Cross-chain swap**: yes — Can receive USDC by CCTP and swap it locally.
- **Transfer recovery**: yes — usedNonces can be checked on chain and an attested message can be finished.

### Avalanche Fuji (43113)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (AVAX).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: no — No Uniswap deployment with a bound router and liquidity was found.
- **USDC bridge (CCTP)**: yes — CCTP domain 1, USDC 0x54258902…
- **ETH deposit (OP Stack)**: no — No canonical portal on this chain and it is not an L1 source for any allowlisted chain.
- **Cross-chain swap**: no — No swap venue, so a cross-chain swap cannot finish here.
- **Transfer recovery**: yes — usedNonces can be checked on chain and an attested message can be finished.

### OP Sepolia (11155420)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (ETH).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: yes — 1 verified pair with real liquidity.
- **USDC bridge (CCTP)**: yes — CCTP domain 2, USDC 0x5fd84259…
- **ETH deposit (OP Stack)**: yes — Deposit through the canonical OptimismPortal on Sepolia.
- **Cross-chain swap**: yes — Can receive USDC by CCTP and swap it locally.
- **Transfer recovery**: yes — usedNonces can be checked on chain and an attested message can be finished.

### Arbitrum Sepolia (421614)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (ETH).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: no — No Uniswap deployment with a bound router and liquidity was found.
- **USDC bridge (CCTP)**: yes — CCTP domain 3, USDC 0x75faf114…
- **ETH deposit (OP Stack)**: no — No canonical portal on this chain and it is not an L1 source for any allowlisted chain.
- **Cross-chain swap**: no — No swap venue, so a cross-chain swap cannot finish here.
- **Transfer recovery**: yes — usedNonces can be checked on chain and an attested message can be finished.

### Base Sepolia (84532)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (ETH).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: yes — 1 verified pair with real liquidity.
- **USDC bridge (CCTP)**: yes — CCTP domain 6, USDC 0x036CbD53…
- **ETH deposit (OP Stack)**: yes — Deposit through the canonical OptimismPortal on Sepolia.
- **Cross-chain swap**: yes — Can receive USDC by CCTP and swap it locally.
- **Transfer recovery**: yes — usedNonces can be checked on chain and an attested message can be finished.

### Polygon Amoy (80002)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (POL).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: no — No Uniswap deployment with a bound router and liquidity was found.
- **USDC bridge (CCTP)**: yes — CCTP domain 7, USDC 0x41E94Eb0…
- **ETH deposit (OP Stack)**: no — No canonical portal on this chain and it is not an L1 source for any allowlisted chain.
- **Cross-chain swap**: no — No swap venue, so a cross-chain swap cannot finish here.
- **Transfer recovery**: yes — usedNonces can be checked on chain and an attested message can be finished.

### Unichain Sepolia (1301)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (ETH).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: yes — 1 verified pair with real liquidity.
- **USDC bridge (CCTP)**: yes — CCTP domain 10, USDC 0x31d02204…
- **ETH deposit (OP Stack)**: yes — Deposit through the canonical OptimismPortal on Sepolia.
- **Cross-chain swap**: yes — Can receive USDC by CCTP and swap it locally.
- **Transfer recovery**: yes — usedNonces can be checked on chain and an attested message can be finished.

### Linea Sepolia (59141)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (ETH).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: no — No Uniswap deployment with a bound router and liquidity was found.
- **USDC bridge (CCTP)**: yes — CCTP domain 11, USDC 0xFEce4462…
- **ETH deposit (OP Stack)**: no — No canonical portal on this chain and it is not an L1 source for any allowlisted chain.
- **Cross-chain swap**: no — No swap venue, so a cross-chain swap cannot finish here.
- **Transfer recovery**: yes — usedNonces can be checked on chain and an attested message can be finished.

### Codex Testnet (812242)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (ETH).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: no — No Uniswap deployment with a bound router and liquidity was found.
- **USDC bridge (CCTP)**: yes — CCTP domain 12, USDC 0x6d7f141b…
- **ETH deposit (OP Stack)**: no — No canonical portal on this chain and it is not an L1 source for any allowlisted chain.
- **Cross-chain swap**: no — No swap venue, so a cross-chain swap cannot finish here.
- **Transfer recovery**: yes — usedNonces can be checked on chain and an attested message can be finished.

### World Chain Sepolia (4801)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (ETH).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: no — No Uniswap deployment with a bound router and liquidity was found.
- **USDC bridge (CCTP)**: yes — CCTP domain 14, USDC 0x66145f38…
- **ETH deposit (OP Stack)**: yes — Deposit through the canonical OptimismPortal on Sepolia.
- **Cross-chain swap**: no — No swap venue, so a cross-chain swap cannot finish here.
- **Transfer recovery**: yes — usedNonces can be checked on chain and an attested message can be finished.

### Monad Testnet (10143)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (MON).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: no — No Uniswap deployment with a bound router and liquidity was found.
- **USDC bridge (CCTP)**: yes — CCTP domain 15, USDC 0x534b2f3A…
- **ETH deposit (OP Stack)**: no — No canonical portal on this chain and it is not an L1 source for any allowlisted chain.
- **Cross-chain swap**: no — No swap venue, so a cross-chain swap cannot finish here.
- **Transfer recovery**: yes — usedNonces can be checked on chain and an attested message can be finished.

### Sei Testnet (1328)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (SEI).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: no — No Uniswap deployment with a bound router and liquidity was found.
- **USDC bridge (CCTP)**: yes — CCTP domain 16, USDC 0x4fCF1784…
- **ETH deposit (OP Stack)**: no — No canonical portal on this chain and it is not an L1 source for any allowlisted chain.
- **Cross-chain swap**: no — No swap venue, so a cross-chain swap cannot finish here.
- **Transfer recovery**: yes — usedNonces can be checked on chain and an attested message can be finished.

### Ink Sepolia (763373)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (ETH).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: no — No Uniswap deployment with a bound router and liquidity was found.
- **USDC bridge (CCTP)**: yes — CCTP domain 21, USDC 0xFabab97d…
- **ETH deposit (OP Stack)**: yes — Deposit through the canonical OptimismPortal on Sepolia.
- **Cross-chain swap**: no — No swap venue, so a cross-chain swap cannot finish here.
- **Transfer recovery**: yes — usedNonces can be checked on chain and an attested message can be finished.

### Arc Testnet (5042002)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (USDC).
- **ERC-20 balances**: yes — Arc USDC is the gas token; the 6-decimal ERC-20 view is read for display.
- **Same-chain swap**: yes — 1 verified pair with real liquidity.
- **USDC bridge (CCTP)**: yes — CCTP domain 26, USDC 0x36000000…
- **ETH deposit (OP Stack)**: no — No canonical portal on this chain and it is not an L1 source for any allowlisted chain.
- **Cross-chain swap**: yes — Can receive USDC by CCTP and swap it locally.
- **Transfer recovery**: yes — usedNonces can be checked on chain and an attested message can be finished.

### Injective Testnet (1439)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (INJ).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: no — No Uniswap deployment with a bound router and liquidity was found.
- **USDC bridge (CCTP)**: yes — CCTP domain 29, USDC 0x0C382e68…
- **ETH deposit (OP Stack)**: no — No canonical portal on this chain and it is not an L1 source for any allowlisted chain.
- **Cross-chain swap**: no — No swap venue, so a cross-chain swap cannot finish here.
- **Transfer recovery**: yes — usedNonces can be checked on chain and an attested message can be finished.

### Plasma Testnet (9746)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (XPL).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: no — No Uniswap deployment with a bound router and liquidity was found.
- **USDC bridge (CCTP)**: yes — CCTP domain 33, USDC 0xE67Fb267…
- **ETH deposit (OP Stack)**: no — No canonical portal on this chain and it is not an L1 source for any allowlisted chain.
- **Cross-chain swap**: no — No swap venue, so a cross-chain swap cannot finish here.
- **Transfer recovery**: yes — usedNonces can be checked on chain and an attested message can be finished.

### X Layer Testnet (1952)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (OKB).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: no — No Uniswap deployment with a bound router and liquidity was found.
- **USDC bridge (CCTP)**: yes — CCTP domain 37, USDC 0xDec90b78…
- **ETH deposit (OP Stack)**: no — No canonical portal on this chain and it is not an L1 source for any allowlisted chain.
- **Cross-chain swap**: no — No swap venue, so a cross-chain swap cannot finish here.
- **Transfer recovery**: yes — usedNonces can be checked on chain and an attested message can be finished.

### Robinhood Chain Testnet (46630)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (ETH).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: no — No Uniswap v3 deployment: the canonical factories (0x0227628f…, 0x1F98431c…, 0x4752ba5D…) have no code on this chain.
- **USDC bridge (CCTP)**: no — TokenMessengerV2 and MessageTransmitterV2 do exist at the canonical address here (localDomain 35, and the Iris sandbox returns a fee schedule), but Circle does not document this chain and several look-alike USDC tokens exist without a verifiably Circle-issued one. Offering a burn against the wrong USDC would be a fund-loss trap, so no USDC route is exposed.
- **ETH deposit (OP Stack)**: no — No canonical portal on this chain and it is not an L1 source for any allowlisted chain.
- **Cross-chain swap**: no — No swap venue, so a cross-chain swap cannot finish here.
- **Transfer recovery**: no — Not a CCTP chain, there is nothing to recover.

### GIWA Sepolia (91342)
- **Wallet connection**: yes — Any injected EVM wallet. No separate account.
- **Native balance**: yes — Reads the chain's own gas token (ETH).
- **ERC-20 balances**: yes — Multicall3 where deployed, single reads otherwise.
- **Same-chain swap**: no — No Uniswap deployment with a bound router and liquidity was found.
- **USDC bridge (CCTP)**: no — Not a Circle CCTP chain, so USDC cannot be bridged here.
- **ETH deposit (OP Stack)**: yes — Deposit through the canonical OptimismPortal on Sepolia.
- **Cross-chain swap**: no — No swap venue, so a cross-chain swap cannot finish here.
- **Transfer recovery**: no — Not a CCTP chain, there is nothing to recover.

## Swap venues

Chains with a verified Uniswap v3 deployment: Ethereum Sepolia (11155111), OP Sepolia (11155420), Base Sepolia (84532), Unichain Sepolia (1301), Arc Testnet (5042002).

Verified pools: 48. Pairs per chain: Sepolia 16, OP Sepolia 1, Base Sepolia 1, Unichain 1, Arc 1.
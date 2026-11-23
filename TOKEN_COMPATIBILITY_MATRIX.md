# TOKEN COMPATIBILITY MATRIX

Identity is `chainId + contract address`. The native asset has its own id
(`0x0000…0000`). A symbol is never used to decide that two tokens are the same asset.

## Bridgeable assets

| Asset | Chains with a bridge route | Route |
| --- | --- | --- |
| USDC | every chain in `NETWORK_CAPABILITIES.md` marked "USDC bridge: yes" | Circle CCTP v2 burn-and-mint |
| Native ETH | Sepolia → Base, OP Sepolia, Unichain, World Chain, Ink, GIWA | canonical OP Stack portal deposit (one-way) |
| USDT, DAI, UNI, LINK, WBTC, WETH, EURC, cirBTC | none as bridge assets | no provider moves them |

The consequence: USDT on Sepolia can leave Sepolia only by being **swapped** into USDC (or ETH) first.
That is a composite route, and the app labels it as such.

## Per-chain token inventory

| Chain | id | Native | ERC-20 in the registry | Swappable (verified pool) | Bridge asset |
| --- | --- | --- | --- | --- | --- |
| Ethereum Sepolia | 11155111 | ETH | USDC, WETH, UNI, DAI, LINK, USDT, WBTC | all of them | USDC, ETH |
| OP Sepolia | 11155420 | ETH | USDC, WETH | USDC/WETH (0.05%) | USDC, ETH |
| Base Sepolia | 84532 | ETH | USDC, WETH | USDC/WETH (0.01/0.05/0.30/1.00%) | USDC, ETH |
| Unichain Sepolia | 1301 | ETH | USDC, WETH | USDC/WETH (0.01/0.05/0.30/1.00%) | USDC, ETH |
| Arc Testnet | 5042002 | USDC (native gas) | USDC (6dp ERC-20 view), EURC, cirBTC | USDC/EURC (0.01/0.30/1.00%) | USDC |
| Avalanche Fuji | 43113 | AVAX | USDC | none verified | USDC |
| Arbitrum Sepolia | 421614 | ETH | USDC | none verified | USDC |
| Polygon Amoy | 80002 | POL | USDC | none verified | USDC |
| Linea Sepolia | 59141 | ETH | USDC | none verified | USDC |
| Codex Testnet | 812242 | ETH | USDC | none verified | USDC |
| World Chain Sepolia | 4801 | ETH | USDC | none verified | USDC |
| Monad Testnet | 10143 | MON | USDC | none verified | USDC |
| Sei Testnet | 1328 | SEI | USDC | none verified | USDC |
| Ink Sepolia | 763373 | ETH | USDC | none verified | USDC |
| Injective Testnet | 1439 | INJ | USDC | none verified | USDC |
| Plasma Testnet | 9746 | XPL | USDC | none verified | USDC |
| X Layer Testnet | 1952 | OKB | USDC | none verified | USDC |
| GIWA Sepolia | 91342 | ETH | none | none | ETH (deposit from Sepolia) |
| Robinhood Chain Testnet | 46630 | ETH | none verified | none | none |

## Arc specifics

- **Native USDC** is the gas token (18 decimals in the native view). The **ERC-20 view** at
  `0x3600000000000000000000000000000000000000` is 6 decimals. Portfolio reads the ERC-20 view and
  never sums both.
- **EURC** `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`, 6 decimals, verified live.
- **cirBTC** `0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF`, 8 decimals, `symbol() = cirBTC`,
  `name() = Circle Wrapped Bitcoin`, `totalSupply() = 178024598083` (1,780.24598083 BTC). Verified on
  chain 2026-11-23. It has **no pool on Arc**, so it is correctly absent from Swap and Bridge while
  still appearing in Portfolio.

## Address-keyed logos

`src/config/logos.ts` maps `chainId:address` to a local file. The symbol map is only a fallback and
is suppressed for user-imported tokens, so a look-alike ERC-20 named USDC cannot borrow Circle's mark.

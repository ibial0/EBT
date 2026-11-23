# FAUCET VERIFICATION

Every URL configured in `src/config/chains.ts` was requested on 2026-11-23 with `curl -L -m 15` and the
HTTP status recorded. "Not working" in the UI means one of two things, and the UI says which.

| Chain | Provider | Asset | URL | HTTP | Access | Cooldown |
| --- | --- | --- | --- | --- | --- | --- |
| Ethereum Sepolia | Google Web3 | ETH | cloud.google.com/application/web3/faucet/ethereum/sepolia | 200 | Google account | rate limit |
| Ethereum Sepolia | QuickNode | ETH | faucet.quicknode.com/ethereum/sepolia | 200 | account | 12h |
| Ethereum Sepolia | Sepolia PoW | ETH | sepolia-faucet.pk910.de | 200 | none, mine in browser | none |
| Ethereum Sepolia | Alchemy | ETH | alchemy.com/faucets/ethereum-sepolia | 200 | account | 24h |
| Ethereum Sepolia | Circle | USDC | faucet.circle.com | 200 | account | ~2h |
| Avalanche Fuji | Avalanche | AVAX | faucet.avax.network | 200 | account | - |
| OP Sepolia | Superchain | ETH | console.optimism.io/faucet | 200 | account | 24h |
| OP Sepolia | Alchemy | ETH | alchemy.com/faucets/optimism-sepolia | 200 | account | 24h |
| Arbitrum Sepolia | Alchemy | ETH | alchemy.com/faucets/arbitrum-sepolia | 200 | account | 24h |
| Base Sepolia | Coinbase CDP | ETH | portal.cdp.coinbase.com/products/faucet | 200 | account | - |
| Base Sepolia | Alchemy | ETH | alchemy.com/faucets/base-sepolia | 200 | account | 24h |
| Base Sepolia | QuickNode | ETH | faucet.quicknode.com/base/sepolia | 200 | account | 12h |
| Polygon Amoy | Polygon | POL | faucet.polygon.technology | 403 | account | - |
| Unichain Sepolia | Superchain | ETH | console.optimism.io/faucet | 200 | account | 24h |
| Linea Sepolia | Linea docs | ETH | linea.build | 200 | docs entry point | - |
| Codex Testnet | Codex explorer | ETH | explorer.codex-stg.xyz | 200 | docs entry point | - |
| World Chain Sepolia | World Chain docs | ETH | docs.world.org/world-chain | 200 | docs entry point | - |
| Monad Testnet | Monad | MON | testnet.monad.xyz | 200 | account | 24h |
| Sei Testnet | Sei docs | SEI | docs.sei.io | 200 | docs entry point | - |
| Ink Sepolia | Ink | ETH | inkonchain.com/faucet | 200 | account | - |
| GIWA Sepolia | GIWA (official) | ETH | faucet.giwa.io | 403 | free, address only | 24h, 0.005 ETH |
| GIWA Sepolia | Nodit | ETH | faucet.lambda256.io/giwa-sepolia | 200 | free, address only | 24h, 0.01 ETH |
| Arc, Sei, Plasma, X Layer, Codex, Injective, Linea, World | Circle | USDC | faucet.circle.com | 200 | account | ~2h |

## The two 403s

Both are bot walls, not dead links:

- `faucet.giwa.io` is the **official GIWA faucet**, linked directly from `docs.giwa.io`. It blocks
  automated requests and works in a normal browser tab. The UI says so. The Nodit faucet
  (`faucet.lambda256.io/giwa-sepolia`, 200, no account) is listed alongside it as the fallback.
- `faucet.polygon.technology` is Polygon's official faucet behind a bot wall, same treatment.

Neither was replaced with a third-party mirror, because a mirror is exactly the kind of link that
turns into a phishing page later.

## Docs entry points

Linea, Codex, World Chain and Sei do not resolve a dedicated faucet host from this machine, so the
UI links the chain's own documentation page and the modal marks the requirements as not verified
rather than inventing a faucet URL. If a direct host appears, it replaces the docs link.

## UI behaviour

Every faucet row has a direct **Open** link and a **Requirements** button. The modal shows the
dispensed asset, the access type, the published cooldown, the requirement note, the raw URL and the
date the link was last checked. Where the provider publishes nothing, the modal says
"Requirements not verified for this provider" instead of guessing.

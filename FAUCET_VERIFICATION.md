# FAUCET VERIFICATION

Every URL in `src/config/chains.ts` was requested with `curl -L -m 20` on 2026-11-23, the 200 pages
were read, and JavaScript-only pages were rendered in a real browser. Access requirements and
cooldowns below are quoted from the provider's own page, not guessed.

## Ethereum Sepolia

| Provider | URL | HTTP | Access | Cooldown | Amount | Verified requirement |
| --- | --- | --- | --- | --- | --- | --- |
| Google Web3 | cloud.google.com/application/web3/faucet/ethereum/sepolia | 200 | Google account | rate limit | 0.05 ETH | "there's a rate limit on the number of drips each Google Account and address can request"; the FAQ mentions a 0.001 ETH mainnet minimum |
| QuickNode | faucet.quicknode.com/ethereum/sepolia | 200 | no account | 12h | shown after address | "no Quicknode account", but "a small mainnet balance" is required; optional X share doubles it |
| Sepolia PoW | sepolia-faucet.pk910.de | 200 | none | none | mining-based | "this faucet requires some mining work to be done in exchange for free testnet funds" |
| Alchemy | alchemy.com/faucets/ethereum-sepolia | 200 | no account | 24h | 0.1 ETH | "No Alchemy account required. Wallets must meet eligibility requirements" |
| Circle | faucet.circle.com | 200 | no account | 2h | 20 USDC | "One request per pairing of asset and test network every 2 hours"; public and permissionless |

## Other chains

| Chain | Provider | URL | HTTP | Access | Cooldown | Amount |
| --- | --- | --- | --- | --- | --- | --- |
| Avalanche Fuji | Builder Hub | build.avax.network/console/primary-network/faucet | 200 | account, or mainnet AVAX | 2h, up to 2 AVAX/day | up to 2 AVAX |
| OP Sepolia | Superchain | console.optimism.io/faucet | 200 | account | 24h | **under maintenance** on 2026-11-23 |
| OP Sepolia | Alchemy | alchemy.com/faucets/optimism-sepolia | 200 | no account | 24h | 0.1 ETH |
| Arbitrum Sepolia | Alchemy | alchemy.com/faucets/arbitrum-sepolia | 200 | no account | 24h | 0.1 ETH |
| Base Sepolia | Coinbase CDP | portal.cdp.coinbase.com/products/faucet | 200 | Coinbase account | not confirmed | not confirmed |
| Base Sepolia | Alchemy | alchemy.com/faucets/base-sepolia | 200 | no account | 24h | 0.1 ETH |
| Base Sepolia | QuickNode | faucet.quicknode.com/base/sepolia | 200 | no account | 12h | address-dependent |
| Polygon Amoy | Polygon | faucet.polygon.technology | **403** | Cloudflare bot wall | not reachable | not reachable |
| Unichain Sepolia | Superchain | console.optimism.io/faucet | 200 | account | 24h | **under maintenance** |
| Unichain Sepolia | Alchemy | alchemy.com/faucets/unichain-sepolia | 200 | no account | 24h | 0.1 ETH |
| Linea Sepolia | MetaMask Developer | developer.metamask.com/faucet/linea-sepolia | 200 | account | 24h | 0.5 ETH daily max per Linea docs |
| Linea Sepolia | QuickNode | faucet.quicknode.com/linea/sepolia | 200 | no account | 12h | address-dependent |
| World Chain Sepolia | Alchemy | alchemy.com/faucets/world-chain-sepolia | 200 | no account | 24h | 0.1 ETH |
| Monad Testnet | Monad | faucet.monad.xyz | 200 (429 under load) | no account | 24h | up to 50 MON |
| Monad Testnet | Monad docs | testnet.monad.xyz | 200 | redirects to docs | - | - |
| Sei Testnet | Sei docs | docs.sei.io/learn/faucet | 200 | account | 24h | not published |
| Ink Sepolia | Ink | inkonchain.com/faucet | 200 | provider choice | 24h | 0.01 ETH per request |
| GIWA Sepolia | GIWA official | faucet.giwa.io | **403** | free, address only | 24h | 0.005 ETH |
| GIWA Sepolia | Nodit | faucet.lambda256.io/giwa-sepolia | 200 | no account | 24h | 0.01 ETH (asks for an X follow) |
| Robinhood Chain Testnet | Robinhood | faucet.testnet.chain.robinhood.com | 429 (rate limit) | free | not published | not published |
| Codex Testnet | explorer | explorer.codex-stg.xyz | 200 | - | - | **no official faucet found** |
| All CCTP chains | Circle | faucet.circle.com | 200 | no account | 2h | 20 USDC |

## The non-200s, and why nothing was removed

- **`faucet.giwa.io` (403)** is the **official GIWA faucet**, behind Cloudflare. It blocks automated
  requests and works in a browser tab. The Nodit faucet (200, no account) is listed alongside it.
- **`faucet.polygon.technology` (403)** is Polygon's official faucet behind the same kind of wall.
- **`faucet.testnet.chain.robinhood.com` (429)** is the official Robinhood faucet, rate-limited for
  automated checks.
- **`console.optimism.io/faucet` (200)** is genuinely **under maintenance** for both OP Sepolia and
  Unichain Sepolia. The link is kept and labelled, with the Alchemy entries as the working path.

No link was replaced with a third-party mirror, and no dead link is presented as working. Where a
chain has no faucet at all (Codex), the UI says so instead of linking a random one.

## Replacements made this pass

| Chain | Was | Now | Why |
| --- | --- | --- | --- |
| Linea Sepolia | linea.build (marketing site, zero "faucet" occurrences) | MetaMask developer faucet + QuickNode Linea | the old link was not a faucet |
| World Chain Sepolia | docs.world.org/world-chain | Alchemy World Chain Sepolia | the docs page listed Alchemy as the faucet |
| Sei Testnet | docs.sei.io (docs home) | docs.sei.io/learn/faucet | the actual faucet page |
| Monad Testnet | testnet.monad.xyz (redirects to docs) | faucet.monad.xyz | the real faucet |
| Avalanche Fuji | faucet.avax.network (redirects) | build.avax.network/console/primary-network/faucet | direct destination |
| Unichain Sepolia | Superchain only | Superchain + Alchemy | Superchain is under maintenance |

## UI behaviour

Each row has a direct **Open** link and a **Requirements** button. The modal shows the dispensed
asset, access type, published cooldown, the requirement note, the raw URL and the date the link was
last checked. Where a provider publishes nothing, the modal says "Requirements not verified for this
provider" rather than guessing.

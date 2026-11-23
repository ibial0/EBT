# FAUCET SOURCES

Every link was requested on 2026-11-23 and its HTTP status recorded. A 403/000 from this machine is
noted; those hosts block automated requests but work in a browser, and the UI says so.

## Ethereum Sepolia (ETH)

| Provider | URL | Access | Cooldown | Status |
| --- | --- | --- | --- | --- |
| Google Web3 | https://cloud.google.com/application/web3/faucet/ethereum/sepolia | Google account | 24h | 200 |
| QuickNode | https://faucet.quicknode.com/ethereum/sepolia | account | 12h | 200 |
| Sepolia PoW | https://sepolia-faucet.pk910.de/ | proof of work, no account | none | 200 |
| Alchemy | https://www.alchemy.com/faucets/ethereum-sepolia | Alchemy account | 24h | 200 |
| Circle | https://faucet.circle.com | account, issues USDC | ~2h | 200 |

The PoW faucet is the only one without an account or a daily cap. You leave the tab open while it
mines and receive a small amount; it is slower and the amount is smaller than a hosted faucet.

## GIWA Sepolia (ETH)

| Provider | URL | Access | Cooldown | Status |
| --- | --- | --- | --- | --- |
| GIWA (official) | https://faucet.giwa.io/ | free, address only | 24h, 0.005 ETH | 403 to curl, works in a browser |
| Nodit | https://faucet.lambda256.io/giwa-sepolia | free, address only | 24h, 0.01 ETH | 200 |

Both are linked directly from the official GIWA docs page (`docs.giwa.io/.../faucets`), which is now
only referenced in the note, not used as the link itself.

## Other chains

| Chain | Provider | URL | Access | Status |
| --- | --- | --- | --- | --- |
| Base Sepolia | Coinbase CDP | https://portal.cdp.coinbase.com/products/faucet | account | 200 |
| Base Sepolia | Alchemy | https://www.alchemy.com/faucets/base-sepolia | account | 200 |
| Base Sepolia | QuickNode | https://faucet.quicknode.com/base/sepolia | account | 200 |
| Unichain Sepolia | Superchain | https://console.optimism.io/faucet | account | 200 |
| Unichain Sepolia | Alchemy | https://www.alchemy.com/faucets/unichain-sepolia | account | 200 |
| OP Sepolia | Superchain | https://console.optimism.io/faucet | account | 200 |
| Arbitrum Sepolia | Alchemy | https://www.alchemy.com/faucets/arbitrum-sepolia | account | 200 |
| Avalanche Fuji | Avalanche | https://faucet.avax.network/ | account | 200 |
| Polygon Amoy | Polygon | https://faucet.polygon.technology/ | account | 403 to curl (bot wall) |
| Monad | Monad | https://testnet.monad.xyz/ | account | 200 |
| Ink | Ink | https://inkonchain.com/faucet | account | 200 |
| Arc, Sei, Plasma, X Layer, Codex, Injective, Linea | Circle USDC | https://faucet.circle.com | account | 200 |
| Linea (gas) | Linea docs | https://linea.build/ | docs entry point | 200 |
| Sei (gas) | Sei docs | https://docs.sei.io/ | docs entry point | 200 |
| Codex (gas) | Explorer | https://explorer.codex-stg.xyz/ | docs entry point | 200 |
| World Chain (gas) | Docs | https://docs.world.org/world-chain | docs entry point | 200 |

Where a chain's own faucet host did not resolve from this machine, the UI links the chain's official
docs page and marks it as a docs entry point rather than pretending it is a direct faucet.

## Removed

No faucet was removed for being slow; nothing in the list is known to be discontinued. If a host
starts returning a hard 404, drop it from `src/config/chains.ts` — every entry carries a
`checked` date so the next audit can see what is stale.

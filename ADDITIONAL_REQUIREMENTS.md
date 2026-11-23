# ADDITIONAL REQUIREMENTS

**Short version: none. No API key, account or registration is required for anything in v2.**

| Provider | Requirement | Cost | Status |
| --- | --- | --- | --- |
| Circle CCTP v2 + Iris sandbox | none (public contracts, public API, CORS open) | free | in use |
| Uniswap v3 | none (direct on-chain quotes, no Trading API key by design) | free (testnet gas only) | in use |
| OP Stack portals (Base/OP/Unichain/Ink/World/GIWA) | none | free (Sepolia gas) | in use |
| Public testnet RPCs | none | free, rate-limited | in use, override-able in `src/lib/wallet.ts` |

## Optional, only if you want it later

| Item | Why you might want it | What it needs | Mandatory? |
| --- | --- | --- | --- |
| WalletConnect / mobile wallets | connect a phone wallet or a wallet without an extension | a **Project ID** from https://cloud.reown.com (free tier), set as `VITE_WALLETCONNECT_PROJECT_ID` | No |
| Dedicated RPC (Alchemy/Infura/QuickNode) | remove public-RPC rate limits, faster balance scans | a free API key per chain, pasted into `RPC` in `src/lib/wallet.ts` | No |
| Richer token lists | show more ERC-20s automatically | none — the Portfolio page already imports any ERC-20 by address | No |

## Things that will never be requested

Seed phrases, private keys, wallet passwords, card details, or any secret pasted into chat. EBT signs
nothing; your wallet does.

## Chain exclusions (not fixable by a credential)

| Chain | Blocker |
| --- | --- |
| Plume Testnet | public RPC `testnet-rpc.plumenetwork.xyz` timed out; viem's definition is flagged legacy with a different id |
| Cronos Testnet | public RPC `evm-t3.cronos.org` did not respond |
| Sonic Testnet | Circle's "Sonic Testnet" id does not match viem's Sonic Blaze ids — unresolved ambiguity |
| Solana / Sui / Noble (CCTP v1) | non-EVM wallet stacks, out of scope for an EVM app |

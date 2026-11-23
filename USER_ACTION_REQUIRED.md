# USER ACTION REQUIRED

## TL;DR

**No API keys, no accounts, no registrations, no credentials.**

Everything the app integrates works without an account:
- Circle CCTP → public contracts + public sandbox Iris API (no key).
- Uniswap v3 → direct contract calls (no Uniswap API key, on purpose).
- GIWA deposit → the chain's own portal.

The only things you have to do are physical actions a person must do anyway.

---

## Checklist (do these once)

### 1. A browser wallet
- **Why**: EBT never holds keys; every signature comes from your wallet.
- **What**: MetaMask, Rabby, Coinbase Wallet extension or any injected EVM wallet.
- **Install**: official store page for your browser. Then reload the app.
- **Cost**: free. Nothing to copy, nothing to paste anywhere.

### 2. Testnet gas on the chain you start from
- **Why**: a transaction needs native gas (ETH/AVAX/POL/MON/SEI/…).
- **Where**: the Faucets page lists the official faucet per chain (each link HTTP-checked).
  Sepolia: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- **Cost**: free (faucet cooldowns apply; they are the provider's, not ours).

### 3. Testnet USDC (only needed for bridging / USDC swaps)
- **Where**: https://faucet.circle.com — one page, every CCTP testnet, issues testnet USDC.
- **Cost**: free.
- **Note**: USDC must be *native* USDC on that chain (the addresses in Settings are exactly these).

### 4. (Optional) Add the chain to your wallet
- The app will request a chain switch itself. If your wallet refuses to add a chain automatically,
  copy the chainId + RPC from **Settings → Chain registry** and add it manually.

---

## What I will never ask you for

- Seed phrase / recovery words.
- Private key.
- Wallet password.
- Card or payment details.
- Any API secret to paste into chat.

If anything (a page, a message, a "support" link) asks for those in connection with EBT, it is a scam.

---

## Things only you can do (because a key is involved)

| Step | Why it is yours |
| --- | --- |
| Connect the wallet | the signature proves ownership |
| Approve USDC (exact amount) | an on-chain approval is a signed transaction |
| Burn / swap | signed transaction |
| `receiveMessage` on the destination | signed transaction that mints your USDC |

Everything else — quotes, fees, status, history — the app does on its own.

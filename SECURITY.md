# Security policy

EBT is a **testnet-only** bridge and swap console. It has no backend, no database and no
custody: every transaction is signed by the visitor's own wallet, and the only state it keeps
lives in that browser's `localStorage`.

## Reporting a vulnerability

Do not open a public issue for a security problem. Send a private report to the maintainer
listed on the GitHub profile that owns this repository, with:

- what you found and where (file, route or screen),
- why it matters (what an attacker gains),
- the smallest reproduction you can give.

You can expect an acknowledgement within a few days and a fix or a written explanation for
anything confirmed. Please do not test against other people's wallets or funds, and do not run
automated scanners that generate load.

## Scope

In scope:

- the static site and its build output (`src/`, `index.html`, `vite.config.ts`, `vercel.json`),
- client-side handling of wallet connection, transaction building and signing requests,
- anything that could make a visitor sign a transaction they did not intend.

Out of scope:

- the public testnet RPC endpoints, bridges and DEXes the app talks to,
- testnet funds (they carry no value),
- findings that require a compromised browser, extension or device,
- missing headers on deployments we do not control.

## Secrets

The repository must never contain a private key, seed phrase, API key or paid RPC URL. Local
wallets used for manual testing live in `.test-wallet.json`, which is git-ignored, and the test
signer only ever reads it from disk at runtime. If you believe a secret was committed, report
it privately and rotate it rather than opening a PR that repeats the value.

## Dependency advisories

`npm audit` currently reports advisories in transitive packages pulled in by `wagmi` 2.x
(`@reown/appkit`, `@walletconnect/*`, `viem`, `ws`, `zod`, `decode-uri-component`, `uuid`) and
in `react-router-dom` 6. The clearing upgrades are `wagmi` 3 and `react-router` 7, both breaking
changes planned as a separate migration with a full regression pass. In this app the affected
code either never runs in the deployed bundle or is only reachable from data we generate
ourselves:

- `ws` DoS needs a hostile WebSocket *server* sending tiny fragments; the app only opens sockets
  to wallet relays and RPCs the visitor chose.
- `zod` memory exhaustion needs oversized constrained collections; schemas here only validate
  our own static ABI and config literals.
- `decode-uri-component` / `uuid` are only fed app-built strings and ids; no user payload reaches
  a decoder with attacker-controlled run length, and no `uuid` v3/v5/v6 call passes a buffer.
- `react-router` open redirect needs a user-controlled `<Link to>` / `navigate()` target; every
  route in this app is a static literal.

Dependabot is enabled (weekly npm, monthly actions), so these stay visible. Do not treat a clean
audit as a security guarantee, and do not force a major upgrade just to silence the report.

## Hardening log

The first full security pass (static review over 377 files plus a dependency scan) produced
thirteen findings that were fixed rather than documented away:

- token valuation and grouping now key on `verified`, so a spam token that calls itself `WBTC`
  cannot borrow the real asset's price or merge into its row;
- imported/discovered token metadata from the indexer is validated (address, symbol length,
  integer decimals) before it becomes a `TokenCfg`;
- Wallet Standard providers are matched by exact name and returned addresses must look sane;
- Wormhole claims use the destination Token Bridge and only accept a VAA log whose emitter is
  the bridge that was actually called;
- the swap button stays disabled until the quote matches the visible amount;
- a symbol with no ASCII letters no longer crashes the shell (`initials()` fallback);
- `/bridge?from=` accepts only chains in the allowlist and falls back to defaults;
- the send sheet signs only the row it displays (non-EVM rows cannot silently sign an EVM one);
- Stargate sends carry a 0.5% minimum instead of `0`;
- fee caps are bounded to 500 gwei even if a node reports an absurd `eth_gasPrice`;
- Across quotes are rejected when stale, empty or carrying an impossible exclusivity window;
- unverified tokens no longer render a verified project's logo;
- the local dev signer only answers loopback origins.


## What the site already does

- Strict CSP, HSTS, `nosniff`, `DENY` framing, no-referrer leakage beyond the origin.
- No third-party analytics, no remote fonts or scripts, no inline event handlers.
- Chain, token and bridge metadata are static local data; nothing is rendered as HTML.
- Every write goes through the wallet: the app never holds keys and never signs on its own.

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
(`@reown/appkit`, `@walletconnect/*`, `viem`, `ws`, `zod`). The clearing upgrade is `wagmi` 3,
a breaking change planned as a separate migration. In this app those packages are either not
imported at all (the connector list is injected-only) or only run in the browser, so the
server-side advisories (`ws` memory exhaustion, `zod` oversized collections) are not reachable
from the deployed bundle. This is tracked in the repository issues; do not treat a clean audit
as a security guarantee.

## What the site already does

- Strict CSP, HSTS, `nosniff`, `DENY` framing, no-referrer leakage beyond the origin.
- No third-party analytics, no remote fonts or scripts, no inline event handlers.
- Chain, token and bridge metadata are static local data; nothing is rendered as HTML.
- Every write goes through the wallet: the app never holds keys and never signs on its own.

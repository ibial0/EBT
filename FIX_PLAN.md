# FIX PLAN — 7 problems reported 2026-11-25

Order of work: plan → understand → fix one → test → confirm → next.

## P1 — Chain logos
**Reported:** none of the newly added networks show a logo; several existing logos are wrong,
not the original mark.
**Cause (to verify):** `src/config/logos.ts` has no entry for the 12 Orbit chains, so they fall
back to a coloured monogram. Existing entries were never checked against the real brand.
**Fix:** build a contact sheet of every chain logo, review it visually, replace wrong marks with
the official ones, add the 12 missing ones. Verify each file renders at 64px.

## P2 — Bridge and Cross-chain are the same feature twice
**Reported:** the two pages do the same thing; cross-chain adds nothing. Merge into one.
**Cause:** `CrossChain.tsx` is a second UI over the same route engine.
**Fix:** one page that does everything — direct same-asset bridges, bridge + swap composites,
and picking a destination token. Remove the duplicate nav entry, keep `/cross-chain` as a
redirect so old links still work.

## P3 — Reverse direction has no balance, no tokens, no route
**Reported:** Sepolia → Robinhood works; Robinhood → Sepolia shows no balance, no token, no route.
**Cause:** the route engine only walks L1 → L2. Withdrawals are deliberately excluded because
both OP Stack and Arbitrum require a 7-day challenge period — but the app never says so, and it
does not even read the L2 balance, which it could.
**Fix:** read balances on the source chain even when no route exists; make the no-route panel
explain exactly why (7-day withdrawal, not offered) instead of a generic message.

## P4 — Native tokens are invisible
**Reported:** USDC and ETH are glued onto every chain. Sepolia → Monad offers only USDC, but
Monad's own gas token is MON.
**Cause:** `tokensForChain` falls back to a USDC+WETH pair for chains with no registry entry, and
the bridge source list is filtered by "has a route", which hides natives with no provider.
**Fix:** every chain must expose its real native asset (MON, SEI, XPL, OKB, INJ, AVAX, POL, GEN,
PLUME, tHP, sXAI, WOMOX, SX, JASMY, MarsC, GNET). Show them, and state the provider reason when
they cannot move.

## P5 — Overview "Liquidity by chain"
**Reported:** it reloads, may need a backend, and there should be a bridge-availability matrix
instead (or as well).
**Cause:** it reads pool reserves live from public RPCs — no backend, but each poll is a burst of
`eth_call`s, which is why it feels like a reload.
**Fix:** replace it with a "which chains can bridge, and from where" matrix, which is static
config (no polling). Keep the liquidity numbers on the Swap page only, where they belong.

## P6 — Faucets
**Reported:** list every source, add the source's logo, mark tokens with no faucet, never publish
an unverified link, tag weak sources.
**Cause:** the directory was built quickly; several entries are docs pages, and the 12 new chains
have none.
**Fix:** re-verify every URL (HTTP status + page content), add per-chain native tokens, mark
missing ones explicitly, add source logos (favicon, cached locally), and tag entries that could
not be confirmed.

## P7 — Merge side effects
**Reported:** implicit — everything must keep working after the merge.
**Fix:** route/liquidity/deposit/orbit test suites stay green; browser pass over every page.

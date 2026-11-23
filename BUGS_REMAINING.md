# BUGS REMAINING

Known, deliberate, and documented. Nothing here is hidden behind a working-looking button.

| # | Item | Why it is still open | Workaround |
| --- | --- | --- | --- |
| R1 | Arc swap liquidity is tiny (~1-3 USDC per pool) | the pools themselves hold 1-29 USDC; no code change can create liquidity | the Swap page suggests the largest size that still fills honestly ("Use 1.4 USDC") |
| R2 | Quotes on very thin pools can still show a large impact | that is the real price of a shallow pool; hiding it would be worse | impact is shown in red above the button past 15% |
| R3 | Swap on OP/Arbitrum/Polygon/Linea/Ink/World/Monad/Sei/Plasma/X Layer/Codex/Injective | no verified Uniswap deployment with a router bound to the same factory and real liquidity | bridge into those chains; cross-chain swap only offers a destination swap where a venue exists |
| R4 | Robinhood Chain is not in the allowlist | no official chain id, RPC or bridge deployment could be verified | none; adding it on a rumour would break the testnet allowlist rule |
| R5 | L2 to L1 withdrawals (OP Stack) | 7-day challenge period; a button that cannot finish in a session is a trap | deposits only, stated in the Bridge panel |
| R6 | WalletConnect / mobile wallets | needs a third-party Project ID | injected wallets work |
| R7 | Some faucet hosts block automated checks (GIWA official, Polygon) | Cloudflare bot walls | the link is still the official one; the UI says it must be opened in a browser |
| R8 | cirBTC has no official logo asset found | no verified source; a wrong mark is worse than a monogram | neutral monogram fallback |
| R9 | Testnet USD values | testnet tokens have no market | labelled as mainnet estimates everywhere |
| R10 | Recovery needs the destination chain's gas | the mint is a real transaction | the panel says so; Arc gas is USDC |

## Fixed in this round

- Arc swap returning "no pool" for 23 USDC (partial-fill quotes were accepted for smaller sizes).
- Quote engine accepting flat/improving curves that would revert or under-deliver.
- Swap page offering chains with no verified venue (now only 4 chains with real liquidity).
- False `pending` record created by "Build route plan".
- Wallet rejection recorded as an on-chain failure.
- Sidebar dead space; no collapse.
- No pending indicator; failures were only visible in Activity.
- GIWA faucet linked to documentation instead of the faucet.
- Missing real logos; invented marks removed.
- Em dashes and robotic copy across the interface.

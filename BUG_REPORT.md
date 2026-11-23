# BUG REPORT

| # | Severity | Bug | Root cause | Status |
| --- | --- | --- | --- | --- |
| B1 | Critical | Bridge stuck at "Mint on Arc"; wallet returned generic "Transaction failed"; 20 USDC burned but never minted | Mint tx never reached Arc (explorer: no tx). Arc's mempool enforces a 20 gwei fee floor and the app let the wallet pick gas/fee; no preflight simulation → generic error | **Fixed** — explicit `estimateGas` + fee floor, preflight `eth_call`, precise errors, retry without re-burn, recovery page |
| B2 | Critical | Arc testnet USDC balance (91,280.61) not shown | No Arc entry in the token registry → balance query disabled → UI showed 0; plus the native/ERC-20 dual-decimal model was unhandled | **Fixed** — Arc registered (`nativeIsUsdc`), portfolio reads both views correctly, no double counting |
| B3 | High | "USDC" with 165,747 on Arc could be mistaken for real USDC | A look-alike ERC-20 (`0x4F3b…D20c2`) exists at the same address; symbol alone is not identity | **Guarded** — registry is address-based; custom imports are labelled `custom` |
| B4 | High | Bridge offered only USDC | v1 hard-coded the CCTP asset and had a single OP-chain pair | **Fixed** — route chips (USDC · CCTP / ETH · OP Stack) and 6 OP deposit targets |
| B5 | High | No portfolio | Feature absent | **Added** — `/portfolio` with per-chain native + ERC-20, search, refresh, import, explorer links |
| B6 | Medium | `usedNonces` lookup would always say "unused" | Nonce offset was bytes 8..40; the CCTP v2 nonce sits at bytes **12..44** | **Fixed** — decoder + `messageNonce()` corrected and unit-verified against a real message |
| B7 | Medium | Price impact could read 99.99% | `slot0.sqrtPriceX96` is `sqrt(token1/token0)`; no inversion when selling token1 | **Fixed earlier + re-verified** |
| B8 | Medium | Native-input swaps reverted `STF` | `multicall` delegatecalls, so `wrapETH` inside it left the WETH unreachable | **Fixed earlier + re-verified** |
| B9 | Medium | Errors were raw viem strings | No error mapping layer | **Fixed** — `lib/errors.ts` maps rejection / gas / revert / RPC / wallet-generic to human text with a hint |
| B10 | Low | "0 ETH" shown while disconnected | Balance fell back to `0n` | **Fixed** — `—` until a wallet is connected |
| B11 | Low | Flat text initials instead of logos | No asset set | **Fixed** — local SVG marks for 18 chains and 9 tokens, gradient fallback for unknown |
| B12 | Low | No way to recover a transfer without a local record | Recovery only via Activity | **Fixed** — `/recover`: paste a burn hash, decode, verify `usedNonces`, mint |
| B13 | Low | Attestation could be re-polled for an already-minted message | No short-circuit | **Fixed** — `isMessageUsed()` gate before mint and inside the tracker loop |

## Not a bug (verified, documented)

- The failed mint left the USDC **safe** inside Circle's protocol; `usedNonces = 0` proved it was still
  claimable, and the recovery page can finish it.
- 10 of 46 probed Uniswap pairs have no pool → correctly hidden, not a regression.
- GIWA has no CCTP domain → USDC cannot be bridged there (ETH can, via the portal).

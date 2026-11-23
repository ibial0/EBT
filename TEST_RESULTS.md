# TEST RESULTS

Run: 2026-11-23 09:48 UTC · `npm run test:sim` (live RPCs, `eth_call` + state override, no funds spent)

```
PASS  guard: mainnet rejected                        Blocked: 1 is a mainnet. EBT is testnet-only.
PASS  guard: unknown chain rejected                  unknown testnet id throws
PASS  guard: GIWA has no CCTP route                  CCTP is not available for GIWA Sepolia → Base Sepolia.
PASS  cctp: Iris fee API (0 → 6)                     fast=1bps standard=0bps
PASS  cctp: burn reaches token transfer              revert: ERC20: transfer amount exceeds allowance
PASS  cctp: depositForBurn succeeds with funds       layout balance=9 allowance=10, maxFee=125
PASS  swap: quote WETH→USDC on Sepolia               out=31485700 fee=500 impact=5bps
PASS  swap: native ETH→USDC executes                 returned 0x…01e06f04
PASS  opstack: GIWA deposit accepted                 portal 0x9569…C78A
PASS  swap: quote USDC→WETH on Sepolia               out=32054602335937 fee=3000
PASS  swap: USDC.approve(router, exact)              returned 0x…00
PASS  swap: USDC→ETH executes with funds             returned 0x…00
PASS  swap: quote USDC→WETH on Base Sepolia          out=438216910194011 fee=100
PASS  swap: executable pair coverage                 36 live pairs / 46 probed
PASS  arc: MessageTransmitter localDomain            domain=26
PASS  arc: USDC ERC-20 view is 6dp                   decimals=6, gasPrice=25000000000
PASS  arc: gas floor ≥20 gwei                        25 gwei
PASS  opstack: ETH deposit targets from Sepolia      OP Sepolia, Base Sepolia, Unichain, World, Ink, GIWA
PASS  opstack: portal has code (OP Sepolia)          0x16Fc…48BC
PASS  opstack: portal has code (Base Sepolia)        0x49f5…9e85
PASS  opstack: portal has code (Unichain)            0x0d83…51bD
PASS  cctp: message decoder (real message)           amount=20000000 → domain 26
PASS  cctp: Arc mint simulation                      return=0x…01
=== 23/23 checks passed ===
```

## The critical case, verified against the real transfer

The owner's stuck bridge was checked field by field, not assumed:

| Check | Result |
| --- | --- |
| Burn tx on Base Sepolia | `0xacf7316b…57be19` — status ok, `depositForBurn`, 20,000,000 units, domain 26, maxFee 825 |
| Iris attestation | `status: complete`, message 376 bytes, attestation 130 bytes |
| Arc `usedNonces(nonce)` | `0` → **not minted**, still recoverable |
| Arc explorer, owner address | **no transaction** on 2026-11-23 → the mint never reached the chain |
| `eth_call receiveMessage` on Arc | **succeeds**, returns `true` |
| `estimateGas` with 0 balance | **succeeds** (178,384) — so "insufficient funds" was not the blocker |
| Arc gas parameters | baseFee 20 gwei, gasPrice 25 gwei, mempool floor 20 gwei |
| Recovery page with that hash | decodes 20 USDC → Arc Testnet, recipient correct, `not minted yet` |

Interpretation: the burn and message were healthy; the wallet refused/failed before broadcast on a
chain with a fee floor, and surfaced a generic error. The app now removes every controllable cause and
can finish the transfer without burning again.

## Portfolio loader against the owner's address (Node, live RPCs)

```
Sepolia        native 0.9137 ETH      tokens 0   (664ms)
Arb Sepolia    native 0.1000 ETH      tokens 0   (657ms)
Base Sepolia   native 0.0900 ETH      tokens 1   USDC 138.8061
Unichain       native 0.1100 ETH      tokens 1   USDC 0.0417
Monad          native 2.7968 MON      tokens 1   USDC 20.0000
Arc            native 91280.6058 USDC tokens 2   EURC 480.0000, cirBTC 0.0019
GIWA           native 8.1000 ETH      tokens 0   (191ms)
chains read: 18 | token positions with balance: 5
```

This is the balance that was "missing": **91,280.6058 USDC on Arc**, now read from the ERC-20 view and
shown as the native gas asset.

## UI checks (real browser, Chromium via CDP)

| View | Result |
| --- | --- |
| 8 routes at 1440×980 | no console errors, no `undefined`/`NaN` in text |
| 390×844 (mobile) | no horizontal overflow, bottom nav intact |
| Bridge route chips | `USDC · CCTP` and `ETH · OP Stack` both render; switching flips Provider/Asset/ETA |
| Recover page | lookup of a real hash renders amount, destination, recipient, fee, mint state |
| Logos | chain + token SVG marks render in chips, selectors, portfolio rows |

## Still requires a human wallet (cannot be automated)

| Case | Why | What to do |
| --- | --- | --- |
| Live mint on Arc | needs a signature | Recover page → connect → Mint |
| Live bridge / swap | needs a signature | Bridge / Swap page |
| Arc→Base reverse bridge | needs a signature on Arc (gas in USDC) | works the same way, not yet exercised by a human |

No transaction was fabricated, and no "successful" result in this file came from anything other than a
real RPC/API response or a real simulation.

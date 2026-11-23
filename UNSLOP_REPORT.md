# UNSLOP REPORT — EBT v0.2

## Direction

- **Product.** A personal console for moving testnet money between chains and seeing what every wallet holds.
- **Character.** Precise, instrument-like, quietly technical. A lab bench, not a toy.
- **World.** Test instruments: graphite panels, hairline rules, one signal colour over neutral surfaces.
- **Moments.** The portfolio total and its asset table; the bridge route panel with its step timeline.
- **Signature.** A thin rule with a small node marking the active step (nav accent bar, timeline dots).

## Audit (what was wrong)

| Area | Sign found | Where |
| --- | --- | --- |
| Colour | Mint gradient buttons, coloured glows, radial washes behind content, neon-ish accents | `index.css`, every CTA |
| Colour | Gradient logo tile with a sparkle-ish glyph | sidebar brand |
| Type | 700–800 headings, uppercase tracked labels (`AMOUNT`, `FROM`), many greys | all pages |
| Icons | Logos were text initials in gradient circles; hand-drawn marks for GIWA/Arc/Ink/Plasma looked invented | `Logos.tsx`, `ui.tsx` |
| Spacing | 24px logos, 20px rows, paddings off the 4px rhythm, cramped network list | Overview, selectors |
| Components | Full-pill chips everywhere, glowing status pills, `animate-ping` | ui kit |
| Copy | "stitches existing testnet infrastructure", uppercase badges, `Search anything…` | Overview, pages |
| Layout | 232px sidebar with 30px rows, 40px page padding, dense two-column blocks | shell |
| Motion | `transition-all`, hover lifts, pulsing dots on non-live elements | ui kit |
| Visuals | Fake brand marks where real logos exist | `Logos.tsx` |

## Passes (what changed)

**1. Spacing.** 4px grid everywhere: sidebar 256, nav rows 34 with 2px gaps, page padding 32, card padding 20–24, list rows 44 (asset rows 56), controls 40 (primary 48). Selectors and amount rows got taller so a thumb can hit them.

**2. Colour.** One graphite ramp (`#141415` page → `#19191b` card → `#232325` raised) with 8% hairlines. Accent is cobalt `#6aa6ff`, used only for the active nav rule, links and focus. Primary action is off-white with dark text; success/negative are toned to sit inside the ramp. Every gradient, glow, coloured shadow and radial wash removed.

**3. Icons.** Lucide at 16/1.5 in one column. All emoji-like marks gone. Real logo assets replace the invented SVGs (see Logos).

**4. Copy.** Headlines say what the thing does with its own nouns ("USDC moves with Circle CCTP v2. ETH moves with the chain's own OP Stack portal"). No exclamation marks, no greetings, no trailing periods on labels, no hype words. Empty states name the next action.

**5. Type.** Inter for the interface, mono for figures and chain ids. Weights 400/500 only. Page title 26, card figures 28–44, labels 12 sentence case (no uppercase tracking), tabular numerals everywhere.

**6. Layout.** App shell fills the viewport with a 1240 content cap. Bridge and Swap are a two-column split with the form on the left and the route on the right; Portfolio is a summary block over grouped network sections.

**7. Details.** Nested radii (14 card → 10 panel → 8 row), buttons on the same 10px control radius, hairline separators instead of shadows, quiet mono metadata, status dots instead of glowing pills, visible focus rings.

**8. Visuals.** The one "moment" is the portfolio: a 44px total, grouped network totals, 36px asset marks, and a real price line ("prices 16:22 · defillama"). Logos are now the real assets, downloaded and stored locally.

**9. Motion.** One easing curve (`cubic-bezier(.22,1,.36,1)`), 120–180ms for hover/press, 320ms for the single entrance. No loops, no `animate-ping`, no hover lift, no `transition-all`. Buttons press to 0.985.

## Logos

Real assets, stored in `public/logos`, no hotlinks:

| Set | Source |
| --- | --- |
| Ethereum, Base, Arbitrum, Optimism, Polygon | Trust Wallet assets (`blockchains/<chain>/info/logo.png`) |
| Avalanche, Unichain, Linea, World, Monad, Sei, Ink, Plasma, X Layer, Arc, Codex, Injective | DefiLlama chain icons at 128px |
| GIWA | the chain's own site favicon at 128px |
| USDC, USDT, DAI, WETH, ETH, UNI, LINK, WBTC, EURC | Trust Wallet assets by canonical mainnet contract address |

Unknown tokens fall back to a neutral monogram; imported tokens are labelled `custom` so an impostor USDC can never pass as Circle's.

## Result checklist

- [x] Direction written, every pass follows it
- [x] Spacing on the 4px scale, equal things equal
- [x] Icons, labels, numbers each in one aligned column
- [x] One tinted neutral ramp, three text roles, one accent at 4.5:1
- [x] No hue gradients, gradient text, glows or blobs
- [x] No emoji in the interface
- [x] Type at 400/500, no uppercase tracked labels, no italic
- [x] No greeting headline, no unverified claims
- [x] Numbers tabular and consistently formatted
- [x] Nested radii add up
- [x] Charts: none on these screens (a portfolio table is the right form)
- [x] One entrance animation, one easing curve
- [x] Real logos, real prices, real balances

Unslop by Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), CC BY 4.0.

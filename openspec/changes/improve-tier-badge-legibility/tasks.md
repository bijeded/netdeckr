## 1. Design tokens

- [x] 1.1 Add the four text-on-dark tier tokens (`--tier-1-on-dark`, `--tier-2-on-dark`, `--tier-3-on-dark`, `--tier-rogue-on-dark`) to `design/tokens/colors.css` alongside the existing `--tier-*` fills, using the values in design.md D2, leaving the fill tokens unchanged
- [x] 1.2 Confirm the new tokens resolve at runtime (tokens are only live if reachable from the CSS actually imported in `main.tsx` — verify rather than assume)

## 2. Shared chip treatment

- [x] 2.1 Add the shared `CHIP_BASE` style constant (dark scrim, `blur(8px) saturate(115%)`, radius, inset top highlight) per design.md D1/D6, in a location both `TierBadge` and `TrendIndicator` can import
- [x] 2.2 Rewrite `src/components/TierBadge.tsx` to spread `CHIP_BASE` and drive per-tier border alpha, glow, and text color from the new tokens
- [x] 2.3 Apply the D3 ramp (size, weight, padding, border alpha, glow) to the per-tier table so the four tiers are monotonic in all five attributes

## 3. Trend indicator

- [x] 3.1 Rewrite `src/components/TrendIndicator.tsx` to spread the same `CHIP_BASE`, sized to the T3 ramp row (12.5px), keeping its up/down/flat semantic hues lifted for dark backgrounds per design.md D4
- [x] 3.2 Verify badge and trend chip render at comparable height and weight side by side, per the "Badge and trend arrow hold equal weight" scenario

## 4. Pips and vignette

- [x] 4.1 Add the per-pip dark ring and drop shadow to `src/components/ManaPips.tsx` per design.md D5, without changing pip size or layout
- [x] 4.2 Re-tune the vignette gradient in `src/components/ArchetypeCard.tsx` to the earlier, darker falloff, keeping it `pointer-events: none`
- [x] 4.3 Check the badge/trend cluster spacing in `ArchetypeCard` still balances now that both chips are larger

## 5. Tests

- [x] 5.1 Update `TierBadge.test.tsx` to assert the spec's contract — a dark backdrop is applied, each tier renders its own hue, and the ramp is monotonic — rather than exact pixel values
- [x] 5.2 Update `TrendIndicator.test.tsx`, `ManaPips.test.tsx`, and `ArchetypeCard.test.tsx` where they assert on styling that changed
- [x] 5.3 Add a test covering the fringe tier rendering at the same contrast treatment as T1 (the "Fringe tier is as readable as the top tier" scenario), keeping the existing Rogue/Otros localization assertions intact
- [x] 5.4 Run `npm run lint`, `npm run type-check`, and `npm run test` — all green

## 6. Visual verification

- [x] 6.1 Review the archetype grid against real card art across all four tiers, confirming legibility over the brightest art in the grid (reviewed on the Vercel preview for PR #167)
- [x] 6.2 Check the grid at a mobile breakpoint, where cards are narrower and the two chips compete for the same corner
- [x] 6.3 Settle the vignette falloff open question (design.md) from what the real grid looks like, and record the final values — kept at `40%` / `.58`; badge size ramp flattened to a constant 12px in the same pass

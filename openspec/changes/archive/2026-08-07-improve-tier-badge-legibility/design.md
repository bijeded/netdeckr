## Context

See proposal.md — Why. The relevant current state: all three overlaid indicators are styled inline
in their own components, with no shared "chrome over art" abstraction. `TierBadge` and
`TrendIndicator` each apply their own tint + border + glow + `backdrop-filter: blur(4px)`, and
`ArchetypeCard` owns the vignette that is meant to back all of them.

Two constraints shape the approach:

- **The glassy look is a hard requirement** (confirmed with the user). The fix cannot be "make the
  chip opaque". It has to keep blur and translucency while still guaranteeing contrast.
- **`backdrop-filter: blur()` alone does nothing for contrast.** It redistributes the art's
  luminance without changing its mean, so a blurred bright card is still bright. Contrast has to
  come from an actual dark layer.

## Goals / Non-Goals

**Goals:**

- A contrast floor that is provable from the CSS alone, independent of the art
- Tier order legible pre-attentively across a 12-card grid
- One consistent treatment shared by badge, trend arrow, and pips, rather than three drifting ones

**Non-Goals:**

- Introducing a CSS-module or styled-component layer. The codebase styles inline; this change stays
  inline and does not open that refactor.
- Extracting a general-purpose `<GlassChip>` primitive. Two call sites do not justify it; a shared
  style constant is enough.
- Touching `--tier-2`'s other consumers (`DeckCard`, `DecklistModal` second-place pill).

## Decisions

### D1 — Dark frosted scrim, hue moved to rim/glow/text

Replace the per-tier hue tint background with a single shared near-opaque dark scrim, and let hue
live only in the border, the glow, and the text.

```
background:       rgba(9, 10, 16, .82)     ← shared by all tiers
backdrop-filter:  blur(8px) saturate(115%) ← art survives as texture
border:           1px solid <tier hue at .55–.70>
box-shadow:       0 0 <r>px <tier hue at α>, inset 0 1px 0 rgba(255,255,255,.06)
color:            <tier text color, see D2>
```

At 82% scrim the worst case is pure-white art: the composite backdrop is ≈ `#35363b`
(relative luminance ≈ 0.042), and every tier's text clears 4.5:1 against it (see D2). Any darker art
only improves the ratio. The remaining 18% pass-through plus the blur is what preserves the glass
read — the art is still visible as moving texture behind the chip, which is the part the user wanted
to keep.

*Alternative considered:* keep the hue tint but raise its alpha to ~60%. Rejected — a saturated
violet at 60% is still a mid-luminance background for violet text, so the T1 pairing stays weak
exactly where it matters most.

*Alternative considered:* fully opaque `--surface-card` fill. Rejected — highest contrast, but it is
the one thing the user explicitly ruled out.

### D2 — Tier text colors re-derived for dark backgrounds

The existing `--tier-*` tokens are fill colors. Add text-on-dark variants that preserve hue and lift
lightness. Contrast is against the worst-case `#35363b` backdrop from D1:

| Tier   | fill (unchanged) | new text token         | value     | worst-case contrast |
|--------|------------------|------------------------|-----------|---------------------|
| T1     | `#b14bff`        | `--tier-1-on-dark`     | `#dcb0ff` | ≈ 6.3:1             |
| T2     | `#7fd8ff`        | `--tier-2-on-dark`     | `#c2ecff` | ≈ 9.0:1             |
| T3     | `#9b9dae`        | `--tier-3-on-dark`     | `#e2e4ee` | ≈ 9.1:1             |
| Fringe | `#6b6d80`        | `--tier-rogue-on-dark` | `#c6c9d8` | ≈ 7.0:1             |

The fringe tier now reads as clearly as T1. Its "lastness" is carried entirely by the ramp in D3,
never by being hard to see — which is what the spec's fringe-tier scenario demands.

New tokens are added alongside the existing fills in `design/tokens/colors.css`; the fills stay put
so the second-place pill in `DeckCard`/`DecklistModal` is untouched.

### D3 — Multi-attribute ramp (chosen: B2 over the bar-glyph B1)

A pure font-size ramp across four tiers is too subtle to scan (about 1.5px of spread before the
badge starts distorting the card's header). So the ramp compounds several attributes that all move
in the same direction:

| Tier   | size | weight | padding | border α | glow                    |
|--------|------|--------|---------|----------|-------------------------|
| T1     | 12px | 800    | 3px 9px | .70      | `0 0 16px` hue @ .50    |
| T2     | 12px | 700    | 3px 9px | .55      | `0 0 12px` hue @ .38    |
| T3     | 12px | 700    | 3px 9px | .30      | `0 0 8px` white @ .12   |
| Fringe | 12px | 600    | 3px 9px | .18      | none                    |

**Revised after preview review:** size and padding are constant at 12px / `3px 9px`. The first cut
scaled them 13.5px → 12px across the tiers, but on the real grid the scrim and shadow already
carried legibility on their own, and the larger badges only made the card's top-right corner heavy
without buying readability. Weight, rim brightness, and glow still descend monotonically, which is
enough to keep the order readable in greyscale.

Size still rises 11px → 12px against the old badge — a uniform bump, not a ramp. A pleasant
side-effect: with the badge no longer varying by tier, the trend chip matches it exactly rather than
sitting a step apart, which strengthens the "equal weight" scenario.

*Alternative considered:* B1, a `▮▮▮ / ▮▮ / ▮ / ―` rank glyph prefix. Rejected by the user. It is the
stronger greyscale signal, but it widens every chip and the ES "Otros" label makes the fringe chip
disproportionately large.

### D4 — Trend indicator matched, not quieted

`TrendIndicator` adopts the same scrim, blur, radius, and border treatment at the badge's constant
12px — a trend has no rank to encode, and after D3's revision the badge does not vary by tier
either, so the two chips match exactly. It keeps its own semantic hue
(`up #2fe6a0` / `down #ff5470` / `flat #ffcb45`), lifted for dark backgrounds on the same basis as
D2. Per the user's direction, the two chips stay equally loud; tier wins attention through the ramp,
not by suppressing the trend.

### D5 — Pips get a ring, not a chip; vignette narrows to backing them

The mana pips have the same art-as-background problem on the card's left corner, but wrapping them
in a frosted pill would read as a second badge and unbalance the header. Instead each pip gets its
own minimal dark backdrop as a ring plus drop shadow:

```
box-shadow: 0 0 0 1.5px rgba(6,7,12,.65), 0 1px 3px rgba(0,0,0,.5)
```

This separates each pip from the art and from its neighbours while keeping the pips' existing size
and layout.

With both chips now carrying their own scrim, the vignette's only remaining job is the pips. It gets
re-tuned rather than removed — darker and starting its falloff earlier
(`transparent 0 40%, rgba(0,0,0,.58) 100%`) — so it still supports the pips without washing out the
art's center. It stays `pointer-events: none`.

### D6 — Share the treatment via a style constant

The scrim/blur/radius/inset-highlight block is identical across `TierBadge` and `TrendIndicator`.
Export it once (a `CHIP_BASE` `CSSProperties` constant) and spread it in both, so the two cannot
drift apart and violate the "equal weight" scenario. Per-tier and per-direction values stay in each
component's own lookup table, as today.

## Risks / Trade-offs

- **The card's top-right corner gets visually heavier.** Two opaque-ish chips, both larger, over the
  art. → Review the grid against real art at several breakpoints before archiving; the ramp's
  padding values are the tuning knob if it reads as too heavy.
- **A 5-attribute ramp risks looking inconsistent rather than ordered** if the steps are uneven. →
  All five attributes move monotonically in the same direction, so the tiers read as one family.
- **82% scrim may read as "not glassy enough" to the user.** → Alpha is a single shared constant; it
  is one number to tune. Anything below ~75% starts failing the T1 contrast floor over white art,
  which is the hard boundary.
- **Existing component tests assert on inline styles** and will break. → Expected; they are updated
  as part of the change. Prefer asserting the contract the spec states (a dark backdrop is present,
  the ramp is monotonic) over exact pixel values, so future tuning does not re-break them.
- **No automated contrast check exists**, so the 4.5:1 floor is verified by calculation, not by CI. →
  Ratios are recorded in D2; if a tier color is retuned later, recompute against the D1 worst case.

## Migration Plan

Pure presentation change — no data, schema, API, or pipeline impact. Ships in one PR, verified by
`npm run lint`, `npm run type-check`, and `npm run test`. Rollback is a straight revert; nothing
persists and no state depends on it.

## Open Questions

Resolved during preview review — none outstanding.

- ~~Exact vignette falloff (the `40%` stop and `.58` alpha in D5).~~ Settled on the Vercel preview:
  the values as designed read correctly against real art and ship unchanged.
- The badge size ramp was also settled there, against the design: see D3's revision note.

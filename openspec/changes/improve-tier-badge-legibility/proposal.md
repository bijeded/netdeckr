## Why

The tier badge is the archetype card's primary quality signal, but it is currently the least
readable element on the dashboard. Its background is a 4–16% hue tint, so the *signature-card art
is the badge's background* — contrast is unknowable and, over bright art, drops to roughly 1.5–2:1.
The fringe tier (`#6b6d80` on a 4% white tint) is effectively invisible over light art, and T3
(`#9b9dae`) is barely better. Tier is also encoded by hue alone, with no visual ordering, so T1 does
not read as "higher" than T3 when scanning the grid — which is exactly how the grid is used.

## What Changes

- **Tier badge backdrop becomes frosted dark glass instead of a hue tint.** The badge keeps its
  blur and its "self-lit chip floating on art" character, but the scrim becomes a near-opaque dark
  fill so the art no longer serves as the text's background. Hue moves to where it is actually
  perceived: the border rim, the glow, and the text.
- **Tier text colors are re-derived for dark backgrounds.** The current tier tokens are fill colors,
  not text-on-dark colors. Each tier gets a lightness-lifted variant that preserves hue, including
  the fringe tier, which becomes genuinely readable rather than reading last by being invisible.
- **Tier gains a second, non-color encoding: a size and weight ramp** (T1 largest/boldest with the
  strongest glow, descending through T2/T3 to the fringe tier). Tier order becomes visible
  pre-attentively when scanning the grid, and survives in greyscale or at low contrast. Base badge
  size increases from 11px to 12px.
- **The trend indicator is matched to the badge's new treatment** so the two overlaid chips stay
  equally prominent, as they are today — the tier badge does not win by making the trend arrow quiet.
- **The mana pips and the art vignette are brought along.** The pips suffer the same
  art-as-background problem on the card's opposite corner, and once the chips carry their own scrim
  the vignette's role narrows to protecting the pips. Both are re-tuned as one "chrome over art"
  layer rather than three independently-tuned overlays.

No change to tier *assignment* — Power Score, natural-breaks cutoffs, the Last-2-Weeks basis, and
the fringe/missing-data rules are all untouched. This change is presentation only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `metagame-breakdown-view`: the **Legible card indicators over art** requirement changes — the
  overlaid indicators must guarantee a contrast floor independent of the art behind them (rather
  than relying on a vignette plus a translucent tint), and the tier badge must encode tier order
  through a non-color channel in addition to hue.

## Impact

- **Code**: `src/components/TierBadge.tsx` (badge treatment, per-tier colors and ramp),
  `src/components/TrendIndicator.tsx` (matched treatment), `src/components/ManaPips.tsx` (legibility
  over art), `src/components/ArchetypeCard.tsx` (vignette gradient, overlay layout/spacing). Existing
  component tests in `TierBadge.test.tsx`, `TrendIndicator.test.tsx`, `ManaPips.test.tsx`, and
  `ArchetypeCard.test.tsx` may need updating where they assert on styling.
- **Design tokens**: likely new text-on-dark tier variants alongside the existing `--tier-1` …
  `--tier-rogue` fills in `design/tokens/colors.css`. The existing fill tokens stay — `--tier-2` is
  also used by `DeckCard.tsx` and `DecklistModal.tsx` for the second-place pill, which is out of
  scope here.
- **i18n**: none. The fringe tier's localized label (Rogue/Otros) is unchanged.
- **Supabase / RLS / scraper**: no change. No table, policy, or scraper behavior is touched.
- **Time windows / retention**: no change. The 7days/2weeks model and the 30-day retention window
  are untouched; tier remains computed from the Last-2-Weeks corpus.
- **Visual risk**: with both overlaid chips opaque and slightly larger, the card's top-right corner
  carries noticeably more weight than today. This is a deliberate silhouette change and should be
  reviewed against real art before the change is archived.

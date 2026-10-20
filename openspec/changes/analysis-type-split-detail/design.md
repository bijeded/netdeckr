# Design

## Context

`cardCategory()` in `src/lib/cardType.ts` maps a played face's type line to one of four display groups. It drives the decklist modal and stock list sections (`groupMainByType`), land checks in `manaCurve` and `stockList`, and the Analysis doughnut (`typeSplit` in `src/lib/archetypeAnalysis.ts`). The doughnut (`CompositionRail`) colours slices from a `TYPE_COLOR` map keyed by that four-value union, with matching `.analysis-type-*` legend-dot classes in `src/styles/dashboard.css`, and labels from `modal.group.*`. The doughnut is 96px beside a one-column legend in the 280px rail.

## Goals / Non-Goals

**Goals:**
- An eight-type classification (plus `other`) used only by the doughnut.
- Leave every existing caller of `cardCategory()` untouched.

**Non-Goals:**
- Changing decklist or stock list grouping, the mana curve, or export.
- Per-slice tooltips or interaction on the doughnut.

## Decisions

**A second classifier beside the first, not a refinement of it.** Add `CardType` (`'lands' | 'creatures' | 'planeswalkers' | 'battles' | 'artifacts' | 'enchantments' | 'instants' | 'sorceries' | 'other'`) and `cardType(typeLine)` to `src/lib/cardType.ts`, next to `cardCategory()`. `typeSplit()` switches to it; nothing else does. *Alternative:* derive the four groups from the eight types. Rejected: the two orders disagree on precedence — the decklist puts Enchantment ahead of Artifact inside "Spells" while an Artifact Enchantment is an artifact here — so coupling them would change decklist behaviour, which option (a) excludes.

**Precedence by substring on the lower-cased played-face type line**, first match wins: `land`, `creature`, `planeswalker`, `battle`, `artifact`, `enchantment`, `instant`, `sorcery`, else `other`. Matching is on the type portion only (before ` — `), so a subtype cannot trigger a type. Calculated against known risky lines: "Artifact Creature — Construct" → creatures; "Enchantment Land — Urza's Saga" → lands; "Kindred Sorcery — Goblin" → sorceries; subtypes such as "Equipment" or "Saga" never match a type word. *Alternative:* count a multi-type card under every type it has. Rejected: the doughnut total would exceed the mainboard size.

**Labels under `analysis.composition.types.*`**, not `modal.group.*`. The modal keys belong to the decklist grouping and keep their four values; the doughnut gets its own nine keys in both locales. ES: Tierras, Criaturas, Planeswalkers, Batallas, Artefactos, Encantamientos, Instantáneos, Conjuros, Otros (official Spanish type names; "Planeswalkers" is the term the Spanish card text uses).

**Colours: one token per type, defined in `src/styles/tokens/colors.css`** as `--type-*` and referenced by both `TYPE_COLOR` and the legend-dot classes, so the two cannot drift. Starting assignment, pending visual confirmation: lands keep `--text-muted`, creatures keep `--neon-500`, and the remaining six are drawn from hues not already carrying a semantic meaning on the dashboard (avoiding `--up`/`--down`/`--flat`). Each slice's contrast against `--surface-card` and adjacent-slice distinguishability are checked with the dataviz skill's validator before the preview; the final hex values are recorded here once confirmed on the Vercel preview.

Shipped to preview (calculated; look pending visual confirmation): ring order lands `--text-muted`, creatures `--neon-500`, planeswalkers `#d95926`, battles `#199e70`, artifacts `#3987e5`, enchantments `#c98500`, instants `#d55181`, sorceries `#008300`, other `#5e6072`. The six hues are the dataviz reference palette's dark steps, ordered so adjacent slices pass. Validator on `#11121b`, including the wrap-around other↔lands pair: every slice ≥ 3:1, worst adjacent CVD ΔE 9.4, normal-vision ΔE 15.4. The only failing check is the chroma floor on the two neutral slots, which are grey on purpose. Other started as `--text-faint` (`#6b6d80`) and was darkened to `#5e6072`: next to lands across the wrap it scored normal-vision ΔE 10.8, below the 15 floor.

**Legend stays one column.** Empty types are already filtered, so a typical stock list shows four to six rows; the legend grows downward beside the 96px doughnut. Whether a two-column legend reads better at eight rows is pending visual confirmation.

**Spanish sideboard heading** is a one-string edit to `analysis.composition.sideboardTitle` in `src/locales/es.json`; no key changes.

## Risks / Trade-offs

- [Two classifiers can disagree on the same card's label, e.g. an enchantment is a "Spell" in the stock list but an "Enchantment" in the doughnut] → Intended by option (a); the spec states the split does not change the stock list grouping.
- [Eight categorical colours on a 96px doughnut may be hard to tell apart] → Colours validated for contrast and separation; legend carries the label and count for every slice, so colour is never the only channel. Final look pending preview.
- [A rail taller than the stock list column at eight legend rows] → Calculated worst case is 8 rows × ~18px + gaps ≈ 190px, beside a 96px doughnut; layout effect pending preview.

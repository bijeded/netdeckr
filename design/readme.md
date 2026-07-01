# MetaStack Design System

Design system for **MetaStack** — a dark-mode web dashboard that tracks the *Magic: The Gathering* competitive metagame from tournament data (archetype share, tier lists, trending cards, deck lists with MTG Arena export).

**Source:** derived from the interactive prototype `MetaStack.dc.html` at the project root, which itself was built from `uploads/metastack-design.md`. There is no external codebase or Figma — the prototype is the single source of truth. The prototype includes states not shown in the UI kit index (expanded archetype → deck cards, and the deck modal with main/sideboard + "Exportar a MTG Arena").

## Content fundamentals
- **Language:** Spanish UI copy, English proper nouns (card names, archetypes: "Izzet Cauldron", "Cori-Steel Cutter"). Keep MTG terminology in English — it's how the community reads it.
- **Tone:** terse, data-first, community-native. Labels are short nouns ("Fecha", "Arquetipo", "En Tendencia", "Últimos 5 días"). No marketing voice, no full sentences in the UI.
- **Casing:** Title Case for headings and card names; UPPERCASE micro-labels with wide tracking for eyebrows and stat labels ("EVENTOS", "MTG METAGAME BREAKDOWN").
- **Numbers:** always mono, always one decimal for percentages ("14.2%"), signed deltas ("+2.1" / "-1.7" / "0.0"), zero-padded ranks ("01"). Dates abbreviated ("24 — 28 Jun 2026").
- **No emoji.** Iconography is limited to a few unicode glyphs (see below).

## Visual foundations
- **Vibe:** competitive-gaming telemetry — dark, focused, a single electric violet accent glowing against near-black. Restrained, not flashy; neon is a spotlight, not wallpaper.
- **Color:** app canvas `#0a0b10` with a faint violet radial glow top-right. Surfaces step up in near-black (`#11121b` cards, `#101119` modal). One primary accent — **violet neon `#b14bff → #7a2bff`** — used for the active state, the primary CTA, focus rings, and section markers. **Mana WUBRG** are secondary accents, only for color-identity pips. Semantic trio: green `#2fe6a0` up, red `#ff5470` down, amber `#ffcb45` flat.
- **Type:** Sora (display/heavy titles + UI labels), IBM Plex Sans (body/filters), JetBrains Mono (all data). Hero titles are 46px/800 at -.03em tracking.
- **Spacing:** compact, dense dashboards; 8/11/14/18/22px rhythm. Content maxes at 1240px centered. Sidebar 280px, topbar 62px.
- **Backgrounds:** flat near-black + one radial violet glow. A subtle 135° repeating-linear-gradient hatch texture fills placeholder art headers. No photographic backgrounds.
- **Cards:** `#11121b` fill, 1px `rgba(255,255,255,.07)` border, 15px radius, no shadow at rest. Selected/expanded state swaps to a violet border + `0 0 0 1px` ring + drop shadow.
- **Borders:** hairlines at 6–8% white. Dashed violet underlines mark hoverable card names.
- **Shadows:** almost none at rest; used only for floating layers — modal `0 30px 80px rgba(0,0,0,.6)`, hover card image `0 18px 50px rgba(0,0,0,.7)`, plus violet glows on active/CTA elements.
- **Radii:** 6 (chips/badges) · 9 (buttons/rows) · 11 (deck cards) · 15 (archetype cards) · 16 (panels) · 18 (modal) · 999 (format pills).
- **Motion:** quick, functional. `.13–.15s` transitions on hover/press; cards lift `translateY(-2px)` on hover; modal + toast `popIn` (fade + 8px rise + slight scale, .2s). The live-status dot pulses (2.2s). No bounces.
- **Hover states:** neutral rows get a faint violet wash (`rgba(177,75,255,.06)`); deck cards gain a violet border and lift. **Press/active:** the format pill fills with the violet gradient + glow.
- **Transparency & blur:** topbar and floating chips use `backdrop-filter: blur(10px)` over translucent near-black; modal backdrop is `rgba(5,5,9,.74)` + 4px blur.

## Iconography
- **No icon library.** The design uses a tiny set of **unicode glyphs**: `≡` (menu), `✕` (close), `⬇` (export), `▲ ▼ –` (deltas), `✓` (toast), `→` (row affordance). Keep to these; if you need more, add a lightweight stroke set (e.g. Lucide via CDN) and flag it.
- **Logo:** a rotated (45°) rounded-square with the violet gradient + glow, paired with the "MetaStack" wordmark (Sora 800) and an uppercase tagline. See `guidelines/brand-logo.card.html`.
- **Mana pips:** solid WUBRG dots (the `ManaPip` component) stand in for color icons.
- **Art:** archetype/card art are styled placeholders (hatched violet gradient) — swap for real Scryfall card art when available. Never hand-draw card art as SVG.

## Index / manifest
- `styles.css` — entry point; `@import`s the token + font files below.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `fonts.css`.
- `components/`
  - `core/` — `Button`, `IconButton`, `Pill`
  - `mana/` — `ManaPip`, `ManaPips`
  - `data/` — `TierBadge` (+ `tierFor`), `ChangeIndicator`, `StatCard`
  - `archetype/` — `ArchetypeCard` (the signature card)
- `ui_kits/dashboard/` — full dashboard recreation (`index.html`, `README.md`).
- `guidelines/` — foundation specimen cards (Colors, Type, Brand).
- `MetaStack.dc.html` (root) — original interactive prototype (all states).
- `SKILL.md` — Agent-Skill entry point.

## Namespace note
Component cards mount from `window.MetaStack` (e.g. `const { Button } = window.MetaStack`). If the compiler bundles under a different namespace, update the `window.<NS>` reference in the `*.card.html` files and the UI kit.

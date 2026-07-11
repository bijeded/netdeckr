## Context

The dashboard chrome is built with a mix of inline styles (topbar logo, StatCard strip, FormatSwitcher, LanguageToggle — all in `src/App.tsx` / component files) and a small stylesheet (`src/styles/dashboard.css`) that owns the `.topbar`, `.sidebar`, `.app-content`, and `.trending-layout` layout. The topbar today is a single flex row: `≡` toggle · logo · (spacer) · FormatSwitcher · LanguageToggle. FormatSwitcher and the StatCard strip both rely on `flex-wrap: wrap`, which is what produces the ragged mobile wrapping. The narrow breakpoint used elsewhere for the sidebar drawer is `max-width: 860px` (`SIDEBAR_MQ` in App.tsx); dashboard.css already uses `900px` and `640px` breakpoints for trending/decklist.

## Goals / Non-Goals

**Goals:**
- Add the topbar subtitle and move the language toggle into the sidebar (structural, not responsive).
- Make the format pills and StatCard strip behave on mobile (single rows; pills scroll without a scrollbar).
- Small copy/spacing fixes (trending titles, trending top margin).
- Keep everything localized and keep existing tests green (update those affected).

**Non-Goals:**
- Item 7 (mobile tap-to-reveal card-art preview) — deferred to a separate reproduce-first bug.
- No redesign of the topbar/sidebar beyond what these six items require; no new design tokens.
- No data/behavior changes to trending tables (only their titles).

## Decisions

- **Breakpoint**: reuse a single mobile breakpoint for the new responsive rules. Use `max-width: 640px` (the existing "small" breakpoint in dashboard.css) for the format-pill and StatCard reflow, so the phone layout is distinct from the `860px` sidebar-drawer threshold. Rationale: the wrapping problem is a phone-width problem; tablets at ~700–860px still have room for the current layout. (If the pill row proves cramped above 640px during implementation, widen to `768px` — a judgement call left to the task.)

- **Topbar → CSS class for reflow (items 3 & 1)**: the topbar layout moves from inline flex assumptions to `.topbar` rules so a media query can restack it. On mobile `.topbar` becomes `flex-wrap: wrap` at the container level with the logo cluster on row 1 (full width) and the FormatSwitcher on row 2 (full width). The subtitle is added inside the logo cluster as a stacked `<span>` (wordmark over muted subtitle) using `--text-faint`/`--fs-2xs`-ish styling; the topbar height rule (`--topbar-h`) becomes `min-height` so two rows can grow it on mobile.

- **FormatSwitcher scroll-without-scrollbar (item 3)**: give the switcher a class (e.g. `.format-switcher`). Desktop keeps `flex-wrap: wrap`. On mobile: `flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch;` plus scrollbar hiding — `scrollbar-width: none` (Firefox) and `::-webkit-scrollbar { display: none }` (WebKit/Blink). Pills keep `flex: 0 0 auto` + `white-space: nowrap` so they don't shrink.

- **StatCard strip single row (item 4)**: the inline value font (`--fs-stat-sm`) and padding/`minWidth: 96` can't be shrunk by a media query while they live inline. Move the strip and StatCard presentation to classes (`.stat-strip`, `.stat-card`). Keep the component API identical; the value/label spans get classes too so a mobile media query can reduce padding, drop `min-width` to `0`, make the strip `display: flex` with three equal `flex: 1` children below the title (drop `margin-left: auto` on mobile), and shrink the value font. Non-goal: changing StatCard's props.

- **Language toggle move (item 2)**: remove `<LanguageToggle />` from the topbar right cluster and render it as the last child of `.sidebar-inner`, wrapped so it is pushed to the bottom and separated from the filters (e.g. `margin-top: auto` on the wrapper plus a hairline top border / spacing). The `.sidebar-inner` already is a `flex-column`; add `min-height: 100%` (or make the sidebar a column that fills height) so `margin-top: auto` pushes the toggle down. The `LanguageToggle` component itself is unchanged.

- **Trending title copy (item 6)**: change only the i18n values `trending.creaturesTitle` and `trending.spellsTitle` in `en.json`/`es.json` to "Top Creatures"/"Top Criaturas" and "Top Spells"/"Top Hechizos". The i18n keys stay the same, so `App.tsx`/`TopCardsTable` are untouched. Spanish uses the "Top …" convention already established by "Top Sideboard Cards" / the sideboard title.

- **Trending top margin (item 5)**: bump `.trending-layout { margin-top }` from `var(--sp-6)` to `var(--sp-8)` in dashboard.css (roughly double). Pure spacing.

- **Subtitle copy (item 1)**: `app.subtitle` = "MTG Metagame Snapshot" in both `en.json` and `es.json` (kept in English as an MTG-community-facing tagline, consistent with the design source).

## Risks / Trade-offs

- **Inline-style → class refactor (StatCard, topbar) can regress desktop layout.** Mitigation: keep desktop rules equivalent to the current inline values; rely on existing StatCard/App tests and visual check of the desktop header.
- **Scrollbar-hiding is non-standard across engines.** `scrollbar-width: none` + `::-webkit-scrollbar` covers Firefox and WebKit/Blink (the app's targets); acceptable per the "no horizontal scrollbar" requirement.
- **Breakpoint choice (640 vs 860).** Picking 640px means the 640–860px band keeps the desktop-style header while the sidebar is already a drawer; that's fine but worth a glance during implementation to confirm the pill row isn't cramped just above 640px.
- **`margin-top: auto` pinning** requires the sidebar inner to fill available height; on very short viewports the toggle may sit right under the filters rather than pinned — acceptable (it stays below the filters either way).

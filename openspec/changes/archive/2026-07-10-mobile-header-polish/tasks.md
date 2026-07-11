## 1. Copy & spacing quick wins

- [x] 1.1 Rename trending titles in `src/locales/en.json` and `src/locales/es.json`: `trending.creaturesTitle` → "Top Creatures"/"Top Criaturas", `trending.spellsTitle` → "Top Spells"/"Top Hechizos". Keep the keys unchanged; confirm the locale parity test still passes.
- [x] 1.2 Add `app.subtitle` = "MTG Metagame Snapshot" to both `en.json` and `es.json` (same English text in both locales).
- [x] 1.3 Increase `.trending-layout` top margin in `src/styles/dashboard.css` from `var(--sp-6)` to `var(--sp-8)`.

## 2. Topbar subtitle & language-selector move

- [x] 2.1 Render the `app.subtitle` under the "MetaStack" wordmark in the topbar logo cluster (`src/App.tsx`), stacked vertically, styled as muted/secondary text; change the fixed topbar height to a `min-height` so the extra line fits.
- [x] 2.2 Remove `<LanguageToggle />` from the topbar right cluster and render it as the last child of `.sidebar-inner`, pinned to the bottom (`margin-top: auto` wrapper) and visually detached from the filters (spacing / hairline separator). Ensure the sidebar column fills height so the toggle is pushed down.
- [x] 2.3 Verify language switching still works from the sidebar and no language selector remains in the topbar; update/extend App tests for the moved control.

## 3. Mobile format pills (single scrollable row)

- [x] 3.1 Move `.topbar` layout into CSS so it can reflow: on the mobile breakpoint (`max-width: 640px`, revisit if cramped) wrap the topbar so the logo cluster is row 1 and the FormatSwitcher is row 2 (full width).
- [x] 3.2 Give `FormatSwitcher` a class; on mobile switch from `flex-wrap: wrap` to `flex-wrap: nowrap; overflow-x: auto` with scrollbar hidden (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`); keep pills `flex: 0 0 auto` + `white-space: nowrap`.
- [x] 3.3 Verify on a narrow viewport: pills sit below the logo in one row, overflow scrolls, no visible scrollbar, no wrapping; desktop layout unchanged.

## 4. Mobile StatCard strip (single row below title)

- [x] 4.1 Move the StatCard strip and StatCard presentation to classes (`.stat-strip`, `.stat-card`) preserving the current desktop appearance and the component API.
- [x] 4.2 Add a mobile rule so the three StatCards fit one row below the title: strip becomes `display: flex` with equal `flex: 1` children (drop `margin-left: auto` on mobile), reduce card padding, set `min-width: 0`, and shrink the value font.
- [x] 4.3 Verify all three cards fit one row on a phone width without wrapping; desktop strip unchanged; update StatCard/App tests as needed.

## 5. Validation

- [x] 5.1 Run `npm run lint`, `npm run type-check`, and `npm run test`; fix any fallout.
- [x] 5.2 Manual/responsive check at desktop, ~700px, and phone widths for the topbar, sidebar language toggle, pills, StatCard strip, and trending spacing/titles.
- [x] 5.3 Run `openspec validate mobile-header-polish` and resolve any issues.

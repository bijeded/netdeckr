## Why

The dashboard chrome doesn't hold up on mobile: the format pills wrap into a ragged block that collides with the format title, the StatCard strip balloons to two-plus rows, and the header lacks the app tagline shown in the design source. A few desktop copy/spacing details are also off (trending titles read "Trending" where the design says "Top"; the trending section hugs the grid above it). This is a focused batch of six presentational fixes to bring the header, sidebar, and trending section in line with the design and make the top of the page usable on a phone.

(Item 7 from the original request — the tap-to-reveal card-art preview not appearing on mobile — is a real-device bug and is deferred to a separate reproduce-first change.)

## What Changes

- **Topbar subtitle**: add an "MTG Metagame Snapshot" tagline directly under the MetaStack wordmark in the topbar (new i18n key `app.subtitle`, ES + EN), matching `design/MetaStack.dc.html`.
- **Language selector relocation**: move the `LanguageToggle` out of the topbar right cluster into the sidebar, pinned at the bottom (after "Clear filters"), visually detached from the filter groups.
- **Mobile format pills**: on narrow viewports the format pills sit in a single row below the logo and scroll horizontally on overflow **without a visible scrollbar**, replacing today's `flex-wrap` wrapping. The `.topbar` reflows to two rows (logo row, pills row) on mobile.
- **Mobile StatCard strip**: on narrow viewports the three StatCards fit in one row below the format title (reduced padding/min-width/value size), instead of wrapping.
- **Trending section spacing**: increase the top margin above `.trending-layout` (roughly double) so it's clearly separated from the last archetype row.
- **Trending titles**: rename "Trending Creatures" → "Top Creatures" and "Trending Spells" → "Top Spells" in both locales (keeping the "Top …" convention already used by "Top Sideboard Cards").

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `metagame-breakdown-view`: adds header/sidebar chrome requirements — a topbar app subtitle, the language selector's placement at the bottom of the filter sidebar, and mobile layout of the format-switcher pills (single scrollable row below the logo) and the header StatCard strip (single row below the title).
- `trending-cards-view`: the mainboard table titles change from "Trending Creatures"/"Trending Spells" to "Top Creatures"/"Top Spells" (both locales); table data and behavior are unchanged.

## Impact

- Frontend only. No data, API, schema, or scraper changes.
- Code: `src/App.tsx` (topbar logo/subtitle, language toggle move, StatCard strip), `src/components/FormatSwitcher.tsx`, `src/components/StatCard.tsx`, `src/styles/dashboard.css` (topbar reflow, pill/statcard mobile rules, `.trending-layout` margin), `src/locales/en.json` + `src/locales/es.json` (`app.subtitle`, trending titles).
- Tests: locale parity test, plus component tests for FormatSwitcher/StatCard/App header structure as affected.
- No breaking changes.

## Why

MetaStack has no footer, no "How it works" explainer, and no privacy policy. As a fan-made site built on MTGTop8 tournament data and Scryfall card data, it needs the Wizards of the Coast Fan Content Policy attribution to stay compliant, and — with Vercel Analytics, error tracking, and possibly ads planned — it needs a privacy policy before those land, not after.

## What Changes

- Add a persistent footer to the app shell (visible on the dashboard and on legal pages) containing: a "How it works" link, a "Privacy policy" link, the language toggle (moved out of the sidebar so it stays reachable when the sidebar is hidden), and the required Wizards of the Coast Fan Content Policy attribution legend.
- Add client-side navigation to two legal pages via a `?page=how-it-works` / `?page=privacy` query param, following the same URL-sync pattern already used by `useFormatSelection`/`useWindowSelection` (no router dependency added).
- When a legal page is open: the topbar (logo + format switcher) and footer stay as-is; the filter sidebar (window/event/archetype/tier filters, clear-filters button) is hidden since it doesn't apply.
- Add a "How it works" page: a plain-language explainer (readable by a 13-year-old) of how MetaStack processes tournament and card data, that it has no user accounts and collects nothing personal from visitors, a "Built by DMM Studios" credit linking to studiosdmm.com.mx, and a Scryfall data/image credit line.
- Add a "Privacy policy" page: discloses current and intended data practices — analytics (live, cookieless, vendor-neutral wording), error tracking (planned, tool not yet chosen), and a note that advertising may be added in the future via an as-yet-undetermined provider — plus that there are no user accounts and no personal data collection beyond aggregate analytics. Ends with a "Last changed" date stamp.
- Introduce a typed, per-locale content module format (`Section[]` — heading/paragraph/list/link) for long-form page content, stored outside `en.json`/`es.json`, rendered by one shared page component. This is a new content-authoring convention alongside the existing react-i18next convention (which still covers short UI labels, including the footer's own link/label text).

## Capabilities

### New Capabilities
- `site-footer`: the persistent footer — its links, the language toggle relocated into it, the Wizards Fan Content Policy legend, and its responsive behavior at small widths.
- `legal-pages`: the `?page=` navigation mechanism, the shell chrome changes when a legal page is active, the typed per-locale content module format, the shared legal-page renderer, and the specific content requirements for the How It Works and Privacy Policy pages.

### Modified Capabilities
_None — no existing spec's requirements change. The sidebar's existing filter behavior is unaffected on the dashboard; it is only conditionally hidden, which is new footer/legal-pages behavior, not a change to `metagame-breakdown-view` et al._

## Impact

- **New files**: footer component; legal-page renderer component; `?page=` read/write hook (mirroring `useFormatSelection`/`useWindowSelection`); per-locale content modules under `src/content/legal/` for How It Works and Privacy Policy.
- **Modified files**: `src/App.tsx` (render footer in app shell, conditionally hide sidebar, swap main content when a legal page is active, remove `LanguageToggle` from the sidebar); `src/locales/en.json` / `es.json` (short footer/link/nav labels only — not the page prose).
- **No backend/schema/scraper impact.** No new dependencies (no router, no markdown renderer).
- **Design docs to update after this change ships**: CLAUDE.md's "Error tracking: none (v1)" line will need revisiting once error tracking is actually implemented (the privacy policy describes it as planned, not yet live) — flagged for a future change, not this one.

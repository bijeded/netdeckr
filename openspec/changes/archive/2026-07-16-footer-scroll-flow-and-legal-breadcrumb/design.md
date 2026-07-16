## Context

The app shell (`src/styles/dashboard.css`) is a `position: fixed; inset: 0` flex column: a pinned topbar, an `.app-body` (flex sidebar + independently scrolling `main.app-main`), and a `flex: 0 0 auto` footer pinned at the bottom of the shell. Because only `.app-main` scrolls, the footer permanently reserves vertical space at the bottom of the viewport on every view — cramped on mobile.

Legal pages (`LegalPage.tsx`) render inside `.app-main` in place of the dashboard content, with the sidebar hidden. Today the only explicit way back to the dashboard is the topbar logo (`setPage(null)`).

## Goals / Non-Goals

**Goals:**
- Stop the footer from reserving fixed viewport space; let it flow at the end of scrollable content, reached by scrolling.
- Give legal pages an obvious breadcrumb-style back control above the title.
- Keep a single footer render shared by dashboard and legal pages.

**Non-Goals:**
- No sticky/fixed footer, no scroll listeners, no reveal-on-scroll animation.
- No change to footer content (links, language toggle, WotC legend).
- No routing library — keep the existing `?page=` URL-sync pattern.

## Decisions

- **Relocate the footer into `.app-main` as its last child**, after `.app-content`. This is the minimal DOM move: the footer already rendered once and shows on both views; since legal pages also render inside `.app-main`, the footer continues to appear on them unchanged. Alternative considered: a mobile-only conditional render using the existing `narrow` flag — rejected as more complex for no benefit, since flowing at content-end is desirable on desktop too.
- **No sticky-footer flex trick.** Per product decision, a short page simply shows the footer right under the content; users scroll to reach it when content is tall. Keeps CSS untouched beyond width scoping.
- **Footer width now spans the content column, not the full shell.** The `.app-footer` `border-top` still reads as an end-of-content divider. The full-width-across-sidebar look is intentionally dropped.
- **Breadcrumb via a new `onBack` prop** on `LegalPage`, wired in `App.tsx` to `setPage(null)`. Chosen over widening `onNavigate` to accept `null` so intent stays explicit and the existing inter-page navigation contract is unchanged.
- **`←` glyph** rendered as literal text in the button label alongside localized copy, and added to the CLAUDE.md design vocabulary (which listed only `→`).

## Risks / Trade-offs

- [Footer no longer always visible on desktop] → Acceptable: it holds legal links/attribution, fine to require a scroll; the topbar logo and breadcrumb remain the primary navigation.
- [Existing tests may assert the footer's position as a sibling of `.app-body`] → Update `Footer.test.tsx` / any App layout tests to reflect the new location.
- [`←` in RTL contexts] → Not a concern; app is ES/EN only, both LTR.

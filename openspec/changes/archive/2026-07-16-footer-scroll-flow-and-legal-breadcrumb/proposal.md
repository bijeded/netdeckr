## Why

The recently added footer is a permanently-pinned element at the bottom of the app shell, so it reserves fixed vertical space on every view — noticeably cramped on mobile, where two rows (links + toggle, then the legal legend) eat into a short viewport. Separately, the How It Works and Privacy Policy pages only offer the topbar logo as a way back to the dashboard, which isn't an obvious affordance; a breadcrumb-style back button above the title makes the exit explicit.

## What Changes

- Move the footer from a permanently-pinned sibling of the topbar/body into the end of the scrolling main content area, so it flows after the content and is reached by scrolling rather than always occupying the bottom of the viewport. No sticky/fixed behavior — users scroll to see it. This frees vertical space on mobile.
- Add a breadcrumb-style "← Ir al dashboard" / "← Go to dashboard" button above the title on both legal pages, wired to return to the dashboard (clear the `page` param). This is in addition to the existing topbar-logo path.
- Add the `←` glyph to the app's design vocabulary (CLAUDE.md), which currently lists only `→` among its arrows.
- Add a localized i18n pair `legal.backToDashboard` (ES/EN).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `site-footer`: the footer is no longer rendered as a sibling of the topbar and main content that is always visible at the bottom of the shell; it is rendered at the end of the scrolling main content area and reached by scrolling.
- `legal-pages`: legal pages gain an explicit, always-present breadcrumb "back to dashboard" control above the page title, in addition to the topbar logo.

## Impact

- `src/App.tsx` — footer relocated into `.app-main`; new `onBack` prop passed to `LegalPage`.
- `src/components/LegalPage.tsx` — new breadcrumb back button above the title, new `onBack` prop.
- `src/styles/dashboard.css` — footer no longer spans the full shell width (now within the content column); new breadcrumb button styles.
- `src/locales/en.json`, `src/locales/es.json` — new `legal.backToDashboard` key.
- `CLAUDE.md` — add `←` to the design glyph vocabulary.
- Tests: `Footer.test.tsx`, `LegalPage.test.tsx`, and any App-level layout assertions.

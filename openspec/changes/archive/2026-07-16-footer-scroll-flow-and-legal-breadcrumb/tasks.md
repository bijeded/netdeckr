## 1. Footer scroll flow

- [x] 1.1 In `src/App.tsx`, move `<Footer onNavigate={setPage} />` from a sibling of `.app-body` to the last child of `main.app-main`, after `.app-content`, so it renders on both dashboard and legal-page views.
- [x] 1.2 In `src/styles/dashboard.css`, scope `.app-footer` to the content column (it no longer spans the full shell); confirm the `border-top` divider and padding read correctly at the end of scrolling content.
- [x] 1.3 Verify at a narrow (mobile) width that the footer no longer reserves fixed bottom space and appears only on scroll to the bottom.
- [x] 1.4 Update `Footer.test.tsx` and any App-level layout tests to reflect the footer's new location within `.app-main`.

## 2. Legal-page breadcrumb

- [x] 2.1 Add `legal.backToDashboard` to `src/locales/en.json` ("Go to dashboard") and `src/locales/es.json` ("Ir al dashboard").
- [x] 2.2 In `src/components/LegalPage.tsx`, add an `onBack: () => void` prop and render a breadcrumb-style button above `.legal-page-title` with label `← ` + `t('legal.backToDashboard')`, calling `onBack` on click.
- [x] 2.3 In `src/App.tsx`, pass `onBack={() => setPage(null)}` to `<LegalPage />`.
- [x] 2.4 Add breadcrumb button styles to `src/styles/dashboard.css` (subtle, secondary-text, above the title).
- [x] 2.5 Update `LegalPage.test.tsx`: breadcrumb renders localized label with `←`, and clicking it invokes `onBack`.

## 3. Design vocabulary

- [x] 3.1 Add the `←` glyph to the design glyph vocabulary line in `CLAUDE.md` (currently lists `≡ ✕ ⬇ ▲ ▼ – ✓ →`).

## 4. Verify

- [x] 4.1 Run `npm run lint`, `npm run type-check`, and `npm run test`; confirm all pass.
- [x] 4.2 Manually verify in the dev server: footer flows at content end on dashboard and both legal pages; breadcrumb returns to the dashboard in both locales with `f`/`w` state intact.

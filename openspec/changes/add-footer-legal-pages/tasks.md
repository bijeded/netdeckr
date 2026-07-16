## 1. Content module foundation

- [x] 1.1 Add `src/content/legal/types.ts` defining the `Section` type (`heading` | `paragraph` | `list` | `link`)
- [x] 1.2 Add `src/content/legal/parity.test.ts` asserting each locale pair (`howItWorks.en`/`howItWorks.es`, `privacy.en`/`privacy.es`) has matching section-type sequences, mirroring the existing `src/locales/parity.test.ts` approach

## 2. Navigation hook

- [x] 2.1 Add `src/hooks/useLegalPage.ts`: reads `?page=` (`'how-it-works' | 'privacy' | null`), exposes a setter that uses `pushState` (preserving other params) and a `popstate` listener, following `useFormatSelection.ts`/`useWindowSelection.ts` conventions
- [x] 2.2 Add `src/hooks/useLegalPage.test.ts` covering: reading an existing `?page=` value, setting/clearing it preserves `f`/`w`, invalid/missing values resolve to `null`, back/forward via `popstate` updates state

## 3. Footer component

- [x] 3.1 Add `src/components/Footer.tsx`: renders the "How it works" / "Privacy policy" links (localized via `t()`), the relocated `LanguageToggle`, and the Wizards Fan Content Policy legend (localized via `t()`)
- [x] 3.2 Add `en.json`/`es.json` keys for the footer's link labels and the Wizards Fan Content Policy legend text
- [x] 3.3 Add `src/components/Footer.test.tsx` covering: both links render and call the navigation setter with the right page value, language toggle renders and switches locale, legend text renders in the current locale
- [x] 3.4 Style the footer per design tokens (Sora/IBM Plex Sans, spacing rhythm, dark canvas) with a responsive layout that stacks/wraps at narrow widths

## 4. Shared legal-page renderer

- [x] 4.1 Add `src/components/LegalPage.tsx`: takes a `title` and `sections: Section[]`, renders heading/paragraph/list/link section types with design-token styling
- [x] 4.2 Add `src/components/LegalPage.test.tsx` covering rendering of each section type, including that `link` sections render an anchor with the given `href`

## 5. How It Works content

- [x] 5.1 Write `src/content/legal/howItWorks.en.ts`: plain-language (13-year-old-readable) explanation of how MetaStack processes public MTGTop8 tournament data and Scryfall card data into patterns/statistics, states there are no user accounts and nothing personal is collected from visitors, a "Built by DMM Studios" link section to https://studiosdmm.com.mx/, and a Scryfall data/image credit line
- [x] 5.2 Write `src/content/legal/howItWorks.es.ts` mirroring the English content's section structure

## 6. Privacy Policy content

- [x] 6.1 Write `src/content/legal/privacy.en.ts`: present-tense Vercel Analytics disclosure (cookieless/privacy-friendly), planned-error-tracking disclosure (no vendor named), future-tense possible-advertising disclosure (provider TBD, policy will be updated), no-accounts/no-personal-data-collection statement, anonymous/read-only Supabase access note, and a note that MTGTop8/Scryfall data is public data not personal data about visitors
- [x] 6.2 Write `src/content/legal/privacy.es.ts` mirroring the English content's section structure

## 7. App shell integration

- [x] 7.1 Wire `useLegalPage` into `App.tsx`; when a legal page is active, render `<LegalPage>` with the matching locale's content module in place of the dashboard's `<main>` body
- [x] 7.2 Hide the `<aside className="sidebar">` (and its toggle affordance) whenever a legal page is active; keep the topbar and render the new `<Footer>` unconditionally
- [x] 7.3 Remove `LanguageToggle` from `.sidebar-inner` (now owned by `Footer`)
- [x] 7.4 Update `App.test.tsx` (and add cases as needed) covering: footer renders on the dashboard, navigating via the footer links swaps to each legal page, sidebar is absent while a legal page is active, topbar/format switcher still renders, `f`/`w` params survive a round trip through a legal page, browser back returns to the dashboard

## 8. Verification

- [x] 8.1 Run `npm run test`, `npm run lint`, `npm run type-check` and fix any failures
- [x] 8.2 Manually verify in the dev server: both footer links navigate correctly, deep-linking to `?page=privacy` and `?page=how-it-works` works directly, language toggle switches both legal pages' content, layout is legible at a narrow (mobile) viewport width, and browser back/forward behaves correctly

## 9. Review feedback (PR #145)

- [x] 9.1 Thin down the footer bar (reduced vertical padding and inter-row gap)
- [x] 9.2 Rewrite How It Works in plain, non-condescending language throughout
- [x] 9.3 "Where the information comes from": drop "the scraper" as a named actor — "twice a day, we visit MTGTop8 and read those public results"; keep the Scryfall paragraph's content but say "we" instead of "the scraper"
- [x] 9.4 "What MetaStack does with it": replace the "counts things" framing with a real explanation of what the app does, plus a one-sentence explanation of how Tier is decided (Power Score, not popularity), and what each dashboard data point means (stat cards, metagame share, share delta, tier + tier trend arrow, the top-cards tables); remove the "just math... nothing more mysterious than that" line
- [x] 9.5 Extend `Section`'s paragraph type to carry `Segment[]` (plain text / external link / internal link) so a link can apply to only part of a sentence, and add a `note` section type for the Privacy Policy's date stamp; update `LegalPage` to render segments (external links as new-tab `<a>`, internal links as a button calling the page's `onNavigate`) and the `note` type
- [x] 9.6 "What we know about you": link only the words "Privacy Policy" (internal navigation, not a full reload) to the Privacy Policy page
- [x] 9.7 "Who made this": link only the words "DMM Studios", not the whole sentence
- [x] 9.8 "Credits": remove the "see the notice in the footer for details" sentence
- [x] 9.9 Privacy Policy: rename the Analytics disclosure to stop naming the vendor/platform — describe it generically as "analytics"
- [x] 9.10 Privacy Policy: add a "Last changed: DD-MM-YYYY" note at the end of the page, styled distinctly from body copy
- [x] 9.11 Update `specs/legal-pages/spec.md`, `design.md`, and `proposal.md` to match the revised content model and requirements
- [x] 9.12 Re-run `npm run test`, `npm run lint`, `npm run type-check`, and re-verify in the dev server

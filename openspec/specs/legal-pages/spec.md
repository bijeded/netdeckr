# legal-pages

## Purpose
The How It Works and Privacy Policy pages: URL-addressable via a `?page=` query param (no router — extends the app's existing hand-rolled `?f=`/`?w=` URL-sync pattern), sharing the dashboard's topbar/footer chrome while hiding the filter sidebar, with an explicit way back to the dashboard. Long-form content is authored as typed, per-locale `Section[]` modules (kept out of `en.json`/`es.json`) and rendered through one shared `LegalPage` component.

## Requirements

### Requirement: URL-addressable legal pages

The app SHALL expose the How It Works page and the Privacy Policy page via a `?page=` query param (`how-it-works` or `privacy`), following the existing URL-sync pattern used by the format (`?f=`) and time-window (`?w=`) selections: read from and written to `URLSearchParams`, synced via the History API, and kept in sync with browser back/forward navigation. Setting or clearing `?page=` SHALL preserve any other existing query params (e.g. `f`, `w`).

#### Scenario: Deep link to a legal page
- **WHEN** a user loads the app at a URL containing `?page=privacy`
- **THEN** the Privacy Policy page renders directly, without requiring the user to click through the footer first

#### Scenario: Other params preserved
- **WHEN** the user is on `?f=modern&w=5days` and navigates to the How It Works page
- **THEN** the resulting URL retains `f=modern&w=5days` alongside `page=how-it-works`

#### Scenario: Back button returns to the dashboard
- **WHEN** the user navigates from the dashboard to a legal page and then uses the browser back button
- **THEN** the app returns to the dashboard view (the `page` param is removed, prior `f`/`w` state intact)

#### Scenario: Invalid or missing page param
- **WHEN** `?page=` is absent, empty, or holds a value other than `how-it-works` or `privacy`
- **THEN** the app renders the normal dashboard

### Requirement: Legal-page shell chrome

When a legal page is active, the app SHALL keep the topbar (logo and format switcher) and the footer rendered as on the dashboard, and SHALL NOT render the filter sidebar (window/event/archetype/tier selectors and the clear-filters button).

#### Scenario: Topbar and footer unchanged
- **WHEN** a legal page is active
- **THEN** the topbar and footer render identically to how they render on the dashboard

#### Scenario: Sidebar hidden
- **WHEN** a legal page is active
- **THEN** the filter sidebar (and its toggle affordance) is not rendered

### Requirement: Return to the dashboard from a legal page

The app SHALL provide an explicit, always-visible way to leave a legal page and return to the dashboard, independent of the browser's back button. Activating the topbar logo/title SHALL clear the `page` param and return to the dashboard. In addition, each legal page SHALL render a breadcrumb-style "back to dashboard" button above the page title, labeled with a leading `←` glyph and localized text (ES "Ir al dashboard" / EN "Go to dashboard"); activating it SHALL clear the `page` param and return to the dashboard via client-side navigation (no full reload).

#### Scenario: Logo returns to the dashboard
- **WHEN** a legal page is active and the user activates the topbar logo/title
- **THEN** the app returns to the dashboard (the `page` param is cleared) and the filter sidebar reappears

#### Scenario: Breadcrumb button returns to the dashboard
- **WHEN** a legal page is active and the user activates the "← Ir al dashboard" / "← Go to dashboard" breadcrumb button above the title
- **THEN** the app returns to the dashboard (the `page` param is cleared) via client-side navigation, with prior `f`/`w` state intact

#### Scenario: Breadcrumb localized
- **WHEN** a legal page is displayed in Spanish or English
- **THEN** the breadcrumb button reads "← Ir al dashboard" or "← Go to dashboard" respectively

### Requirement: Typed per-locale legal content

Each legal page's long-form content SHALL be authored as a typed `Section[]` (heading, paragraph, list, or link entries) in a dedicated per-locale content module (not in `en.json`/`es.json`, not in Markdown), and rendered through one shared legal-page component shared by both pages. The active locale's module SHALL be selected based on the current i18next language.

#### Scenario: Locale switch re-renders content
- **WHEN** the user switches the UI language while a legal page is open
- **THEN** the page re-renders using that locale's content module, with the same section structure

#### Scenario: Shared renderer
- **WHEN** either legal page is displayed
- **THEN** both are rendered through the same legal-page component, driven by that page's `Section[]` data

### Requirement: How It Works content

The How It Works page SHALL explain, in plain, direct language (not condescending, not aimed below the reader), how Netdeckr processes information: that it periodically reads publicly available tournament results from MTGTop8 and publicly available card data from Scryfall, and turns that into the metagame view shown on the dashboard. It SHALL explain, in accessible terms, what each dashboard data point means — the Events/Archetypes/Decks stat cards, metagame share, share delta, the Tier classification (including a one-sentence explanation of how Tier is decided, distinct from popularity), the tier trend arrow, the Top Creatures/Top Spells/Top Sideboard Cards/Top New Cards tables, and each value those tables show per card: Avg (average copies in the decks that run it), Copies (total copies across the decks in view), Decks (the share of decks in view that run it) and Trend (how that share changed versus the previous period of the same length). It SHALL state that Netdeckr has no user accounts and does not collect anything personal from visitors, with an inline link on the words "Privacy Policy" that navigates to the Privacy Policy page. It SHALL credit DMM Studios as the site's developer, with the link applied only to the words "DMM Studios" (not the surrounding sentence). It SHALL include a Scryfall data/image credit line, without a cross-reference to the footer notice.

#### Scenario: Plain-language data explanation
- **WHEN** the How It Works page is displayed
- **THEN** it explains, in plain and respectful (not childish) language, that Netdeckr reads public tournament and card data and turns it into the dashboard's metagame view, and that it has no accounts and collects nothing personal from visitors

#### Scenario: Dashboard data points explained
- **WHEN** the How It Works page is displayed
- **THEN** it explains what the stat cards, metagame share, share delta, Tier (including how Tier is decided in one sentence), the tier trend arrow, and the Top Creatures/Top Spells/Top Sideboard Cards/Top New Cards tables each mean

#### Scenario: Trending table values explained
- **WHEN** the How It Works page is displayed in English or Spanish
- **THEN** it explains what Avg, Copies, Decks and Trend mean in the trending tables, notes that the tables are ranked by Copies, and does not mention a set code on Top New Cards

#### Scenario: Inline link to the Privacy Policy
- **WHEN** the How It Works page is displayed
- **THEN** the words "Privacy Policy" within the "what we know about you" section are a link that navigates to the Privacy Policy page, without a full page reload

#### Scenario: DMM Studios and Stackeados credit
- **WHEN** the How It Works page is displayed
- **THEN** it credits DMM Studios as the site's developer (link applied only to the words "DMM Studios", linking to https://studiosdmm.com.mx/) and Stackeados, a Mexican Spanish-language Magic: The Gathering podcast, as who the site was built for (link applied only to the word "Stackeados", linking to https://www.youtube.com/@stackeados)

#### Scenario: Scryfall credit
- **WHEN** the How It Works page is displayed
- **THEN** it includes a credit line for card images and data sourced via Scryfall

### Requirement: How It Works explains the Analysis tab
The How It Works page SHALL include a section on the archetype Analysis tab, in English and Spanish and in the page's plain language. The section SHALL state the tab's fixed scope, then explain each part of the tab, naming each part as the tab labels it in that locale.

#### Scenario: Fixed scope is explained
- **WHEN** the How It Works page is displayed in English or Spanish
- **THEN** the Analysis tab section says the tab always covers the last 2 weeks and all events, and that the sidebar's time frame, event, event size, and tier filters do not change it

#### Scenario: Each part of the tab is explained
- **WHEN** the How It Works page is displayed in English or Spanish
- **THEN** the section has one entry each for the stock list, Power Score, the performance figures, the consensus bands, the sideboard plan, card types, Arena wildcards, and the small-sample label, each starting with that part's on-screen name

#### Scenario: Stock list and Power Score are explained
- **WHEN** the reader looks up the stock list and Power Score
- **THEN** the stock list entry says cards are ranked by how many decks play them, weighted so deeper finishes at bigger events count more, and placed at their most common copy count; and the Power Score entry says it is the performance score behind the Tier

#### Scenario: Bands and wildcards are explained
- **WHEN** the reader looks up the consensus bands and Arena wildcards
- **THEN** the bands entry gives the Core (90% or more of decks), Flex (25% or more), and Spicy (under 25%) thresholds, and the wildcards entry says it applies to Standard and Pioneer only, excludes basic lands, and is an approximation based on each card's printed rarity

#### Scenario: Small sample is explained
- **WHEN** the reader looks up the small-sample label
- **THEN** its entry says it appears when the archetype has fewer than 5 decks and that those numbers should be read loosely

#### Scenario: Both locales keep the same structure
- **WHEN** the English and Spanish How It Works pages are compared
- **THEN** they have the same sequence of section types, including the Analysis tab section

### Requirement: Privacy Policy content

The Privacy Policy page SHALL disclose Netdeckr's data practices, distinguishing what is currently live from what is planned: analytics (described in present tense, as cookieless/privacy-friendly and currently in use, without naming the underlying vendor/platform), error tracking (described as planned/intended without naming a specific unconfirmed vendor), and potential future advertising (described in future tense, noting the provider is not yet determined and that the policy will be updated when finalized). It SHALL state that Netdeckr has no user accounts, collects no personal data beyond aggregate analytics, and that its Supabase data access is anonymous/read-only. It SHALL note that the underlying tournament and card data (MTGTop8, Scryfall) is public data, not personal data about site visitors. It SHALL end with a "Last changed" date stamp.

#### Scenario: Present-tense analytics disclosure
- **WHEN** the Privacy Policy page is displayed
- **THEN** it states that analytics is currently used and describes it as cookieless/privacy-friendly, without naming a specific vendor/platform

#### Scenario: Planned error tracking disclosure
- **WHEN** the Privacy Policy page is displayed
- **THEN** it states that error tracking is used/planned to help fix bugs, without naming a specific vendor as already integrated

#### Scenario: Future advertising disclosure
- **WHEN** the Privacy Policy page is displayed
- **THEN** it states, in future tense, that advertising may be added later via a provider not yet determined, and that this policy will be updated if so

#### Scenario: No accounts, no personal data collection
- **WHEN** the Privacy Policy page is displayed
- **THEN** it states there are no user accounts and no personal data is collected from visitors beyond aggregate analytics, and that Supabase access from the browser is anonymous/read-only

#### Scenario: Last-changed date stamp
- **WHEN** the Privacy Policy page is displayed
- **THEN** a "Last changed" date stamp is shown at the end of the page, styled distinctly from body copy

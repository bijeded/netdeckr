## ADDED Requirements

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

### Requirement: Typed per-locale legal content

Each legal page's long-form content SHALL be authored as a typed `Section[]` (heading, paragraph, list, or link entries) in a dedicated per-locale content module (not in `en.json`/`es.json`, not in Markdown), and rendered through one shared legal-page component shared by both pages. The active locale's module SHALL be selected based on the current i18next language.

#### Scenario: Locale switch re-renders content
- **WHEN** the user switches the UI language while a legal page is open
- **THEN** the page re-renders using that locale's content module, with the same section structure

#### Scenario: Shared renderer
- **WHEN** either legal page is displayed
- **THEN** both are rendered through the same legal-page component, driven by that page's `Section[]` data

### Requirement: How It Works content

The How It Works page SHALL explain, in plain language understandable to a 13-year-old, how MetaStack processes information: that it reads publicly available tournament results (via a scraper from MTGTop8) and publicly available card data (via Scryfall), and shows patterns and statistics derived from that data. It SHALL state that MetaStack has no user accounts and does not collect anything personal from visitors themselves. It SHALL credit DMM Studios as the site's developer with a link to their website, and SHALL include a Scryfall data/image credit line.

#### Scenario: Plain-language data explanation
- **WHEN** the How It Works page is displayed
- **THEN** it explains, without technical jargon, that MetaStack reads public tournament and card data and shows patterns derived from it, and that it has no accounts and collects nothing personal from visitors

#### Scenario: DMM Studios credit
- **WHEN** the How It Works page is displayed
- **THEN** it includes a "Built by DMM Studios" credit with a link to https://studiosdmm.com.mx/

#### Scenario: Scryfall credit
- **WHEN** the How It Works page is displayed
- **THEN** it includes a credit line for card images and data sourced via Scryfall

### Requirement: Privacy Policy content

The Privacy Policy page SHALL disclose MetaStack's data practices, distinguishing what is currently live from what is planned: Vercel Analytics (described in present tense, as cookieless/privacy-friendly and currently in use), error tracking (described as planned/intended without naming a specific unconfirmed vendor), and potential future advertising (described in future tense, noting the provider is not yet determined and that the policy will be updated when finalized). It SHALL state that MetaStack has no user accounts, collects no personal data beyond aggregate analytics, and that its Supabase data access is anonymous/read-only. It SHALL note that the underlying tournament and card data (MTGTop8, Scryfall) is public data, not personal data about site visitors.

#### Scenario: Present-tense analytics disclosure
- **WHEN** the Privacy Policy page is displayed
- **THEN** it states that Vercel Analytics is currently used and describes it as cookieless/privacy-friendly

#### Scenario: Planned error tracking disclosure
- **WHEN** the Privacy Policy page is displayed
- **THEN** it states that error tracking is used/planned to help fix bugs, without naming a specific vendor as already integrated

#### Scenario: Future advertising disclosure
- **WHEN** the Privacy Policy page is displayed
- **THEN** it states, in future tense, that advertising may be added later via a provider not yet determined, and that this policy will be updated if so

#### Scenario: No accounts, no personal data collection
- **WHEN** the Privacy Policy page is displayed
- **THEN** it states there are no user accounts and no personal data is collected from visitors beyond aggregate analytics, and that Supabase access from the browser is anonymous/read-only

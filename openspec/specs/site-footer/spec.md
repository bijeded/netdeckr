# site-footer

## Purpose
The app footer: links to the How It Works and Privacy Policy pages, the EN/ES language toggle (relocated here from the filter sidebar so it stays reachable when the sidebar is hidden on legal pages), and the required Wizards of the Coast Fan Content Policy attribution legend. Rendered once, at the end of the scrolling main content, visible on both the dashboard and any legal page, and responsive at mobile widths.

## Requirements

### Requirement: Persistent footer

The app SHALL render a footer that is present both on the main dashboard and on any legal page (`?page=how-it-works`, `?page=privacy`). The footer SHALL be rendered once, at the end of the scrolling main content area (not as a permanently-pinned element at the bottom of the app shell), so it flows after the content and is reached by scrolling to the bottom rather than always occupying the bottom of the viewport. It SHALL still be rendered once, not duplicated per view.

#### Scenario: Footer present on dashboard
- **WHEN** no `?page=` param is set (the dashboard is showing)
- **THEN** the footer is rendered at the end of the dashboard's scrolling main content

#### Scenario: Footer present on legal pages
- **WHEN** `?page=how-it-works` or `?page=privacy` is set
- **THEN** the footer is still rendered, unchanged, at the end of the legal page's scrolling content

#### Scenario: Footer does not reserve fixed viewport space
- **WHEN** the app is viewed at a narrow (mobile) width with content taller than the viewport
- **THEN** the footer is not pinned to the bottom of the viewport and does not reserve fixed vertical space; it becomes visible when the user scrolls to the bottom of the content

### Requirement: Footer navigation links

The footer SHALL contain a "How it works" link and a "Privacy policy" link, both localized (ES/EN) via the existing react-i18next convention. Activating a link SHALL navigate to the corresponding legal page without a full page reload.

#### Scenario: How it works link
- **WHEN** the user activates the "How it works" / "Cómo funciona" footer link
- **THEN** the app navigates to the How It Works page via client-side navigation (no full reload)

#### Scenario: Privacy policy link
- **WHEN** the user activates the "Privacy policy" / "Política de privacidad" footer link
- **THEN** the app navigates to the Privacy Policy page via client-side navigation (no full reload)

### Requirement: Language toggle lives in the footer

The language toggle (EN/ES) SHALL be rendered in the footer, not in the filter sidebar, so it remains reachable when the sidebar is hidden (on legal pages). It SHALL behave exactly as the existing sidebar-hosted toggle did (same component, same `i18n.changeLanguage` behavior).

#### Scenario: Toggle reachable on the dashboard
- **WHEN** the dashboard is showing
- **THEN** the language toggle is present in the footer (not in the sidebar)

#### Scenario: Toggle reachable on a legal page
- **WHEN** a legal page is showing (sidebar hidden)
- **THEN** the language toggle is still present, in the footer, and switching language re-renders the current legal page's content in the new locale

### Requirement: Wizards of the Coast Fan Content Policy legend

The footer SHALL display the Wizards of the Coast Fan Content Policy attribution legend, using Wizards' required template filled in for MetaStack: "MetaStack is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC." (localized ES/EN, preserving the required legal terms — "unofficial," "not approved/endorsed" — in both locales). It SHALL NOT reproduce another site's footer wording verbatim.

#### Scenario: Legend present on every view
- **WHEN** the app renders the footer, on the dashboard or any legal page
- **THEN** the Wizards Fan Content Policy legend is visible in the footer, in the current locale

### Requirement: Responsive footer

The footer SHALL remain legible and usable at narrow (mobile) viewport widths, consistent with the app's existing responsive convention (filter panel collapses on mobile). The navigation links ("How it works", "Privacy policy") and the language toggle SHALL stay on the same row/level as each other at mobile widths, not stacked into separate rows; the legal legend wraps onto its own line below.

#### Scenario: Narrow viewport
- **WHEN** the app is viewed at a narrow (mobile) width
- **THEN** the footer's links, language toggle, and legal legend remain legible and tappable, and the links and language toggle stay on the same row rather than stacking into separate rows

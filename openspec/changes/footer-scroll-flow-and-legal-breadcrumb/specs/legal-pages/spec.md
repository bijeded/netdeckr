## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Topbar app subtitle

The topbar SHALL display a localized subtitle "MTG Metagame Snapshot" (same text in both locales — it is an MTG proper-noun-style tagline) directly beneath the "MetaStack" wordmark, styled as secondary/muted text distinct from the wordmark. The subtitle SHALL sit within the topbar logo cluster (not under the format `<h1>` title) and SHALL be provided via react-i18next (`app.subtitle`).

#### Scenario: Subtitle renders under the wordmark
- **WHEN** the dashboard loads
- **THEN** "MTG Metagame Snapshot" is shown directly below the "MetaStack" wordmark in the topbar

#### Scenario: Subtitle comes from i18n
- **WHEN** the UI language is switched between English and Spanish
- **THEN** the subtitle text is resolved through react-i18next (no hardcoded string) and renders consistently

### Requirement: Language selector placement in the sidebar

The language selector (EN/ES toggle) SHALL be located at the **bottom of the filter sidebar**, after the "Clear filters" control, visually detached from the filter groups (not presented as one of the filters). It SHALL NOT appear in the topbar. The selector SHALL remain fully localized and keyboard-operable, and switching languages SHALL update the UI as before.

#### Scenario: Selector lives at the bottom of the sidebar
- **WHEN** the sidebar is open
- **THEN** the language selector appears below the filter groups and the "Clear filters" control, and no language selector is present in the topbar

#### Scenario: Switching language still works from the sidebar
- **WHEN** the user activates the ES or EN control in the sidebar
- **THEN** the interface language changes accordingly

### Requirement: Mobile format-switcher layout

On narrow (mobile) viewports the topbar SHALL place the format-switcher pills in a **single horizontal row below the logo cluster**. When the pills exceed the viewport width they SHALL scroll horizontally within that row **without displaying a horizontal scrollbar**, and SHALL NOT wrap onto multiple lines. On wider viewports the existing single-row topbar layout is retained.

#### Scenario: Pills sit below the logo on mobile
- **WHEN** the viewport is narrow
- **THEN** the format pills render as one row beneath the logo, not wrapped alongside the format title

#### Scenario: Overflowing pills scroll without a visible scrollbar
- **WHEN** the format pills are wider than the viewport on a narrow screen
- **THEN** the row scrolls horizontally to reveal the remaining pills and no horizontal scrollbar is shown

### Requirement: Mobile StatCard strip layout

On narrow (mobile) viewports the header StatCard strip (Events, Archetypes, Decks) SHALL fit its three cards in a **single row below the format title**, reducing each card's padding, minimum width, and value size as needed rather than wrapping onto additional rows. On wider viewports the existing right-aligned strip is retained.

#### Scenario: Three StatCards fit one row on mobile
- **WHEN** the viewport is narrow
- **THEN** the Events, Archetypes, and Decks StatCards render side by side in a single row below the title without wrapping

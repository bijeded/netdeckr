# Spec Delta

## MODIFIED Requirements

### Requirement: Open the archetype's full view from an expanded card
An expanded archetype card that is not already isolated SHALL show a localized "View all lists →" control in its recent-decklists header. Activating it SHALL open the isolated archetype view for that archetype, the same state as selecting it in the Archetype filter, and bring that view's top into sight. The control SHALL stand out from the deck rows' "go to deck →" links and SHALL NOT reuse the share-delta trend colors.

#### Scenario: Control appears on an expanded card
- **WHEN** the user expands an archetype card in the grid with no archetype isolated
- **THEN** the card's recent-decklists header shows a "View all lists →" control (localized)

#### Scenario: Control opens the isolated archetype view
- **WHEN** the user activates "View all lists →" on an expanded archetype card
- **THEN** the dashboard shows the isolated view for that archetype, exactly as if it had been selected in the Archetype filter, with the Archetype filter showing that archetype and the caption naming it

#### Scenario: The isolated view's top is brought into sight
- **WHEN** the user activates "View all lists →" on a card positioned below the top of the grid
- **THEN** the view scrolls so the format header and grid caption of the isolated view are visible

#### Scenario: Control is absent on an already-isolated card
- **WHEN** an archetype is isolated and its card is auto-expanded
- **THEN** its recent-decklists header shows no "View all lists →" control

#### Scenario: Control stands out from the deck-row links
- **WHEN** an expanded card shows both the "View all lists →" control and its deck rows
- **THEN** the control is visibly emphasized relative to the deck rows' "go to deck →" links, and its accent is not the share-delta trend colors

#### Scenario: Control is reachable on mobile
- **WHEN** the viewport is narrow and an archetype card is expanded
- **THEN** the recent-decklists heading and list count stay together on one row, and the "View all lists →" and "Analysis →" controls share their own full-width row beneath them, above the deck rows, without horizontal scrolling and each as a comfortable tap target

## ADDED Requirements

### Requirement: Open the archetype analysis from an expanded card
An expanded archetype card that is not already isolated SHALL show a localized "Analysis →" control beside "View all lists →", in the same pill shape with its own distinct accent. Activating it SHALL open the isolated archetype view for that archetype with the Analysis tab selected, bring that view's top into sight, and add a history entry so Back returns to the grid.

#### Scenario: Analysis control appears beside View all lists
- **WHEN** the user expands an archetype card in the grid with no archetype isolated
- **THEN** the recent-decklists header shows an "Analysis →" control (localized) beside "View all lists →", the same pill shape in a distinct accent that is not the share-delta trend colors

#### Scenario: Analysis control opens the Analysis tab
- **WHEN** the user activates "Analysis →" on an expanded archetype card
- **THEN** the dashboard shows the isolated view for that archetype with the Analysis tab selected, and its top is in sight

#### Scenario: Back returns to the grid
- **WHEN** the user opened the analysis through "Analysis →" and then navigates Back
- **THEN** the grid is shown with no archetype isolated

### Requirement: Isolated view offers a Lists / Analysis tab toggle
While an archetype is isolated, its card's recent-decklists header SHALL show a localized two-option tab toggle, Lists and Analysis, alongside the "← Back" control. Lists SHALL show the deck rows as before; Analysis SHALL show the archetype analysis in their place. Exactly one tab SHALL be selected, and the toggle SHALL be keyboard-operable and expose the selected tab to assistive technology.

#### Scenario: Isolating an archetype defaults to Lists
- **WHEN** an archetype is isolated through "View all lists →" or the Archetype filter
- **THEN** the Lists tab is selected and the deck rows are shown

#### Scenario: Switch to Analysis and back
- **WHEN** the user selects Analysis and then Lists on an isolated archetype
- **THEN** the analysis replaces the deck rows, then the deck rows return

#### Scenario: Toggle is absent outside the isolated view
- **WHEN** an archetype card is expanded in the grid with no archetype isolated
- **THEN** no Lists / Analysis toggle is shown

#### Scenario: Toggle fits narrow viewports
- **WHEN** the viewport is narrow and an archetype is isolated
- **THEN** the "← Back" control and the tab toggle fit without horizontal scrolling, each as a comfortable tap target

### Requirement: Selected tab is persisted in the URL
The Analysis tab SHALL be persisted in the URL as `tab=analysis` alongside `?a=`, and Lists SHALL be represented by the absence of the param. A link carrying `?a=` and `tab=analysis` SHALL open the isolated view on the Analysis tab. An unknown `tab` value, or `tab` without a valid `?a=`, SHALL be removed silently. Clearing the isolated archetype SHALL remove `tab`. Switching tabs SHALL NOT add a history entry.

#### Scenario: Analysis link restores the tab
- **WHEN** the user loads a URL with a valid `?a=` and `tab=analysis`
- **THEN** the isolated view opens on the Analysis tab once data loads

#### Scenario: Invalid tab value falls back to Lists
- **WHEN** the user loads a URL with a valid `?a=` and `tab=stats`
- **THEN** the isolated view opens on the Lists tab and the `tab` param is removed

#### Scenario: Leaving the archetype clears the tab
- **WHEN** the Analysis tab is open and the user activates "← Back" or clears the Archetype filter
- **THEN** both `?a=` and `tab` are removed from the URL

#### Scenario: Tab switches do not stack history
- **WHEN** the user switches between Lists and Analysis several times and then navigates Back
- **THEN** Back leaves the isolated view rather than stepping through each tab switch

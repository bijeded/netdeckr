## Purpose

Tells the user that a ban is why the metagame they are looking at suddenly changed, so a favourite archetype vanishing from the grid reads as a ban rather than a bug, and so a shifted tier is understood to have been recalculated without the banned decks.

## ADDED Requirements

### Requirement: Ban notice appears after a newly detected ban

The dashboard SHALL display a notice for the selected format when that format has at least one banned card whose first-seen date is within the last 3 days. A banned card with no first-seen date (a historical ban) SHALL never trigger the notice.

The notice SHALL be shown above the archetype grid and below the header stat strip, so it is read before the numbers it explains.

#### Scenario: Notice shown within the window

- **WHEN** the selected format has a banned card first seen 0, 1, 2, or 3 days ago
- **THEN** the notice is displayed above the archetype grid

#### Scenario: Notice expires after three days

- **WHEN** the most recent first-seen date for the selected format is more than 3 days old
- **THEN** no notice is displayed, and it never appears for that ban again

#### Scenario: Historical bans do not announce

- **WHEN** a format's banned cards all have no first-seen date
- **THEN** no notice is displayed

#### Scenario: Notice is per format

- **WHEN** one format has a newly detected ban and the user switches to a format that does not
- **THEN** the notice is not displayed for the format without one, and reappears on switching back

### Requirement: Ban notice reports what was hidden and why the figures moved

The notice SHALL name the newly banned cards for the selected format, SHALL report the number of decks hidden from the current view as a deck count, and SHALL state that the tiers and shares shown below are calculated without those decks. It SHALL NOT report a count of hidden archetypes.

The hidden-deck count SHALL be the number of decks excluded from the corpus currently being displayed, so it reflects the selected time frame and any active filters.

All notice text SHALL be localized in Spanish and English, with card names left in English in both locales.

#### Scenario: Notice names the banned cards and the deck count

- **WHEN** the notice is displayed
- **THEN** it names the newly banned cards for that format and reports how many decks are hidden, without naming or counting hidden archetypes

#### Scenario: Notice explains the effect on the figures

- **WHEN** the notice is displayed
- **THEN** it states that the tiers and shares below exclude the hidden decks

#### Scenario: Count follows the current view

- **WHEN** the user changes the time frame or a filter while the notice is displayed
- **THEN** the reported deck count updates to the number of decks excluded from the view now shown

#### Scenario: Zero hidden decks in the current view

- **WHEN** a newly detected ban exists but the currently displayed corpus contains no illegal deck
- **THEN** the notice is still displayed, reporting that no decks are hidden from this view

#### Scenario: Localized copy

- **WHEN** the user views the notice in Spanish or in English
- **THEN** the notice text is in that language, with the card names in English in both

### Requirement: Ban notice is dismissible for the session

The user SHALL be able to dismiss the notice. A dismissal SHALL last for the remainder of the browsing session and SHALL NOT persist beyond it: in a later session, while the ban is still within its 3-day window, the notice SHALL appear again.

#### Scenario: Dismissal hides the notice for the session

- **WHEN** the user dismisses the notice and continues using the dashboard
- **THEN** the notice does not reappear during that session, including after switching format away and back

#### Scenario: Dismissal does not persist across sessions

- **WHEN** the user dismisses the notice, and later returns in a new session while the ban is still within its 3-day window
- **THEN** the notice is displayed again

#### Scenario: Dismissal never resurrects an expired notice

- **WHEN** a new session begins after the ban's 3-day window has elapsed
- **THEN** no notice is displayed regardless of whether it was ever dismissed

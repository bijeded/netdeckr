# Spec Delta

## ADDED Requirements

### Requirement: Decklist modal links the player to their Player view
The decklist modal's player name SHALL be a link that closes the modal and opens that player's Player view (see the `players-view` capability) for the active format, adding a history entry. When the modal was opened from that same player's Player view, the name SHALL render as plain text. A deck with an empty player name SHALL show no link.

#### Scenario: Player name opens the Player view
- **WHEN** the decklist modal is open on the dashboard and the user activates the player name
- **THEN** the modal closes, the Player view for that player opens, and the URL carries `?v=players&p=<name>`

#### Scenario: Back returns to where the modal was opened
- **WHEN** the user opened the Player view from the modal's player name and presses the browser Back button
- **THEN** the previous view is shown again

#### Scenario: Name is plain text in the player's own view
- **WHEN** the decklist modal was opened from a deck row in that player's Player view
- **THEN** the player name is shown as plain text, not a link

#### Scenario: Link is keyboard reachable and localized
- **WHEN** the user tabs through the open decklist modal
- **THEN** the player-name link is focusable, activates with Enter, and carries a localized accessible label naming the destination (e.g. "View Luminati's decks" / "Ver los mazos de Luminati")

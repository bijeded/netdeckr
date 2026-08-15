## MODIFIED Requirements

### Requirement: Card-art preview in the decklist modal
The decklist modal SHALL let the player preview a card's full art from that card's representation in either view — the card name in list view, or the card tile in image view. On a mouse device, hovering that representation SHALL show the card's image in a floating preview near the pointer; on a touch device, touching/pressing it SHALL show it, and tapping away (or releasing) SHALL dismiss it. The image SHALL be hotlinked from Scryfall's CDN and lazy-loaded (fetched only when a card is previewed). The preview SHALL show the card at full-preview size in both views, so a thumbnail tile that is too small to read remains previewable. When a card has no image (a resolution miss), no preview is shown and the interaction is a no-op. The preview SHALL NOT cause layout shift in the decklist and SHALL stay within the viewport.

#### Scenario: Hover shows the card image (mouse)
- **WHEN** the player hovers a card name that has an image URL
- **THEN** a floating preview of that card's full art appears, and it disappears when the pointer leaves

#### Scenario: Touch shows and dismisses the card image (mobile)
- **WHEN** the player touches a card name that has an image URL, then taps elsewhere
- **THEN** the card's art appears on touch and is dismissed on the tap-away

#### Scenario: Card without an image is a no-op
- **WHEN** the player hovers or touches a card name that has no image URL
- **THEN** no preview appears and nothing else changes

#### Scenario: Tile in image view previews the same art
- **WHEN** the player hovers or touches a card tile in the decklist modal's image view and that card has an image URL
- **THEN** the same floating full-art preview appears as it would for that card's name in list view, at full preview size rather than tile size

#### Scenario: Placeholder tile is a no-op
- **WHEN** the player hovers or touches a placeholder tile in image view (a card with no image URL)
- **THEN** no preview appears and nothing else changes

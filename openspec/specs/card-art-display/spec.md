# card-art-display

## Purpose

Show real Magic card art in the UI, hotlinked from Scryfall's CDN: a full-card preview when the player hovers (mouse) or touches (mobile) a card name in the decklist modal, and a representative-card image on each ArchetypeCard (replacing the procedural gradient placeholder), with graceful fallbacks when art is unavailable.

## Requirements

### Requirement: Card-art preview in the decklist modal
The decklist modal SHALL let the player preview a card's full art: on a mouse device, hovering a card name SHALL show that card's image in a floating preview near the pointer; on a touch device, touching/pressing a card name SHALL show it, and tapping away (or releasing) SHALL dismiss it. The image SHALL be hotlinked from Scryfall's CDN and lazy-loaded (fetched only when a card is previewed). When a card has no image (a resolution miss), no preview is shown and the interaction is a no-op. The preview SHALL NOT cause layout shift in the decklist and SHALL stay within the viewport.

#### Scenario: Hover shows the card image (mouse)
- **WHEN** the player hovers a card name that has an image URL
- **THEN** a floating preview of that card's full art appears, and it disappears when the pointer leaves

#### Scenario: Touch shows and dismisses the card image (mobile)
- **WHEN** the player touches a card name that has an image URL, then taps elsewhere
- **THEN** the card's art appears on touch and is dismissed on the tap-away

#### Scenario: Card without an image is a no-op
- **WHEN** the player hovers or touches a card name that has no image URL
- **THEN** no preview appears and nothing else changes

### Requirement: Archetype card shows representative art
The ArchetypeCard SHALL display the archetype's representative-card art when one is available, filling the card's art region (cropped to cover). When the archetype has no art (null), it SHALL fall back to the existing procedural gradient placeholder. Archetype art SHALL be hotlinked from Scryfall's CDN.

#### Scenario: Archetype with art shows the card image
- **WHEN** an archetype has a representative-card art URL
- **THEN** its card renders that art in the art region instead of the gradient placeholder

#### Scenario: Archetype without art falls back to the placeholder
- **WHEN** an archetype has no representative-card art URL
- **THEN** its card renders the existing gradient placeholder

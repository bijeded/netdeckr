## MODIFIED Requirements

### Requirement: Archetype card shows representative art
The ArchetypeCard SHALL display the archetype's signature-card art when one is available, filling the card's art region (cropped to cover). It SHALL prefer the cropped-art image (`art_crop_url`) when present, fall back to the normal image (`art_image_url`) when the crop is absent, and fall back to the existing procedural gradient placeholder when the archetype has neither (both null). Archetype art SHALL be hotlinked from Scryfall's CDN.

#### Scenario: Archetype with cropped art shows the crop
- **WHEN** an archetype has a cropped-art URL
- **THEN** its card renders that cropped art in the art region instead of the normal image or the gradient placeholder

#### Scenario: Archetype with only a normal image shows that image
- **WHEN** an archetype has a normal image URL but no cropped-art URL
- **THEN** its card renders the normal image in the art region

#### Scenario: Archetype without art falls back to the placeholder
- **WHEN** an archetype has neither a cropped-art URL nor a normal image URL
- **THEN** its card renders the existing gradient placeholder

## MODIFIED Requirements

### Requirement: Scraped card names resolve to canonical Scryfall printings
The system SHALL build an index from the bulk data that maps a card name to its canonical Scryfall identity: the canonical card `name`, a non-foil printing's `set_code` and `collector_number`, the printing's `normal`-size image URL (hotlinked from Scryfall's CDN, for card-art display; a multi-face card lacking a top-level image uses the front face's), and additionally the printing's cropped-art (`art_crop`) URL, `type_line`, `rarity`, `cmc`, and set release date (`released_at`) so callers can persist card metadata and choose representative art.

A printing whose `layout` is `reversible_card` SHALL NOT be an eligible candidate for any card. Such printings carry no top-level `type_line` or `cmc`, and are indexed under a doubled name (`"<name> // <name>"`) that would otherwise never be ranked against the plain card's printings — making selection depend on bulk-file ordering and allowing a printing with null metadata to be chosen. Ineligibility SHALL be absolute rather than a ranking demotion, so a `reversible_card` printing is rejected even when it is the only paper printing of that card.

When a card has several eligible non-foil paper printings, the system SHALL choose the printing that most closely resembles a plain, standard printing, ranking candidates by the following priorities in order:
1. **Plain treatment first.** A plain printing SHALL be preferred over any special-treatment printing. A printing is special-treatment if it is a promo, carries `boosterfun` in its promo types, is `full_art`, is `textless`, has `border_color` equal to `borderless`, or carries a `showcase`, `extendedart`, or `inverted` frame effect. Plain treatment SHALL take precedence over both set type and recency (a plain printing in an older set beats a special-treatment printing in a newer set). Border colors other than `borderless` (e.g. black, white, silver, gold) SHALL NOT by themselves make a printing special-treatment. A Universes Beyond crossover marker SHALL NOT by itself make a printing special-treatment: on a wholly-Universes-Beyond set every printing carries it, so it cannot distinguish the plain printing from its alternate-treatment variants; those variants are distinguished by `boosterfun` and the other markers above.
2. **Preferred set types next.** Among printings tied on treatment, the system SHALL prefer a printing from an `expansion` or `core` set over a neutral set type, and SHALL demote `commander`, `draft_innovation`, and `box` set types below neutral ones. The `masters` set type SHALL be neutral: reprint and draft-product sets SHALL NOT outrank a real expansion or core printing on recency alone.
3. **Most recent next.** Among printings tied on treatment and set-type tier, the system SHALL prefer the most recent set release date.
4. **Stable tiebreak.** Set code SHALL be used as a final deterministic tiebreak so selection is independent of bulk-file ordering.

Resolution SHALL match the scraped card name to a Scryfall card name, tolerating the split/double-faced card naming MTGTop8 emits (including its single-slash separator, e.g. resolving `Fire / Ice` or a front-face-only name to the full `Fire // Ice` card). When a scraped name has no confident match, resolution SHALL return no printing (a miss) rather than an incorrect one.

**Whole cards outrank foreign faces.** A scraped name can be claimed by more than one card: a name that is a card's own full name may also appear as some *other* multi-face card's face name (for example `Replenish`, both a standalone Urza's Destiny sorcery and the back face of `Eiganjo Dynastorian // Replenish`). Resolution SHALL rank these claims rather than letting bulk-file ordering decide:
1. A card whose full canonical name matches the scraped name.
2. A multi-face card whose **front** face name matches — this is the form MTGTop8 emits for split, adventure, and double-faced cards.
3. Any other face name of a multi-face card.

A lower-priority claim SHALL NOT displace a higher-priority one regardless of the order the printings appear in the bulk data, and SHALL still resolve when no higher-priority claim exists. Ties within a priority tier SHALL be broken deterministically so resolution is independent of bulk-file ordering.

**Metadata describes the matched face.** When a scraped name matches a face of a multi-face card, the resolved `type_line` SHALL be that face's type line, not the card's combined `"<front> // <back>"` line. The identity columns — canonical `name`, `set_code`, `collector_number`, and the image URLs — SHALL continue to describe the whole card and its selected printing, since that is what identifies the physical card and its Arena export line. A single-face card's type line is unchanged.

#### Scenario: Known card resolves to a printing
- **WHEN** a scraped card name matches a Scryfall card
- **THEN** resolution returns the canonical name, a non-foil set code, a collector number, the printing's image URL, and the printing's cropped-art URL, type line, rarity, converted mana cost, and set release date

#### Scenario: A standalone card is not displaced by another card's face
- **WHEN** a scraped name is both a standalone card's full name and the non-front face name of a different multi-face card
- **THEN** resolution returns the standalone card's identity and printing, regardless of which of the two appears first in the bulk data

#### Scenario: A front face outranks another card's back face
- **WHEN** a scraped name matches one multi-face card's front face and another multi-face card's back face, and no standalone card carries that name
- **THEN** resolution returns the card whose front face matches

#### Scenario: A non-front face still resolves when nothing else claims the name
- **WHEN** a scraped name appears only as a non-front face of a single multi-face card
- **THEN** resolution returns that card rather than a miss

#### Scenario: Type line describes the matched face
- **WHEN** a scraped name matches the sorcery front face of a transforming card whose back face is a creature
- **THEN** the resolved type line is the sorcery face's line alone, and contains no part of the back face's line

#### Scenario: Identity still describes the whole card
- **WHEN** a scraped name matches one face of a multi-face card
- **THEN** the resolved canonical name, set code, collector number, and image URLs are those of the whole card's selected printing, so the Arena export line and card art are unchanged

#### Scenario: Single-face cards are unaffected
- **WHEN** a scraped name matches a single-face card
- **THEN** the resolved type line is that card's own type line, exactly as before

#### Scenario: Reversible printings are never selected
- **WHEN** a card has a plain printing plus a `reversible_card` printing whose `type_line` and `cmc` are null
- **THEN** resolution returns the plain printing, and the resolved type line and converted mana cost are non-null regardless of the order the printings appear in the bulk data

#### Scenario: A card whose only printing is reversible is a miss
- **WHEN** a card's only eligible-looking paper printing has layout `reversible_card`
- **THEN** resolution returns no printing rather than one with a null type line

#### Scenario: Plain printing preferred over promo or crossover
- **WHEN** a card has a plain non-foil printing plus a newer promo or Universes Beyond crossover printing
- **THEN** resolution returns the plain printing's set code and collector number, not the promo or crossover variant

#### Scenario: Plain printing preferred over borderless, showcase, extended-art, full-art, or textless
- **WHEN** a card has a plain non-foil printing plus a special-treatment printing (`full_art`, `textless`, `borderless` border color, or a `showcase`/`extendedart`/`inverted` frame effect), even in the same or a newer set
- **THEN** resolution returns the plain printing's set code, collector number, image URL, and cropped-art URL, not the special-treatment variant

#### Scenario: Plain printing preferred over a booster-fun variant in the same set
- **WHEN** a card has two printings in the same set with the same release date, one plain and one carrying `boosterfun` in its promo types
- **THEN** resolution returns the plain printing, not the booster-fun variant

#### Scenario: Universes Beyond marker alone does not demote a printing
- **WHEN** every printing of a card is from a wholly-Universes-Beyond set and only one of them is plain
- **THEN** resolution returns that plain printing rather than an alternate-treatment printing from the same set

#### Scenario: Plain treatment beats recency
- **WHEN** a card's only newer printings are special-treatment and an older printing is plain
- **THEN** resolution returns the older plain printing rather than a newer special-treatment printing

#### Scenario: Preferred set types beat commander and draft-innovation reprints
- **WHEN** a card has equally-plain printings in both a preferred set (`expansion` or `core`) and a `commander` or `draft_innovation` set
- **THEN** resolution returns the printing from the preferred set

#### Scenario: Preferred set types beat box-product reprints
- **WHEN** a card has equally-plain printings in both a preferred set (`expansion` or `core`) and a `box` set such as a Secret Lair drop
- **THEN** resolution returns the printing from the preferred set

#### Scenario: Masters reprints do not outrank an expansion printing
- **WHEN** a card has a plain `expansion` printing and a plain, more recent `masters` printing
- **THEN** resolution returns the `expansion` printing

#### Scenario: Demoted set types are still selected when nothing else exists
- **WHEN** a card's only eligible printing is from a `box`, `commander`, or `draft_innovation` set
- **THEN** resolution returns that printing rather than a miss

#### Scenario: Non-borderless border colors remain eligible
- **WHEN** a card's best plain candidate has a white, silver, or gold border and is otherwise plain
- **THEN** it is treated as plain and is not demoted for its border color

#### Scenario: Signature-card art follows the same selection
- **WHEN** an archetype's signature card is resolved to a printing for its art
- **THEN** it uses the same printing-selection ranking, so signature-card art reflects a plain printing rather than a special-treatment variant

#### Scenario: Split or double-faced name resolves to the full card
- **WHEN** a scraped card name is a front-face-only, single-slash, or partial form of a multi-face Scryfall card
- **THEN** resolution returns the full card's canonical identity

#### Scenario: Unknown card is a miss
- **WHEN** a scraped card name matches no Scryfall card
- **THEN** resolution returns no printing and the caller leaves the Scryfall columns null

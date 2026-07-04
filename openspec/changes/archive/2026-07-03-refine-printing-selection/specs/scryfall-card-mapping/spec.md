## MODIFIED Requirements

### Requirement: Scraped card names resolve to canonical Scryfall printings
The system SHALL build an index from the bulk data that maps a card name to its canonical Scryfall identity: the canonical card `name`, a non-foil printing's `set_code` and `collector_number`, the printing's `normal`-size image URL (hotlinked from Scryfall's CDN, for card-art display; a multi-face card lacking a top-level image uses the front face's), and additionally the printing's cropped-art (`art_crop`) URL, `type_line`, `rarity`, `cmc`, and set release date (`released_at`) so callers can persist card metadata and choose representative art.

When a card has several non-foil paper printings, the system SHALL choose the printing that most closely resembles a plain, standard printing, ranking candidates by the following priorities in order:
1. **Plain treatment first.** A plain printing SHALL be preferred over any special-treatment printing. A printing is special-treatment if it is a promo, a Universes Beyond crossover, `full_art`, `textless`, has `border_color` equal to `borderless`, or carries a `showcase`, `extendedart`, or `inverted` frame effect. Plain treatment SHALL take precedence over both set type and recency (a plain printing in an older set beats a special-treatment printing in a newer set). Border colors other than `borderless` (e.g. black, white, silver, gold) SHALL NOT by themselves make a printing special-treatment.
2. **Preferred set types next.** Among printings tied on treatment, the system SHALL prefer a printing from an `expansion`, `core`, or `masters` set over a neutral set type, and SHALL demote `commander` and `draft_innovation` set types below neutral ones.
3. **Most recent next.** Among printings tied on treatment and set-type tier, the system SHALL prefer the most recent set release date.
4. **Stable tiebreak.** Set code SHALL be used as a final deterministic tiebreak so selection is independent of bulk-file ordering.

Resolution SHALL match the scraped card name to a Scryfall card name, tolerating the split/double-faced card naming MTGTop8 emits (including its single-slash separator, e.g. resolving `Fire / Ice` or a front-face-only name to the full `Fire // Ice` card). When a scraped name has no confident match, resolution SHALL return no printing (a miss) rather than an incorrect one.

#### Scenario: Known card resolves to a printing
- **WHEN** a scraped card name matches a Scryfall card
- **THEN** resolution returns the canonical name, a non-foil set code, a collector number, the printing's image URL, and the printing's cropped-art URL, type line, rarity, converted mana cost, and set release date

#### Scenario: Plain printing preferred over promo or crossover
- **WHEN** a card has a plain non-foil printing plus a newer promo or Universes Beyond crossover printing
- **THEN** resolution returns the plain printing's set code and collector number, not the promo or crossover variant

#### Scenario: Plain printing preferred over borderless, showcase, extended-art, full-art, or textless
- **WHEN** a card has a plain non-foil printing plus a special-treatment printing (`full_art`, `textless`, `borderless` border color, or a `showcase`/`extendedart`/`inverted` frame effect), even in the same or a newer set
- **THEN** resolution returns the plain printing's set code, collector number, image URL, and cropped-art URL, not the special-treatment variant

#### Scenario: Plain treatment beats recency
- **WHEN** a card's only newer printings are special-treatment and an older printing is plain
- **THEN** resolution returns the older plain printing rather than a newer special-treatment printing

#### Scenario: Preferred set types beat commander and draft-innovation reprints
- **WHEN** a card has equally-plain printings in both a preferred set (`expansion`, `core`, or `masters`) and a `commander` or `draft_innovation` set
- **THEN** resolution returns the printing from the preferred set

#### Scenario: Non-borderless border colors remain eligible
- **WHEN** a card's best plain candidate has a white, silver, or gold border and is otherwise plain
- **THEN** it is treated as plain and is not demoted for its border color

#### Scenario: Split or double-faced name resolves to the full card
- **WHEN** a scraped card name is a front-face-only, single-slash, or partial form of a multi-face Scryfall card
- **THEN** resolution returns the full card's canonical identity

#### Scenario: Unknown card is a miss
- **WHEN** a scraped card name matches no Scryfall card
- **THEN** resolution returns no printing and the caller leaves the Scryfall columns null

#### Scenario: Signature-card art follows the same selection
- **WHEN** an archetype's signature card is resolved to a printing for its art
- **THEN** it uses the same printing-selection ranking, so signature-card art reflects a plain printing rather than a special-treatment variant

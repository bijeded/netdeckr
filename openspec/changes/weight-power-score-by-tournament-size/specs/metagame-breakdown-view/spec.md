## ADDED Requirements

### Requirement: Tournament-size weighting of the Power Score
The Power Score SHALL weight each deck's finish by the size of the tournament it came from, so that a given finish contributes **more effective statistical observations** when it was earned at a larger tournament and fewer when earned at a smaller one. Concretely, a finish's contribution to the uncertainty adjustment's effective sample SHALL scale with its event's player count, so an equal finish quality proven across larger fields yields a higher (less-shrunken) Power Score than the same finish quality earned only at tiny events. A deck whose event has **no recorded player count** SHALL be weighted as a **small event** (a conservative small-size default), and SHALL NOT be dropped from scoring. Size weighting SHALL affect only the Power Score and its Tier badge; the metagame **share percentage**, header StatCard totals, trending, and decklists SHALL be unchanged. When no deck in the field carries a recorded size (e.g. before the pipeline records sizes), scoring SHALL degrade gracefully by treating every event as the small-size default and SHALL NOT error.

#### Scenario: Larger tournaments carry more weight
- **WHEN** two archetypes have identical finish qualities but one earned them only at large tournaments and the other only at tiny tournaments
- **THEN** the large-tournament archetype receives a strictly higher Power Score

#### Scenario: Missing size defaults to a small event
- **WHEN** a deck's event has no recorded player count
- **THEN** that deck is weighted as a small event rather than dropped, and scoring completes without error

#### Scenario: Share and totals are unaffected
- **WHEN** size weighting is applied
- **THEN** each archetype's metagame share percentage and the header StatCard totals are identical to what they were without size weighting

#### Scenario: Graceful degradation before sizes exist
- **WHEN** no deck in the field carries a recorded player count
- **THEN** every event is treated as the small-size default and Power Scores are computed without error

## MODIFIED Requirements

### Requirement: Small-sample statistical adjustment without a hard floor
The Power Score SHALL apply a statistical lower-bound adjustment (a Wilson-style shrink) so that an archetype supported by few decks — or by decks from only small tournaments — is pulled toward the low end in proportion to its uncertainty, and a strong record supported by more decks (or larger tournaments) is trusted more. The general adjustment SHALL NOT force low-count archetypes to the fringe tier regardless of results. In addition, to keep the top tier a strong signal, **Tier 1 eligibility MAY require a minimum number of supporting decks**: an archetype supported by fewer than that minimum SHALL NOT be assigned T1 on the strength of a tiny sample, but SHALL still be placed by the uncertainty adjustment into a lower tier (T2 or below) according to its Power Score rather than being forced to the fringe tier. The small-sample penalty SHALL be tuned so that single-tiny-event winners do not flood Tier 1 in large formats.

#### Scenario: A single lucky win does not reach the top tier
- **WHEN** an archetype is represented by exactly one deck that placed 1st over the Last 2 Weeks
- **THEN** its Power Score is materially reduced by the uncertainty adjustment and, being below the Tier 1 minimum-deck floor, it is not assigned T1 on that single result

#### Scenario: A strong record over enough decks is trusted
- **WHEN** an archetype has many decks that consistently finish in top brackets
- **THEN** the uncertainty adjustment leaves its Power Score high enough to earn a high tier

#### Scenario: A below-floor strong performer lands in a lower tier, not the fringe
- **WHEN** a genuinely strong archetype is supported by fewer decks than the Tier 1 minimum floor
- **THEN** it is placed in the next tier down (T2 or below) by its Power Score rather than being forced to the fringe tier

#### Scenario: Tier 1 stays a small signal in large formats
- **WHEN** tiers are computed for a large format that previously showed a broad Tier 1 inflated by single-tiny-event winners
- **THEN** those single-tiny-event winners no longer appear in Tier 1, while tier order remains monotonic in Power Score

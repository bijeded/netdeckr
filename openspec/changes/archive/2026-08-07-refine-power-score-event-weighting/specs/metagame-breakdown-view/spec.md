## MODIFIED Requirements

### Requirement: Placement-derived Power Score inputs
The Power Score SHALL be computed only from each deck's final-standing bracket (e.g. `1`, `2`, `3-4`, `5-8`, `9-16`), mapping better standings to higher finish quality, and SHALL depend on how deep the archetype's decks finish rather than on how many decks it has. Increasing an archetype's number of decks without improving their standings SHALL NOT by itself raise its Power Score above a rival with fewer but deeper-finishing decks.

An event whose recorded standings are **not a genuine ranking** — a published-ladder event, where every qualifying decklist is published and the recorded positions are presentation order rather than a competitive result — SHALL contribute a **single flat finish quality** for each of its decks, identical across all of them, rather than a quality derived from each deck's recorded position. Such a deck SHALL NOT be dropped from scoring: qualifying for publication is itself a real result. An event SHALL be treated as unranked only when its recorded standings carry **no bracket range** AND the event has **no recorded player count**; an event exhibiting either a bracket range or a recorded player count SHALL be treated as genuinely ranked. The flat quality SHALL be set below the value a first-place finish would receive, so that no unranked event can contribute a champion-grade finish. This classification SHALL affect only the Power Score and its Tier badge; the metagame **share percentage**, header StatCard totals, trending, and decklists SHALL be unchanged.

#### Scenario: Deeper finishes score higher
- **WHEN** an archetype's decks are shifted to better standings (e.g. more 1st/2nd, fewer 9-16)
- **THEN** its Power Score does not decrease

#### Scenario: Volume without depth does not win
- **WHEN** archetype A appears many times but always in a low bracket, and archetype B appears fewer times but consistently in top brackets
- **THEN** B's Power Score is not lower than A's on account of A's larger deck count alone

#### Scenario: An unranked event contributes no champion
- **WHEN** an event has no recorded player count and its standings are a flat run of positions with no bracket range
- **THEN** every one of its decks receives the same flat finish quality, none of them receives the first-place quality, and none of them is dropped from scoring

#### Scenario: A bracket range marks a genuine ranking
- **WHEN** an event has no recorded player count but its standings include a bracket range such as `3-4` or `5-8`
- **THEN** its decks are scored from their recorded standings as normal, not flattened

#### Scenario: A recorded player count marks a genuine ranking
- **WHEN** an event records a player count
- **THEN** its decks are scored from their recorded standings as normal, regardless of whether its standings contain a bracket range

#### Scenario: Share and totals are unaffected by the classification
- **WHEN** unranked-event handling is applied
- **THEN** each archetype's metagame share percentage and the header StatCard totals are identical to what they were without it

### Requirement: Tournament-size weighting of the Power Score
The Power Score SHALL weight each deck's finish by the size of the tournament it came from, so that a given finish contributes **more effective statistical observations** when it was earned at a larger tournament and fewer when earned at a smaller one. Concretely, a finish's contribution to the uncertainty adjustment's effective sample SHALL scale with its event's player count, so an equal finish quality proven across larger fields yields a higher (less-shrunken) Power Score than the same finish quality earned only at tiny events.

Above a reference field size the weight SHALL continue to grow with player count at a **diminishing rate**, such that each doubling of the field adds a fixed increment to the weight. Two events whose player counts differ by a factor of two SHALL therefore receive **distinct** weights at every size the data can produce, so that arbitrarily large events remain distinguishable from one another rather than saturating at a shared ceiling. Weighting SHALL remain bounded, but the bound SHALL sit far enough above the largest plausible field that it acts as a guard against implausible recorded sizes rather than as a calibration limit on real events. The weighting of events **at or below** the reference field size SHALL be unchanged.

A deck whose event has **no recorded player count** SHALL be weighted as a **small event** (a conservative small-size default), and SHALL NOT be dropped from scoring. Size weighting SHALL affect only the Power Score and its Tier badge; the metagame **share percentage**, header StatCard totals, trending, and decklists SHALL be unchanged. When no deck in the field carries a recorded size (e.g. before the pipeline records sizes), scoring SHALL degrade gracefully by treating every event as the small-size default and SHALL NOT error.

#### Scenario: Larger tournaments carry more weight
- **WHEN** two archetypes have identical finish qualities but one earned them only at large tournaments and the other only at tiny tournaments
- **THEN** the large-tournament archetype receives a strictly higher Power Score

#### Scenario: Very large events stay distinguishable
- **WHEN** one event's player count is at least double another's, and both are well above the reference field size
- **THEN** the larger event's finishes carry a strictly greater weight than the smaller event's

#### Scenario: Each doubling adds a fixed increment
- **WHEN** three events above the reference size have player counts in the ratio 1 : 2 : 4
- **THEN** the weight increase from the first to the second equals the increase from the second to the third

#### Scenario: Weighting below the reference size is unchanged
- **WHEN** an event's player count is at or below the reference field size
- **THEN** its weight is identical to the weight it received before this change

#### Scenario: Implausible sizes are bounded
- **WHEN** an event records a player count far beyond any plausible tournament field
- **THEN** its weight is clamped to the guard bound rather than growing without limit

#### Scenario: Missing size defaults to a small event
- **WHEN** a deck's event has no recorded player count
- **THEN** that deck is weighted as a small event rather than dropped, and scoring completes without error

#### Scenario: Share and totals are unaffected
- **WHEN** size weighting is applied
- **THEN** each archetype's metagame share percentage and the header StatCard totals are identical to what they were without size weighting

#### Scenario: Graceful degradation before sizes exist
- **WHEN** no deck in the field carries a recorded player count
- **THEN** every event is treated as the small-size default and Power Scores are computed without error

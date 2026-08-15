## Context

See proposal.md — Why. Two facts about the current implementation shape the approach:

- The index is built once per run in `CardIndex.from_bulk_rows`, which picks a best printing per canonical card name and then registers that one `Printing` object under several keys (`_name_keys`: the full name, `//`-split parts, and every `card_faces` name) with `dict.setdefault`. First writer wins, and the iteration order is bulk-file order, so a foreign face can claim a name a real card owns.
- `Printing.type_line` is copied verbatim from the bulk row's top-level `type_line`, which for a multi-face card is the combined `"<front> // <back>"` string. Every consumer — the `top_cards` RPC, `cardCategory`, signature-card land exclusion — asks a substring question of that string.

The consumers are correct as written. The defect is entirely upstream of them, in what gets stored.

## Goals / Non-Goals

**Goals:**

- Resolution is deterministic and independent of bulk-file ordering for names claimed by more than one card.
- `deck_cards.type_line` describes one face.
- No change to `resolve()`'s signature, so the four call sites in `supabase_writer.py` stay untouched.

**Non-Goals:**

- Changing which *card* a correctly-resolved name maps to, or which printing of it is selected. The existing ranking (plain treatment → set type → recency → set code) is unchanged.
- A schema migration. `deck_cards.type_line` keeps its type and nullability.
- Teaching the pipeline about faces beyond the type line. Identity, images, and Arena export stay whole-card.

## Decisions

### Split the key set into priority tiers, and register them in two passes

`_name_keys` becomes two generators:

- `_primary_keys(row)` — the full canonical name, plus the front face's name (`card_faces[0]`, or the first `//` part for a split card shipping without `card_faces`).
- `_secondary_keys(row)` — every remaining face name.

`from_bulk_rows` then loops twice over `best`: pass one `setdefault`s the primary keys, pass two `setdefault`s the secondary keys. A foreign back face can only ever fill a key no real card and no front face wanted.

Both passes iterate `best` in sorted canonical-name order rather than dict-insertion order, so a within-tier collision (two cards whose front faces share a name — not currently known to exist, but not prevented by anything either) resolves the same way on every run and in every environment.

*Alternative considered:* a full ranking function with an explicit tier score per candidate, mirroring `_selection_key`. Rejected as heavier than the problem — there are exactly two tiers and the second is a fallback, which two passes express directly.

*Alternative considered:* dropping secondary face names from the index entirely. Rejected: it would turn every genuine back-face lookup into a miss, and misses are silent (columns left null), so it trades a visible wrong answer for an invisible absent one.

### Store the matched face's type line by specializing the `Printing` per key

`Printing` is a frozen dataclass, so each face key registers `dataclasses.replace(printing, type_line=<that face's type_line>)`. The full-name key of a multi-face card also carries the **front** face's line — classification must be single-face regardless of which spelling MTGTop8 emitted, and the front face is the one the deck plays.

This keeps `resolve(name) -> Printing | None` intact. Every caller keeps reading `printing.type_line` and gets the right answer without knowing faces exist.

*Alternative considered:* `resolve()` returns `(Printing, face_type_line)`. Rejected — it pushes face-awareness into four call sites and three maintenance passes to express something the return value can already carry.

*Alternative considered:* keep storing the combined line and teach each consumer to split on `//` and take the first segment. Rejected: it duplicates the same parsing in SQL, in TypeScript, and in the signature-card pass, and each copy can drift. Parse once, at the boundary where the faces are still structured data.

### Leave the SQL and `cardCategory` alone

Because the fix lands in what is stored, `top_cards`'s `category` expression, its `%land%` predicate, and `cardCategory`'s Land→Creature→Spell→Other precedence all produce correct results unchanged. The behavior described in the trending and decklist spec deltas is reached by narrowing their input, not by editing them.

Consequence worth stating plainly: a deployed frontend is not what makes this change visible — the data is. Merging the code is close to inert on existing rows; the remap is the switch.

### Multi-face layouts this must handle

| Layout | Example | Scraped name | Stored type line |
|---|---|---|---|
| `transform` | Esper Origins // Summon: Esper Maduin | front | `Sorcery` |
| `prepare` | Eiganjo Dynastorian // Replenish | front | `Creature — Fox Advisor` |
| `modal_dfc` | Agadeem's Awakening // …the Undercrypt | front | `Sorcery — Arcane` |
| `adventure` | Brazen Borrower // Petty Theft | front | `Creature — Faerie Rogue` |
| `split` | Fire // Ice | full or either part | `Instant` (front) |
| `flip` | Erayo, Soratami Ascendant // Erayo's Essence | front | `Creature — Moonfolk Monk` |

The assumption running through the whole table — MTGTop8 emits the front/castable-from-hand face — is load-bearing and was verified before the rule was built on it.

**Verified (task 1.1).** The saved fixtures turned out to be useless for this: they hold 5 distinct card names, every one of them single-face. The check was run against production `deck_cards` instead (read-only, anon key), over every row whose stored `type_line` contains `//` — 112 distinct scraped names:

| Form MTGTop8 emitted | Count |
|---|---|
| Front-face name (`Brazen Borrower`, `Agadeem's Awakening`) | 96 |
| Full or single-slash split form (`Fire / Ice`, `Assault / Battery`) | 15 |
| Any non-front face | 1 |

The single outlier is `Replenish` → `Eiganjo Dynastorian // Replenish` — the bug itself, not a counterexample: that deck plays the Urza's Destiny sorcery and MTGTop8 emitted a front-face name for it, which the index mis-assigned. So across 111 genuine multi-face lines, the scraper never emits a back face. The assumption holds.

## Risks / Trade-offs

**Modal DFC lands move from Lands to Spells in the modal, and become eligible for Top Spells and for archetype signature-card selection** → This is the chosen behavior (see proposal), not an accident, but it is the change most likely to look like a bug to a player. Confirm on the Vercel preview before merge, and check the archetype grid for a signature card that changed.

**MTGTop8 may emit a back-face name for some card we haven't seen** → Front-face priority would then resolve to the wrong face's type line silently. Mitigated by the fixture check above; a genuine back-face-only name still resolves (tier two), it just carries that face's line, which is the correct answer for it anyway.

**The remap is a full rewrite of every `deck_cards` identity and metadata column on production** → It is an existing, idempotent mode that skips unresolved names rather than nulling them, so a resolution regression cannot erase data. Run it once, capture the reported row count, and spot-check the two known cards.

**Between merge and remap, rows are inconsistent** — newly scraped rows carry single-face lines while older rows still carry combined ones → Keep the window short by running the remap deliberately after merge rather than waiting on the twice-daily cron.

**Within-tier ties are resolved by canonical-name sort, which is arbitrary** → Arbitrary but stable and inspectable, which is the property that matters. If a real collision of this kind ever appears, it wants its own rule rather than a better tiebreak.

## Migration Plan

1. Merge the code fix. Existing rows are untouched; new scrapes begin writing single-face type lines.
2. Run `python scraper/run.py --remap-scryfall` against production with the service-role key. It re-resolves every distinct `card_name` and rewrites all Scryfall columns.
3. Verify on the site: Pre-Modern `Replenish` shows the Urza's Destiny card and art; `Esper Origins` appears in Top Spells, not Top Creatures.

**Rollback:** revert the code and re-run the remap. Because the pass rewrites unconditionally from whatever the current resolver says, the previous resolver reproduces the previous data — the remap is the rollback mechanism as much as the migration one.

## Open Questions

- How many other names are claimed by both a standalone card and a foreign face? Answering it would size the blast radius but cannot change the approach — the priority rule handles one collision and a hundred identically. Worth a sweep of the bulk file after the fix lands, as information rather than a gate.

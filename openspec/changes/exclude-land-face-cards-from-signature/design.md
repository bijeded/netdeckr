## Context

See proposal.md — Why, for the regression and the Belcher symptom.

The constraint that shapes everything here: `deck_cards.type_line` is deliberately
**per-face**. `_face_type_line` in `scraper/scryfall.py` returns the type line of the one
face a scraped name names, and `Printing.type_line`'s own comment lists the consumers that
need it that way — trending's creature/spell split, the decklist modal's grouping, and
(wrongly, as it turns out) signature-card land exclusion. Signature selection is the one
consumer that asks a whole-card question: *would this art read as a land?*

Two facts make the fix cheap:

- `refresh_archetype_art` already requires a `card_resolver` and raises without one, and
  `_signature_card` is called only from there. The resolver is in hand at selection time.
- `CardIndex.resolve` is a plain in-memory dict lookup over the parsed bulk index, so
  consulting it once per distinct card name costs nothing measurable.

## Goals / Non-Goals

**Goals:**
- Signature selection sees the whole card; every other `type_line` consumer sees the face
  the deck plays, exactly as today.
- The land-face fact is derived from Scryfall data already loaded, not stored.
- Affected archetypes correct themselves on the next scheduled run.

**Non-Goals:**
- Changing `_face_type_line` or the meaning of `deck_cards.type_line`.
- Any schema change, new column, backfill, or remap pass.
- Treating "is a modal double-faced card" as the exclusion criterion — the rule is about
  land faces, and non-land MDFCs stay eligible.
- Frontend changes of any kind.

## Decisions

### Carry the land-face fact on `Printing`, not in the database

Add a `has_land_face: bool` field to `Printing`, computed once in `_printing_for` from
the card's faces: true when any face's type line contains "land", falling back to the
row's top-level `type_line` when the row has no faces. It describes the whole card, so
every lookup key for a card — front-face name, back-face name, full `//` name — carries
the same value, unlike `type_line`.

*Why here:* `Printing` is already the per-card record that carries whole-card identity
(canonical name, set, images) alongside the per-face `type_line`. This is one more
whole-card fact in the place that already holds them, and it makes the front/back
asymmetry impossible to reintroduce by accident.

*Alternatives considered:*
- **A `back_type_line` field.** Directionally named, so it invites a
  `"land" in back_type_line` test that misses a hypothetical land-front card and reads as
  a string question when the answer is a boolean. `has_land_face` states the intent.
- **A new `deck_cards.back_type_line` or `is_land_face` column.** Makes the filter a pure
  DB predicate, but costs a schema edit plus a remap run — one was just done for
  `fix-face-name-card-resolution` — and stores a fact that is always re-derivable from
  the bulk index.
- **Filtering on Scryfall `layout == "modal_dfc"`.** Answers the wrong question. It would
  exclude Valki // Tibalt and Ondu Inversion, and miss a land face on any other layout.

### Exclude after aggregation, on distinct names

`_signature_card` keeps its current per-row loop (paging, quantity summing, first-non-null
metadata capture) and its existing cheap `"land" in type_line` row test, then drops
land-faced names from `totals` before ranking, by resolving each distinct name once.

*Why:* exclusion does not depend on quantity, so filtering after aggregation is equivalent
to filtering per row and does one resolver lookup per distinct name instead of one per
deck row. Keeping the existing row test as a first pass means a single-faced land never
reaches the resolver at all.

*Trade-off:* candidates and their totals are built and then discarded, a negligible cost
at these row counts, in exchange for a filter that reads as one statement.

### Unresolvable names stay eligible

A name the resolver misses keeps today's behavior: not excluded. The spec already says a
null/unknown type line is not treated as a land, and inverting that would make an
unrelated resolver miss silently blank an archetype's art.

### No name-based preference

Selection stays purely rank-based. An archetype whose signature card matches its name is
a coincidence. Deciding otherwise would mean matching archetype names to cards, which is a
much larger change and was explicitly ruled out.

## Risks / Trade-offs

- **Some archetypes lose their art entirely** → only if a land-faced card was their *only*
  candidate, which cannot happen for a real deck (a deck of nothing but lands and
  land-faced MDFCs is not a tournament deck). The null path already exists and falls back
  to the procedural placeholder.
- **Art changes on archetypes beyond Belcher** → intended. Every land-backed MDFC is
  affected the same way. The blast radius is bounded to archetypes whose current signature
  card has a land face; the archetype grid needs a look on the Vercel preview before
  merge, since `main` deploys straight to production.
- **`Printing` gains a field that only one consumer reads** → accepted. The alternative is
  each consumer re-deriving face data from a row it no longer has.
- **A future consumer reaches for `has_land_face` when it wants `type_line`** → the field
  name says "any face", and the field's comment should say which question it answers and
  which it does not.
- **Visual outcome is unverified** → whether the replacement art reads better for each
  affected archetype is a judgment only the preview can settle. This design asserts only
  that the land-faced card is no longer selected.

## Migration Plan

No migration. `refresh_archetype_art` is idempotent and recomputes every archetype's
signature card from current decks on each run, so the next scheduled pipeline run — or a
`workflow_dispatch` run if the correction is wanted sooner — rewrites the affected rows.
Rollback is a revert; the following run restores the previous selection.

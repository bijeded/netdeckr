## Context

See `proposal.md` — Why, for the motivation, and `specs/` for the behaviour contracts.

Three properties of the existing code shape everything below:

1. **The dashboard's derivation chain is pure and single-sourced.** `useMetagame` performs one paged fetch of a 28-day deck corpus, then hands a plain deck list to `deriveBreakdown`, `attachPowerTiers` and `shareDeltas`. Those modules are pure and unit-tested and know nothing about Supabase. Everything the user sees — shares, Power Scores, Jenks cutoffs, the T1 deck floor, trends, share deltas, header totals, event and archetype filter options — is a function of that one list.
2. **The grid never loads card names.** `deck_cards` reaches the browser only lazily per expanded deck (`useDeckCards`) or pre-aggregated server-side (the `top_cards` RPC). Deciding legality client-side from card names would mean pulling the raw card rows for the whole corpus — tens of thousands of rows in the larger formats, which is precisely what `top_cards` exists to avoid.
3. **Trending is a second, independent path.** `top_cards` reads `deck_cards` directly and shares no code with the corpus.

## Goals / Non-Goals

**Goals:**

- One definition of "illegal deck", enforced in both the corpus path and the trending path.
- The pure derivation modules stay untouched and unaware that filtering happened.
- A banlist change takes effect on the next page load with no backfill over stored deck data.
- The ban notice is derivable from data the frontend already has after the fetch.

**Non-Goals:**

- Detecting the announcement itself. The system learns of a ban when Scryfall's legalities flip, which is on or near the effective date. No Wizards of the Coast or community page is parsed.
- Any per-deck legality flag stored on `decks`. See Decision 3.
- Surfacing banned cards anywhere in the UI as labelled-but-visible content. The exclusion is total; the notice is the only trace.

## Decisions

### 1. Scryfall `legalities` as the only banlist source

Scryfall's `default_cards` bulk rows carry a `legalities` map with a key per format, and it covers all five supported formats including `premodern` — the one format with no Wizards of the Coast banlist page at all. The pipeline already downloads and streams this file daily (`scraper/scryfall.py`), so the marginal cost is reading one more field per row.

*Alternatives considered:* parsing `magic.wizards.com/en/banned-restricted-list` plus `premodernmagic.com/banned-watched` — two HTML parsers against unversioned marketing/community markup, needing their own fixtures, covering four and one format respectively. The only thing they buy is earlier detection when a ban is announced before it takes effect; the cost is two fragile parsers on the critical path of every run. Rejected for now. If the announcement-to-effective lag turns out to matter in practice, an announcement scraper can be layered on later as a *supplement* to this table without changing anything downstream — the `banned_cards` table is the interface, not Scryfall.

*Consequence to accept:* the badge/notice can lag a real announcement by up to one sync cycle, and by longer if a ban is announced well before it takes effect.

### 2. `first_seen_at` computed by diffing, with a null-seeded first run

Scryfall carries no announcement date, so recency is manufactured from the pipeline's own history: compare the incoming banned set for a format against the stored one, and stamp only the additions.

The seeding hazard is the important part. On the first run the stored set is empty, so a naive diff marks every historical ban — Standard bans back through the format's whole history, and Modern's and Pauper's long lists — as "new today", producing a five-format banner announcing decade-old bans. The initial population therefore writes `first_seen_at = null` for every row, and `null` means "historical, never announce". This must be a property of *the first population of a format's list*, not of a one-off migration flag, so that a format added later seeds correctly too. The condition is therefore: if the format has no stored banned rows at all, seed with nulls; otherwise diff and stamp.

*Consequence to accept:* if a genuine ban happens to land in the same run that first populates a format, it will not announce. Acceptable — it happens once per format, ever.

### 3. Legality resolved at query time, never stored on `decks`

Two shapes were considered:

| | Read cost | Behaviour when a banlist changes |
|---|---|---|
| Store `decks.has_banned_card` at scrape time | ~free | requires re-scanning every deck in the DB, at exactly the moment the answer is most urgent |
| Resolve at query time against `banned_cards` | one subquery / one extra round trip | correct the instant the table changes |

The second wins on the property that matters: a ban's whole value here is immediacy. A stored flag would also be wrong for any deck scraped before the ban and never revisited, which is most of the corpus.

### 4. Corpus filtering happens once, at the boundary

`useMetagame` fetches the format's illegal deck ids alongside the corpus and removes them from the array before anything downstream sees it:

```
fetchCorpusDecks(format) ─┐
                          ├─► rows.filter(r => !illegal.has(r.id))
illegalDeckIds(format)  ──┘            │
                                       ▼
                    deriveBreakdown / attachPowerTiers / shareDeltas
                    (unchanged, untouched, unaware)
```

This is the whole reason the change is small. Because every figure is a function of that one array, filtering it satisfies the entire "contributes to no derived figure" requirement at one line — shares, the Jenks reference field, the T1 minimum-deck count, trend, share delta, header totals and filter option lists all fall out for free, with no per-consumer edit and no new arguments threaded through the pure modules. Their existing tests should be unaffected.

`illegalDeckIds` is a small RPC returning `bigint[]`, scoped by format and the same 28-day fetch start date as the corpus, so the payload stays proportional to the ban's actual impact (zero rows in the normal case). It runs in parallel with the corpus fetch.

*Alternative considered:* filtering inside the corpus query itself with a `not exists` clause, avoiding the extra round trip. Rejected because the frontend needs the *count* of what was hidden for the notice, which a pre-filtered query cannot report. Fetching the id set gives both the filter and the count from one call.

### 5. Trending excludes whole decks, not banned card rows

Inside `top_cards`, the restriction is on the deck, not the card line:

```sql
and not exists (
  select 1 from public.deck_cards bc
  join public.banned_cards b
    on b.card_name = bc.scryfall_name and b.format_code = p_format
  where bc.deck_id = dc.deck_id
)
```

Filtering the banned card's own rows instead would be cheaper and would still hide the banned card, but it would let a dead deck's other 59 cards keep voting in the rankings — a deck absent from the grid still shaping the trending table. That is two different meanings of "illegal deck" in one app, and they would drift. One rule.

The signature and return columns are unchanged, so unlike the `p_event_ids` addition this needs no drop-and-recreate — `create or replace` suffices. The function stays `security invoker`, so `banned_cards` must carry its own anon read policy for the subquery to see rows.

### 6. Match on `scryfall_name`

`deck_cards.card_name` is the raw MTGTop8 string and varies in punctuation and casing; `scryfall_name` is the canonical name, null on a resolution miss. Matching on `scryfall_name` means an unresolved card can never be recognised as banned, so a resolution gap under-filters (a dead deck survives one more day) rather than over-filters (a legal deck vanishes). Under-filtering is the direction to fail in: the visible failure is a stale deck, not a missing one.

`banned_cards.card_name` therefore stores the Scryfall canonical name, making the join a plain equality with no normalisation on either side.

### 7. The notice reports decks, not archetypes

Per the user's decision, the notice reports a deck count only. This also happens to be the number the frontend can state without qualification: it is `illegal.size` restricted to the current view, a direct count of rows removed. An archetype count would require distinguishing archetypes that lost every deck from those that merely lost some — a distinction the notice has no room to explain and that would mislead if collapsed.

Because the count follows the displayed corpus, it recomputes with the time frame and the active filters, which falls out of computing it at the same place the filter is applied.

### 8. Three-day window, session-scoped dismissal

`first_seen_at >= today - 3 days` gates visibility; `sessionStorage` (not `localStorage`) holds the dismissal, keyed per format. The pairing is deliberate: a permanent dismissal risks the user hiding it on day zero and never learning why their archetype vanished, while a notice that ignores dismissal for three days is nagging. Session scope means it returns on each visit but yields immediately within one.

Both bounds are hard, so a dismissal can never resurrect an expired notice: expiry is evaluated first.

*Visual treatment — confirmed in production 2026-08-11.* The notice sits between the StatCard strip and the archetype grid. It reads as informational rather than as an error: the semantic down colour (`--down`) is the wrong register for what is neutral news, so it uses the amber **flat** semantic instead — `--flat-tint` surface, `--flat-border` hairline, `--flat-on-dark` heading over body text in `--text-muted`, `--r-2xl` corners. Confirmed against the real Standard ban (Badgermole Cub / Gran-Gran / Stormchaser's Talent), not a preview fixture — the notice's first render was on production data.

*Note on the confirmation's limits.* It was confirmed at one viewport with three card names. A ban naming many more cards would make the card list the longest line in the notice, and that wrapping behaviour has not been seen.

## Risks / Trade-offs

- **Ban lands, Scryfall hasn't flipped yet, user sees a dead metagame** → Inherent to Decision 1 and bounded by one sync cycle in the common case. The escape hatch is designed in: `banned_cards` is the interface, so an announcement source can be added later without touching the frontend or the RPC.

- **The corpus empties out.** A wide Standard ban could remove most of a format's 28-day corpus, leaving a nearly blank grid and thin, unstable tiers computed over a handful of decks — Jenks breaks over a tiny reference field are noisy. → The existing empty-state and the notice together explain the sparseness. Worth watching on the preview after the first real ban; if tiers visibly thrash, a minimum-corpus guard is a follow-up change, not part of this one.

  **Observed 2026-08-11, first real ban:** the exclusion removed **350 of 581** Standard decks — 60% of the corpus, so the tier reference field fell to ~231 decks in a single day. The grid was judged to read fine at that size, so no guard was added. This is the largest thinning seen so far and it is a data point, not a bound: a wider ban, or the same ban against a thinner format, could go further. If a future ban leaves a format visibly thrashing, the minimum-corpus guard is still the follow-up.

- **`not exists` subquery slows `top_cards`.** It runs per deck in the queried range. → `deck_cards_deck_idx` already exists, and `banned_cards` is tiny (tens of rows per format). Expected negligible; confirm on the largest format (Modern or Pauper over 2 weeks) rather than assuming.

  **Measured 2026-08-11**, 2-week window, best of 3, wall clock from a dev machine (so inclusive of network round-trip, not pure DB time): ST main 517 ms / side 440 ms; MO main 1102 ms / side 837 ms; PAU main 913 ms / side 630 ms. No alarming cost. **This is not a regression measurement** — the control was an empty banlist, and the seeding run populated all five formats at once, so no before/after delta was ever captured and cannot now be reconstructed. Absolute numbers only.

- **The extra round trip in `useMetagame`.** → Issued in parallel with the corpus fetch, and returns zero rows in the steady state. It does add a failure mode: if the banlist call fails while the corpus succeeds, the honest fallback is to render the unfiltered corpus rather than block the dashboard — a stale metagame beats no metagame. Worth an explicit decision in implementation rather than an accidental one.

- **Scryfall changes the shape of `legalities`.** → Decision 1's "missing legality is not a ban" rule makes the failure mode silent under-reporting rather than mass deletion of decks. That is the right direction, but it is silent, so the sync should log the count of banned cards found per format so a drop to zero is visible in the workflow output.

- **An unban is as disruptive as a ban.** Removing a row silently re-admits decks. → Correct behaviour and rare; no notice is shown for it, which is a deliberate omission (nothing disappeared, so nothing needs explaining).

## Migration Plan

1. Apply the `banned_cards` table, policy and grant, plus the `create or replace` of `top_cards`, to Supabase manually — `supabase/schema.sql` is the record, per the project's manual-migration convention. Until the table has rows, `top_cards` behaves exactly as before.
2. Ship the scraper change. Its first run seeds every format with `first_seen_at = null` (Decision 2), so the exclusion begins working immediately and no notice fires.
3. Ship the frontend. The notice cannot appear until a *subsequent* run detects a genuine change, so the deploy is quiet by construction.

Rollback: truncate `banned_cards`. Every consumer degrades to its pre-change behaviour with no code revert — the corpus filter removes nothing and the RPC's subquery matches nothing.

## Open Questions

- ~~The exact copy of the notice in ES/EN, and its visual treatment, are to be settled against the Vercel preview and recorded in Decision 8.~~ **Settled 2026-08-11** — confirmed on production against the real Standard ban; values recorded in Decision 8.

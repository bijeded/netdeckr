## Why

When Wizards of the Coast bans cards, MTGTop8 keeps reporting the pre-ban metagame for days or weeks — every scrape until the new results accumulate. The dashboard presents that stale field as the current one: dead archetypes hold top tiers, their finishes set the Jenks cutoffs that demote the archetypes that actually survived, banned cards head the trending tables, and the metagame shares are computed against a denominator full of decks no one can legally register. A ban is exactly the moment a player checks the meta, and it is the moment the numbers are least trustworthy.

The fix is to stop counting decks that are no longer legal, and to tell the user that is what happened so a favourite archetype's disappearance reads as a ban rather than a bug.

## What Changes

- **Per-format banlist, sourced from Scryfall.** The daily Scryfall bulk sync already downloads `default_cards`, whose rows carry a `legalities` map covering all five supported formats (`standard`, `pioneer`, `modern`, `pauper`, `premodern`). The sync derives the set of cards whose legality is `banned` in each format and writes it to a new `banned_cards` table. No new upstream source, no HTML scraping of magic.wizards.com or premodernmagic.com.
- **`first_seen_at` as an announcement proxy.** Scryfall carries no announcement date, so the sync diffs the incoming banned set against the stored one and stamps newly-appearing rows with the current date. The initial seeding run writes `first_seen_at` as null for every row, so pre-existing bans never announce themselves.
- **Illegal decks leave the corpus.** A deck holding at least one card banned in its format is dropped from the metagame corpus before the breakdown, Power Scores, tiers, shares, trends and share deltas are derived. Archetypes left with no surviving deck disappear from the grid; archetypes that survive keep only the finishes earned with legal lists.
- **The same rule reaches the trending tables.** The `top_cards` aggregation excludes whole illegal decks, not merely the banned card's own rows — so a dead deck's other 59 cards stop inflating every card around it. "Illegal deck" has one definition across the app.
- **A ban notice above the archetype grid.** When the selected format has a card whose `first_seen_at` is within the last 3 days, a dismissible notice names the newly banned cards, reports how many decks are hidden, and states that the tiers and shares below exclude them. Dismissal lasts the session; the notice returns on the next session until the 3 days elapse, then never again.
- No change to the 7days/2weeks logical window model or to the 30-day retention window. The 3-day notice lifetime and the 30-day retention are deliberately independent: the notice explains a surprise, retention eventually removes the cause.

## Capabilities

### New Capabilities
- `banned-card-exclusion`: How the per-format banlist is sourced and stored, what makes a deck illegal, and the guarantee that illegal decks contribute to no derived metagame figure — breakdown, share, Power Score, tier, trend, share delta, or trending card counts.
- `ban-announcement-notice`: The per-format notice shown after a newly detected ban — when it appears, what it reports, how it is dismissed, and when it stops appearing for good.

### Modified Capabilities
- `metagame-data-pipeline`: The schema gains a `banned_cards` table with public read-only RLS, and the Scryfall sync gains the responsibility of populating it each run.
- `scryfall-card-mapping`: The bulk sync additionally reads each row's `legalities` map, not only its printing metadata.
- `metagame-breakdown-view`: The displayed breakdown, its shares, and its tiers are derived from the legal corpus only.
- `trending-cards-view`: The trending tables count only legal decks.

## Impact

**Database** — new `public.banned_cards` table (public `select` for `anon`/`authenticated`, writes service-role only, matching every other table); `public.top_cards` gains a legality restriction (behaviour changes, argument list and return columns do not, so no drop-and-recreate). `supabase/schema.sql` is edited, which the project otherwise treats as requiring an explicit migration task — this change is that task.

**Scraper** — `scryfall.py` surfaces per-format banned status from the bulk rows; `supabase_writer.py` gains the `banned_cards` write; `run.py` sequences it. Scraper tests need a bulk fixture carrying `legalities`.

**Frontend** — `useMetagame` fetches the format's banlist and the illegal-deck set alongside the corpus and filters before deriving anything; a new notice component and its placement in the dashboard between the StatCard strip and the archetype grid; ES/EN strings for the notice; session-scoped dismissal state.

**Blast radius** — every derived figure on the dashboard moves the day a ban lands, by design. The pure derivation modules (`metagame.ts`, `powerScore.ts`, `shareDelta.ts`) are untouched: they keep receiving a deck list and stay unaware that anything was filtered out of it. Existing tests for those modules should be unaffected. `useMetagame` gains a round trip, and the Trending tables' RPC gains a subquery.

-- Netdeckr — database schema
-- Applied manually to the Supabase project (see CLAUDE.md → Database).
-- Idempotent: safe to re-run. Public data, read-only from the browser via RLS;
-- writes happen only from the daily scraper using the service-role key.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per supported format. `last_updated_at` is stamped by the scraper
-- after a successful run and drives the "Updated X ago" freshness indicator.
create table if not exists public.formats (
  code            text primary key,          -- MTGTop8 format code: ST, PI, MO, PAU, PREM
  name            text not null,             -- display name, e.g. "Standard"
  last_updated_at timestamptz                -- null until first successful scrape
);

-- Archetype identity, scoped per format. The scraper upserts on (format_code, name).
create table if not exists public.archetypes (
  id             bigint generated always as identity primary key,
  format_code    text not null references public.formats(code) on delete cascade,
  name           text not null,              -- English archetype name, e.g. "Izzet Cauldron"
  color_identity text not null default '',   -- WUBRG subset, '' = colorless
  signature_card_name text,                  -- ranked non-land signature card (null until computed)
  art_image_url  text,                       -- that card's hotlinked Scryfall normal image (null on a miss)
  art_crop_url   text,                       -- that card's hotlinked Scryfall art_crop image (null on a miss)
  unique (format_code, name)
);

-- ---------------------------------------------------------------------------
-- Removed tables (change derive-metagame-from-decks).
-- The metagame breakdown is now derived in the frontend from the scraped decks,
-- and freshness is per-format via formats.last_updated_at. The pre-aggregated
-- metagame_snapshots table and the per-(format, window) format_window_freshness
-- table — and the meta_window logical-window column they carried — are no longer
-- read or written by anything, so drop them. Idempotent (`if exists`); `cascade`
-- also removes their RLS policies. No-ops on a fresh DB that never had them.
-- ---------------------------------------------------------------------------
drop table if exists public.metagame_snapshots cascade;
drop table if exists public.format_window_freshness cascade;

-- ---------------------------------------------------------------------------
-- Decklists: events, decks, deck cards.
-- Populated by the scraper from MTGTop8 event + decklist pages. The frontend
-- expands an archetype into its recent decklists and exports a deck to MTG Arena.
-- All read-only from the browser via RLS; writes only via the service-role key.
-- ---------------------------------------------------------------------------

-- One row per MTGTop8 event. `source_event_id` is MTGTop8's `e` param; the
-- (source_event_id, format_code) unique key makes the scraper's upsert idempotent
-- so daily re-runs never duplicate an event. `event_date` drives the frontend's
-- "latest N lists" ordering and the 6-month retention prune.
create table if not exists public.events (
  id              bigint generated always as identity primary key,
  source_event_id text not null,               -- MTGTop8 `e` param
  format_code     text not null references public.formats(code) on delete cascade,
  name            text not null,               -- event name, e.g. "MTGO Challenge 32"
  event_date      date,                        -- null if MTGTop8 omits it
  player_count    integer,                     -- tournament size; null if MTGTop8 omits it
  unique (source_event_id, format_code)
);

-- One row per deck within an event. Links to the shared per-format archetype.
-- `placement` is the raw MTGTop8 result label (e.g. "1", "2", "3-4", "5-8") kept as
-- text because finishes are ranges. Named `placement` because `placing` is a
-- reserved SQL keyword (OVERLAY ... PLACING ...) and cannot be an unquoted column.
-- `source_deck_id` is MTGTop8's `d` param; the (event_id, source_deck_id) unique
-- key keeps the deck upsert idempotent.
create table if not exists public.decks (
  id             bigint generated always as identity primary key,
  event_id       bigint not null references public.events(id) on delete cascade,
  archetype_id   bigint not null references public.archetypes(id) on delete cascade,
  source_deck_id text not null,                -- MTGTop8 `d` param
  player         text not null default '',     -- pilot name, '' if absent
  placement      text not null default '',     -- raw finish label: 1, 2, 3-4, 5-8, ...
  unique (event_id, source_deck_id)
);

-- One row per card line in a deck, split into main/side boards. `card_name` is the
-- name scraped from MTGTop8 and is always present. The `scryfall_*` columns and
-- `image_url` are populated by the Scryfall mapping when the card resolves and are
-- null on a miss (export/art fall back to card_name / a placeholder).
create table if not exists public.deck_cards (
  id               bigint generated always as identity primary key,
  deck_id          bigint not null references public.decks(id) on delete cascade,
  board            text not null,              -- 'main' or 'side'
  quantity         integer not null,
  card_name        text not null,              -- scraped card name (fallback for export)
  scryfall_name    text,                       -- canonical English name (null on a resolution miss)
  set_code         text,                       -- current non-foil set (null on a miss)
  collector_number text,                       -- printing collector number (null on a miss)
  image_url        text,                       -- hotlinked Scryfall CDN image (normal size; null on a miss)
  small_image_url  text,                       -- same printing's thumbnail-size image, for the decklist image view (null on a miss)
  type_line        text,                       -- resolved printing type line, e.g. "Creature — Elf" (null on a miss)
  rarity           text,                       -- resolved printing rarity: mythic/rare/uncommon/common (null on a miss)
  cmc              numeric,                     -- resolved printing converted mana cost (null on a miss)
  released_at      date,                        -- resolved printing's set release date (null on a miss)
  constraint deck_cards_board_check check (board in ('main', 'side'))
);

-- ---------------------------------------------------------------------------
-- Banned cards, per format (change exclude-banned-decks).
-- Populated each pipeline run from the per-format `legalities` map on Scryfall's
-- bulk card rows — there is no second upstream source and no banlist page is
-- scraped. Only the `banned` status is stored: `restricted` and `not_legal` are
-- not bans (a not_legal card cannot appear in a legal list for the format at
-- all, so treating it as a ban would discard decks over a resolution artifact).
--
-- `card_name` holds the **canonical Scryfall name**, so it joins to
-- `deck_cards.scryfall_name` as a plain equality with no normalization on either
-- side. Matching the canonical name (not the raw scraped `card_name`) means an
-- unresolved card can never be recognised as banned — a resolution gap
-- under-filters (a dead deck survives a day longer) rather than over-filters (a
-- legal deck disappears), which is the safe direction to fail in.
--
-- `first_seen_at` is the run date on which the pipeline FIRST observed this ban,
-- and is the system's only proxy for an announcement date (Scryfall carries
-- none). Null means "historical — never announce": the first population of a
-- format's list writes null for every row, so shipping this does not fire a
-- notice for every ban in the format's history. See supabase_writer.refresh_banlist.
create table if not exists public.banned_cards (
  id            bigint generated always as identity primary key,
  format_code   text not null references public.formats(code) on delete cascade,
  card_name     text not null,               -- canonical Scryfall name
  first_seen_at date,                        -- null = pre-existing ban, never announced
  unique (format_code, card_name)
);

-- The legality join runs per deck card (deck_cards.scryfall_name -> banned_cards),
-- so index the lookup side by format.
create index if not exists banned_cards_format_name_idx
  on public.banned_cards (format_code, card_name);

-- Common access paths: an event's decks, and an archetype's decks by recency.
create index if not exists decks_event_idx on public.decks (event_id);
create index if not exists decks_archetype_idx on public.decks (archetype_id);
create index if not exists deck_cards_deck_idx on public.deck_cards (deck_id);
create index if not exists events_format_date_idx on public.events (format_code, event_date desc);

-- Card-art columns for existing deployments (the create-table definitions above
-- already include them for a fresh apply; these add them to a database created
-- before card art). All nullable and hotlinked from Scryfall's CDN — no re-host.
alter table public.deck_cards add column if not exists image_url text;
alter table public.archetypes add column if not exists signature_card_name text;
alter table public.archetypes add column if not exists art_image_url text;

-- Card metadata + cropped art for the refined signature-card selection (added to
-- databases created before it; the create-table definitions above already include
-- them for a fresh apply). All nullable; art_crop hotlinked from Scryfall's CDN.
alter table public.deck_cards add column if not exists type_line text;
alter table public.deck_cards add column if not exists rarity text;
alter table public.deck_cards add column if not exists cmc numeric;
alter table public.deck_cards add column if not exists released_at date;
alter table public.archetypes add column if not exists art_crop_url text;

-- Thumbnail card image for the decklist modal's image view (change deck-image-view;
-- added to databases created before it, the create-table definition above already
-- includes it for a fresh apply). Nullable and hotlinked from Scryfall's CDN like
-- the other art columns. Rows enriched before this column exists carry a non-null
-- `image_url`, so they are invisible to the `image_url is null` backfill sentinel
-- and are populated by their own `small_image_url is null` pass instead
-- (supabase_writer.backfill_small_images).
alter table public.deck_cards add column if not exists small_image_url text;

-- Tournament size for size-weighted Power Score (added to databases created before
-- it; the create-table definition above already includes it for a fresh apply).
-- Nullable — MTGTop8 does not report a size for every event.
alter table public.events add column if not exists player_count integer;

-- ---------------------------------------------------------------------------
-- One-time merge: MTGTop8 capitalizes archetype names inconsistently across
-- pages (one page spells "UW Control", another "Uw Control"). The case-sensitive
-- `unique (format_code, name)` let the decklist scrape create duplicate archetype
-- rows that split an archetype's decks in two. Collapse each (format_code,
-- lower(name)) group to one canonical row (the lowest id), re-point its decks, and
-- delete the orphans. Then a functional unique index makes the collision impossible
-- going forward; the scraper also resolves archetypes case-insensitively (see
-- supabase_writer.upsert_archetype). Idempotent: after the merge no duplicate groups
-- remain, so the map is empty on re-run. MUST run before the unique index is created
-- (the index would fail while duplicates still exist). Applying this needs the
-- service-role key.
-- ---------------------------------------------------------------------------
drop table if exists _arch_dupe_map;
create temporary table _arch_dupe_map as
with ranked as (
  select a.id, a.format_code, lower(a.name) as lname
  from public.archetypes a
),
canon as (
  select format_code, lname, min(id) as canonical_id
  from ranked
  group by format_code, lname
)
select r.id as dup_id, c.canonical_id
from ranked r
join canon c on c.format_code = r.format_code and c.lname = r.lname
where r.id <> c.canonical_id;

-- Re-point decks (their (event_id, source_deck_id) key is unaffected).
update public.decks d set archetype_id = m.canonical_id
from _arch_dupe_map m where d.archetype_id = m.dup_id;

-- Remove the now-orphaned duplicate archetype rows.
delete from public.archetypes a using _arch_dupe_map m where a.id = m.dup_id;

drop table if exists _arch_dupe_map;

-- Enforce case-insensitive archetype identity. The table's `unique (format_code,
-- name)` only blocks exact-case duplicates; this functional index additionally
-- blocks case variants (e.g. "UW Control" vs "Uw Control"), matching how the
-- scraper resolves archetypes case-insensitively (see supabase_writer.upsert_archetype).
create unique index if not exists archetypes_format_lower_name_key
  on public.archetypes (format_code, lower(name));

-- ---------------------------------------------------------------------------
-- Seed formats (idempotent)
-- ---------------------------------------------------------------------------

insert into public.formats (code, name) values
  ('ST',   'Standard'),
  ('PI',   'Pioneer'),
  ('MO',   'Modern'),
  ('PAU',  'Pauper'),
  ('PREM', 'Pre-Modern')
on conflict (code) do update set name = excluded.name;

-- ---------------------------------------------------------------------------
-- Row Level Security — public read-only
--   anon (browser) may SELECT only. No insert/update/delete policy exists, so
--   RLS denies all writes to anon by default. The scraper uses the service-role
--   key, which bypasses RLS.
-- ---------------------------------------------------------------------------

alter table public.formats                 enable row level security;
alter table public.archetypes              enable row level security;
alter table public.events                  enable row level security;
alter table public.decks                   enable row level security;
alter table public.deck_cards              enable row level security;
alter table public.banned_cards            enable row level security;

drop policy if exists formats_read                 on public.formats;
drop policy if exists archetypes_read              on public.archetypes;
drop policy if exists events_read                  on public.events;
drop policy if exists decks_read                   on public.decks;
drop policy if exists deck_cards_read              on public.deck_cards;
drop policy if exists banned_cards_read            on public.banned_cards;

create policy formats_read
  on public.formats for select to anon, authenticated using (true);

create policy archetypes_read
  on public.archetypes for select to anon, authenticated using (true);

create policy events_read
  on public.events for select to anon, authenticated using (true);

create policy decks_read
  on public.decks for select to anon, authenticated using (true);

create policy deck_cards_read
  on public.deck_cards for select to anon, authenticated using (true);

-- The banlist is public data, and `top_cards` is SECURITY INVOKER — without this
-- policy the caller's RLS would hide every banned_cards row from the exclusion
-- subquery, silently disabling it for the browser.
create policy banned_cards_read
  on public.banned_cards for select to anon, authenticated using (true);

-- Ensure the anon/authenticated roles have table-level SELECT (RLS still gates rows).
grant select on public.formats, public.archetypes, public.events, public.decks,
                public.deck_cards, public.banned_cards
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Trending cards aggregation (changes add-trending-cards-table, revamp-trending-cards).
-- Per-card copy counts for the trending tables (Trending Creatures, Trending
-- Spells, Top Sideboard Cards), aggregated server-side so the browser never
-- pulls the ~88k raw deck_cards lines the largest formats hold. Returns one row
-- per card name for the requested slice (format + date window + board), with
-- optional archetype and event narrowing to mirror the sidebar filters. Each row
-- carries total_copies and deck_count (the frontend derives average copies per
-- deck as total_copies / deck_count) plus a `category` of 'creature' or 'spell'
-- so the mainboard can be split into the Trending Creatures / Trending Spells
-- tables. The frontend calls this per board: main + side.
--
-- Category: a card is 'creature' when its Scryfall type_line contains "Creature"
-- (incl. "Artifact Creature" etc., and any face of a modal/split card), else
-- 'spell'; a null type_line is 'spell'. bool_or over the group keeps the
-- expression valid under GROUP BY card_name (type_line isn't a group key).
--
-- Land exclusion uses `type_line ILIKE '%land%'`, which drops both basic and
-- nonbasic lands (Basic Land, dual/fetch lands, Artifact Land, Urza's Saga) so
-- the tables show spells/creatures rather than manabase; a null type_line (a
-- Scryfall resolution miss) is kept so a resolution gap never hides a real card.
-- (Tradeoff: a modal/split card with a land face, e.g. "Sorcery // Land", is also
-- dropped — acceptable, the spells-only view is the intent.)
-- SECURITY INVOKER (the default) so the caller's RLS applies — anon keeps its
-- read-only access and no write path is exposed.
--
-- The return signature changed in revamp-trending-cards (added `category`), so
-- the old function is dropped first — create-or-replace cannot alter a function's
-- OUT columns in place. add-event-size-filter added `p_event_ids`, changing the
-- argument list, so both the pre- and post-`category` signatures are dropped.
--
-- Legality (change exclude-banned-decks): decks that are no longer legal in the
-- queried format are excluded outright, so that after a ban the tables describe
-- the field a player may actually register. The exclusion is of the **whole
-- deck**, not merely of the banned card's own rows: filtering just the banned
-- card would still let a dead deck's other 59 cards vote in the rankings, which
-- would give "illegal deck" a second meaning here that drifts from the one the
-- archetype grid applies. The banned set is read at query time, so a banlist
-- change takes effect immediately with no backfill over stored deck data.
--
-- This changed the function's BEHAVIOR but not its argument list or its return
-- columns, so unlike the `category` and `p_event_ids` changes it needs no
-- drop-and-recreate — the create-or-replace below suffices.
--
-- `p_event_id` (one event) and `p_event_ids` (a set) are independent narrowings
-- that AND together. The set exists for the event-size filter: the bands are
-- classified in TypeScript (src/lib/eventSize.ts) and only the resulting event
-- ids are sent, so the thresholds live in exactly one language and cannot drift
-- between the grid and these tables.
-- ---------------------------------------------------------------------------
drop function if exists public.top_cards(text, date, date, text, bigint[], bigint);
drop function if exists public.top_cards(text, date, date, text, bigint[], bigint, bigint[]);

create or replace function public.top_cards(
  p_format         text,
  p_start          date,
  p_end            date,
  p_board          text,
  p_archetype_ids  bigint[] default null,
  p_event_id       bigint   default null,
  p_event_ids      bigint[] default null
)
returns table (
  card_name    text,
  total_copies bigint,
  deck_count   bigint,
  image_url    text,
  category     text
)
language sql
stable
security invoker
set search_path = public
as $$
  select dc.card_name,
         sum(dc.quantity)::bigint            as total_copies,
         count(distinct dc.deck_id)::bigint  as deck_count,
         max(dc.image_url)                   as image_url,
         case when bool_or(dc.type_line ilike '%creature%')
              then 'creature' else 'spell' end as category
  from public.deck_cards dc
  join public.decks  d on d.id = dc.deck_id
  join public.events e on e.id = d.event_id
  where e.format_code = p_format
    and dc.board = p_board
    and e.event_date >= p_start
    and e.event_date <  p_end
    and (dc.type_line is null or dc.type_line not ilike '%land%')
    and (p_archetype_ids is null or d.archetype_id = any (p_archetype_ids))
    and (p_event_id is null or d.event_id = p_event_id)
    -- An empty array means "no events match the selected size class", which must
    -- yield no rows — `= any('{}')` is false for every row, which is correct and
    -- deliberately different from null (= no restriction).
    and (p_event_ids is null or d.event_id = any (p_event_ids))
    -- Whole-deck legality: drop every card of a deck holding a card banned in
    -- this format, in either board. Matching `scryfall_name` (not the raw scraped
    -- `card_name`) means an unresolved name can never make a deck illegal.
    and not exists (
      select 1
      from public.deck_cards banned_line
      join public.banned_cards b
        on b.card_name = banned_line.scryfall_name
       and b.format_code = p_format
      where banned_line.deck_id = dc.deck_id
    )
  group by dc.card_name
$$;

-- Let the browser (anon) and authenticated roles call the aggregation; RLS on the
-- underlying tables still gates the rows it reads (SECURITY INVOKER).
grant execute on function
  public.top_cards(text, date, date, text, bigint[], bigint, bigint[])
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Illegal decks in a format's corpus (change exclude-banned-decks).
-- Returns the ids of decks from `p_start` onward that hold at least one card
-- banned in `p_format`, in either board. The frontend fetches this alongside its
-- deck corpus and removes these ids before deriving anything, so no illegal deck
-- reaches a share, a Power Score, a tier cutoff, a trend, or a filter option.
--
-- Returning the id SET rather than pre-filtering the corpus query is deliberate:
-- the ban notice must report how many decks were hidden, and a pre-filtered query
-- cannot say what it removed. One call answers both.
--
-- Legality is resolved here at query time rather than stamped onto `decks` at
-- scrape time, because a ban's whole value is immediacy: a stored flag would need
-- a full re-scan of every deck at exactly the moment the answer matters most, and
-- would be wrong for any deck scraped before the ban and never revisited.
--
-- Normally returns zero rows (no bans, or none reachable in the window), so the
-- payload is proportional to a ban's actual impact.
-- SECURITY INVOKER (the default) so the caller's RLS applies — anon keeps its
-- read-only access and no write path is exposed.
-- ---------------------------------------------------------------------------
create or replace function public.illegal_deck_ids(
  p_format text,
  p_start  date
)
returns table (deck_id bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select d.id
  from public.decks d
  join public.events e on e.id = d.event_id
  where e.format_code = p_format
    and e.event_date >= p_start
    and exists (
      select 1
      from public.deck_cards dc
      join public.banned_cards b
        on b.card_name = dc.scryfall_name
       and b.format_code = p_format
      where dc.deck_id = d.id
    )
$$;

grant execute on function public.illegal_deck_ids(text, date) to anon, authenticated;

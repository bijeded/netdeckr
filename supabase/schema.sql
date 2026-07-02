-- MetaStack — database schema
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
  unique (format_code, name)
);

-- The metagame share per archetype, per format AND time window.
-- The scraper clears a slice and re-inserts, so no stale archetypes linger.
-- One snapshot row per (format, meta_window, archetype). `meta_window` is a
-- format-independent LOGICAL window key (5days/2weeks/2months); the scraper maps
-- it to each format's per-format MTGTop8 `meta` ID. Named `meta_window` because
-- `window` is a reserved SQL keyword and cannot be an unquoted column name.
create table if not exists public.metagame_snapshots (
  format_code  text   not null references public.formats(code) on delete cascade,
  meta_window  text   not null default '2weeks', -- logical window: 5days/2weeks/2months
  archetype_id bigint not null references public.archetypes(id) on delete cascade,
  share_pct    numeric(5,2) not null,        -- metagame share %, e.g. 14.20
  rank         integer not null,             -- 1-based, by descending share
  primary key (format_code, meta_window, archetype_id),
  constraint metagame_snapshots_window_check
    check (meta_window in ('5days', '2weeks', '2months'))
);

-- ---------------------------------------------------------------------------
-- Migration for a pre-existing metagame_snapshots table (feature 1 shape:
-- PK archetype_id, no meta_window column). Idempotent; no-ops on a fresh DB
-- where the create above already produced the window-aware shape.
--   Add `meta_window` (backfills existing rows to '2weeks' via the default) →
--   rebuild the PK as composite if it lacks `meta_window`.
-- ---------------------------------------------------------------------------
alter table public.metagame_snapshots
  add column if not exists meta_window text not null default '2weeks';

do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_attribute a
      on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
    where i.indrelid = 'public.metagame_snapshots'::regclass
      and i.indisprimary
      and a.attname = 'meta_window'
  ) then
    alter table public.metagame_snapshots drop constraint if exists metagame_snapshots_pkey;
    alter table public.metagame_snapshots
      add primary key (format_code, meta_window, archetype_id);
  end if;
end $$;

-- Common access path: a format+window's breakdown ordered by rank.
-- Drop the pre-window index name if it lingers from feature 1.
drop index if exists public.metagame_snapshots_format_rank_idx;
create index if not exists metagame_snapshots_format_window_rank_idx
  on public.metagame_snapshots (format_code, meta_window, rank);

-- Per-(format, meta_window) freshness. Drives the "Updated X ago" indicator, which
-- is now window-aware. `formats.last_updated_at` is retained but no longer the source
-- of truth for the indicator (kept to avoid a destructive drop; see design.md).
create table if not exists public.format_window_freshness (
  format_code     text not null references public.formats(code) on delete cascade,
  meta_window     text not null,
  last_updated_at timestamptz,                -- null until first successful scrape
  primary key (format_code, meta_window),
  constraint format_window_freshness_window_check
    check (meta_window in ('5days', '2weeks', '2months'))
);

-- ---------------------------------------------------------------------------
-- One-time remap: earlier ship keyed rows by MTGTop8 meta IDs (50/326/52/46/285,
-- all Standard's), which are per-format and thus wrong for other formats. Move to
-- the format-independent logical keys and drop the two windows we no longer keep
-- (Large Events, MTGO). Idempotent: after the remap the WHERE clauses match nothing.
-- Order: drop the value CHECK → remap/delete → set the new default → re-add the
-- logical CHECK. Non-Standard data becomes correct on the next scrape (which
-- overwrites each (format, meta_window) slice).
-- ---------------------------------------------------------------------------
alter table public.metagame_snapshots      drop constraint if exists metagame_snapshots_window_check;
alter table public.format_window_freshness drop constraint if exists format_window_freshness_window_check;

delete from public.metagame_snapshots      where meta_window in ('46', '285');
delete from public.format_window_freshness where meta_window in ('46', '285');

update public.metagame_snapshots set meta_window =
  case meta_window when '50' then '2weeks' when '326' then '5days' when '52' then '2months'
                   else meta_window end
  where meta_window in ('50', '326', '52');
update public.format_window_freshness set meta_window =
  case meta_window when '50' then '2weeks' when '326' then '5days' when '52' then '2months'
                   else meta_window end
  where meta_window in ('50', '326', '52');

alter table public.metagame_snapshots      alter column meta_window set default '2weeks';

-- Safe to use bare `add constraint`: both are unconditionally dropped above on
-- every run, so re-running never hits a duplicate-constraint error. Keep the
-- drops paired with these adds if this block is ever reordered.
alter table public.metagame_snapshots
  add constraint metagame_snapshots_window_check
    check (meta_window in ('5days', '2weeks', '2months'));
alter table public.format_window_freshness
  add constraint format_window_freshness_window_check
    check (meta_window in ('5days', '2weeks', '2months'));

-- Backfill freshness for the default window from the legacy per-format timestamp.
insert into public.format_window_freshness (format_code, meta_window, last_updated_at)
select code, '2weeks', last_updated_at
from public.formats
where last_updated_at is not null
on conflict (format_code, meta_window) do nothing;

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
-- name scraped from MTGTop8 and is always present. The `scryfall_*` columns are
-- nullable and left null by this change; a later Scryfall-mapping change populates
-- them for a more canonical MTG Arena export (export falls back to card_name).
create table if not exists public.deck_cards (
  id               bigint generated always as identity primary key,
  deck_id          bigint not null references public.decks(id) on delete cascade,
  board            text not null,              -- 'main' or 'side'
  quantity         integer not null,
  card_name        text not null,              -- scraped card name (fallback for export)
  scryfall_name    text,                       -- canonical English name (null until Scryfall change)
  set_code         text,                       -- current non-foil set (null until Scryfall change)
  collector_number text,                       -- printing collector number (null until Scryfall change)
  constraint deck_cards_board_check check (board in ('main', 'side'))
);

-- Common access paths: an event's decks, and an archetype's decks by recency.
create index if not exists decks_event_idx on public.decks (event_id);
create index if not exists decks_archetype_idx on public.decks (archetype_id);
create index if not exists deck_cards_deck_idx on public.deck_cards (deck_id);
create index if not exists events_format_date_idx on public.events (format_code, event_date desc);

-- ---------------------------------------------------------------------------
-- One-time merge: MTGTop8 capitalizes archetype names inconsistently across
-- pages (the breakdown spells "UW Control", the decklist results table
-- "Uw Control"). The case-sensitive `unique (format_code, name)` let the
-- decklist scrape create duplicate archetype rows with no metagame snapshot,
-- stranding their decks. Collapse each (format_code, lower(name)) group to one
-- canonical row (prefer the row that carries a snapshot, else the lowest id),
-- re-point its decks and snapshots, and delete the orphans. Then a functional
-- unique index makes the collision impossible going forward; the scraper also
-- resolves archetypes case-insensitively (see supabase_writer.upsert_archetype).
-- Idempotent: after the merge no duplicate groups remain, so the map is empty on
-- re-run. MUST run before the unique index is created (the index would fail while
-- duplicates still exist). Applying this needs the service-role key.
-- ---------------------------------------------------------------------------
drop table if exists _arch_dupe_map;
create temporary table _arch_dupe_map as
with ranked as (
  select a.id, a.format_code, lower(a.name) as lname,
         exists (select 1 from public.metagame_snapshots s where s.archetype_id = a.id) as has_snapshot
  from public.archetypes a
),
canon as (
  select format_code, lname,
         (array_agg(id order by has_snapshot desc, id asc))[1] as canonical_id
  from ranked
  group by format_code, lname
)
select r.id as dup_id, c.canonical_id
from ranked r
join canon c on c.format_code = r.format_code and c.lname = r.lname
where r.id <> c.canonical_id;

-- Drop duplicate snapshots that would collide with the canonical row's PK
-- (format_code, meta_window, archetype_id), then move the rest.
delete from public.metagame_snapshots s
using _arch_dupe_map m
where s.archetype_id = m.dup_id
  and exists (
    select 1 from public.metagame_snapshots t
    where t.archetype_id = m.canonical_id
      and t.format_code = s.format_code
      and t.meta_window = s.meta_window
  );
update public.metagame_snapshots s set archetype_id = m.canonical_id
from _arch_dupe_map m where s.archetype_id = m.dup_id;

-- Re-point decks (their (event_id, source_deck_id) key is unaffected).
update public.decks d set archetype_id = m.canonical_id
from _arch_dupe_map m where d.archetype_id = m.dup_id;

-- Remove the now-orphaned duplicate archetype rows.
delete from public.archetypes a using _arch_dupe_map m where a.id = m.dup_id;

drop table if exists _arch_dupe_map;

-- Enforce case-insensitive archetype identity. The plain `unique (format_code,
-- name)` above is kept so the breakdown upsert's `on_conflict=format_code,name`
-- still resolves; this functional index additionally blocks case variants.
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
alter table public.metagame_snapshots      enable row level security;
alter table public.format_window_freshness enable row level security;
alter table public.events                  enable row level security;
alter table public.decks                   enable row level security;
alter table public.deck_cards              enable row level security;

drop policy if exists formats_read                 on public.formats;
drop policy if exists archetypes_read              on public.archetypes;
drop policy if exists metagame_snapshots_read      on public.metagame_snapshots;
drop policy if exists format_window_freshness_read on public.format_window_freshness;
drop policy if exists events_read                  on public.events;
drop policy if exists decks_read                   on public.decks;
drop policy if exists deck_cards_read              on public.deck_cards;

create policy formats_read
  on public.formats for select to anon, authenticated using (true);

create policy archetypes_read
  on public.archetypes for select to anon, authenticated using (true);

create policy metagame_snapshots_read
  on public.metagame_snapshots for select to anon, authenticated using (true);

create policy format_window_freshness_read
  on public.format_window_freshness for select to anon, authenticated using (true);

create policy events_read
  on public.events for select to anon, authenticated using (true);

create policy decks_read
  on public.decks for select to anon, authenticated using (true);

create policy deck_cards_read
  on public.deck_cards for select to anon, authenticated using (true);

-- Ensure the anon/authenticated roles have table-level SELECT (RLS still gates rows).
grant select on public.formats, public.archetypes, public.metagame_snapshots,
                public.format_window_freshness, public.events, public.decks,
                public.deck_cards
  to anon, authenticated;

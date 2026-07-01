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

drop policy if exists formats_read                 on public.formats;
drop policy if exists archetypes_read              on public.archetypes;
drop policy if exists metagame_snapshots_read      on public.metagame_snapshots;
drop policy if exists format_window_freshness_read on public.format_window_freshness;

create policy formats_read
  on public.formats for select to anon, authenticated using (true);

create policy archetypes_read
  on public.archetypes for select to anon, authenticated using (true);

create policy metagame_snapshots_read
  on public.metagame_snapshots for select to anon, authenticated using (true);

create policy format_window_freshness_read
  on public.format_window_freshness for select to anon, authenticated using (true);

-- Ensure the anon/authenticated roles have table-level SELECT (RLS still gates rows).
grant select on public.formats, public.archetypes, public.metagame_snapshots,
                public.format_window_freshness
  to anon, authenticated;

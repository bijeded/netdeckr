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

-- The metagame share per archetype, per format AND time window / scope.
-- The scraper clears a slice and re-inserts, so no stale archetypes linger.
-- One snapshot row per (format, meta_window, archetype). `meta_window` is the
-- MTGTop8 `meta` param (see the CHECK below); replace-on-run is scoped to
-- (format, meta_window). Named `meta_window` because `window` is a reserved
-- SQL keyword and cannot be an unquoted column name.
create table if not exists public.metagame_snapshots (
  format_code  text   not null references public.formats(code) on delete cascade,
  meta_window  text   not null default '50', -- MTGTop8 meta param: 50/326/52/46/285
  archetype_id bigint not null references public.archetypes(id) on delete cascade,
  share_pct    numeric(5,2) not null,        -- metagame share %, e.g. 14.20
  rank         integer not null,             -- 1-based, by descending share
  primary key (format_code, meta_window, archetype_id),
  constraint metagame_snapshots_window_check
    check (meta_window in ('50', '326', '52', '46', '285'))
);

-- ---------------------------------------------------------------------------
-- Migration for a pre-existing metagame_snapshots table (feature 1 shape:
-- PK archetype_id, no meta_window column). Idempotent; no-ops on a fresh DB
-- where the create above already produced the window-aware shape.
--   Order: add `meta_window` (backfills existing rows to '50' via the default) →
--   ensure the CHECK → rebuild the PK as composite if it lacks `meta_window`.
-- ---------------------------------------------------------------------------
alter table public.metagame_snapshots
  add column if not exists meta_window text not null default '50';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'metagame_snapshots_window_check'
      and conrelid = 'public.metagame_snapshots'::regclass
  ) then
    alter table public.metagame_snapshots
      add constraint metagame_snapshots_window_check
        check (meta_window in ('50', '326', '52', '46', '285'));
  end if;
end $$;

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
    check (meta_window in ('50', '326', '52', '46', '285'))
);

-- Backfill freshness for window '50' from the legacy per-format timestamp.
insert into public.format_window_freshness (format_code, meta_window, last_updated_at)
select code, '50', last_updated_at
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

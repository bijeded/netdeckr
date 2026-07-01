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

-- The current "Last 2 Weeks" metagame share per archetype. Replace-on-run:
-- the scraper clears a format's rows and re-inserts, so no stale archetypes linger.
-- One snapshot row per archetype.
create table if not exists public.metagame_snapshots (
  archetype_id bigint primary key references public.archetypes(id) on delete cascade,
  format_code  text   not null references public.formats(code) on delete cascade,
  share_pct    numeric(5,2) not null,        -- metagame share %, e.g. 14.20
  rank         integer not null             -- 1-based, by descending share
);

-- Common access path: a format's breakdown ordered by rank.
create index if not exists metagame_snapshots_format_rank_idx
  on public.metagame_snapshots (format_code, rank);

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

alter table public.formats            enable row level security;
alter table public.archetypes         enable row level security;
alter table public.metagame_snapshots enable row level security;

drop policy if exists formats_read            on public.formats;
drop policy if exists archetypes_read         on public.archetypes;
drop policy if exists metagame_snapshots_read on public.metagame_snapshots;

create policy formats_read
  on public.formats for select to anon, authenticated using (true);

create policy archetypes_read
  on public.archetypes for select to anon, authenticated using (true);

create policy metagame_snapshots_read
  on public.metagame_snapshots for select to anon, authenticated using (true);

-- Ensure the anon/authenticated roles have table-level SELECT (RLS still gates rows).
grant select on public.formats, public.archetypes, public.metagame_snapshots
  to anon, authenticated;

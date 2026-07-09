## Context

`archetypes.color_identity` (WUBRG subset, `''` = colorless) is set once, at archetype insert, from `color_identity_for(name)` in `scraper/mtgtop8.py` (`supabase_writer.upsert_archetype`). MTGTop8 exposes no mana symbols, so archetypes named for a card/mechanic rather than a guild/shard/mono/letter code store `''` and render a single gray pip even when clearly colored. Every `deck_cards` row is already resolved to a Scryfall printing during scraping; the bulk rows carry an authoritative `color_identity` field, but the `Printing` dataclass / `CardIndex` don't currently keep it. The scraper already has a per-format archetype-refresh pass (`refresh_archetype_art`) that iterates each format's archetypes, queries their decks' cards, computes a value, and PATCHes the archetype — the ideal host for a color-identity recompute.

## Goals / Non-Goals

**Goals:**
- Fill `archetypes.color_identity` for name-colorless archetypes from the union of their decks' cards' Scryfall color identities, splash-filtered.
- Keep name-derived identities authoritative (fallback only).
- Recompute (not insert-only) so identities fill/correct as decks accumulate; idempotent.
- Correct existing rows via a one-time service-role backfill, mirroring prior maintenance passes.

**Non-Goals:**
- No schema change (`color_identity` already exists), no frontend change (pips already render it), no dependency change.
- Not changing the name-based `color_identity_for` heuristic itself.
- No per-deck stored color column — colors are read transiently from the resolver during the pass.

## Decisions

- **Carry `color_identity` on `Printing`.** Add a `color_identity: list[str] | None` (or tuple) field, populated in `CardIndex.from_bulk_rows` from the bulk row's `color_identity`. The chosen printing's color identity is set-invariant across printings of a card, so best-printing selection is unaffected.
- **New `refresh_archetype_color_identity(fmt)` in `supabase_writer.py`**, mirroring `refresh_archetype_art`: for each archetype, compute `name_ci = color_identity_for(name)`; if non-empty, PATCH `color_identity = name_ci` (keeps name authoritative, also self-heals any drift); if empty, compute the card-derived value and PATCH it. Run it in the same place `refresh_archetype_art` is invoked (per-format scrape + the `_refresh_all_archetype_art` maintenance path → extend to also refresh color identity, or add a sibling).
- **Card-derived value = threshold union over decks.** For the archetype's decks, resolve each mainboard card to its printing's `color_identity`; a *deck's* colors = union of its cards' colors. A color is kept iff it appears in `>= COLOR_IDENTITY_MIN_DECK_SHARE` of the archetype's decks (share = decks-with-color / total decks). Order the kept colors WUBRG via the existing `_canonical`. Deck-presence (not card-count) is the threshold unit, matching how a "splash" is judged. Default threshold ~0.35 (tunable constant, like the powerScore constants); a single splash deck in a large archetype falls out, a genuine base color in most decks stays.
- **Mainboard only.** Sideboard cards routinely add off-color hate; the base identity is a mainboard property. (Consistent with signature-card selection, which is mainboard-only.)
- **One-time correction via `run.py`.** A dedicated `--refresh-color-identity` standalone mode recomputes every archetype's color identity from its already-mapped `deck_cards` (no re-scrape, no card re-resolution), and the shared maintenance helper (`_refresh_all_archetype_derived`, formerly `_refresh_all_archetype_art`) now runs the color pass alongside art, so `--backfill` / `--remap-scryfall` / `--backfill-scryfall` also keep color identity current. One-time backfill after merge, service-role key:

  ```
  gh workflow run scrape.yml -f format=refresh-color-identity   # Actions (has the service-role key)
  # or locally with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY:
  python scraper/run.py --refresh-color-identity
  ```
  Idempotent (change-detected PATCH), so it is safe to re-run.

## Risks / Trade-offs

- **Threshold tuning:** too low re-admits splashes; too high drops a real base color in a diverse archetype. Mitigation: single named constant, verify live across formats before archiving (like the Jenks/Z constants). Property/unit tests assert behavior (splash excluded, base kept) without pinning the exact value.
- **Resolver misses:** a card that doesn't resolve contributes no color (silver-border cases). Acceptable — those are rare and rarely define identity; if an archetype resolves no cards it stays `''` (unchanged from today).
- **Extra read load per run:** one deck_cards query per archetype for the color pass. Same shape/volume as the existing signature-card pass, so negligible and CI-free.
- **Name-vs-cards disagreement is intentionally not surfaced:** by choosing name-precedence we accept that a mis-named archetype keeps its name color; revisiting that is a separate change.

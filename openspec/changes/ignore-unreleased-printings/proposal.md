# Proposal

## Why

During a set's preview season, Scryfall already lists the upcoming set's printings in `default_cards`, with a `released_at` in the future. Printing selection ranks by recency without checking that date, so a plain reprint in the upcoming expansion beats the card's current printing. Deck cards then get stored with a set code that is not yet on Arena (a broken Arena export line), preview art, and a future release date that also skews signature-card ranking. The recent-main-sets selection already ignores unreleased sets; printing selection never got the same guard.

## What Changes

- Printing selection ranks a printing released on or before the run's date above any printing released after it, ahead of treatment, set type, and recency.
- Unreleased printings are demoted, not rejected: a card printed only in a not-yet-released set still resolves (e.g. new cards played between the digital and the paper release).
- A printing released on the run's date, or one with no release date, counts as released.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `scryfall-card-mapping`: the "Scraped card names resolve to canonical Scryfall printings" requirement gains a new top ranking priority (released first), with scenarios for an unreleased reprint, an unreleased plain printing against a released special-treatment one, a card printed only in an unreleased set, and the release-day boundary.

## Impact

- **Scraper:** Scryfall card resolution (`scraper/scryfall.py`) and its tests. Every caller of the resolver is affected: deck-card enrichment, the backfill/remap passes, and archetype signature-card art.
- **Supabase:** no schema or RLS change. Values written to the `deck_cards` Scryfall columns (`set_code`, `collector_number`, `image_url`, `small_image_url`, `released_at`, ...) and to archetype art change only for cards with a reprint in a set still in preview.
- **Existing rows:** no remap needed. Rows written during preview with the upcoming set's code become correct on release day, because normal ranking picks that set from then on.
- **Unaffected:** `recent_set_cards` (Top New Cards), the banlist, the 7days/2weeks window model, and 30-day retention.

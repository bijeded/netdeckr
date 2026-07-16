"""Netdeckr scraper entry point.

Scrapes every format's recent decklists (the two-week window) into Supabase and
stamps each format's freshness on success. The metagame breakdown is derived
frontend-side from these decks, so the scraper stores no separate breakdown. Run
daily by GitHub Actions; can also be run locally with SUPABASE_URL and
SUPABASE_SERVICE_ROLE_KEY set.

    python scraper/run.py                    # scrape all formats
    python scraper/run.py ST                 # scrape one format
    python scraper/run.py --backfill-scryfall  # one-time: map existing deck_cards
    python scraper/run.py --backfill           # one-time: fill card metadata + art_crop
    python scraper/run.py --remap-scryfall     # one-time: re-resolve ALL rows (heuristic changes)
    python scraper/run.py --refresh-color-identity  # one-time: recompute archetype color identity
    python scraper/run.py --backfill-sizes     # one-time: fill events.player_count from event pages
"""
from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timedelta, timezone

import requests

from decklist_pipeline import backfill_event_sizes, sync_decklists
from mtgtop8 import FORMATS, event_url, format_url, meta_id_for
from scryfall import sync_bulk
from supabase_writer import SupabaseWriter

USER_AGENT = "Netdeckr/0.1 (metagame dashboard; +https://github.com/bijeded/netdeckr)"
REQUEST_DELAY_SECONDS = 2  # respectful rate limiting between requests (fair use)
REQUEST_TIMEOUT_SECONDS = 30
RETENTION_DAYS = 30  # data older than this is pruned each run
# The decklist pass gathers only the two-week window (which contains the last five
# days by date). This is the only window the scraper resolves via `meta_id_for`.
DECKLIST_WINDOWS = ["2weeks"]
SCRYFALL_CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cache", "scryfall")


def build_card_resolver():
    """Sync Scryfall bulk data and return a card resolver, or None on failure.

    Best-effort: card enrichment is optional, so a Scryfall outage must not fail
    the scrape — the writer simply leaves the Scryfall columns null in that case.
    The bulk file is cached per day, so repeated runs the same day don't re-download.
    """
    try:
        today = datetime.now(timezone.utc).date().isoformat()
        return sync_bulk(SCRYFALL_CACHE_DIR, today=today)
    except Exception as exc:  # noqa: BLE001 — enrichment is optional
        print(f"[error] scryfall bulk sync: {exc} (deck cards will be unenriched)", file=sys.stderr)
        return None


def _get(url: str) -> str:
    """GET a URL with the polite User-Agent, then pause to be a good citizen."""
    response = requests.get(
        url,
        headers={"User-Agent": USER_AGENT},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    time.sleep(REQUEST_DELAY_SECONDS)
    return response.text


def fetch(fmt: str, window: str, cp: int | None = None) -> str:
    """Fetch a format's page for one logical window (optionally a later events page).

    Resolves the logical window to that format's MTGTop8 `meta` ID; ``cp`` selects a
    1-based events-list page (``None`` = page 1) for decklist pagination.
    """
    return _get(format_url(fmt, meta_id_for(fmt, window), cp))


def fetch_event(fmt: str, event_id: str, deck_id: str | None = None) -> str:
    """Fetch an event page (results list) or a specific deck's decklist page."""
    return _get(event_url(fmt, event_id, deck_id))


def formats_to_scrape(argv: list[str], available) -> list[str]:
    """Resolve which formats to scrape from the command line.

    With no argument, scrape all formats. With one format code (case-insensitive),
    scrape only that format. An unknown code exits with an error.
    """
    if len(argv) > 1:
        fmt = argv[1].upper()
        if fmt not in available:
            raise SystemExit(f"Unknown format: {argv[1]} (expected one of {', '.join(available)})")
        return [fmt]
    return list(available)


def _refresh_all_archetype_derived(writer: SupabaseWriter) -> None:
    """Recompute every format's derived archetype attributes (best-effort).

    Runs the same signature-card art and color-identity passes the daily scrape
    loop runs, so the standalone maintenance modes (--backfill-scryfall,
    --remap-scryfall, --backfill) keep both derived attributes in lockstep with
    the resolved deck_cards rows — e.g. after a --remap-scryfall the card-derived
    color identities are refreshed rather than left stale until the next scrape.
    """
    for fmt in FORMATS:
        try:
            arts = writer.refresh_archetype_art(fmt)
            print(f"{fmt}/archetype-art: {arts} archetypes")
        except Exception as exc:  # noqa: BLE001 — art is best-effort
            print(f"[error] {fmt}/archetype-art: {exc}", file=sys.stderr)
        try:
            colors = writer.refresh_archetype_color_identity(fmt)
            print(f"{fmt}/archetype-color: {colors} archetypes")
        except Exception as exc:  # noqa: BLE001 — color identity is best-effort
            print(f"[error] {fmt}/archetype-color: {exc}", file=sys.stderr)


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv if argv is None else argv)
    try:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    except KeyError as missing:
        print(f"Missing required environment variable: {missing}", file=sys.stderr)
        return 2

    if "--refresh-color-identity" in argv:
        # One-time mode: recompute every archetype's color identity from its
        # already-mapped deck_cards (name-derived, else card-derived), without
        # re-resolving cards or re-scraping. Use after shipping the card-derived
        # color-identity fallback to correct existing name-colorless archetypes.
        resolver = build_card_resolver()
        if resolver is None:
            print("Scryfall bulk sync unavailable; cannot refresh color identity", file=sys.stderr)
            return 1
        writer = SupabaseWriter(url, key, card_resolver=resolver)
        for fmt in FORMATS:
            try:
                colors = writer.refresh_archetype_color_identity(fmt)
                print(f"{fmt}/archetype-color: {colors} archetypes")
            except Exception as exc:  # noqa: BLE001 — color identity is best-effort
                print(f"[error] {fmt}/archetype-color: {exc}", file=sys.stderr)
        return 0

    if "--backfill-sizes" in argv:
        # One-time mode: fill events.player_count on stored events still missing a
        # size by re-fetching each event page and parsing its player count. A
        # standalone pass — it touches only events, no decklists or Scryfall.
        writer = SupabaseWriter(url, key)
        updated = backfill_event_sizes(
            writer,
            fetch_event_page=fetch_event,
            on_error=lambda ctx, exc: print(f"[error] event {ctx}: {exc}", file=sys.stderr),
        )
        print(f"backfill-sizes: set player_count on {updated} events")
        return 0

    if "--backfill-scryfall" in argv:
        # One-time mode: enrich existing deck_cards rows that predate Scryfall
        # mapping. A standalone pass — it does not scrape.
        resolver = build_card_resolver()
        if resolver is None:
            print("Scryfall bulk sync unavailable; cannot backfill", file=sys.stderr)
            return 1
        writer = SupabaseWriter(url, key, card_resolver=resolver)
        updated = writer.backfill_scryfall()
        print(f"backfill-scryfall: enriched {updated} deck_cards rows")
        _refresh_all_archetype_derived(writer)
        return 0

    if "--remap-scryfall" in argv:
        # One-time mode: fully re-resolve EVERY existing deck_cards row against the
        # current resolver (not just sentinel-null rows), so a later resolver change
        # reaches already-enriched rows, then recompute archetype signature cards +
        # art. A standalone pass — it does not scrape.
        resolver = build_card_resolver()
        if resolver is None:
            print("Scryfall bulk sync unavailable; cannot remap", file=sys.stderr)
            return 1
        writer = SupabaseWriter(url, key, card_resolver=resolver)
        updated = writer.remap_scryfall()
        print(f"remap-scryfall: re-resolved {updated} deck_cards rows")
        _refresh_all_archetype_derived(writer)
        return 0

    if "--backfill" in argv:
        # One-time mode: fill the card-metadata columns (type_line/rarity/cmc/
        # released_at, plus any missing identity/image) on existing deck_cards rows,
        # then recompute archetype signature cards + art from the refreshed rows. A
        # standalone pass — it does not scrape.
        resolver = build_card_resolver()
        if resolver is None:
            print("Scryfall bulk sync unavailable; cannot backfill", file=sys.stderr)
            return 1
        writer = SupabaseWriter(url, key, card_resolver=resolver)
        updated = writer.backfill_metadata()
        print(f"backfill: enriched {updated} deck_cards rows with card metadata")
        _refresh_all_archetype_derived(writer)
        return 0

    formats = formats_to_scrape(argv, FORMATS)
    writer = SupabaseWriter(url, key, card_resolver=build_card_resolver())
    now = datetime.now(timezone.utc).isoformat()

    # Decklist pass: for each format, gather the two-week window's events and store
    # every NEW deck + its cards, then refresh archetype art and stamp the format's
    # freshness. Incremental — events already stored are skipped, so only the first
    # backfill is expensive; daily runs fetch just new events. A failure in one
    # format does not abort the rest.
    succeeded = 0
    for fmt in formats:
        try:
            known = writer.existing_event_ids(fmt)
        except Exception as exc:  # noqa: BLE001 — fall back to a full pass on lookup failure
            print(f"[error] {fmt}/existing-events: {exc}", file=sys.stderr)
            known = set()
        try:
            deck_count = sync_decklists(
                fmt,
                DECKLIST_WINDOWS,
                fetch_format_page=fetch,
                fetch_event_page=fetch_event,
                writer=writer,
                skip_event_ids=known,
                on_error=lambda f, ctx, exc: print(f"[error] {f}/decklists/{ctx}: {exc}", file=sys.stderr),
            )
        except Exception as exc:  # noqa: BLE001 — one bad format must not stop the rest
            print(f"[error] {fmt}/decklists: {exc}", file=sys.stderr)
            continue
        print(f"{fmt}/decklists: {deck_count} new decks")

        # Refresh each archetype's signature-card art from its current decks.
        # Best-effort — art is a nicety, not worth failing the scrape.
        try:
            arts = writer.refresh_archetype_art(fmt)
            print(f"{fmt}/archetype-art: {arts} archetypes")
        except Exception as exc:  # noqa: BLE001
            print(f"[error] {fmt}/archetype-art: {exc}", file=sys.stderr)

        # Refresh each archetype's color identity: name-derived when the name
        # carries a color, else derived from its decks' cards. Best-effort.
        try:
            colors = writer.refresh_archetype_color_identity(fmt)
            print(f"{fmt}/archetype-color: {colors} archetypes")
        except Exception as exc:  # noqa: BLE001
            print(f"[error] {fmt}/archetype-color: {exc}", file=sys.stderr)

        # Stamp the format's freshness after a successful scrape (drives the
        # "Updated X ago" indicator). Best-effort — a stamp failure must not fail
        # the run, which already refreshed the format's decks.
        try:
            writer.stamp_format_updated(fmt, now)
        except Exception as exc:  # noqa: BLE001
            print(f"[error] {fmt}/stamp: {exc}", file=sys.stderr)
        succeeded += 1

    # Retention: drop events (and, via cascade, their decks/cards) older than the
    # retention window. Best-effort — a prune failure must not fail the run.
    cutoff = (datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)).date().isoformat()
    try:
        writer.prune_events_before(cutoff)
        print(f"pruned events before {cutoff}")
    except Exception as exc:  # noqa: BLE001
        print(f"[error] prune before {cutoff}: {exc}", file=sys.stderr)

    # Fail the run only if every format's scrape failed (a single flaky format is
    # tolerated).
    if succeeded == 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

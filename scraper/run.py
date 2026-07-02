"""MetaStack scraper entry point.

Fetches the metagame breakdown for every format and every logical time window
(the three universal windows: 5 days / 2 weeks / 2 months) and writes each slice
to Supabase. The window is a format-independent logical key; MTGTop8's numeric
`meta` param is per-format, so it's resolved via `meta_id_for` at fetch time. Run
daily by GitHub Actions; can also be run locally with SUPABASE_URL and
SUPABASE_SERVICE_ROLE_KEY set.

    python scraper/run.py
"""
from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timedelta, timezone

import requests

from decklist_pipeline import sync_decklists
from mtgtop8 import FORMATS, WINDOWS, event_url, format_url, meta_id_for
from pipeline import sync_all
from supabase_writer import SupabaseWriter

USER_AGENT = "MetaStack/0.1 (metagame dashboard; +https://github.com/bijeded/metastack)"
REQUEST_DELAY_SECONDS = 2  # respectful rate limiting between requests (fair use)
REQUEST_TIMEOUT_SECONDS = 30
RETENTION_DAYS = 182  # ~6 months; data older than this is pruned each run


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


def fetch(fmt: str, window: str) -> str:
    """Fetch a format's page for one logical window.

    Resolves the logical window to that format's MTGTop8 `meta` ID.
    """
    return _get(format_url(fmt, meta_id_for(fmt, window)))


def fetch_event(fmt: str, event_id: str, deck_id: str | None = None) -> str:
    """Fetch an event page (results list) or a specific deck's decklist page."""
    return _get(event_url(fmt, event_id, deck_id))


def main() -> int:
    try:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    except KeyError as missing:
        print(f"Missing required environment variable: {missing}", file=sys.stderr)
        return 2

    writer = SupabaseWriter(url, key)
    now = datetime.now(timezone.utc).isoformat()

    def on_error(fmt: str, window: str, exc: Exception) -> None:
        print(f"[error] {fmt}/{window}: {exc}", file=sys.stderr)

    results = sync_all(
        list(FORMATS),
        WINDOWS,
        fetch=fetch,
        writer=writer,
        now=now,
        on_error=on_error,
    )

    for (fmt, window), count in results.items():
        status = "FAILED" if count is None else f"{count} archetypes"
        print(f"{fmt}/{window}: {status}")

    # Decklist pass: for each format, gather events across the windows and store
    # every deck + its cards. Runs after the breakdown so archetypes exist.
    for fmt in FORMATS:
        deck_count = sync_decklists(
            fmt,
            WINDOWS,
            fetch_format_page=fetch,
            fetch_event_page=fetch_event,
            writer=writer,
            on_error=lambda f, ctx, exc: print(f"[error] {f}/decklists/{ctx}: {exc}", file=sys.stderr),
        )
        print(f"{fmt}/decklists: {deck_count} decks")

    # Retention: drop events (and, via cascade, their decks/cards) older than the
    # retention window. Best-effort — a prune failure must not fail the run.
    cutoff = (datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)).date().isoformat()
    try:
        writer.prune_events_before(cutoff)
        print(f"pruned events before {cutoff}")
    except Exception as exc:  # noqa: BLE001
        print(f"[error] prune before {cutoff}: {exc}", file=sys.stderr)

    # Fail the run only if every (format, window) breakdown pair failed (a single
    # flaky slice is tolerated).
    if all(count is None for count in results.values()):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

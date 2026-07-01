"""MetaStack scraper entry point.

Fetches the metagame breakdown for every format and every time window / scope
(the five MTGTop8 `meta` params) and writes each slice to Supabase. Run daily by
GitHub Actions; can also be run locally with SUPABASE_URL and
SUPABASE_SERVICE_ROLE_KEY set.

    python scraper/run.py
"""
from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timezone

import requests

from mtgtop8 import FORMATS, META_WINDOWS, format_url
from pipeline import sync_all
from supabase_writer import SupabaseWriter

USER_AGENT = "MetaStack/0.1 (metagame dashboard; +https://github.com/bijeded/metastack)"
REQUEST_DELAY_SECONDS = 2  # respectful rate limiting between requests (fair use)
REQUEST_TIMEOUT_SECONDS = 30


def fetch(fmt: str, meta_window: str) -> str:
    """Fetch a format's page for one meta window, then pause to be polite."""
    response = requests.get(
        format_url(fmt, meta_window),
        headers={"User-Agent": USER_AGENT},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    time.sleep(REQUEST_DELAY_SECONDS)
    return response.text


def main() -> int:
    try:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    except KeyError as missing:
        print(f"Missing required environment variable: {missing}", file=sys.stderr)
        return 2

    writer = SupabaseWriter(url, key)
    now = datetime.now(timezone.utc).isoformat()

    def on_error(fmt: str, meta_window: str, exc: Exception) -> None:
        print(f"[error] {fmt}/{meta_window}: {exc}", file=sys.stderr)

    results = sync_all(
        list(FORMATS),
        list(META_WINDOWS),
        fetch=fetch,
        writer=writer,
        now=now,
        on_error=on_error,
    )

    for (fmt, meta_window), count in results.items():
        status = "FAILED" if count is None else f"{count} archetypes"
        print(f"{fmt}/{meta_window}: {status}")

    # Fail the run only if every (format, window) pair failed (a single flaky
    # slice is tolerated).
    if all(count is None for count in results.values()):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""MetaStack scraper entry point.

Fetches the Last 2 Weeks (meta=50) breakdown for every format from MTGTop8 and
writes it to Supabase. Run daily by GitHub Actions; can also be run locally with
SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set.

    python scraper/run.py
"""
from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timezone

import requests

from mtgtop8 import FORMATS, format_url
from pipeline import sync_all
from supabase_writer import SupabaseWriter

USER_AGENT = "MetaStack/0.1 (metagame dashboard; +https://github.com/bijeded/metastack)"
META_LAST_2_WEEKS = "50"
REQUEST_DELAY_SECONDS = 2  # respectful rate limiting between formats (fair use)
REQUEST_TIMEOUT_SECONDS = 30


def fetch(fmt: str) -> str:
    """Fetch a format's meta=50 page, then pause to be polite to MTGTop8."""
    response = requests.get(
        format_url(fmt, META_LAST_2_WEEKS),
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

    def on_error(fmt: str, exc: Exception) -> None:
        print(f"[error] {fmt}: {exc}", file=sys.stderr)

    results = sync_all(list(FORMATS), fetch=fetch, writer=writer, now=now, on_error=on_error)

    for fmt, count in results.items():
        status = "FAILED" if count is None else f"{count} archetypes"
        print(f"{fmt}: {status}")

    # Fail the run only if every format failed (a single flaky format is tolerated).
    if all(count is None for count in results.values()):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

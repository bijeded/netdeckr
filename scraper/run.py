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
from datetime import datetime, timezone

import requests

from mtgtop8 import FORMATS, WINDOWS, format_url, meta_id_for
from pipeline import sync_all
from supabase_writer import SupabaseWriter

USER_AGENT = "MetaStack/0.1 (metagame dashboard; +https://github.com/bijeded/metastack)"
REQUEST_DELAY_SECONDS = 2  # respectful rate limiting between requests (fair use)
REQUEST_TIMEOUT_SECONDS = 30


def fetch(fmt: str, window: str) -> str:
    """Fetch a format's page for one logical window, then pause to be polite.

    Resolves the logical window to that format's MTGTop8 `meta` ID.
    """
    response = requests.get(
        format_url(fmt, meta_id_for(fmt, window)),
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

    # Fail the run only if every (format, window) pair failed (a single flaky
    # slice is tolerated).
    if all(count is None for count in results.values()):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

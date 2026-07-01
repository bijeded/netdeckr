"""Scraper pipeline orchestration.

Pure control flow: fetch + parse a format, then hand a ranked breakdown to a
writer. Network (fetch) and DB (writer) are injected so this module is fully
unit-testable without touching the wire.
"""
from __future__ import annotations

from typing import Callable, Optional

from mtgtop8 import parse_meta_breakdown, rank_archetypes


def sync_format(fmt: str, *, fetch: Callable[[str], str], writer, now: str) -> int:
    """Sync one format's Last 2 Weeks breakdown.

    Fetches and parses first: if either raises, no write happens and prior data
    is left intact. Only after a successful write is the format stamped as
    updated. Returns the number of archetypes written.
    """
    html = fetch(fmt)  # raises on source failure — before any write
    archetypes = rank_archetypes(parse_meta_breakdown(html))
    writer.replace_breakdown(fmt, archetypes)
    writer.stamp_updated(fmt, now)
    return len(archetypes)


def sync_all(
    formats: list[str],
    *,
    fetch: Callable[[str], str],
    writer,
    now: str,
    on_error: Optional[Callable[[str, Exception], None]] = None,
) -> dict[str, Optional[int]]:
    """Sync every format. A failure in one does not abort the rest.

    Returns a map of format code -> archetype count (or None if that format
    failed).
    """
    results: dict[str, Optional[int]] = {}
    for fmt in formats:
        try:
            results[fmt] = sync_format(fmt, fetch=fetch, writer=writer, now=now)
        except Exception as exc:  # noqa: BLE001 — one bad format must not stop the run
            results[fmt] = None
            if on_error is not None:
                on_error(fmt, exc)
    return results

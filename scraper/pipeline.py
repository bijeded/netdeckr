"""Scraper pipeline orchestration.

Pure control flow: fetch + parse one (format, window), then hand a ranked
breakdown to a writer. Network (fetch) and DB (writer) are injected so this
module is fully unit-testable without touching the wire.
"""
from __future__ import annotations

from typing import Callable, Optional

from mtgtop8 import parse_meta_breakdown, rank_archetypes


def sync_format(
    fmt: str,
    meta_window: str,
    *,
    fetch: Callable[[str, str], str],
    writer,
    now: str,
) -> int:
    """Sync one (format, window) breakdown.

    Fetches and parses first: if either raises, no write happens and prior data
    for this slice is left intact. Only after a successful write is the
    (format, window) slice stamped as updated. Returns the archetype count.
    """
    html = fetch(fmt, meta_window)  # raises on source failure — before any write
    archetypes = rank_archetypes(parse_meta_breakdown(html))
    writer.replace_breakdown(fmt, meta_window, archetypes)
    writer.stamp_updated(fmt, meta_window, now)
    return len(archetypes)


def sync_all(
    formats: list[str],
    windows: list[str],
    *,
    fetch: Callable[[str, str], str],
    writer,
    now: str,
    on_error: Optional[Callable[[str, str, Exception], None]] = None,
) -> dict[tuple[str, str], Optional[int]]:
    """Sync every (format, window) pair. A failure in one does not abort the rest.

    Returns a map of (format code, window) -> archetype count (or None if that
    pair failed).
    """
    results: dict[tuple[str, str], Optional[int]] = {}
    for fmt in formats:
        for meta_window in windows:
            try:
                results[(fmt, meta_window)] = sync_format(
                    fmt, meta_window, fetch=fetch, writer=writer, now=now
                )
            except Exception as exc:  # noqa: BLE001 — one bad pair must not stop the run
                results[(fmt, meta_window)] = None
                if on_error is not None:
                    on_error(fmt, meta_window, exc)
    return results

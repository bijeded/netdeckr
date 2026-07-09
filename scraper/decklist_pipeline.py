"""Decklist scraping orchestration.

Pure control flow for the decklist pass: gather a format's events (deduped across
the logical windows), then for each event store its decks and their cards. Network
(fetch) and DB (writer) are injected so this module is unit-testable without the
wire. The metagame breakdown is derived frontend-side from these stored decks.

Every event and every deck (all finishes) is stored — the frontend selects what to
display (top finishes, else the latest lists), and later event/archetype filters
need the complete set.
"""
from __future__ import annotations

from typing import AbstractSet, Callable, Optional

from mtgtop8 import parse_decklist, parse_event_decks, parse_event_list, parse_event_size

# Safety cap on how many events-list pages to follow per window. MTGTop8 shows
# ~24 events per page; the two-week window is a handful of pages, so this only
# bounds a runaway (e.g. a page that never stops yielding new events).
DEFAULT_MAX_PAGES = 20


def sync_decklists(
    fmt: str,
    windows: list[str],
    *,
    fetch_format_page: Callable[..., str],
    fetch_event_page: Callable[..., str],
    writer,
    skip_event_ids: AbstractSet[str] = frozenset(),
    on_error: Optional[Callable[[str, str, Exception], None]] = None,
    max_pages: int = DEFAULT_MAX_PAGES,
) -> int:
    """Scrape and store every new event and deck for one format.

    Gathers events from each window's format page — following every page of the
    events list (``&cp=2``, ``&cp=3``, …) until a page yields no new events or the
    ``max_pages`` cap is reached — deduped by source event id across pages and
    windows. Then per event stores the event, each deck (get-or-create archetype),
    and each deck's cards. Events whose id is in ``skip_event_ids`` are skipped
    entirely (no results/deck fetches) — a past event's decklists do not change,
    so daily runs only fetch new events (and, since MTGTop8 lists newest-first, a
    first all-known page halts pagination cheaply). A failure on one window or one
    event does not abort the rest. Returns the number of decks stored.
    """
    events = {}
    for window in windows:
        try:
            for page in range(1, max_pages + 1):
                html = fetch_format_page(fmt, window) if page == 1 else fetch_format_page(fmt, window, page)
                new_on_page = 0
                for event in parse_event_list(html):
                    if event.source_event_id in skip_event_ids:
                        continue
                    if event.source_event_id not in events:
                        events[event.source_event_id] = event
                        new_on_page += 1
                if new_on_page == 0:
                    break  # past the last page (empty, repeated, or all already-known)
        except Exception as exc:  # noqa: BLE001 — one bad window must not stop the rest
            if on_error is not None:
                on_error(fmt, window, exc)

    deck_count = 0
    for event in events.values():
        try:
            event_page = fetch_event_page(fmt, event.source_event_id)
            event.player_count = parse_event_size(event_page)
            event_id = writer.upsert_event(fmt, event)
            results = parse_event_decks(event_page)
            for result in results:
                archetype_id = writer.upsert_archetype(fmt, result.archetype_name)
                deck_id = writer.upsert_deck(event_id, archetype_id, result)
                cards = parse_decklist(
                    fetch_event_page(fmt, event.source_event_id, result.source_deck_id)
                )
                writer.replace_deck_cards(deck_id, cards)
                deck_count += 1
        except Exception as exc:  # noqa: BLE001 — one bad event must not stop the rest
            if on_error is not None:
                on_error(fmt, event.source_event_id, exc)

    return deck_count


def backfill_event_sizes(
    writer,
    *,
    fetch_event_page: Callable[..., str],
    on_error: Optional[Callable[[str, Exception], None]] = None,
) -> int:
    """Fill `events.player_count` on stored events that still have it null.

    A one-time pass: for each null-size event the writer reports, fetch its event
    page, parse the reported size, and write it when present (a miss leaves the row
    null, revisited on a later run). Touches only `events.player_count` — never
    decks or cards. Network is injected so this is unit-testable. A failure on one
    event does not abort the rest. Returns the number of events updated.
    """
    updated = 0
    for event in writer.events_missing_size():
        try:
            size = parse_event_size(
                fetch_event_page(event["format_code"], event["source_event_id"])
            )
            if size is not None:
                writer.set_event_size(event["id"], size)
                updated += 1
        except Exception as exc:  # noqa: BLE001 — one bad event must not stop the rest
            if on_error is not None:
                on_error(event["source_event_id"], exc)
    return updated

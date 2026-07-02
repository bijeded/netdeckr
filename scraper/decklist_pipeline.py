"""Decklist scraping orchestration.

Pure control flow for the decklist pass: gather a format's events (deduped across
the logical windows), then for each event store its decks and their cards. Network
(fetch) and DB (writer) are injected so this module is unit-testable without the
wire. Complements pipeline.py, which handles the metagame breakdown.

Every event and every deck (all finishes) is stored — the frontend selects what to
display (top finishes, else the latest lists), and later event/archetype filters
need the complete set.
"""
from __future__ import annotations

from typing import AbstractSet, Callable, Optional

from mtgtop8 import parse_decklist, parse_event_decks, parse_event_list


def sync_decklists(
    fmt: str,
    windows: list[str],
    *,
    fetch_format_page: Callable[[str, str], str],
    fetch_event_page: Callable[..., str],
    writer,
    skip_event_ids: AbstractSet[str] = frozenset(),
    on_error: Optional[Callable[[str, str, Exception], None]] = None,
) -> int:
    """Scrape and store every new event and deck for one format.

    Gathers events from each window's format page (deduped by source event id),
    then per event stores the event, each deck (get-or-create archetype), and each
    deck's cards. Events whose id is in ``skip_event_ids`` are skipped entirely
    (no results/deck fetches) — a past event's decklists do not change, so daily
    runs only fetch new events. A failure on one window or one event does not
    abort the rest. Returns the number of decks stored.
    """
    events = {}
    for window in windows:
        try:
            for event in parse_event_list(fetch_format_page(fmt, window)):
                if event.source_event_id in skip_event_ids:
                    continue
                events.setdefault(event.source_event_id, event)
        except Exception as exc:  # noqa: BLE001 — one bad window must not stop the rest
            if on_error is not None:
                on_error(fmt, window, exc)

    deck_count = 0
    for event in events.values():
        try:
            event_id = writer.upsert_event(fmt, event)
            results = parse_event_decks(fetch_event_page(fmt, event.source_event_id))
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

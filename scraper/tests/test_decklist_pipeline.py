import os
import sys
from unittest.mock import MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from decklist_pipeline import sync_decklists  # noqa: E402

FIXTURES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")


def _load(name):
    with open(os.path.join(FIXTURES, name), encoding="utf-8") as fh:
        return fh.read()


def _fake_writer():
    writer = MagicMock()
    writer.upsert_event.return_value = 1
    writer.upsert_archetype.side_effect = range(100, 200)
    writer.upsert_deck.side_effect = range(200, 300)
    return writer


def test_events_deduped_across_windows():
    writer = _fake_writer()
    fetch_format_page = MagicMock(return_value=_load("event_list_ST.html"))
    fetch_event_page = MagicMock(return_value=_load("event_ST.html"))

    sync_decklists(
        "ST",
        ["5days", "2weeks"],
        fetch_format_page=fetch_format_page,
        fetch_event_page=fetch_event_page,
        writer=writer,
    )

    # Same three events appear in both windows but each is upserted once.
    assert writer.upsert_event.call_count == 3


def test_each_deck_is_stored_with_archetype_and_cards():
    writer = _fake_writer()
    fetch_event_page = MagicMock(return_value=_load("event_ST.html"))

    count = sync_decklists(
        "ST",
        ["5days"],
        fetch_format_page=MagicMock(return_value=_load("event_list_ST.html")),
        fetch_event_page=fetch_event_page,
        writer=writer,
    )

    # 3 events x 4 decks each in the event fixture = 12 decks stored.
    assert count == 12
    assert writer.upsert_deck.call_count == 12
    assert writer.replace_deck_cards.call_count == 12
    # Cards from the decklist fixture were parsed and passed through.
    first_cards = writer.replace_deck_cards.call_args_list[0][0][1]
    assert any(c.card_name == "Island" for c in first_cards)


def test_deck_pages_fetched_per_deck():
    writer = _fake_writer()
    fetch_event_page = MagicMock(return_value=_load("event_ST.html"))

    sync_decklists(
        "ST",
        ["5days"],
        fetch_format_page=MagicMock(return_value=_load("event_list_ST.html")),
        fetch_event_page=fetch_event_page,
        writer=writer,
    )

    # The deck page fetch passes a deck id (kwarg or 3rd positional arg).
    deck_fetches = [
        c for c in fetch_event_page.call_args_list
        if len(c[0]) >= 3 or "deck_id" in c[1]
    ]
    assert len(deck_fetches) == 12


def test_incremental_skips_known_events():
    writer = _fake_writer()
    fetch_event_page = MagicMock(return_value=_load("event_ST.html"))

    # Fixture has events 87496, 87497, 87444; skip the first two.
    count = sync_decklists(
        "ST",
        ["5days"],
        fetch_format_page=MagicMock(return_value=_load("event_list_ST.html")),
        fetch_event_page=fetch_event_page,
        writer=writer,
        skip_event_ids={"87496", "87497"},
    )

    # Only the one new event (87444, 4 decks) is processed.
    assert writer.upsert_event.call_count == 1
    assert count == 4
    fetched_event_ids = {c[0][1] for c in fetch_event_page.call_args_list}
    assert "87496" not in fetched_event_ids
    assert "87497" not in fetched_event_ids
    assert "87444" in fetched_event_ids


def test_event_failure_does_not_abort_the_rest():
    writer = _fake_writer()
    # Second event's page fetch fails; the other two events still process.
    fetch_event_page = MagicMock(
        side_effect=[
            _load("event_ST.html"), _load("event_ST.html"), _load("event_ST.html"),
            _load("event_ST.html"), _load("event_ST.html"),  # event 1: list + 4 decks
            RuntimeError("boom"),                              # event 2: list fetch fails
            _load("event_ST.html"), _load("event_ST.html"), _load("event_ST.html"),
            _load("event_ST.html"), _load("event_ST.html"),  # event 3: list + 4 decks
        ]
    )
    errors = []

    count = sync_decklists(
        "ST",
        ["5days"],
        fetch_format_page=MagicMock(return_value=_load("event_list_ST.html")),
        fetch_event_page=fetch_event_page,
        writer=writer,
        on_error=lambda fmt, ctx, exc: errors.append((fmt, ctx)),
    )

    assert count == 8  # events 1 and 3 (4 decks each); event 2 skipped
    assert len(errors) == 1

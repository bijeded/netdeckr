import os
import sys
from unittest.mock import MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from decklist_pipeline import backfill_event_sizes, sync_decklists  # noqa: E402

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


def test_event_size_is_parsed_from_page_and_passed_to_upsert():
    writer = _fake_writer()
    # Event page reports "21 players"; the pipeline reads it off that page and
    # sets it on the event before upserting.
    fetch_event_page = MagicMock(return_value=_load("event_players_ST.html"))

    sync_decklists(
        "ST",
        ["5days"],
        fetch_format_page=MagicMock(return_value=_load("event_list_ST.html")),
        fetch_event_page=fetch_event_page,
        writer=writer,
    )

    events = [c.args[1] for c in writer.upsert_event.call_args_list]
    assert events and all(e.player_count == 21 for e in events)


def test_event_size_absent_leaves_player_count_none():
    writer = _fake_writer()
    # The results-only fixture reports no size -> player_count stays None.
    fetch_event_page = MagicMock(return_value=_load("event_ST.html"))

    sync_decklists(
        "ST",
        ["5days"],
        fetch_format_page=MagicMock(return_value=_load("event_list_ST.html")),
        fetch_event_page=fetch_event_page,
        writer=writer,
    )

    events = [c.args[1] for c in writer.upsert_event.call_args_list]
    assert events and all(e.player_count is None for e in events)


def test_pagination_follows_and_dedupes_across_pages():
    writer = _fake_writer()
    fetch_format_page = MagicMock(
        side_effect=[
            _load("event_list_ST.html"),     # page 1: 87496, 87497, 87444
            _load("event_list_ST_p2.html"),  # page 2: 87498, 87151, 87045
            _load("event_list_empty.html"),  # page 3: no events -> stop
        ]
    )
    fetch_event_page = MagicMock(return_value=_load("event_ST.html"))

    sync_decklists(
        "ST",
        ["2weeks"],
        fetch_format_page=fetch_format_page,
        fetch_event_page=fetch_event_page,
        writer=writer,
    )

    # 3 events on page 1 + 3 distinct events on page 2 = 6 events stored.
    assert writer.upsert_event.call_count == 6
    # Pages 2 and 3 were requested with a cp page number (3rd positional arg).
    cps = [c.args[2] for c in fetch_format_page.call_args_list if len(c.args) >= 3]
    assert cps == [2, 3]


def test_pagination_stops_when_a_page_has_no_new_events():
    writer = _fake_writer()
    # Every page returns the same three events; page 2 yields nothing new -> stop.
    fetch_format_page = MagicMock(return_value=_load("event_list_ST.html"))
    fetch_event_page = MagicMock(return_value=_load("event_ST.html"))

    sync_decklists(
        "ST",
        ["2weeks"],
        fetch_format_page=fetch_format_page,
        fetch_event_page=fetch_event_page,
        writer=writer,
    )

    # Page 1 (3 new) then page 2 (0 new) -> exactly two page fetches, 3 events.
    assert fetch_format_page.call_count == 2
    assert writer.upsert_event.call_count == 3


def test_pagination_respects_the_page_cap():
    writer = _fake_writer()
    counter = {"n": 0}

    def unique_page(*_args, **_kwargs):
        counter["n"] += 1
        i = counter["n"]
        return (
            "<table><tr class=hover_tr>"
            f"<td class=S14><a href=event?e=90{i:03d}&f=ST>E{i}</a></td>"
            "<td class=S12>01/07/26</td></tr></table>"
        )

    # Every page returns a brand-new event, so only the cap can stop the loop.
    fetch_format_page = MagicMock(side_effect=unique_page)
    fetch_event_page = MagicMock(return_value=_load("event_ST.html"))

    sync_decklists(
        "ST",
        ["2weeks"],
        fetch_format_page=fetch_format_page,
        fetch_event_page=fetch_event_page,
        writer=writer,
        max_pages=3,
    )

    assert fetch_format_page.call_count == 3  # capped at max_pages
    assert writer.upsert_event.call_count == 3  # one new event per page


def test_pagination_short_circuits_when_first_page_all_known():
    writer = _fake_writer()
    # All of page 1's events are already stored; MTGTop8 lists newest-first, so no
    # new event lies deeper — pagination halts after a single fetch on daily runs.
    fetch_format_page = MagicMock(return_value=_load("event_list_ST.html"))
    fetch_event_page = MagicMock(return_value=_load("event_ST.html"))

    count = sync_decklists(
        "ST",
        ["2weeks"],
        fetch_format_page=fetch_format_page,
        fetch_event_page=fetch_event_page,
        writer=writer,
        skip_event_ids={"87496", "87497", "87444"},
    )

    assert fetch_format_page.call_count == 1  # a first all-known page halts pagination
    assert count == 0
    writer.upsert_event.assert_not_called()


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


# --- backfill_event_sizes ---------------------------------------------------


def _size_writer(rows):
    writer = MagicMock()
    writer.events_missing_size.return_value = rows
    return writer


def test_backfill_event_sizes_fills_found_sizes():
    writer = _size_writer([
        {"id": 1, "source_event_id": "87496", "format_code": "ST"},
        {"id": 2, "source_event_id": "87497", "format_code": "ST"},
    ])
    fetch_event_page = MagicMock(return_value=_load("event_players_ST.html"))  # reports 21

    updated = backfill_event_sizes(writer, fetch_event_page=fetch_event_page)

    assert updated == 2
    calls = {c[0][0]: c[0][1] for c in writer.set_event_size.call_args_list}
    assert calls == {1: 21, 2: 21}
    # Fetches the event page by (format, source_event_id); never a deck id.
    assert all(len(c[0]) == 2 for c in fetch_event_page.call_args_list)


def test_backfill_event_sizes_skips_pages_without_a_size():
    writer = _size_writer([{"id": 1, "source_event_id": "87496", "format_code": "ST"}])
    fetch_event_page = MagicMock(return_value=_load("event_no_players_ST.html"))  # no size

    updated = backfill_event_sizes(writer, fetch_event_page=fetch_event_page)

    assert updated == 0
    writer.set_event_size.assert_not_called()


def test_backfill_event_sizes_continues_past_one_error():
    writer = _size_writer([
        {"id": 1, "source_event_id": "1", "format_code": "ST"},
        {"id": 2, "source_event_id": "2", "format_code": "ST"},
    ])
    fetch_event_page = MagicMock(side_effect=[RuntimeError("boom"), _load("event_players_ST.html")])
    errors = []

    updated = backfill_event_sizes(
        writer, fetch_event_page=fetch_event_page, on_error=lambda ctx, exc: errors.append(ctx)
    )

    assert updated == 1  # event 2 still processed after event 1 failed
    assert len(errors) == 1


def test_backfill_event_sizes_touches_only_events():
    writer = _size_writer([{"id": 1, "source_event_id": "87496", "format_code": "ST"}])
    fetch_event_page = MagicMock(return_value=_load("event_players_ST.html"))

    backfill_event_sizes(writer, fetch_event_page=fetch_event_page)

    # No deck/card writes happen during a size backfill.
    writer.upsert_deck.assert_not_called()
    writer.replace_deck_cards.assert_not_called()

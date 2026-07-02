import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mtgtop8 import (  # noqa: E402
    parse_decklist,
    parse_event_decks,
    parse_event_list,
)

FIXTURES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")


def _load(name):
    with open(os.path.join(FIXTURES, name), encoding="utf-8") as fh:
        return fh.read()


# --- parse_event_list -------------------------------------------------------


def test_event_list_parses_each_event_once():
    events = parse_event_list(_load("event_list_ST.html"))
    # Three events; the venue anchor must not create a duplicate of e=87496.
    assert [e.source_event_id for e in events] == ["87496", "87497", "87444"]


def test_event_list_reads_name_not_venue():
    events = parse_event_list(_load("event_list_ST.html"))
    by_id = {e.source_event_id: e for e in events}
    assert by_id["87496"].name == "$uper $unday RCQ 9:30am"
    assert by_id["87497"].name == "MTGO Challenge 32"


def test_event_list_parses_date_to_iso():
    events = parse_event_list(_load("event_list_ST.html"))
    by_id = {e.source_event_id: e for e in events}
    # DD/MM/YY -> ISO date; 26 -> 2026.
    assert by_id["87496"].event_date == "2026-06-28"
    assert by_id["87497"].event_date == "2026-06-27"


def test_event_list_missing_date_is_none():
    events = parse_event_list(_load("event_list_ST.html"))
    by_id = {e.source_event_id: e for e in events}
    assert by_id["87444"].event_date is None


# --- parse_event_decks ------------------------------------------------------


def test_event_decks_parses_all_result_rows():
    decks = parse_event_decks(_load("event_ST.html"))
    assert [d.source_deck_id for d in decks] == ["863982", "863983", "863984", "863985"]


def test_event_decks_reads_placing_player_archetype():
    decks = parse_event_decks(_load("event_ST.html"))
    first = decks[0]
    assert first.placing == "1"
    assert first.player == "Norbspro"
    assert first.archetype_name == "Izzet Spellementals"


def test_event_decks_keeps_range_placings():
    decks = parse_event_decks(_load("event_ST.html"))
    by_id = {d.source_deck_id: d for d in decks}
    assert by_id["863984"].placing == "3-4"
    assert by_id["863985"].placing == "5-8"
    assert by_id["863985"].player == "Javier Dominguez"


# --- parse_decklist ---------------------------------------------------------


def test_decklist_splits_main_and_side():
    cards = parse_decklist(_load("event_ST.html"))
    main = [c for c in cards if c.board == "main"]
    side = [c for c in cards if c.board == "side"]
    assert len(main) == 3
    assert len(side) == 2


def test_decklist_reads_quantity_and_name():
    cards = parse_decklist(_load("event_ST.html"))
    main = [c for c in cards if c.board == "main"]
    assert main[0].quantity == 6
    assert main[0].card_name == "Island"
    side = [c for c in cards if c.board == "side"]
    assert side[0].quantity == 2
    assert side[0].card_name == "Annul"


def test_decklist_scryfall_fields_absent():
    # This change stores scraped names only; Scryfall mapping is a later change.
    card = parse_decklist(_load("event_ST.html"))[0]
    assert not hasattr(card, "scryfall_name") or card.scryfall_name is None

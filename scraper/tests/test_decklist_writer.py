import os
import sys
from unittest.mock import MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mtgtop8 import DeckCard, DeckResult, Event  # noqa: E402
from supabase_writer import SupabaseWriter  # noqa: E402

URL = "https://example.supabase.co"
KEY = "service-role-key"


def _response(json_data=None, status=200):
    resp = MagicMock()
    resp.status_code = status
    resp.json.return_value = json_data if json_data is not None else []
    resp.raise_for_status.return_value = None
    return resp


def _writer(session):
    return SupabaseWriter(URL, KEY, session=session)


def test_upsert_event_uses_conflict_key_and_returns_id():
    session = MagicMock()
    session.post.return_value = _response([{"id": 42}])
    event = Event(source_event_id="87496", name="RCQ", event_date="2026-06-28")

    event_id = _writer(session).upsert_event("ST", event)

    assert event_id == 42
    url = session.post.call_args[0][0]
    assert "/rest/v1/events" in url
    assert "on_conflict=source_event_id,format_code" in url
    body = session.post.call_args[1]["json"]
    assert body["source_event_id"] == "87496"
    assert body["format_code"] == "ST"
    assert body["event_date"] == "2026-06-28"
    assert "merge-duplicates" in session.post.call_args[1]["headers"]["Prefer"]


def test_upsert_deck_carries_player_placing_and_returns_id():
    session = MagicMock()
    session.post.return_value = _response([{"id": 7}])
    deck = DeckResult(source_deck_id="863982", placing="3-4", archetype_name="Dimir Midrange", player="Spike")

    deck_id = _writer(session).upsert_deck(event_id=42, archetype_id=10, deck=deck)

    assert deck_id == 7
    url = session.post.call_args[0][0]
    assert "/rest/v1/decks" in url
    assert "on_conflict=event_id,source_deck_id" in url
    body = session.post.call_args[1]["json"]
    assert body["event_id"] == 42
    assert body["archetype_id"] == 10
    assert body["source_deck_id"] == "863982"
    assert body["placement"] == "3-4"  # DB column (`placing` is a reserved keyword)
    assert body["player"] == "Spike"


def test_replace_deck_cards_clears_then_inserts_with_null_scryfall():
    session = MagicMock()
    session.delete.return_value = _response(status=204)
    session.post.return_value = _response(status=201)
    cards = [
        DeckCard(board="main", quantity=6, card_name="Island"),
        DeckCard(board="side", quantity=2, card_name="Annul"),
    ]

    _writer(session).replace_deck_cards(7, cards)

    delete_url = session.delete.call_args[0][0]
    assert "/rest/v1/deck_cards" in delete_url
    assert "deck_id=eq.7" in delete_url
    rows = session.post.call_args[1]["json"]
    assert rows[0] == {"deck_id": 7, "board": "main", "quantity": 6, "card_name": "Island"}
    # Scryfall columns are left out entirely (populated by a later change).
    assert "scryfall_name" not in rows[0]


def test_replace_deck_cards_with_none_only_clears():
    session = MagicMock()
    session.delete.return_value = _response(status=204)
    _writer(session).replace_deck_cards(7, [])
    session.delete.assert_called_once()
    session.post.assert_not_called()


def test_existing_event_ids_queries_format_and_returns_set():
    session = MagicMock()
    session.get.return_value = _response([{"source_event_id": "1"}, {"source_event_id": "2"}])

    ids = _writer(session).existing_event_ids("ST")

    assert ids == {"1", "2"}
    url = session.get.call_args[0][0]
    assert "/rest/v1/events" in url
    assert "format_code=eq.ST" in url
    assert "select=source_event_id" in url


def test_existing_event_ids_empty_when_none_stored():
    session = MagicMock()
    session.get.return_value = _response([])
    assert _writer(session).existing_event_ids("ST") == set()


def test_prune_events_before_deletes_older_events():
    session = MagicMock()
    session.delete.return_value = _response(status=204)

    _writer(session).prune_events_before("2026-01-01")

    url = session.delete.call_args[0][0]
    assert "/rest/v1/events" in url
    assert "event_date=lt.2026-01-01" in url


def test_upsert_archetype_resolves_case_variant_to_existing_row():
    # Reproduces the casing bug: MTGTop8's decklist table title-cases an
    # archetype ("Uw Control") the breakdown spells "UW Control". The writer must
    # resolve to the existing row case-insensitively, not create a duplicate.
    session = MagicMock()
    session.get.return_value = _response([{"id": 57, "name": "UW Control"}])

    arch_id = _writer(session).upsert_archetype("MO", "Uw Control")

    assert arch_id == 57
    session.post.assert_not_called()  # no duplicate archetype row inserted


def test_upsert_archetype_inserts_when_not_present():
    session = MagicMock()
    session.get.return_value = _response([])  # no archetypes yet for the format
    session.post.return_value = _response([{"id": 200}])

    arch_id = _writer(session).upsert_archetype("MO", "Mardu Energy")

    assert arch_id == 200
    post_url = session.post.call_args[0][0]
    assert "/rest/v1/archetypes" in post_url
    body = session.post.call_args[1]["json"]
    assert body["name"] == "Mardu Energy"
    assert body["format_code"] == "MO"


def test_upsert_archetype_caches_within_a_format_run():
    # A second case-variant of a just-inserted archetype in the same run must not
    # insert again, and the format's archetypes are loaded only once.
    session = MagicMock()
    session.get.return_value = _response([])
    session.post.return_value = _response([{"id": 200}])
    writer = _writer(session)

    first = writer.upsert_archetype("MO", "Mardu Energy")
    second = writer.upsert_archetype("MO", "mardu energy")

    assert first == second == 200
    assert session.post.call_count == 1  # inserted exactly once
    assert session.get.call_count == 1  # format archetypes loaded once

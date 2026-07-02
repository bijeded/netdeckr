import os
import sys
from unittest.mock import MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mtgtop8 import DeckCard, DeckResult, Event  # noqa: E402
from scryfall import Printing  # noqa: E402
from supabase_writer import SupabaseWriter  # noqa: E402


class _StubResolver:
    """Minimal card resolver: resolves the given names, misses everything else."""

    def __init__(self, printings: dict):
        self._printings = printings

    def resolve(self, name):
        return self._printings.get(name)

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


def test_replace_deck_cards_enriches_resolvable_cards_with_scryfall_identity():
    session = MagicMock()
    session.delete.return_value = _response(status=204)
    session.post.return_value = _response(status=201)
    resolver = _StubResolver(
        {"Lightning Bolt": Printing(name="Lightning Bolt", set_code="CLU", collector_number="141")}
    )
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)
    cards = [
        DeckCard(board="main", quantity=4, card_name="Lightning Bolt"),
        DeckCard(board="main", quantity=2, card_name="Homebrew Nonsense"),
    ]

    writer.replace_deck_cards(9, cards)

    rows = session.post.call_args[1]["json"]
    # Resolvable card carries the canonical Scryfall identity.
    assert rows[0]["scryfall_name"] == "Lightning Bolt"
    assert rows[0]["set_code"] == "CLU"
    assert rows[0]["collector_number"] == "141"
    assert rows[0]["card_name"] == "Lightning Bolt"
    # A miss leaves the Scryfall columns null (scraped name retained).
    assert rows[1]["card_name"] == "Homebrew Nonsense"
    assert rows[1]["scryfall_name"] is None
    assert rows[1]["set_code"] is None
    assert rows[1]["collector_number"] is None


def test_replace_deck_cards_without_resolver_omits_scryfall_columns():
    # No resolver configured → columns are omitted entirely (unchanged behavior).
    session = MagicMock()
    session.delete.return_value = _response(status=204)
    session.post.return_value = _response(status=201)
    cards = [DeckCard(board="main", quantity=4, card_name="Lightning Bolt")]

    _writer(session).replace_deck_cards(9, cards)

    rows = session.post.call_args[1]["json"]
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


# -- Scryfall backfill -----------------------------------------------------

def test_backfill_scryfall_requires_a_resolver():
    import pytest

    with pytest.raises(RuntimeError):
        _writer(MagicMock()).backfill_scryfall()


def test_backfill_scryfall_patches_resolvable_names_and_skips_misses():
    session = MagicMock()
    # One page of still-null rows (two Lightning Bolt lines + one unmappable),
    # then an empty page to end the cursor loop.
    session.get.side_effect = [
        _response(
            [
                {"id": 1, "card_name": "Lightning Bolt"},
                {"id": 2, "card_name": "Lightning Bolt"},
                {"id": 3, "card_name": "Homebrew Nonsense"},
            ]
        ),
        _response([]),
    ]
    # PATCH returns the representation of the rows it updated (2 Bolt lines).
    session.patch.return_value = _response([{"id": 1}, {"id": 2}])
    resolver = _StubResolver(
        {"Lightning Bolt": Printing(name="Lightning Bolt", set_code="CLU", collector_number="141")}
    )
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    updated = writer.backfill_scryfall()

    assert updated == 2  # only the resolvable rows counted
    # Exactly one PATCH — for the single resolvable distinct name.
    assert session.patch.call_count == 1
    patch_url = session.patch.call_args[0][0]
    assert "/rest/v1/deck_cards" in patch_url
    assert "card_name=eq." in patch_url
    assert "scryfall_name=is.null" in patch_url  # only touch still-null rows
    body = session.patch.call_args[1]["json"]
    assert body == {"scryfall_name": "Lightning Bolt", "set_code": "CLU", "collector_number": "141"}


def test_backfill_scryfall_no_null_rows_is_a_noop():
    session = MagicMock()
    session.get.return_value = _response([])  # nothing left to map
    resolver = _StubResolver({})
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    assert writer.backfill_scryfall() == 0
    session.patch.assert_not_called()

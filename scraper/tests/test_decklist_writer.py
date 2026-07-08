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
        {
            "Lightning Bolt": Printing(
                name="Lightning Bolt",
                set_code="CLU",
                collector_number="141",
                image_url="https://cards.scryfall.io/normal/bolt.jpg",
                type_line="Instant",
                rarity="uncommon",
                cmc=1,
                released_at="2024-02-23",
            )
        }
    )
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)
    cards = [
        DeckCard(board="main", quantity=4, card_name="Lightning Bolt"),
        DeckCard(board="main", quantity=2, card_name="Homebrew Nonsense"),
    ]

    writer.replace_deck_cards(9, cards)

    rows = session.post.call_args[1]["json"]
    # Resolvable card carries the canonical Scryfall identity + image + metadata.
    assert rows[0]["scryfall_name"] == "Lightning Bolt"
    assert rows[0]["set_code"] == "CLU"
    assert rows[0]["collector_number"] == "141"
    assert rows[0]["image_url"] == "https://cards.scryfall.io/normal/bolt.jpg"
    assert rows[0]["card_name"] == "Lightning Bolt"
    assert rows[0]["type_line"] == "Instant"
    assert rows[0]["rarity"] == "uncommon"
    assert rows[0]["cmc"] == 1
    assert rows[0]["released_at"] == "2024-02-23"
    # A miss leaves the Scryfall columns null (scraped name retained).
    assert rows[1]["card_name"] == "Homebrew Nonsense"
    assert rows[1]["scryfall_name"] is None
    assert rows[1]["set_code"] is None
    assert rows[1]["collector_number"] is None
    assert rows[1]["image_url"] is None
    assert rows[1]["type_line"] is None
    assert rows[1]["rarity"] is None
    assert rows[1]["cmc"] is None
    assert rows[1]["released_at"] is None


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
    # One page of still-null rows (two planeswalker lines whose name carries a
    # comma + one unmappable), then an empty page to end the cursor loop.
    session.get.side_effect = [
        _response(
            [
                {"id": 1, "card_name": "Ral, Crackling Wit"},
                {"id": 2, "card_name": "Ral, Crackling Wit"},
                {"id": 3, "card_name": "Homebrew Nonsense"},
            ]
        ),
        _response([]),
    ]
    # PATCH returns the representation of the rows it updated (2 Ral lines).
    session.patch.return_value = _response([{"id": 1}, {"id": 2}])
    resolver = _StubResolver(
        {
            "Ral, Crackling Wit": Printing(
                name="Ral, Crackling Wit",
                set_code="DFT",
                collector_number="129",
                image_url="https://cards.scryfall.io/normal/ral.jpg",
            )
        }
    )
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    updated = writer.backfill_scryfall()

    assert updated == 2  # only the resolvable rows counted
    # Exactly one PATCH — for the single resolvable distinct name.
    assert session.patch.call_count == 1
    patch_url = session.patch.call_args[0][0]
    assert "/rest/v1/deck_cards" in patch_url
    assert "image_url=is.null" in patch_url  # image_url is the completeness sentinel
    # The filter value is percent-encoded (comma -> %2C, space -> %20) and NOT
    # wrapped in double quotes — PostgREST matches a double-quoted value literally,
    # which matched zero rows in production.
    assert "card_name=eq.Ral%2C%20Crackling%20Wit" in patch_url
    assert "%22" not in patch_url
    body = session.patch.call_args[1]["json"]
    assert body == {
        "scryfall_name": "Ral, Crackling Wit",
        "set_code": "DFT",
        "collector_number": "129",
        "image_url": "https://cards.scryfall.io/normal/ral.jpg",
    }
    # Rows are paged on image_url (the sentinel) so identity-mapped rows that
    # predate the image column (scryfall_name set, image_url null) are re-enriched.
    read_url = session.get.call_args_list[0][0][0]
    assert "image_url=is.null" in read_url


def test_backfill_scryfall_writes_identity_even_when_printing_has_no_image():
    # A card that resolves but whose printing carries no image still gets its
    # identity columns backfilled (image_url stays null). Deliberate: identity is
    # useful for export even without art. Such rows are (rarely) revisited on a
    # re-run since image_url remains the null sentinel.
    session = MagicMock()
    session.get.side_effect = [
        _response([{"id": 1, "card_name": "Imageless Card"}]),
        _response([]),
    ]
    session.patch.return_value = _response([{"id": 1}])
    resolver = _StubResolver(
        {"Imageless Card": Printing(name="Imageless Card", set_code="ABC", collector_number="7", image_url=None)}
    )
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    updated = writer.backfill_scryfall()

    assert updated == 1
    body = session.patch.call_args[1]["json"]
    assert body["scryfall_name"] == "Imageless Card"
    assert body["set_code"] == "ABC"
    assert body["image_url"] is None


def test_backfill_scryfall_no_null_rows_is_a_noop():
    session = MagicMock()
    session.get.return_value = _response([])  # nothing left to map
    resolver = _StubResolver({})
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    assert writer.backfill_scryfall() == 0
    session.patch.assert_not_called()


# -- Metadata backfill -----------------------------------------------------

def test_backfill_metadata_requires_a_resolver():
    import pytest

    with pytest.raises(RuntimeError):
        _writer(MagicMock()).backfill_metadata()


def test_backfill_metadata_pages_on_type_line_and_writes_all_columns():
    session = MagicMock()
    # One page of rows missing metadata (type_line is null), then an empty page.
    session.get.side_effect = [
        _response(
            [
                {"id": 1, "card_name": "Lightning Bolt"},
                {"id": 2, "card_name": "Lightning Bolt"},
                {"id": 3, "card_name": "Homebrew Nonsense"},  # unresolvable
            ]
        ),
        _response([]),
    ]
    session.patch.return_value = _response([{"id": 1}, {"id": 2}])
    resolver = _StubResolver(
        {
            "Lightning Bolt": Printing(
                name="Lightning Bolt",
                set_code="CLU",
                collector_number="141",
                image_url="https://cards.scryfall.io/normal/bolt.jpg",
                art_crop_url="https://cards.scryfall.io/art_crop/bolt.jpg",
                type_line="Instant",
                rarity="uncommon",
                cmc=1,
                released_at="2024-02-23",
            )
        }
    )
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    updated = writer.backfill_metadata()

    assert updated == 2  # only the resolvable rows counted
    # Rows are read paging on the type_line sentinel.
    read_url = session.get.call_args_list[0][0][0]
    assert "type_line=is.null" in read_url
    assert session.patch.call_count == 1
    patch_url = session.patch.call_args[0][0]
    assert "/rest/v1/deck_cards" in patch_url
    assert "type_line=is.null" in patch_url  # sentinel filter on the PATCH too
    assert "card_name=eq.Lightning%20Bolt" in patch_url
    assert "%22" not in patch_url
    body = session.patch.call_args[1]["json"]
    # All columns are (re)written, including identity/image and the new metadata.
    assert body == {
        "scryfall_name": "Lightning Bolt",
        "set_code": "CLU",
        "collector_number": "141",
        "image_url": "https://cards.scryfall.io/normal/bolt.jpg",
        "type_line": "Instant",
        "rarity": "uncommon",
        "cmc": 1,
        "released_at": "2024-02-23",
    }


def test_backfill_metadata_skips_unresolvable_names():
    session = MagicMock()
    session.get.side_effect = [
        _response([{"id": 1, "card_name": "Totally Made Up"}]),
        _response([]),
    ]
    resolver = _StubResolver({})  # nothing resolves
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    assert writer.backfill_metadata() == 0
    session.patch.assert_not_called()  # unresolved rows stay null


def test_backfill_metadata_no_null_rows_is_a_noop():
    session = MagicMock()
    session.get.return_value = _response([])  # nothing missing metadata
    resolver = _StubResolver({})
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    assert writer.backfill_metadata() == 0
    session.patch.assert_not_called()


# -- Scryfall remap (full re-resolution) -----------------------------------

def test_remap_scryfall_requires_a_resolver():
    import pytest

    with pytest.raises(RuntimeError):
        _writer(MagicMock()).remap_scryfall()


def test_remap_scryfall_rewrites_all_columns_for_resolvable_names():
    session = MagicMock()
    # A page of rows (some already enriched) then an empty page. Remap does NOT
    # filter on a null sentinel — every distinct name is reconsidered.
    session.get.side_effect = [
        _response(
            [
                {"id": 1, "card_name": "Lightning Bolt"},
                {"id": 2, "card_name": "Lightning Bolt"},
                {"id": 3, "card_name": "Homebrew Nonsense"},  # unresolvable
            ]
        ),
        _response([]),
    ]
    session.patch.return_value = _response([{"id": 1}, {"id": 2}])
    resolver = _StubResolver(
        {
            "Lightning Bolt": Printing(
                name="Lightning Bolt",
                set_code="CLU",
                collector_number="141",
                image_url="https://cards.scryfall.io/normal/bolt.jpg",
                art_crop_url="https://cards.scryfall.io/art_crop/bolt.jpg",
                type_line="Instant",
                rarity="uncommon",
                cmc=1,
                released_at="2024-02-23",
            )
        }
    )
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    updated = writer.remap_scryfall()

    assert updated == 2  # only the resolvable rows counted
    # Read pages over ALL rows — no null sentinel on the read.
    read_url = session.get.call_args_list[0][0][0]
    assert "is.null" not in read_url
    assert session.patch.call_count == 1
    patch_url = session.patch.call_args[0][0]
    assert "/rest/v1/deck_cards" in patch_url
    # PATCH targets the name with NO null sentinel — rewrites already-enriched rows.
    assert "is.null" not in patch_url
    assert "card_name=eq.Lightning%20Bolt" in patch_url
    assert "%22" not in patch_url
    body = session.patch.call_args[1]["json"]
    assert body == {
        "scryfall_name": "Lightning Bolt",
        "set_code": "CLU",
        "collector_number": "141",
        "image_url": "https://cards.scryfall.io/normal/bolt.jpg",
        "type_line": "Instant",
        "rarity": "uncommon",
        "cmc": 1,
        "released_at": "2024-02-23",
    }


def test_remap_scryfall_skips_misses_leaving_rows_untouched():
    session = MagicMock()
    session.get.side_effect = [
        _response([{"id": 1, "card_name": "Totally Made Up"}]),
        _response([]),
    ]
    resolver = _StubResolver({})  # nothing resolves
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    assert writer.remap_scryfall() == 0
    session.patch.assert_not_called()  # a miss never writes -> existing data untouched


def test_remap_scryfall_empty_table_is_a_noop():
    session = MagicMock()
    session.get.return_value = _response([])
    resolver = _StubResolver({})
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    assert writer.remap_scryfall() == 0
    session.patch.assert_not_called()


# -- Archetype signature-card art ------------------------------------------

def _card_row(cid, name, qty, *, type_line="Creature", rarity=None, cmc=None, released_at=None):
    return {
        "id": cid,
        "card_name": name,
        "quantity": qty,
        "type_line": type_line,
        "rarity": rarity,
        "cmc": cmc,
        "released_at": released_at,
        "decks": {"archetype_id": 5},
    }


def test_refresh_archetype_art_requires_a_resolver():
    import pytest

    with pytest.raises(RuntimeError):
        _writer(MagicMock()).refresh_archetype_art("MO")


def test_refresh_archetype_art_picks_most_played_nonland_and_stores_art():
    session = MagicMock()
    # 1) list archetypes for the format; 2) a page of this archetype's mainboard
    # cards; 3) an empty page to end the cursor loop.
    session.get.side_effect = [
        _response([{"id": 5, "name": "Izzet Prowess"}]),
        _response(
            [
                _card_row(1, "Island", 8, type_line="Basic Land — Island"),  # land — excluded
                _card_row(2, "Fable of the Mirror-Breaker", 12),
                _card_row(3, "Fable of the Mirror-Breaker", 4),  # another deck, same card
                _card_row(4, "Torch the Tower", 6),
            ]
        ),
        _response([]),
    ]
    session.patch.return_value = _response([{"id": 5}])
    resolver = _StubResolver(
        {
            "Fable of the Mirror-Breaker": Printing(
                name="Fable of the Mirror-Breaker // Reflection of Kiki-Rik",
                set_code="NEO",
                collector_number="141",
                image_url="https://cards.scryfall.io/normal/fable.jpg",
                art_crop_url="https://cards.scryfall.io/art_crop/fable.jpg",
            )
        }
    )
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    writer.refresh_archetype_art("MO")

    assert session.patch.call_count == 1
    patch_url = session.patch.call_args[0][0]
    assert "/rest/v1/archetypes" in patch_url
    assert "id=eq.5" in patch_url
    body = session.patch.call_args[1]["json"]
    # Signature is the most-played NON-land card (Fable 16 > Torch 6; Island excluded).
    assert body["signature_card_name"] == "Fable of the Mirror-Breaker"
    assert body["art_image_url"] == "https://cards.scryfall.io/normal/fable.jpg"
    assert body["art_crop_url"] == "https://cards.scryfall.io/art_crop/fable.jpg"


def test_refresh_archetype_art_leaves_unresolvable_top_card_null():
    session = MagicMock()
    session.get.side_effect = [
        _response([{"id": 5, "name": "Homebrew"}]),
        _response([_card_row(1, "Totally Made Up Card", 20)]),
        _response([]),
    ]
    resolver = _StubResolver({})  # nothing resolves
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    writer.refresh_archetype_art("MO")

    session.patch.assert_not_called()  # no resolvable card -> art stays null


def test_refresh_archetype_art_skips_archetype_with_only_lands():
    session = MagicMock()
    session.get.side_effect = [
        _response([{"id": 5, "name": "Landfall Weird"}]),
        _response(
            [
                _card_row(1, "Mountain", 20, type_line="Basic Land — Mountain"),
                _card_row(2, "Forest", 4, type_line="Basic Land — Forest"),
            ]
        ),
        _response([]),
    ]
    resolver = _StubResolver({"Mountain": Printing(name="Mountain", set_code="X", collector_number="1")})
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    writer.refresh_archetype_art("MO")

    session.patch.assert_not_called()  # only lands -> no signature card


def test_refresh_archetype_art_excludes_nonbasic_land_by_type():
    session = MagicMock()
    session.get.side_effect = [
        _response([{"id": 5, "name": "Aggro"}]),
        _response(
            [
                # A 4-of nonbasic land has the most copies but is excluded by type.
                _card_row(1, "Den of the Bugbear", 16, type_line="Land"),
                _card_row(2, "Monastery Swiftspear", 8, type_line="Creature — Human Monk"),
            ]
        ),
        _response([]),
    ]
    session.patch.return_value = _response([{"id": 5}])
    resolver = _StubResolver(
        {"Monastery Swiftspear": Printing(name="Monastery Swiftspear", set_code="X", collector_number="1", image_url="s.jpg")}
    )
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    writer.refresh_archetype_art("MO")

    body = session.patch.call_args[1]["json"]
    assert body["signature_card_name"] == "Monastery Swiftspear"  # land excluded


def test_refresh_archetype_art_breaks_count_ties_by_rarity_then_set_then_cmc_then_name():
    session = MagicMock()
    session.get.side_effect = [
        _response([{"id": 5, "name": "Tiebreaks"}]),
        _response(
            [
                # All tied at 8 copies. Ranking: rarity > set recency > cmc > name.
                _card_row(1, "Common Zebra", 8, rarity="common", released_at="2025-01-01", cmc=5),
                _card_row(2, "Mythic Payoff", 8, rarity="mythic", released_at="2020-01-01", cmc=1),
                _card_row(3, "Rare Newer", 8, rarity="rare", released_at="2026-01-01", cmc=2),
                _card_row(4, "Rare Older", 8, rarity="rare", released_at="2019-01-01", cmc=9),
            ]
        ),
        _response([]),
    ]
    session.patch.return_value = _response([{"id": 5}])
    resolver = _StubResolver(
        {"Mythic Payoff": Printing(name="Mythic Payoff", set_code="X", collector_number="1", image_url="m.jpg")}
    )
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    writer.refresh_archetype_art("MO")

    body = session.patch.call_args[1]["json"]
    # Highest rarity wins the quantity tie outright.
    assert body["signature_card_name"] == "Mythic Payoff"


def test_refresh_archetype_art_set_recency_and_cmc_break_rarity_ties():
    session = MagicMock()
    session.get.side_effect = [
        _response([{"id": 5, "name": "SetTie"}]),
        _response(
            [
                # Both rare, tied at 8. Newer set wins; if same set, higher cmc.
                _card_row(1, "Old Rare", 8, rarity="rare", released_at="2020-01-01", cmc=6),
                _card_row(2, "New Rare Low", 8, rarity="rare", released_at="2026-01-01", cmc=2),
                _card_row(3, "New Rare High", 8, rarity="rare", released_at="2026-01-01", cmc=4),
            ]
        ),
        _response([]),
    ]
    session.patch.return_value = _response([{"id": 5}])
    resolver = _StubResolver(
        {"New Rare High": Printing(name="New Rare High", set_code="X", collector_number="1", image_url="h.jpg")}
    )
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    writer.refresh_archetype_art("MO")

    body = session.patch.call_args[1]["json"]
    # Newest set (2026) with the higher cmc (4 > 2) wins.
    assert body["signature_card_name"] == "New Rare High"


def test_refresh_archetype_art_resolved_metadata_beats_null_at_equal_quantity():
    session = MagicMock()
    session.get.side_effect = [
        _response([{"id": 5, "name": "NullLast"}]),
        _response(
            [
                # Tied at 8. One has resolved rarity; the other has all-null metadata.
                _card_row(1, "Unresolved Card", 8, rarity=None, released_at=None, cmc=None),
                _card_row(2, "Resolved Rare", 8, rarity="rare", released_at="2024-01-01", cmc=3),
            ]
        ),
        _response([]),
    ]
    session.patch.return_value = _response([{"id": 5}])
    resolver = _StubResolver(
        {"Resolved Rare": Printing(name="Resolved Rare", set_code="X", collector_number="1", image_url="r.jpg")}
    )
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    writer.refresh_archetype_art("MO")

    body = session.patch.call_args[1]["json"]
    assert body["signature_card_name"] == "Resolved Rare"  # null metadata sorts last


def test_refresh_archetype_art_breaks_full_ties_by_name_ascending():
    session = MagicMock()
    session.get.side_effect = [
        _response([{"id": 5, "name": "Even Split"}]),
        # Two non-land cards tied on quantity and all metadata; name breaks it.
        _response(
            [
                _card_row(1, "Zenith Flare", 8, rarity="rare", released_at="2024-01-01", cmc=3),
                _card_row(2, "Abrade", 8, rarity="rare", released_at="2024-01-01", cmc=3),
            ]
        ),
        _response([]),
    ]
    session.patch.return_value = _response([{"id": 5}])
    resolver = _StubResolver(
        {
            "Abrade": Printing(name="Abrade", set_code="X", collector_number="1", image_url="a.jpg"),
            "Zenith Flare": Printing(name="Zenith Flare", set_code="Y", collector_number="2", image_url="z.jpg"),
        }
    )
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    writer.refresh_archetype_art("MO")

    body = session.patch.call_args[1]["json"]
    assert body["signature_card_name"] == "Abrade"  # ties broken by name asc


# -- Archetype color identity (name-first, card fallback) -------------------

def _ci_card_row(cid, deck_id, name):
    return {"id": cid, "deck_id": deck_id, "card_name": name, "decks": {"archetype_id": 5}}


def test_refresh_archetype_color_identity_requires_a_resolver():
    import pytest

    with pytest.raises(RuntimeError):
        _writer(MagicMock()).refresh_archetype_color_identity("MO")


def test_refresh_archetype_color_identity_uses_name_when_present():
    session = MagicMock()
    # Name "Izzet Prowess" -> UR; card lookups are never queried.
    session.get.side_effect = [
        _response([{"id": 5, "name": "Izzet Prowess", "color_identity": ""}]),
    ]
    session.patch.return_value = _response([{"id": 5}])
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=_StubResolver({}))

    updated = writer.refresh_archetype_color_identity("MO")

    assert updated == 1
    assert session.get.call_count == 1  # no deck_cards query for a named archetype
    patch_url = session.patch.call_args[0][0]
    assert "/rest/v1/archetypes" in patch_url
    assert "id=eq.5" in patch_url
    body = session.patch.call_args[1]["json"]
    assert body == {"color_identity": "UR"}  # only color_identity is written


def test_refresh_archetype_color_identity_derives_from_cards_when_name_has_none():
    session = MagicMock()
    # Name "Cauldron" -> no color; both decks are UB, so identity is UB.
    session.get.side_effect = [
        _response([{"id": 5, "name": "Cauldron", "color_identity": ""}]),
        _response(
            [
                _ci_card_row(1, 100, "Deep-Cavern Bat"),
                _ci_card_row(2, 100, "Island"),
                _ci_card_row(3, 101, "Deep-Cavern Bat"),
            ]
        ),
        _response([]),
    ]
    session.patch.return_value = _response([{"id": 5}])
    resolver = _StubResolver(
        {
            "Deep-Cavern Bat": Printing(name="Deep-Cavern Bat", set_code="LCI",
                                        collector_number="1", color_identity=("B",)),
            "Island": Printing(name="Island", set_code="X", collector_number="1",
                               color_identity=("U",)),
        }
    )
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=resolver)

    writer.refresh_archetype_color_identity("MO")

    body = session.patch.call_args[1]["json"]
    assert body == {"color_identity": "UB"}


def test_refresh_archetype_color_identity_is_idempotent_when_unchanged():
    session = MagicMock()
    # Stored value already matches the name-derived identity -> no PATCH.
    session.get.side_effect = [
        _response([{"id": 5, "name": "Izzet Prowess", "color_identity": "UR"}]),
    ]
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=_StubResolver({}))

    updated = writer.refresh_archetype_color_identity("MO")

    assert updated == 0
    session.patch.assert_not_called()


def test_refresh_archetype_color_identity_leaves_colorless_empty():
    session = MagicMock()
    # Name has no color and cards don't resolve -> stays "" (no PATCH).
    session.get.side_effect = [
        _response([{"id": 5, "name": "Homebrew", "color_identity": ""}]),
        _response([_ci_card_row(1, 100, "Totally Made Up Card")]),
        _response([]),
    ]
    writer = SupabaseWriter(URL, KEY, session=session, card_resolver=_StubResolver({}))

    updated = writer.refresh_archetype_color_identity("MO")

    assert updated == 0
    session.patch.assert_not_called()

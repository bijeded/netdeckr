import json
import os
import sys
from unittest.mock import MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scryfall import CardIndex, _normalize, load_bulk_index, sync_bulk  # noqa: E402

FIXTURE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "fixtures", "scryfall_default_cards_sample.json"
)


def _rows():
    with open(FIXTURE) as f:
        return json.load(f)


def _index():
    return CardIndex.from_bulk_rows(_rows())


# -- resolution ------------------------------------------------------------

def test_resolves_known_card_to_a_printing():
    printing = _index().resolve("Lightning Bolt")
    assert printing is not None
    assert printing.name == "Lightning Bolt"
    assert printing.set_code == "CLU"
    assert printing.collector_number == "141"
    assert printing.image_url == "https://cards.scryfall.io/normal/bolt-clu.jpg"


def test_resolved_printing_carries_card_metadata():
    printing = _index().resolve("Lightning Bolt")
    assert printing.type_line == "Instant"
    assert printing.rarity == "uncommon"
    assert printing.cmc == 1
    assert printing.released_at == "2024-02-23"
    assert printing.art_crop_url == "https://cards.scryfall.io/art_crop/bolt-clu.jpg"


def test_split_card_printing_uses_front_face_image():
    # Split/DFC cards carry no top-level image_uris; use the front face's.
    printing = _index().resolve("Fire / Ice")
    assert printing is not None
    assert printing.image_url == "https://cards.scryfall.io/normal/fire.jpg"


def test_split_card_art_crop_uses_front_face():
    # Split/DFC cards carry no top-level image_uris; art_crop uses the front face's.
    printing = _index().resolve("Fire / Ice")
    assert printing.art_crop_url == "https://cards.scryfall.io/art_crop/fire.jpg"


def test_prefers_most_recent_nonfoil_paper_printing_and_skips_digital():
    # lea (1993) and clu (2024) are paper; pmtg1 (2030) is digital and must be
    # ignored even though it is the newest.
    printing = _index().resolve("Lightning Bolt")
    assert printing.set_code == "CLU"  # not LEA (older) and not PMTG1 (digital)


def test_prefers_standard_printing_over_newer_promo_and_crossover():
    # "Prefer Standard" has a clean expansion printing (2023) plus a newer promo
    # (2026) and a newer Universes Beyond crossover (2025). Recency alone would
    # pick the promo; we prefer the standard, non-promo, non-crossover printing.
    printing = _index().resolve("Prefer Standard")
    assert printing is not None
    assert printing.set_code == "STD"
    assert printing.collector_number == "42"


def test_split_card_front_face_resolves_to_full_card():
    printing = _index().resolve("Fire")
    assert printing is not None
    assert printing.name == "Fire // Ice"
    assert printing.set_code == "MH2"


def test_double_faced_front_name_resolves_to_full_card():
    printing = _index().resolve("Fable of the Mirror-Breaker")
    assert printing is not None
    assert printing.name == "Fable of the Mirror-Breaker // Reflection of Kiki-Rik"
    assert printing.set_code == "NEO"


def test_full_split_name_also_resolves():
    printing = _index().resolve("Fire // Ice")
    assert printing is not None
    assert printing.name == "Fire // Ice"


def test_normalize_maps_single_slash_and_leaves_double_slash_untouched():
    # The normalization contract: single slash -> double; existing "//" unchanged.
    assert _normalize("Fire / Ice") == "fire // ice"
    assert _normalize("Fire // Ice") == "fire // ice"
    assert _normalize("  LIGHTNING   Bolt ") == "lightning bolt"


def test_single_slash_split_name_resolves():
    # MTGTop8 writes split/DFC names with a single slash (" / "); Scryfall uses
    # " // ". The single-slash scraped form must still resolve to the full card.
    printing = _index().resolve("Fire / Ice")
    assert printing is not None
    assert printing.name == "Fire // Ice"


def test_resolution_is_case_and_whitespace_insensitive():
    printing = _index().resolve("  lightning   BOLT ")
    assert printing is not None
    assert printing.set_code == "CLU"


def test_unknown_card_is_a_miss():
    assert _index().resolve("Nonexistent Card") is None


def test_funny_set_only_card_is_a_miss():
    # Un-Card only has a funny-set printing, which is not a real paper printing.
    assert _index().resolve("Un-Card") is None


def test_memorabilia_set_only_card_is_a_miss():
    # Oversized/memorabilia printings are excluded as non-tournament printings.
    assert _index().resolve("Oversized Card") is None


def test_foil_only_card_is_a_miss():
    # A card with no non-foil finish has no printing we can export.
    assert _index().resolve("Foil Only Card") is None


# -- printing selection (treatment / set-type / recency) -------------------

def _printing_row(name, set_code, num, *, released_at, set_type="expansion", **extra):
    """A minimal paper non-foil bulk row for selection tests."""
    row = {
        "name": name,
        "set": set_code,
        "set_type": set_type,
        "collector_number": num,
        "released_at": released_at,
        "games": ["paper", "arena"],
        "finishes": ["nonfoil", "foil"],
        "border_color": "black",
        "image_uris": {
            "normal": f"https://cards.scryfall.io/normal/{set_code}-{num}.jpg",
            "art_crop": f"https://cards.scryfall.io/art_crop/{set_code}-{num}.jpg",
        },
    }
    row.update(extra)
    return row


def test_plain_printing_preferred_over_borderless_same_set():
    # A plain and a borderless printing from the same set: plain wins, not the
    # arbitrary set-code tiebreak.
    plain = _printing_row("Opt", "aaa", "60", released_at="2024-01-01")
    borderless = _printing_row(
        "Opt", "aab", "300", released_at="2024-01-01", border_color="borderless"
    )
    index = CardIndex.from_bulk_rows([borderless, plain])
    printing = index.resolve("Opt")
    assert printing.set_code == "AAA"
    assert printing.collector_number == "60"


def test_plain_treatment_beats_recency():
    # The only newer printing is a showcase; the older plain printing wins.
    old_plain = _printing_row("Stock Up", "old", "10", released_at="2023-01-01")
    new_showcase = _printing_row(
        "Stock Up", "new", "270", released_at="2025-01-01", frame_effects=["showcase"]
    )
    index = CardIndex.from_bulk_rows([new_showcase, old_plain])
    assert index.resolve("Stock Up").set_code == "OLD"


def test_full_art_printing_is_demoted():
    plain = _printing_row("Island", "set", "5", released_at="2024-01-01")
    full = _printing_row("Island", "fal", "260", released_at="2024-06-01", full_art=True)
    index = CardIndex.from_bulk_rows([full, plain])
    assert index.resolve("Island").set_code == "SET"


def test_textless_printing_is_demoted():
    plain = _printing_row("Cut Down", "set", "90", released_at="2024-01-01")
    textless = _printing_row("Cut Down", "txt", "1", released_at="2024-06-01", textless=True)
    index = CardIndex.from_bulk_rows([textless, plain])
    assert index.resolve("Cut Down").set_code == "SET"


def test_extended_art_frame_effect_is_demoted():
    plain = _printing_row("Sheoldred", "set", "107", released_at="2024-01-01")
    extended = _printing_row(
        "Sheoldred", "ext", "301", released_at="2024-06-01", frame_effects=["extendedart"]
    )
    index = CardIndex.from_bulk_rows([extended, plain])
    assert index.resolve("Sheoldred").set_code == "SET"


def test_non_borderless_border_colors_stay_plain():
    # White/silver/gold borders are legitimate plain printings; only "borderless"
    # is demoted. A white-bordered older printing should still be treated as plain.
    white = _printing_row("Old Card", "whi", "12", released_at="1998-01-01", border_color="white")
    gold = _printing_row("Old Card", "gld", "5", released_at="1999-01-01", border_color="gold")
    index = CardIndex.from_bulk_rows([white, gold])
    printing = index.resolve("Old Card")
    # Neither is demoted for its border; recency picks the gold-bordered one.
    assert printing.set_code == "GLD"


def test_preferred_set_type_beats_commander_reprint():
    expansion = _printing_row("Swords", "exp", "3", released_at="2023-01-01", set_type="expansion")
    commander = _printing_row(
        "Swords", "cmd", "50", released_at="2025-01-01", set_type="commander"
    )
    index = CardIndex.from_bulk_rows([commander, expansion])
    assert index.resolve("Swords").set_code == "EXP"


def test_masters_preferred_over_draft_innovation():
    masters = _printing_row("Force", "mas", "40", released_at="2023-01-01", set_type="masters")
    draft = _printing_row(
        "Force", "drf", "20", released_at="2025-01-01", set_type="draft_innovation"
    )
    index = CardIndex.from_bulk_rows([draft, masters])
    assert index.resolve("Force").set_code == "MAS"


def test_selection_is_deterministic_regardless_of_row_order():
    plain = _printing_row("Card X", "aaa", "1", released_at="2024-01-01")
    borderless = _printing_row(
        "Card X", "bbb", "2", released_at="2024-01-01", border_color="borderless"
    )
    forward = CardIndex.from_bulk_rows([plain, borderless]).resolve("Card X")
    backward = CardIndex.from_bulk_rows([borderless, plain]).resolve("Card X")
    assert forward.set_code == backward.set_code == "AAA"


def test_only_special_printing_still_resolves():
    # A card available only as a showcase printing still resolves (least-bad),
    # rather than nulling out.
    showcase = _printing_row(
        "Rare Drop", "srl", "1", released_at="2024-01-01", frame_effects=["showcase"]
    )
    index = CardIndex.from_bulk_rows([showcase])
    assert index.resolve("Rare Drop").set_code == "SRL"


# -- bulk sync / cache -----------------------------------------------------

def test_load_bulk_index_reads_a_file_into_an_index():
    index = load_bulk_index(FIXTURE)
    assert index.resolve("Lightning Bolt").set_code == "CLU"


def test_sync_reuses_cached_file_when_fresh(tmp_path):
    cache_dir = tmp_path / "scryfall"
    cache_dir.mkdir()
    (cache_dir / "default_cards-2026-07-02.json").write_text(json.dumps(_rows()))
    fetch_meta = MagicMock()
    download = MagicMock()

    index = sync_bulk(cache_dir, today="2026-07-02", fetch_meta=fetch_meta, download=download)

    assert index.resolve("Lightning Bolt").set_code == "CLU"
    fetch_meta.assert_not_called()
    download.assert_not_called()


def test_sync_downloads_when_cache_absent(tmp_path):
    cache_dir = tmp_path / "scryfall"
    fetch_meta = MagicMock(
        return_value={"data": [{"type": "default_cards", "download_uri": "https://scry/dl.json"}]}
    )

    def fake_download(uri, dest):
        assert uri == "https://scry/dl.json"
        with open(dest, "w") as f:
            json.dump(_rows(), f)

    index = sync_bulk(cache_dir, today="2026-07-02", fetch_meta=fetch_meta, download=fake_download)

    assert index.resolve("Fire").name == "Fire // Ice"
    fetch_meta.assert_called_once()
    assert (cache_dir / "default_cards-2026-07-02.json").exists()

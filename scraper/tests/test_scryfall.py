import json
import os
import sys
from unittest.mock import MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scryfall import CardIndex, load_bulk_index, sync_bulk  # noqa: E402

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


def test_prefers_most_recent_nonfoil_paper_printing_and_skips_digital():
    # lea (1993) and clu (2024) are paper; pmtg1 (2030) is digital and must be
    # ignored even though it is the newest.
    printing = _index().resolve("Lightning Bolt")
    assert printing.set_code == "CLU"  # not LEA (older) and not PMTG1 (digital)


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

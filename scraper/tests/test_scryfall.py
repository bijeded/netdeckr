import gzip
import json
import os
import sys
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scryfall import CardIndex, _normalize, load_bulk_index, sync_bulk  # noqa: E402

FIXTURE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "fixtures", "scryfall_default_cards_sample.jsonl.gz"
)


def _rows():
    """The fixture's card records. Scryfall ships bulk data as gzipped JSONL."""
    with gzip.open(FIXTURE, "rt", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def _write_bulk(dest, rows):
    """Write rows in Scryfall's on-disk bulk format (gzipped JSONL)."""
    with gzip.open(dest, "wt", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row) + "\n")


def _index():
    return CardIndex.from_bulk_rows(_rows())


# -- resolution ------------------------------------------------------------

def test_resolves_known_card_to_a_printing():
    printing = _index().resolve("Lightning Bolt")
    assert printing is not None
    assert printing.name == "Lightning Bolt"
    assert printing.set_code == "M11"
    assert printing.collector_number == "149"
    assert printing.image_url == "https://cards.scryfall.io/normal/bolt-m11.jpg"


def test_resolved_printing_carries_card_metadata():
    printing = _index().resolve("Lightning Bolt")
    assert printing.type_line == "Instant"
    assert printing.rarity == "common"
    assert printing.cmc == 1
    assert printing.released_at == "2010-07-16"
    assert printing.art_crop_url == "https://cards.scryfall.io/art_crop/bolt-m11.jpg"


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
    # lea (1993), m11 (2010) and clu (2024) are paper; pmtg1 (2030) is digital and
    # must be ignored even though it is the newest. Among the paper printings, clu
    # is the most recent but is a `masters` reprint (Ravnica: Clue Edition) and so
    # sits in the neutral tier; m11 wins on set-type tier despite being older, and
    # beats lea on recency within that tier.
    printing = _index().resolve("Lightning Bolt")
    assert printing.set_code == "M11"  # not CLU (masters), LEA (older), PMTG1 (digital)


def test_prefers_standard_printing_over_newer_promo_and_crossover():
    # "Prefer Standard" has a clean expansion printing (2023) plus a newer promo
    # (2026) and a newer Universes Beyond crossover in a Secret Lair box (2025).
    # Recency alone would pick the promo; the promo loses on treatment and the
    # crossover loses on set type (`box` is demoted), so the expansion wins.
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
    assert printing.set_code == "M11"


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
    # `masters` is neutral, `draft_innovation` is demoted — neutral still wins.
    masters = _printing_row("Force", "mas", "40", released_at="2023-01-01", set_type="masters")
    draft = _printing_row(
        "Force", "drf", "20", released_at="2025-01-01", set_type="draft_innovation"
    )
    index = CardIndex.from_bulk_rows([draft, masters])
    assert index.resolve("Force").set_code == "MAS"


def test_expansion_preferred_over_newer_masters_reprint():
    # The Torpor Orb shape: a plain expansion printing and a newer plain reprint
    # in a `masters` product (Mystery Booster 2). Recency alone would pick the
    # reprint; `masters` is neutral, so the expansion's preferred tier wins.
    expansion = _printing_row("Torpor Orb", "exp", "27", released_at="2024-04-19")
    reprint = _printing_row(
        "Torpor Orb", "mb2", "236", released_at="2024-08-02", set_type="masters"
    )
    index = CardIndex.from_bulk_rows([reprint, expansion])
    assert index.resolve("Torpor Orb").set_code == "EXP"


def test_preferred_set_type_beats_box_product():
    # Secret Lair and other `box` products are demoted below neutral.
    expansion = _printing_row("Ajani", "exp", "3", released_at="2023-01-01")
    secret_lair = _printing_row("Ajani", "sld", "900", released_at="2025-01-01", set_type="box")
    index = CardIndex.from_bulk_rows([secret_lair, expansion])
    assert index.resolve("Ajani").set_code == "EXP"


def test_box_product_still_selected_when_it_is_the_only_printing():
    # Demoted, not rejected: a card whose only printing is a Secret Lair drop
    # must still resolve rather than becoming a miss.
    secret_lair = _printing_row("Lair Only", "sld", "900", released_at="2025-01-01", set_type="box")
    index = CardIndex.from_bulk_rows([secret_lair])
    printing = index.resolve("Lair Only")
    assert printing is not None
    assert printing.set_code == "SLD"


def test_plain_printing_preferred_over_boosterfun_variant_same_set():
    # The Aang's Iceberg shape: both printings are from the same wholly-Universes
    # Beyond set with the same release date, so treatment is the only thing that
    # can separate them. `boosterfun` marks the alternate-treatment variant.
    plain = _printing_row(
        "Aang's Iceberg", "tla", "5", released_at="2025-11-21",
        promo_types=["universesbeyond"], frame_effects=["enchantment"],
    )
    showcase = _printing_row(
        "Aang's Iceberg", "tla", "336", released_at="2025-11-21",
        promo_types=["universesbeyond", "boosterfun"],
        frame_effects=["showcase", "enchantment"], border_color="borderless",
    )
    index = CardIndex.from_bulk_rows([showcase, plain])
    assert index.resolve("Aang's Iceberg").collector_number == "5"


def test_universes_beyond_marker_alone_does_not_demote_a_printing():
    # On a wholly-UB set every printing carries `universesbeyond`, so it must not
    # by itself mark a printing special — otherwise the plain printing ties with
    # its variants and file order decides. Here the only distinguishing signal is
    # `boosterfun`, and the plain printing must win from either row order.
    plain = _printing_row(
        "Sokka's Plan", "tla", "60", released_at="2025-11-21",
        promo_types=["universesbeyond"],
    )
    variant = _printing_row(
        "Sokka's Plan", "tla", "412", released_at="2025-11-21",
        promo_types=["universesbeyond", "boosterfun"],
    )
    for rows in ([plain, variant], [variant, plain]):
        assert CardIndex.from_bulk_rows(rows).resolve("Sokka's Plan").collector_number == "60"


# -- reversible printings --------------------------------------------------

def _reversible_row(name, set_code, num, *, released_at, set_type="box"):
    """A Secret Lair reversible printing: doubled name, no top-level type_line/cmc."""
    return {
        "name": f"{name} // {name}",
        "layout": "reversible_card",
        "set": set_code,
        "set_type": set_type,
        "collector_number": num,
        "released_at": released_at,
        "games": ["paper"],
        "finishes": ["nonfoil"],
        "border_color": "black",
        "card_faces": [
            {"name": name, "image_uris": {"normal": f"https://cards.scryfall.io/normal/{num}a.jpg"}},
            {"name": name, "image_uris": {"normal": f"https://cards.scryfall.io/normal/{num}b.jpg"}},
        ],
    }


def test_reversible_printing_never_wins_over_a_plain_printing():
    # A reversible printing is indexed under "X // X" — a different bucket from
    # the plain card — so it never competes on the ranking and would otherwise
    # win or lose on bulk-file order. Assert from both orderings.
    plain = _printing_row(
        "Ajani Goldmane", "exp", "12", released_at="2009-07-17",
        type_line="Legendary Planeswalker — Ajani", cmc=4.0,
    )
    reversible = _reversible_row("Ajani Goldmane", "sld", "1512", released_at="2024-01-01")
    for rows in ([reversible, plain], [plain, reversible]):
        printing = CardIndex.from_bulk_rows(rows).resolve("Ajani Goldmane")
        assert printing.set_code == "EXP"
        assert printing.type_line == "Legendary Planeswalker — Ajani"
        assert printing.cmc == 4.0


def test_card_with_only_a_reversible_printing_is_a_miss():
    # Rejected outright, not demoted: resolving would yield null type_line/cmc,
    # which mis-sorts the card downstream. A miss leaves the columns null instead.
    reversible = _reversible_row("Lair Exclusive", "sld", "1600", released_at="2024-01-01")
    assert CardIndex.from_bulk_rows([reversible]).resolve("Lair Exclusive") is None


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


# -- color identity --------------------------------------------------------

def test_printing_carries_color_identity():
    row = _printing_row("Izzet Thing", "aaa", "1", released_at="2024-01-01",
                        color_identity=["U", "R"])
    printing = CardIndex.from_bulk_rows([row]).resolve("Izzet Thing")
    assert printing.color_identity == ("U", "R")


def test_colorless_printing_has_empty_color_identity():
    row = _printing_row("Sol Ring", "aaa", "1", released_at="2024-01-01",
                        color_identity=[])
    printing = CardIndex.from_bulk_rows([row]).resolve("Sol Ring")
    assert printing.color_identity == ()


def test_printing_color_identity_defaults_empty_when_absent():
    # A bulk row missing color_identity (shouldn't happen in real data) is
    # treated as colorless rather than raising.
    row = _printing_row("Odd Card", "aaa", "1", released_at="2024-01-01")
    printing = CardIndex.from_bulk_rows([row]).resolve("Odd Card")
    assert printing.color_identity == ()


# -- bulk sync / cache -----------------------------------------------------

def test_load_bulk_index_reads_a_file_into_an_index():
    index = load_bulk_index(FIXTURE)
    assert index.resolve("Lightning Bolt").set_code == "M11"


def test_sync_reuses_cached_file_when_fresh(tmp_path):
    cache_dir = tmp_path / "scryfall"
    cache_dir.mkdir()
    _write_bulk(cache_dir / "default_cards-2026-07-02.jsonl.gz", _rows())
    fetch_meta = MagicMock()
    download = MagicMock()

    index = sync_bulk(cache_dir, today="2026-07-02", fetch_meta=fetch_meta, download=download)

    assert index.resolve("Lightning Bolt").set_code == "M11"
    fetch_meta.assert_not_called()
    download.assert_not_called()


def test_sync_downloads_when_cache_absent(tmp_path):
    cache_dir = tmp_path / "scryfall"
    fetch_meta = MagicMock(
        return_value={
            "data": [
                {"type": "default_cards", "jsonl_download_uri": "https://scry/dl.jsonl.gz"}
            ]
        }
    )

    def fake_download(uri, dest):
        assert uri == "https://scry/dl.jsonl.gz"
        _write_bulk(dest, _rows())

    index = sync_bulk(cache_dir, today="2026-07-02", fetch_meta=fetch_meta, download=fake_download)

    assert index.resolve("Fire").name == "Fire // Ice"
    fetch_meta.assert_called_once()
    assert (cache_dir / "default_cards-2026-07-02.jsonl.gz").exists()


def test_sync_reads_the_jsonl_download_uri(tmp_path):
    """Regression: Scryfall renamed `download_uri` to `jsonl_download_uri`. Reading
    the old key raised KeyError, which the caller swallowed into unenriched rows."""
    cache_dir = tmp_path / "scryfall"
    fetch_meta = MagicMock(
        return_value={
            "data": [
                {
                    "type": "default_cards",
                    "jsonl_download_uri": "https://scry/correct.jsonl.gz",
                    "download_uri": "https://scry/stale.json",
                }
            ]
        }
    )
    seen = []

    def fake_download(uri, dest):
        seen.append(uri)
        _write_bulk(dest, _rows())

    sync_bulk(cache_dir, today="2026-07-02", fetch_meta=fetch_meta, download=fake_download)

    assert seen == ["https://scry/correct.jsonl.gz"]


def test_sync_raises_when_download_uri_missing(tmp_path):
    """An upstream key rename must fail loudly, naming the cause."""
    cache_dir = tmp_path / "scryfall"
    fetch_meta = MagicMock(return_value={"data": [{"type": "default_cards"}]})

    with pytest.raises(RuntimeError, match="jsonl_download_uri"):
        sync_bulk(cache_dir, today="2026-07-02", fetch_meta=fetch_meta, download=MagicMock())


def test_sync_raises_when_default_cards_entry_missing(tmp_path):
    cache_dir = tmp_path / "scryfall"
    fetch_meta = MagicMock(return_value={"data": [{"type": "oracle_cards"}]})

    with pytest.raises(RuntimeError, match="default_cards"):
        sync_bulk(cache_dir, today="2026-07-02", fetch_meta=fetch_meta, download=MagicMock())


def test_empty_bulk_file_raises_rather_than_yielding_an_empty_index(tmp_path):
    """An empty index is truthy, so returning one would silently reinstate the
    unenriched-write failure this module's hard-stop exists to prevent."""
    path = tmp_path / "default_cards-2026-07-02.jsonl.gz"
    _write_bulk(path, [])

    with pytest.raises(RuntimeError, match="no card records"):
        load_bulk_index(str(path))


def test_sync_raises_when_downloaded_file_has_no_records(tmp_path):
    cache_dir = tmp_path / "scryfall"
    fetch_meta = MagicMock(
        return_value={
            "data": [{"type": "default_cards", "jsonl_download_uri": "https://scry/dl.jsonl.gz"}]
        }
    )

    with pytest.raises(RuntimeError, match="no card records"):
        sync_bulk(
            cache_dir,
            today="2026-07-02",
            fetch_meta=fetch_meta,
            download=lambda uri, dest: _write_bulk(dest, []),
        )


def test_download_failure_leaves_no_reusable_cache_file(tmp_path):
    """A truncated download must not become the day's cache: every later run would
    reuse it and fail, and CI would then cache the corrupt file across jobs."""
    cache_dir = tmp_path / "scryfall"

    def failing_download(uri, dest):
        with open(dest, "wb") as f:
            f.write(b"\x1f\x8b partial...")
        raise OSError("connection reset mid-download")

    fetch_meta = MagicMock(
        return_value={
            "data": [{"type": "default_cards", "jsonl_download_uri": "https://scry/dl.jsonl.gz"}]
        }
    )

    with pytest.raises(OSError):
        sync_bulk(cache_dir, today="2026-07-02", fetch_meta=fetch_meta, download=failing_download)

    assert not (cache_dir / "default_cards-2026-07-02.jsonl.gz").exists()


def test_malformed_line_names_the_file_and_line(tmp_path):
    path = tmp_path / "default_cards-2026-07-02.jsonl.gz"
    with gzip.open(path, "wt", encoding="utf-8") as f:
        f.write(json.dumps(_rows()[0]) + "\n")
        f.write("{not json\n")

    with pytest.raises(ValueError, match="line 2"):
        load_bulk_index(str(path))

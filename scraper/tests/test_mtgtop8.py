import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mtgtop8 import (  # noqa: E402
    COLOR_IDENTITY_MIN_DECK_SHARE,
    FORMATS,
    color_identity_from_decks,
    format_url,
    meta_id_for,
)

# The logical windows the scraper resolves to per-format MTGTop8 meta ids.
WINDOWS = ["5days", "2weeks"]


def test_format_url_without_meta():
    assert format_url("ST") == "http://mtgtop8.com/format?f=ST"


def test_format_url_with_meta():
    assert format_url("ST", "50") == "http://mtgtop8.com/format?f=ST&meta=50"


def test_format_url_with_cp_paginates():
    # Page 2+ of a window's events list is the same URL plus &cp=<n>.
    assert format_url("ST", "50", cp=2) == "http://mtgtop8.com/format?f=ST&meta=50&cp=2"


def test_format_url_cp_none_is_page_one():
    # cp=None (the default) is page 1 — no cp param appended.
    assert format_url("ST", "50", cp=None) == "http://mtgtop8.com/format?f=ST&meta=50"


def test_meta_id_for_maps_per_format():
    # MTGTop8 meta IDs are per-format for the same logical window.
    assert meta_id_for("ST", "2weeks") == "50"
    assert meta_id_for("PI", "2weeks") == "194"
    assert meta_id_for("MO", "2weeks") == "54"
    assert meta_id_for("PAU", "5days") == "348"
    assert meta_id_for("PREM", "2weeks") == "301"


def test_window_meta_covers_every_format_and_window():
    for fmt in FORMATS:
        for window in WINDOWS:
            meta = meta_id_for(fmt, window)
            assert meta and meta.isdigit()


# -- card-derived color identity -------------------------------------------

def test_color_identity_from_decks_keeps_base_colors():
    # Every deck is UR: both colors present in 100% of decks.
    decks = [{"U", "R"}, {"U", "R"}, {"U", "R"}]
    assert color_identity_from_decks(decks) == "UR"


def test_color_identity_from_decks_orders_wubrg():
    decks = [{"G", "W", "U"}] * 4
    assert color_identity_from_decks(decks) == "WUG"


def test_color_identity_from_decks_excludes_splash_below_threshold():
    # Green is the base color (all 10 decks); black splashes in only 1 (0.1).
    decks = [{"G"} for _ in range(9)] + [{"G", "B"}]
    assert color_identity_from_decks(decks) == "G"


def test_color_identity_from_decks_threshold_is_inclusive():
    # A color present in exactly the threshold share of decks is kept: the
    # code compares count >= share * len(decks), so 7 >= 0.35 * 20 == 7.0.
    total = 20
    keep = int(COLOR_IDENTITY_MIN_DECK_SHARE * total)  # decks containing R == 7
    decks = [{"U", "R"} for _ in range(keep)] + [{"U"} for _ in range(total - keep)]
    result = color_identity_from_decks(decks)
    assert "R" in result and result == "UR"


def test_color_identity_from_decks_just_below_threshold_drops_color():
    total = 20
    keep = round(COLOR_IDENTITY_MIN_DECK_SHARE * total) - 1
    decks = [{"U", "R"} for _ in range(keep)] + [{"U"} for _ in range(total - keep)]
    assert color_identity_from_decks(decks) == "U"


def test_color_identity_from_decks_colorless_only_is_empty():
    decks = [set(), set(), set()]
    assert color_identity_from_decks(decks) == ""


def test_color_identity_from_decks_no_decks_is_empty():
    assert color_identity_from_decks([]) == ""

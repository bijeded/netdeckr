import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mtgtop8 import FORMATS, WINDOWS, format_url, meta_id_for  # noqa: E402


def test_format_url_without_meta():
    assert format_url("ST") == "http://mtgtop8.com/format?f=ST"


def test_format_url_with_meta():
    assert format_url("ST", "50") == "http://mtgtop8.com/format?f=ST&meta=50"


def test_windows_are_the_three_universal_logical_keys():
    # Only these three windows exist (with the same meaning) for every format.
    assert WINDOWS == ["5days", "2weeks", "2months"]


def test_meta_id_for_maps_per_format():
    # MTGTop8 meta IDs are per-format for the same logical window.
    assert meta_id_for("ST", "2weeks") == "50"
    assert meta_id_for("PI", "2weeks") == "194"
    assert meta_id_for("MO", "2weeks") == "54"
    assert meta_id_for("PAU", "5days") == "348"
    assert meta_id_for("PREM", "2months") == "261"


def test_window_meta_covers_every_format_and_window():
    for fmt in FORMATS:
        for window in WINDOWS:
            meta = meta_id_for(fmt, window)
            assert meta and meta.isdigit()

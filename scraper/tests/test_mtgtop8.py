import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mtgtop8 import META_WINDOWS, format_url  # noqa: E402


def test_format_url_without_meta():
    assert format_url("ST") == "http://mtgtop8.com/format?f=ST"


def test_format_url_with_meta():
    assert format_url("ST", "50") == "http://mtgtop8.com/format?f=ST&meta=50"


def test_meta_windows_mapping():
    assert META_WINDOWS["326"] == "last_5_days"
    assert META_WINDOWS["46"] == "large_events_2_months"

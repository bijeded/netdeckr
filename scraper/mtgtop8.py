"""MTGTop8 scraping helpers.

Pure parsing functions live here so they can be unit-tested against saved HTML
fixtures without hitting the live site. Network access is isolated in run.py.
"""
from __future__ import annotations

BASE_URL = "http://mtgtop8.com"

# meta parameter -> human-readable time/size window (see CLAUDE.md "Data pipeline").
META_WINDOWS = {
    "50": "last_2_weeks",
    "326": "last_5_days",
    "52": "last_2_months",
    "46": "large_events_2_months",
    "285": "mtgo_2_months",
}

# MTGTop8 format codes.
FORMATS = {
    "ST": "standard",
    "PI": "pioneer",
    "MO": "modern",
    "PAU": "pauper",
    "PREM": "premodern",
}


def format_url(fmt: str, meta: str | None = None) -> str:
    """Build a format page URL, e.g. /format?f=ST&meta=50."""
    url = f"{BASE_URL}/format?f={fmt}"
    if meta is not None:
        url += f"&meta={meta}"
    return url

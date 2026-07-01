"""MTGTop8 scraping helpers.

Pure parsing functions live here so they can be unit-tested against saved HTML
fixtures without hitting the live site. Network access is isolated in run.py.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from bs4 import BeautifulSoup

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


# ---------------------------------------------------------------------------
# Color identity
# MTGTop8 exposes no explicit mana symbols on the format page — an archetype's
# colors are encoded in its name (guild/shard/mono/explicit letters). We map the
# name to a WUBRG-ordered string; unknown names are treated as colorless ('').
# ---------------------------------------------------------------------------

WUBRG = "WUBRG"

# Two-color guilds → canonical WUBRG string.
_GUILDS = {
    "azorius": "WU",
    "dimir": "UB",
    "rakdos": "BR",
    "gruul": "RG",
    "selesnya": "WG",
    "orzhov": "WB",
    "izzet": "UR",
    "golgari": "BG",
    "boros": "WR",
    "simic": "UG",
}

# Three-color shards/wedges → canonical WUBRG string.
_SHARDS = {
    "esper": "WUB",
    "grixis": "UBR",
    "jund": "BRG",
    "naya": "WRG",
    "bant": "WUG",
    "mardu": "WBR",
    "temur": "URG",
    "abzan": "WBG",
    "jeskai": "WUR",
    "sultai": "UBG",
}

# Individual color words → letter.
_COLOR_WORDS = {
    "white": "W",
    "blue": "U",
    "black": "B",
    "red": "R",
    "green": "G",
}


def _canonical(colors: set[str]) -> str:
    """Return the colors as a WUBRG-ordered string."""
    return "".join(c for c in WUBRG if c in colors)


def _color_words_in(text: str) -> set[str]:
    """Return the color letters named by whole color words in ``text`` (lowercased)."""
    return {
        letter
        for word, letter in _COLOR_WORDS.items()
        if re.search(rf"\b{word}\b", text)
    }


def color_identity_for(name: str) -> str:
    """Derive an archetype's WUBRG color identity from its name.

    Returns a WUBRG-ordered string (e.g. "UR"), or "" when the name carries no
    recognizable color identity (rendered as a single gray pip in the UI).
    """
    lower = name.lower()

    # 4- or 5-color / domain archetypes → all five colors.
    if re.search(r"\b(4/5c|4c|5c|4-color|5-color|four-color|five-color)\b", lower):
        return WUBRG

    # Named three-color shards/wedges take precedence over two-color guilds.
    # Match whole words so "bant" doesn't fire inside "Bantam".
    for key, colors in _SHARDS.items():
        if re.search(rf"\b{key}\b", lower):
            return colors

    for key, colors in _GUILDS.items():
        if re.search(rf"\b{key}\b", lower):
            return colors

    # Mono-color: "Mono Green" → the single named color.
    if "mono" in lower:
        found = _color_words_in(lower)
        if found:
            return _canonical(found)

    # Explicit letter code, e.g. "UR Aggro", "UW Control". The token must be
    # uppercase in the source so an ordinary word like "Grub" isn't read as a code.
    for token in name.split():
        if (
            token.isupper()
            and 2 <= len(token) <= 5
            and all(ch in WUBRG for ch in token)
            and len(set(token)) == len(token)
        ):
            return _canonical(set(token))

    # Fall back to individual color words, e.g. "Red Deck Wins" → R.
    found = _color_words_in(lower)
    if found:
        return _canonical(found)

    return ""


# ---------------------------------------------------------------------------
# Metagame breakdown parsing
# ---------------------------------------------------------------------------


@dataclass
class Archetype:
    """One archetype in a format's metagame breakdown."""

    name: str
    share_pct: float
    color_identity: str
    rank: int | None = None


def parse_meta_breakdown(html: str) -> list[Archetype]:
    """Parse a MTGTop8 `meta=50` format page into archetypes.

    Each archetype block links to `archetype?a=...`; its share is the first
    "N %" in the block (absent for the low-share tail → 0.0). Category headers
    (e.g. "AGGRO 51%") are not archetype links and are naturally excluded.
    """
    soup = BeautifulSoup(html, "html.parser")
    archetypes: list[Archetype] = []

    for anchor in soup.find_all("a", href=re.compile(r"^archetype\?a=")):
        name = anchor.get_text(strip=True)
        if not name:
            continue
        # Cap name length — anchor text comes from untrusted HTML.
        name = name[:200]
        # The share lives in the archetype's `hover_tr` block. If MTGTop8 ever
        # renames that class, the block is missing and share falls back to 0.0.
        block = anchor.find_parent("div", class_="hover_tr")
        share = 0.0
        if block is not None:
            match = re.search(r"(\d+(?:\.\d+)?)\s*%", block.get_text(" ", strip=True))
            if match:
                # Clamp to a sane percentage range against malformed input.
                share = max(0.0, min(100.0, float(match.group(1))))
        archetypes.append(
            Archetype(name=name, share_pct=share, color_identity=color_identity_for(name))
        )

    return archetypes


def rank_archetypes(archetypes: list[Archetype]) -> list[Archetype]:
    """Return archetypes sorted by descending share with a 1-based rank set."""
    ordered = sorted(archetypes, key=lambda a: a.share_pct, reverse=True)
    for index, archetype in enumerate(ordered, start=1):
        archetype.rank = index
    return ordered

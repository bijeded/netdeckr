"""MTGTop8 scraping helpers.

Pure parsing functions live here so they can be unit-tested against saved HTML
fixtures without hitting the live site. Network access is isolated in run.py.
"""
from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass

from bs4 import BeautifulSoup

BASE_URL = "http://mtgtop8.com"

# MTGTop8 format codes.
FORMATS = {
    "ST": "standard",
    "PI": "pioneer",
    "MO": "modern",
    "PAU": "pauper",
    "PREM": "premodern",
}

# (format, logical window) -> MTGTop8 `meta` param ID. The logical keys (`5days`,
# `2weeks`) are format-independent; MTGTop8's numeric `meta` param is per-format, so
# the same window has a different id per format. The decklist pass resolves only the
# `2weeks` window (which contains `5days` as a date subset). Verified against the
# live per-format window dropdowns; regenerate deliberately if MTGTop8 renumbers them.
# Wider MTGTop8 windows ("2 Months", "Large Events", "MTGO/Live") are not tracked.
WINDOW_META = {
    "ST":   {"5days": "326", "2weeks": "50"},
    "PI":   {"5days": "305", "2weeks": "194"},
    "MO":   {"5days": "304", "2weeks": "54"},
    "PAU":  {"5days": "348", "2weeks": "299"},
    "PREM": {"5days": "347", "2weeks": "301"},
}


def meta_id_for(fmt: str, window: str) -> str:
    """Return the MTGTop8 `meta` param ID for a format's logical window."""
    return WINDOW_META[fmt][window]


def format_url(fmt: str, meta: str | None = None, cp: int | None = None) -> str:
    """Build a format page URL, e.g. /format?f=ST&meta=50[&cp=2].

    `cp` is MTGTop8's 1-based events-list page number; page 1 omits it.
    """
    url = f"{BASE_URL}/format?f={fmt}"
    if meta is not None:
        url += f"&meta={meta}"
    if cp is not None:
        url += f"&cp={cp}"
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


# Minimum share of an archetype's decks a color must appear in to count toward
# the card-derived color identity, so an occasional splash doesn't add a pip.
# Tunable (verify live across formats); tests don't depend on the exact value.
COLOR_IDENTITY_MIN_DECK_SHARE = 0.35


def color_identity_from_decks(deck_color_sets: Iterable[set[str]]) -> str:
    """Derive a WUBRG color identity from an archetype's decks' card colors.

    ``deck_color_sets`` is one color-letter set per deck (the union of that deck's
    cards' Scryfall color identities). A color is kept only when it appears in at
    least ``COLOR_IDENTITY_MIN_DECK_SHARE`` of the decks, so a one-off splash is
    excluded. Returns a WUBRG-ordered string, or "" for no decks / all colorless.
    """
    decks = list(deck_color_sets)
    if not decks:
        return ""
    threshold = COLOR_IDENTITY_MIN_DECK_SHARE * len(decks)
    counts: dict[str, int] = {}
    for colors in decks:
        for color in colors:
            counts[color] = counts.get(color, 0) + 1
    kept = {color for color, count in counts.items() if count >= threshold}
    return _canonical(kept)


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
# Event + decklist parsing
# The format page lists recent events in a table of `tr.hover_tr` rows; each
# event page (event?e=<id>&f=<fmt>) carries a results list (placing + deck +
# player) and, for the currently-displayed deck, the mainboard/sideboard cards.
# ---------------------------------------------------------------------------


@dataclass
class Event:
    """One MTGTop8 event from a format page's events table."""

    source_event_id: str
    name: str
    event_date: str | None = None  # ISO date (YYYY-MM-DD) or None if absent
    player_count: int | None = None  # tournament size, or None if MTGTop8 omits it


@dataclass
class DeckResult:
    """One deck's finish in an event's results list."""

    source_deck_id: str
    placing: str  # raw MTGTop8 label: "1", "2", "3-4", "5-8", ...
    archetype_name: str
    player: str


@dataclass
class DeckCard:
    """One card line in a decklist."""

    board: str  # 'main' or 'side'
    quantity: int
    card_name: str


def event_url(fmt: str, event_id: str, deck_id: str | None = None) -> str:
    """Build an event/decklist page URL, e.g. /event?e=87496&f=ST[&d=863982]."""
    url = f"{BASE_URL}/event?e={event_id}&f={fmt}"
    if deck_id is not None:
        url += f"&d={deck_id}"
    return url


def _parse_ddmmyy(text: str) -> str | None:
    """Convert MTGTop8's DD/MM/YY date to an ISO date, or None if unparseable."""
    match = re.fullmatch(r"(\d{2})/(\d{2})/(\d{2})", text.strip())
    if not match:
        return None
    day, month, year = match.groups()
    return f"20{year}-{month}-{day}"


def parse_event_list(html: str) -> list[Event]:
    """Parse a format page's events table into events.

    Each event is a `tr.hover_tr` row whose first `event?e=<id>` anchor gives the
    event id and name (a second `class=und` venue anchor points at the same event
    and is ignored via de-duplication). The date lives in the row's `td.S12`.
    """
    soup = BeautifulSoup(html, "html.parser")
    events: list[Event] = []
    seen: set[str] = set()

    for row in soup.find_all("tr"):
        classes = row.get("class") or []
        if "hover_tr" not in classes:
            continue
        link = row.find("a", href=re.compile(r"^event\?e=\d+"))
        if link is None:
            continue
        match = re.search(r"e=(\d+)", link["href"])
        if not match:
            continue
        event_id = match.group(1)
        if event_id in seen:  # skip the venue anchor / repeated links
            continue
        seen.add(event_id)
        name = link.get_text(strip=True)[:200]
        date_cell = row.find("td", class_="S12")
        event_date = _parse_ddmmyy(date_cell.get_text()) if date_cell else None
        events.append(Event(source_event_id=event_id, name=name, event_date=event_date))

    return events


def parse_event_size(html: str) -> int | None:
    """Parse an event page's reported player count, or None when it is absent.

    MTGTop8 renders the tournament size in the event's `class=S14` meta panel as
    "<N> players - DD/MM/YY". We match the "<N> players" text directly: the only
    other "player" occurrences on the page are pilot `class=player` / `player=`
    links, which are never preceded by a digit, so a global match is safe.
    """
    match = re.search(r"(\d+)\s+players?\b", html, re.IGNORECASE)
    return int(match.group(1)) if match else None


def parse_event_decks(html: str) -> list[DeckResult]:
    """Parse an event page's results list into decks (all finishes).

    A result row is a `div.chosen_tr`/`div.hover_tr` containing an `a.player`
    pilot link (which distinguishes it from decklist card rows). Placing is the
    row's first bare rank label (`1`, `3-4`); the deck (archetype) link is the
    `?...&d=<id>` anchor carrying visible text; the pilot is the `a.player` text.
    """
    soup = BeautifulSoup(html, "html.parser")
    decks: list[DeckResult] = []
    seen: set[str] = set()

    for row in soup.find_all("div"):
        classes = row.get("class") or []
        if "chosen_tr" not in classes and "hover_tr" not in classes:
            continue
        player_link = row.find("a", class_="player")
        if player_link is None:  # not a result row (e.g. a decklist card row)
            continue

        name_link = None
        for anchor in row.find_all("a", href=re.compile(r"[?&]d=\d+")):
            if anchor.get_text(strip=True):  # skip the thumbnail (image-only) link
                name_link = anchor
                break
        if name_link is None:
            continue
        match = re.search(r"[?&]d=(\d+)", name_link["href"])
        if not match:
            continue
        deck_id = match.group(1)
        if deck_id in seen:
            continue
        seen.add(deck_id)

        placing = ""
        for div in row.find_all("div"):
            text = div.get_text(strip=True)
            if re.fullmatch(r"\d+(-\d+)?", text):
                placing = text
                break

        decks.append(
            DeckResult(
                source_deck_id=deck_id,
                placing=placing,
                archetype_name=name_link.get_text(strip=True)[:200],
                player=player_link.get_text(strip=True)[:200],
            )
        )

    return decks


def parse_decklist(html: str) -> list[DeckCard]:
    """Parse the currently-displayed deck's cards into main/side card lines.

    Card rows are `div.deck_line` keyed `id=md...` (mainboard) or `id=sb...`
    (sideboard); each renders "QTY <span class=L14>Card Name</span>".
    """
    soup = BeautifulSoup(html, "html.parser")
    cards: list[DeckCard] = []

    for div in soup.find_all("div", id=re.compile(r"^(md|sb)")):
        classes = div.get("class") or []
        if "deck_line" not in classes:
            continue
        span = div.find("span", class_="L14")
        if span is None:
            continue
        name = span.get_text(strip=True)[:200]
        quantity_match = re.match(r"(\d+)", div.get_text(" ", strip=True))
        quantity = int(quantity_match.group(1)) if quantity_match else 0
        board = "main" if div["id"].startswith("md") else "side"
        cards.append(DeckCard(board=board, quantity=quantity, card_name=name))

    return cards

"""Scryfall bulk-data sync and card-name resolution.

Maps a scraped MTGTop8 card name to its canonical Scryfall printing (canonical
name + a current non-foil paper set/collector number). Kept dependency-light and
offline-testable: network is injected (``fetch_meta``/``download``) so tests build
an index straight from a saved bulk fixture and never hit live Scryfall.

Scryfall's `default_cards` bulk export holds one row per printing (multiple per
card). We keep, per canonical card name, the best non-foil *paper* printing —
preferring a standard (non-promo, non-crossover) printing over a special one,
then the most recent — and index it under the full name plus each face name so
split/DFC front-face names (what MTGTop8 emits) still resolve.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass

import requests

# Scryfall set types that are not real tournament-legal paper printings.
_EXCLUDED_SET_TYPES = frozenset({"funny", "memorabilia", "token", "alchemy"})
BULK_META_URL = "https://api.scryfall.com/bulk-data"


@dataclass(frozen=True)
class Printing:
    """A resolved current non-foil printing for a card."""

    name: str  # canonical Scryfall name (full, e.g. "Fire // Ice")
    set_code: str  # uppercased set code, matching Arena's "(SET) NUM"
    collector_number: str


def _normalize(name: str) -> str:
    """Lowercase and collapse whitespace so lookups are case/space insensitive.

    MTGTop8 writes split/DFC names with a single slash (``Fire / Ice``) where
    Scryfall uses a double slash (``Fire // Ice``); normalize the single-slash
    separator to ``//`` so both forms resolve to the same key."""
    collapsed = " ".join(name.strip().lower().split())
    return collapsed.replace(" / ", " // ")


def _is_paper_nonfoil(row: dict) -> bool:
    """True if the row is a real, non-digital, non-foil paper printing."""
    if row.get("digital"):
        return False
    if "paper" not in (row.get("games") or []):
        return False
    if row.get("set_type") in _EXCLUDED_SET_TYPES:
        return False
    finishes = row.get("finishes")
    if finishes is not None:
        return "nonfoil" in finishes
    return bool(row.get("nonfoil", True))


def _is_special_printing(row: dict) -> bool:
    """True for promo or Universes Beyond crossover printings — alternate
    treatments (odd collector numbers, different art) that we avoid when a plain
    standard printing of the same card exists."""
    if row.get("promo"):
        return True
    return "universesbeyond" in (row.get("promo_types") or [])


def _selection_key(row: dict) -> tuple[int, str, str]:
    """Sort key choosing the best printing. Prefer a standard (non-promo,
    non-crossover) printing over a special one, then the most recent, then set
    code as a stable tiebreak. Greater is better."""
    return (
        0 if _is_special_printing(row) else 1,
        row.get("released_at", ""),
        str(row.get("set", "")),
    )


def _name_keys(row: dict):
    """Yield the lookup keys a printing should answer to: the full name and,
    for split/DFC/adventure cards, each individual face name. The `//` split and
    `card_faces` branches overlap for multi-face cards (both yield the face
    names, deduped by the caller's setdefault); the split branch is kept for the
    rare split card that ships without a `card_faces` array."""
    yield _normalize(row["name"])
    if "//" in row["name"]:
        for part in row["name"].split("//"):
            yield _normalize(part)
    for face in row.get("card_faces") or []:
        if face.get("name"):
            yield _normalize(face["name"])


class CardIndex:
    """A ``name -> Printing`` lookup built from Scryfall bulk rows."""

    def __init__(self, by_name: dict[str, Printing]):
        self._by_name = by_name

    @classmethod
    def from_bulk_rows(cls, rows) -> "CardIndex":
        # Per canonical name, keep the best paper non-foil printing: a standard
        # (non-promo, non-crossover) printing is preferred over a special one,
        # then the most recent, with set code as a stable tiebreak so selection
        # is deterministic regardless of bulk-file ordering.
        best: dict[str, dict] = {}
        for row in rows:
            if not _is_paper_nonfoil(row):
                continue
            name = row["name"]
            current = best.get(name)
            if current is None or _selection_key(row) > _selection_key(current):
                best[name] = row

        by_name: dict[str, Printing] = {}
        for name, row in best.items():
            printing = Printing(
                name=name,
                set_code=str(row["set"]).upper(),
                collector_number=str(row["collector_number"]),
            )
            for key in _name_keys(row):
                by_name.setdefault(key, printing)
        return cls(by_name)

    def resolve(self, name: str) -> Printing | None:
        """Return the canonical printing for a scraped card name, or None on a miss."""
        return self._by_name.get(_normalize(name))


def load_bulk_index(path: str) -> CardIndex:
    """Build a CardIndex from a Scryfall bulk JSON file on disk."""
    with open(path) as f:
        return CardIndex.from_bulk_rows(json.load(f))


# Scryfall asks API clients to send a descriptive User-Agent.
_USER_AGENT = "MetaStack/1.0 (https://github.com/bijeded/metastack)"


def _default_fetch_meta() -> dict:
    return requests.get(BULK_META_URL, headers={"User-Agent": _USER_AGENT}, timeout=30).json()


def _default_download(uri: str, dest: str) -> None:
    """Stream the (large) bulk file to disk so it is never held in memory."""
    with requests.get(uri, headers={"User-Agent": _USER_AGENT}, stream=True, timeout=300) as resp:
        resp.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in resp.iter_content(chunk_size=1 << 20):
                f.write(chunk)


def sync_bulk(cache_dir, *, today: str, fetch_meta=_default_fetch_meta, download=_default_download) -> CardIndex:
    """Return a CardIndex for today, downloading the bulk file only once per day.

    Reuses a cached ``default_cards-<today>.json`` in ``cache_dir`` when present;
    otherwise resolves the ``default_cards`` download URI from Scryfall's bulk-data
    metadata and streams the file to the cache. ``today`` is an ISO date string so
    the cache key rotates daily (and the GH Actions cache can key on the same date).
    """
    cache_dir = str(cache_dir)
    os.makedirs(cache_dir, exist_ok=True)
    cache_path = os.path.join(cache_dir, f"default_cards-{today}.json")

    if not os.path.exists(cache_path):
        meta = fetch_meta()
        entry = next((d for d in meta["data"] if d["type"] == "default_cards"), None)
        if entry is None:
            raise RuntimeError("Scryfall bulk-data metadata has no 'default_cards' entry")
        download(entry["download_uri"], cache_path)

    return load_bulk_index(cache_path)

"""Scryfall bulk-data sync and card-name resolution.

Maps a scraped MTGTop8 card name to its canonical Scryfall printing (canonical
name + a current non-foil paper set/collector number). Kept dependency-light and
offline-testable: network is injected (``fetch_meta``/``download``) so tests build
an index straight from a saved bulk fixture and never hit live Scryfall.

Scryfall's `default_cards` bulk export holds one row per printing (multiple per
card). We keep, per canonical card name, the best non-foil *paper* printing —
ranking by plain treatment first (a plain printing beats any special-treatment
one: promo, crossover, full-art, textless, borderless, or showcase/extended/
inverted frame — even in a newer set), then a preferred set type (expansion/
core/masters over commander/draft-innovation), then the most recent — and index
it under the full name plus each face name so split/DFC front-face names (what
MTGTop8 emits) still resolve.
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
    image_url: str | None = None  # hotlinked Scryfall CDN image (normal size), if any
    art_crop_url: str | None = None  # hotlinked Scryfall CDN art_crop image, if any
    type_line: str | None = None  # printing type line, e.g. "Creature — Elf"
    rarity: str | None = None  # mythic/rare/uncommon/common
    cmc: float | None = None  # converted mana cost
    released_at: str | None = None  # printing's set release date (ISO YYYY-MM-DD)
    color_identity: tuple[str, ...] = ()  # WUBRG color identity letters, () for colorless


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


# Frame effects that mark an alternate treatment we avoid when a plain printing
# exists (Scryfall vocabulary). Borderless is handled via `border_color`.
_SPECIAL_FRAME_EFFECTS = frozenset({"showcase", "extendedart", "inverted"})

# Set types whose printings we prefer (a clean expansion/core/masters printing)
# and demote (bonus reprints in Commander / draft-innovation products). Anything
# else is neutral.
_PREFERRED_SET_TYPES = frozenset({"expansion", "core", "masters"})
_DEMOTED_SET_TYPES = frozenset({"commander", "draft_innovation"})


def _is_special_printing(row: dict) -> bool:
    """True for a special-treatment printing — promo, Universes Beyond crossover,
    full-art, textless, borderless, or a showcase/extended/inverted frame — the
    alternate treatments (odd collector numbers, different art) we avoid when a
    plain printing of the same card exists. Border colors other than
    ``borderless`` (black, white, silver, gold) are NOT special by themselves."""
    if row.get("promo"):
        return True
    if "universesbeyond" in (row.get("promo_types") or []):
        return True
    if row.get("full_art") or row.get("textless"):
        return True
    if row.get("border_color") == "borderless":
        return True
    return bool(_SPECIAL_FRAME_EFFECTS.intersection(row.get("frame_effects") or []))


def _set_type_tier(row: dict) -> int:
    """Preference tier for a printing's set type: 2 for expansion/core/masters,
    0 for commander/draft-innovation reprints, 1 for anything else. Greater is
    better."""
    set_type = row.get("set_type")
    if set_type in _PREFERRED_SET_TYPES:
        return 2
    if set_type in _DEMOTED_SET_TYPES:
        return 0
    return 1


def _selection_key(row: dict) -> tuple[int, int, str, str]:
    """Sort key choosing the best printing (greater is better). Plain treatment
    is the top priority — a plain printing beats any special-treatment one even
    in a newer set — then the preferred set type, then the most recent release,
    then set code as a stable tiebreak."""
    return (
        0 if _is_special_printing(row) else 1,
        _set_type_tier(row),
        row.get("released_at", ""),
        str(row.get("set", "")),
    )


def _normal_image_url(row: dict) -> str | None:
    """The printing's `normal`-size image URL. Split/DFC cards carry no top-level
    `image_uris`; fall back to the front face's."""
    top = (row.get("image_uris") or {}).get("normal")
    if top:
        return top
    for face in row.get("card_faces") or []:
        face_url = (face.get("image_uris") or {}).get("normal")
        if face_url:
            return face_url
    return None


def _art_crop_url(row: dict) -> str | None:
    """The printing's `art_crop`-size image URL. Split/DFC cards carry no top-level
    `image_uris`; fall back to the front face's (mirrors `_normal_image_url`)."""
    top = (row.get("image_uris") or {}).get("art_crop")
    if top:
        return top
    for face in row.get("card_faces") or []:
        face_url = (face.get("image_uris") or {}).get("art_crop")
        if face_url:
            return face_url
    return None


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
        # Per canonical name, keep the best paper non-foil printing: plain
        # treatment beats any special-treatment one, then the preferred set type,
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
                image_url=_normal_image_url(row),
                art_crop_url=_art_crop_url(row),
                type_line=row.get("type_line"),
                rarity=row.get("rarity"),
                cmc=row.get("cmc"),
                released_at=row.get("released_at"),
                color_identity=tuple(row.get("color_identity") or ()),
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

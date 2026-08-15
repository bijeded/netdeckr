"""Scryfall bulk-data sync and card-name resolution.

Maps a scraped MTGTop8 card name to its canonical Scryfall printing (canonical
name + a current non-foil paper set/collector number). Kept dependency-light and
offline-testable: network is injected (``fetch_meta``/``download``) so tests build
an index straight from a saved bulk fixture and never hit live Scryfall.

Scryfall's `default_cards` bulk export holds one row per printing (multiple per
card). We keep, per canonical card name, the best non-foil *paper* printing —
ranking by plain treatment first (a plain printing beats any special-treatment
one: promo, booster-fun variant, full-art, textless, borderless, or showcase/
extended/inverted frame — even in a newer set), then a preferred set type
(expansion/core over commander/draft-innovation/box, with masters and everything
else neutral), then the most recent — and index it under the full name plus each
face name so split/DFC front-face names (what MTGTop8 emits) still resolve.

`reversible_card` printings are excluded from candidacy entirely; see
`_is_paper_nonfoil`.
"""
from __future__ import annotations

import contextlib
import gzip
import json
import os
from collections.abc import Iterator
from dataclasses import dataclass

import requests

# Scryfall set types that are not real tournament-legal paper printings.
_EXCLUDED_SET_TYPES = frozenset({"funny", "memorabilia", "token", "alchemy"})
BULK_META_URL = "https://api.scryfall.com/bulk-data"

# DB format code -> the key that format uses in a bulk row's `legalities` map.
# The single place the two vocabularies meet, so they cannot drift apart across
# modules. (mtgtop8.FORMATS happens to hold the same five slugs, but those are
# MTGTop8's own labels and are not this mapping — a coincidence, not a contract.)
SCRYFALL_LEGALITY_KEY = {
    "ST": "standard",
    "PI": "pioneer",
    "MO": "modern",
    "PAU": "pauper",
    "PREM": "premodern",
}

# The only legality status that is a ban. `restricted` is not a ban, and
# `not_legal` means the card was never legal in the format at all — treating
# either as a ban would discard decks over something that is not a ban.
_BANNED_STATUS = "banned"


@dataclass(frozen=True)
class Printing:
    """A resolved current non-foil printing for a card."""

    name: str  # canonical Scryfall name (full, e.g. "Fire // Ice")
    set_code: str  # uppercased set code, matching Arena's "(SET) NUM"
    collector_number: str
    image_url: str | None = None  # hotlinked Scryfall CDN image (normal size), if any
    small_image_url: str | None = None  # same image at thumbnail size, for grid display
    art_crop_url: str | None = None  # hotlinked Scryfall CDN art_crop image, if any
    # Type line of the FACE this printing was looked up by, e.g. "Creature — Elf".
    # Never a multi-face card's combined "<front> // <back>" line: a scraped name
    # names one face, and every consumer (trending's creature/spell split, the
    # decklist modal's grouping, signature-card land exclusion) asks a substring
    # question that a glued-together line answers wrong. See `_face_type_line`.
    type_line: str | None = None
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
    """True if the row is a real, non-digital, non-foil paper printing.

    ``reversible_card`` printings (Secret Lair double-sided reprints) are rejected
    outright rather than merely demoted: they carry no top-level ``type_line`` or
    ``cmc``, and Scryfall names them ``"<name> // <name>"`` — a different index
    bucket from the plain card, so they would never be ranked against it and would
    win or lose purely on bulk-file order. Rejecting them here also keeps a card
    whose only paper printing is reversible from resolving with null metadata."""
    if row.get("layout") == "reversible_card":
        return False
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

# Set types whose printings we prefer (a clean expansion/core printing) and demote
# (bonus reprints in Commander / draft-innovation products, and box products like
# Secret Lair). Anything else — including `masters` reprint/draft sets such as
# Mystery Booster 2 — is neutral: those are real printings, but they should not
# outrank an expansion or core printing on recency alone.
_PREFERRED_SET_TYPES = frozenset({"expansion", "core"})
_DEMOTED_SET_TYPES = frozenset({"commander", "draft_innovation", "box"})


def _is_special_printing(row: dict) -> bool:
    """True for a special-treatment printing — promo, booster-fun variant,
    full-art, textless, borderless, or a showcase/extended/inverted frame — the
    alternate treatments (odd collector numbers, different art) we avoid when a
    plain printing of the same card exists. Border colors other than
    ``borderless`` (black, white, silver, gold) are NOT special by themselves.

    A Universes Beyond marker is deliberately not consulted: on a wholly-UB set
    every printing carries it, so it cannot separate the plain printing from its
    variants and only flattens the ranking into a tie broken by file order. The
    variants it was meant to catch carry ``boosterfun`` or one of the treatment
    markers below."""
    promo_types = row.get("promo_types") or []
    if row.get("promo"):
        return True
    if "boosterfun" in promo_types:
        return True
    if row.get("full_art") or row.get("textless"):
        return True
    if row.get("border_color") == "borderless":
        return True
    return bool(_SPECIAL_FRAME_EFFECTS.intersection(row.get("frame_effects") or []))


def _set_type_tier(row: dict) -> int:
    """Preference tier for a printing's set type: 2 for expansion/core, 0 for
    commander/draft-innovation/box reprints, 1 for anything else (including
    `masters`). Greater is better. Demoted, not rejected — a card whose only
    printing is a Secret Lair drop should still resolve."""
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


def _image_url(row: dict, size: str) -> str | None:
    """The printing's image URL at one of Scryfall's sizes (`normal`, `small`,
    `art_crop`). Split/DFC cards carry no top-level `image_uris`; fall back to the
    front face's."""
    top = (row.get("image_uris") or {}).get(size)
    if top:
        return top
    for face in row.get("card_faces") or []:
        face_url = (face.get("image_uris") or {}).get(size)
        if face_url:
            return face_url
    return None


def _faces(row: dict) -> list[dict]:
    """The row's faces in printed order, or [] for a single-face card.

    Falls back to synthesising faces from a `//` name for the rare split card that
    ships without a `card_faces` array; such a row has no per-face type line, so
    the synthesised faces carry none either.
    """
    faces = row.get("card_faces") or []
    if faces:
        return [f for f in faces if f.get("name")]
    if "//" in row["name"]:
        return [{"name": part.strip()} for part in row["name"].split("//") if part.strip()]
    return []


def _primary_keys(row: dict):
    """Yield the lookup keys this card owns outright: its full canonical name and
    its FRONT face's name.

    These are the forms MTGTop8 actually emits (verified over production's
    multi-face rows: front-face name or the single-slash split form, never a back
    face), so a card must never lose one of them to another card's back face.
    """
    yield _normalize(row["name"])
    faces = _faces(row)
    if faces:
        yield _normalize(faces[0]["name"])


def _secondary_keys(row: dict):
    """Yield the lookup keys this card answers to only as a fallback: the names of
    its non-front faces.

    A back face name is a weaker claim than any card's own name — `Replenish` is a
    standalone Urza's Destiny sorcery first and `Eiganjo Dynastorian`'s back face
    second — so these are registered in a later pass and can only fill a key no
    primary claim wanted.
    """
    for face in _faces(row)[1:]:
        yield _normalize(face["name"])


def _face_type_line(row: dict, key: str) -> str | None:
    """The type line of the face `key` names, falling back to the front face's.

    A multi-face row's top-level `type_line` is the combined "<front> // <back>"
    string, which no consumer can classify correctly. The full-name key resolves to
    the front face's line too: classification must describe one face whichever
    spelling was scraped, and the front face is the one the deck plays.
    """
    faces = _faces(row)
    if not faces:
        return row.get("type_line")
    index = next(
        (i for i, face in enumerate(faces) if _normalize(face["name"]) == key), 0
    )
    face_line = faces[index].get("type_line")
    if face_line:
        return face_line
    # A synthesised face (split card shipping without `card_faces`) carries no type
    # line, so take the matching half of the row's combined one positionally.
    halves = [part.strip() for part in (row.get("type_line") or "").split("//")]
    if len(halves) == len(faces):
        return halves[index] or None
    return row.get("type_line")


def _banned_formats(row: dict) -> Iterator[str]:
    """Yield the DB format codes this row's card is BANNED in.

    Legality is a property of the card, not of the printing, and every printing of
    a card carries the same map — so any row will do and duplicates across a card's
    printings collapse in the caller's set.

    A row with no `legalities` map, or with a format key missing from it, yields
    nothing for that format: a missing field can only under-report a ban, never
    invent one. That is the safe direction — an unreported ban leaves a dead deck
    counted for a day, while an invented one would delete a legal deck.
    """
    legalities = row.get("legalities") or {}
    for code, key in SCRYFALL_LEGALITY_KEY.items():
        if legalities.get(key) == _BANNED_STATUS:
            yield code


class CardIndex:
    """A ``name -> Printing`` lookup built from Scryfall bulk rows.

    Also carries, per supported format, the set of canonical card names banned in
    it — read from the same rows in the same pass, so the banlist costs no extra
    download and no per-card REST request.
    """

    def __init__(self, by_name: dict[str, Printing], banned_by_format: dict[str, set[str]] | None = None):
        self._by_name = by_name
        self._banned_by_format = banned_by_format or {code: set() for code in SCRYFALL_LEGALITY_KEY}

    def banned_cards(self, fmt: str) -> set[str]:
        """Canonical Scryfall names banned in a DB format code (empty when none).

        These are matched against `deck_cards.scryfall_name`, so they are the full
        canonical names — never a face name or a scraped spelling.
        """
        return self._banned_by_format.get(fmt, set())

    @classmethod
    def from_bulk_rows(cls, rows) -> "CardIndex":
        # Per canonical name, keep the best paper non-foil printing: plain
        # treatment beats any special-treatment one, then the preferred set type,
        # then the most recent, with set code as a stable tiebreak so selection
        # is deterministic regardless of bulk-file ordering.
        best: dict[str, dict] = {}
        banned_by_format: dict[str, set[str]] = {code: set() for code in SCRYFALL_LEGALITY_KEY}
        for row in rows:
            # Banned status is collected BEFORE the printing filter: legality is a
            # property of the card, so a card whose only paper non-foil printing is
            # rejected here (a reversible_card, say) must still be recognised as
            # banned. `reversible_card` rows are skipped because Scryfall names them
            # "<name> // <name>", which is not a name any deck card resolves to.
            if row.get("layout") != "reversible_card":
                for code in _banned_formats(row):
                    banned_by_format[code].add(row["name"])
            if not _is_paper_nonfoil(row):
                continue
            name = row["name"]
            current = best.get(name)
            if current is None or _selection_key(row) > _selection_key(current):
                best[name] = row

        # Register keys in two priority passes, so a name a real card owns can never
        # be taken by some other card's back face (`Replenish` is the Urza's Destiny
        # sorcery, not `Eiganjo Dynastorian`'s back half). Within a pass, iterate in
        # sorted canonical-name order: a same-tier collision is not known to exist,
        # but nothing prevents one, and this makes the winner independent of
        # bulk-file order rather than merely unspecified.
        by_name: dict[str, Printing] = {}
        ordered = sorted(best.items())
        for keys_for in (_primary_keys, _secondary_keys):
            for name, row in ordered:
                for key in keys_for(row):
                    by_name.setdefault(key, _printing_for(name, row, key))
        return cls(by_name, banned_by_format)

    def __len__(self) -> int:
        return len(self._by_name)

    def resolve(self, name: str) -> Printing | None:
        """Return the canonical printing for a scraped card name, or None on a miss."""
        return self._by_name.get(_normalize(name))


def _printing_for(name: str, row: dict, key: str) -> Printing:
    """Build the Printing served for one lookup key.

    Identity (canonical name, set, collector number, images) always describes the
    whole card — that is what identifies the physical card and its Arena export
    line — while `type_line` describes the face `key` names.
    """
    return Printing(
        name=name,
        set_code=str(row["set"]).upper(),
        collector_number=str(row["collector_number"]),
        image_url=_image_url(row, "normal"),
        small_image_url=_image_url(row, "small"),
        art_crop_url=_image_url(row, "art_crop"),
        type_line=_face_type_line(row, key),
        rarity=row.get("rarity"),
        cmc=row.get("cmc"),
        released_at=row.get("released_at"),
        color_identity=tuple(row.get("color_identity") or ()),
    )


def _bulk_rows(path: str) -> Iterator[dict]:
    """Yield card records from a gzipped-JSONL bulk file, one per line.

    Streamed rather than parsed whole: the decompressed dataset is ~2 GB, and only
    the resulting index needs to stay resident. A malformed line is reported with
    the file and line number — bare decode errors are thin diagnostics against a
    two-million-line stream.
    """
    with gzip.open(path, "rt", encoding="utf-8") as f:
        for lineno, line in enumerate(f, start=1):
            if not line.strip():
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path}: malformed JSON on line {lineno}: {exc}") from exc


def load_bulk_index(path: str) -> CardIndex:
    """Build a CardIndex from a Scryfall bulk file on disk (gzipped JSONL).

    An index with no cards is an error, not a valid result: an empty ``CardIndex``
    is still truthy, so returning one would let every card silently miss and put
    unenriched rows back in the database — the failure this module exists to make
    impossible. An empty or record-less file is the shape a truncated download or
    an upstream format change takes.
    """
    index = CardIndex.from_bulk_rows(_bulk_rows(path))
    if not index:
        raise RuntimeError(f"Scryfall bulk file yielded no card records: {path}")
    return index


# Scryfall asks API clients to send a descriptive User-Agent.
_USER_AGENT = "Netdeckr/1.0 (https://github.com/bijeded/netdeckr)"


def _default_fetch_meta() -> dict:
    return requests.get(BULK_META_URL, headers={"User-Agent": _USER_AGENT}, timeout=30).json()


def _default_download(uri: str, dest: str) -> None:
    """Stream the (large) bulk file to disk so it is never held in memory.

    Written byte-for-byte, staying gzipped at rest (~77 MB vs ~2 GB decompressed) —
    which is what ``gzip.open`` wants on the read side. Scryfall serves the file as
    ``Content-Type: application/gzip`` with no ``Content-Encoding``, so requests
    passes the bytes through instead of transparently decompressing them.
    """
    with requests.get(uri, headers={"User-Agent": _USER_AGENT}, stream=True, timeout=300) as resp:
        resp.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in resp.iter_content(chunk_size=1 << 20):
                f.write(chunk)


def sync_bulk(cache_dir, *, today: str, fetch_meta=_default_fetch_meta, download=_default_download) -> CardIndex:
    """Return a CardIndex for today, downloading the bulk file only once per day.

    Reuses a cached ``default_cards-<today>.jsonl.gz`` in ``cache_dir`` when present;
    otherwise resolves the ``default_cards`` download URI from Scryfall's bulk-data
    metadata and streams the file to the cache. ``today`` is an ISO date string so
    the cache key rotates daily (and the GH Actions cache can key on the same date).

    Scryfall publishes the dataset as gzipped JSONL under ``jsonl_download_uri``;
    the ``.jsonl.gz`` suffix keeps a cache entry written for an older encoding from
    being read as if it were the current format. A missing key is raised rather
    than tolerated: silently falling back is what let an earlier upstream rename go
    unnoticed while every scrape wrote unenriched rows.
    """
    cache_dir = str(cache_dir)
    os.makedirs(cache_dir, exist_ok=True)
    cache_path = os.path.join(cache_dir, f"default_cards-{today}.jsonl.gz")

    if not os.path.exists(cache_path):
        meta = fetch_meta()
        entry = next((d for d in meta["data"] if d["type"] == "default_cards"), None)
        if entry is None:
            raise RuntimeError("Scryfall bulk-data metadata has no 'default_cards' entry")
        uri = entry.get("jsonl_download_uri")
        if not uri:
            raise RuntimeError(
                "Scryfall 'default_cards' entry has no 'jsonl_download_uri' "
                "(upstream bulk-data format may have changed)"
            )
        # Download aside, then rename into place: a network drop mid-transfer would
        # otherwise leave a truncated file at the day's cache path, which every
        # later per-format run would reuse (and CI would then cache across jobs).
        # os.replace is atomic within a filesystem, so the cache path only ever
        # holds a complete file.
        partial = f"{cache_path}.part"
        try:
            download(uri, partial)
            os.replace(partial, cache_path)
        finally:
            # Suppressed: cleanup failing must not mask the download error above.
            with contextlib.suppress(OSError):
                os.remove(partial)

    return load_bulk_index(cache_path)

"""Supabase writer for the scraper.

Talks to Supabase's PostgREST API with the service-role key (which bypasses RLS).
Kept dependency-light: only `requests`. Network I/O lives here; the orchestration
in pipeline.py is pure and injected with this writer.
"""
from __future__ import annotations

from datetime import date
from urllib.parse import quote

import requests

from mtgtop8 import Archetype, DeckCard, DeckResult, Event, color_identity_for

# Rarity ordering for signature-card ranking; mythic is best. An unknown/null
# rarity sorts after all of these (see _signature_sort_key), so a resolved card
# outranks an unresolved one at equal quantity.
_RARITY_RANK = {"mythic": 0, "rare": 1, "uncommon": 2, "common": 3}


def _release_ordinal(released_at: str | None) -> int | None:
    """Parse an ISO date string to a sortable ordinal, or None if absent/invalid."""
    if not released_at:
        return None
    try:
        return date.fromisoformat(released_at[:10]).toordinal()
    except ValueError:
        return None


class SupabaseWriter:
    """Replace-on-run writer, scoped per (format, meta_window) snapshot slice."""

    def __init__(
        self,
        url: str,
        service_role_key: str,
        session: requests.Session | None = None,
        card_resolver=None,
    ):
        if not url.startswith("https://"):
            # The service-role key must never travel over cleartext http.
            raise ValueError("Supabase URL must use https")
        self._rest = f"{url.rstrip('/')}/rest/v1"
        self._session = session or requests.Session()
        # Optional Scryfall card resolver (anything exposing `resolve(name)`);
        # when set, deck cards are enriched with the canonical printing. Left
        # None means the Scryfall columns are omitted (kept null by the DB).
        self._card_resolver = card_resolver
        # Per-format {lower(name): id} cache for case-insensitive archetype
        # get-or-create (loaded lazily on first decklist upsert for a format).
        self._archetype_ids_by_format: dict[str, dict[str, int]] = {}
        self._headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        }

    def replace_breakdown(self, fmt: str, meta_window: str, archetypes: list[Archetype]) -> None:
        """Replace one (format, meta_window) snapshot slice.

        Deletes only that window's snapshots — archetypes are shared across
        windows, so they are upserted (get-or-create) rather than deleted. Then
        inserts this window's ranked snapshots. Leaves other windows untouched.
        """
        delete = self._session.delete(
            f"{self._rest}/metagame_snapshots"
            f"?format_code=eq.{quote(fmt)}&meta_window=eq.{quote(meta_window)}",
            headers=self._headers,
        )
        delete.raise_for_status()

        if not archetypes:
            return

        # Upsert archetypes on their (format_code, name) unique key so ids are
        # stable across windows; return the rows to map name -> id.
        upsert_archetypes = self._session.post(
            f"{self._rest}/archetypes?on_conflict=format_code,name",
            headers={
                **self._headers,
                "Prefer": "resolution=merge-duplicates,return=representation",
            },
            json=[
                {"format_code": fmt, "name": a.name, "color_identity": a.color_identity}
                for a in archetypes
            ],
        )
        upsert_archetypes.raise_for_status()

        id_by_name = {row["name"]: row["id"] for row in upsert_archetypes.json()}
        snapshots = [
            {
                "archetype_id": id_by_name[a.name],
                "format_code": fmt,
                "meta_window": meta_window,
                "share_pct": a.share_pct,
                "rank": a.rank,
            }
            for a in archetypes
        ]

        insert_snapshots = self._session.post(
            f"{self._rest}/metagame_snapshots",
            headers=self._headers,
            json=snapshots,
        )
        insert_snapshots.raise_for_status()

    def stamp_updated(self, fmt: str, meta_window: str, now_iso: str) -> None:
        """Upsert the (format, meta_window) freshness timestamp."""
        upsert = self._session.post(
            f"{self._rest}/format_window_freshness?on_conflict=format_code,meta_window",
            headers={**self._headers, "Prefer": "resolution=merge-duplicates"},
            json={"format_code": fmt, "meta_window": meta_window, "last_updated_at": now_iso},
        )
        upsert.raise_for_status()

    # -- Decklists ----------------------------------------------------------
    # events/decks/deck_cards are upserted on their unique keys so daily re-runs
    # are idempotent (no duplicate events or decks). deck_cards are replaced per
    # deck, and enriched with the resolved Scryfall printing when a `card_resolver`
    # is configured (a miss or no resolver leaves the Scryfall columns null; the
    # export falls back to `card_name`).

    def upsert_event(self, fmt: str, event: Event) -> int:
        """Upsert an event on (source_event_id, format_code); return its id."""
        upsert = self._session.post(
            f"{self._rest}/events?on_conflict=source_event_id,format_code",
            headers={**self._headers, "Prefer": "resolution=merge-duplicates,return=representation"},
            json={
                "source_event_id": event.source_event_id,
                "format_code": fmt,
                "name": event.name,
                "event_date": event.event_date,
            },
        )
        upsert.raise_for_status()
        return upsert.json()[0]["id"]

    def upsert_archetype(self, fmt: str, name: str) -> int:
        """Get-or-create an archetype for a format, matching case-insensitively.

        MTGTop8 capitalizes archetype names inconsistently across pages (the
        breakdown spells "UW Control", the decklist results table "Uw Control").
        Matching on the exact name would create a duplicate archetype row that has
        no metagame snapshot and strands its decks, so we resolve against a
        per-format `lower(name) -> id` map and only insert on a true miss (keeping
        the first-seen display name). Colour identity is derived from the name.
        """
        cache = self._archetype_ids(fmt)
        existing = cache.get(name.lower())
        if existing is not None:
            return existing

        insert = self._session.post(
            f"{self._rest}/archetypes",
            headers={**self._headers, "Prefer": "return=representation"},
            json={"format_code": fmt, "name": name, "color_identity": color_identity_for(name)},
        )
        insert.raise_for_status()
        new_id = insert.json()[0]["id"]
        cache[name.lower()] = new_id
        return new_id

    def _archetype_ids(self, fmt: str) -> dict[str, int]:
        """Lazily load and cache a format's `lower(name) -> id` archetype map.

        Assumes the breakdown pass (which POSTs archetypes directly, bypassing
        this cache) is complete before any decklist `upsert_archetype` for the
        format — true in run.py, where the decklist pass follows all breakdowns —
        so the first lazy load sees the canonical breakdown names. In-run inserts
        update the cache. Archetype counts per format are well under PostgREST's
        default 1000-row page cap, so a single GET returns them all.
        """
        if fmt not in self._archetype_ids_by_format:
            resp = self._session.get(
                f"{self._rest}/archetypes?format_code=eq.{quote(fmt)}&select=id,name",
                headers=self._headers,
            )
            resp.raise_for_status()
            self._archetype_ids_by_format[fmt] = {
                row["name"].lower(): row["id"] for row in resp.json()
            }
        return self._archetype_ids_by_format[fmt]

    def upsert_deck(self, event_id: int, archetype_id: int, deck: DeckResult) -> int:
        """Upsert a deck on (event_id, source_deck_id); return its id."""
        upsert = self._session.post(
            f"{self._rest}/decks?on_conflict=event_id,source_deck_id",
            headers={**self._headers, "Prefer": "resolution=merge-duplicates,return=representation"},
            json={
                "event_id": event_id,
                "archetype_id": archetype_id,
                "source_deck_id": deck.source_deck_id,
                "player": deck.player,
                "placement": deck.placing,  # DB column is `placement` (`placing` is reserved)
            },
        )
        upsert.raise_for_status()
        return upsert.json()[0]["id"]

    def replace_deck_cards(self, deck_id: int, cards: list[DeckCard]) -> None:
        """Replace a deck's cards: clear the deck's rows, then insert the new set."""
        delete = self._session.delete(
            f"{self._rest}/deck_cards?deck_id=eq.{deck_id}",
            headers=self._headers,
        )
        delete.raise_for_status()

        if not cards:
            return

        insert = self._session.post(
            f"{self._rest}/deck_cards",
            headers=self._headers,
            json=[self._deck_card_row(deck_id, c) for c in cards],
        )
        insert.raise_for_status()

    def _deck_card_row(self, deck_id: int, card: DeckCard) -> dict:
        """Build a deck_cards insert row, enriched with the Scryfall printing when
        a resolver is configured and the card name resolves. A miss (or no
        resolver) leaves the Scryfall columns null; the scraped name is kept."""
        row = {
            "deck_id": deck_id,
            "board": card.board,
            "quantity": card.quantity,
            "card_name": card.card_name,
        }
        if self._card_resolver is not None:
            printing = self._card_resolver.resolve(card.card_name)
            # All four Scryfall columns are written together (identity + image);
            # image_url is never set independently. backfill_scryfall relies on this
            # coupling — it uses `image_url is null` as the completeness sentinel.
            row["scryfall_name"] = printing.name if printing else None
            row["set_code"] = printing.set_code if printing else None
            row["collector_number"] = printing.collector_number if printing else None
            row["image_url"] = printing.image_url if printing else None
            row["type_line"] = printing.type_line if printing else None
            row["rarity"] = printing.rarity if printing else None
            row["cmc"] = printing.cmc if printing else None
            row["released_at"] = printing.released_at if printing else None
        return row

    def backfill_scryfall(self, *, page_size: int = 1000) -> int:
        """Populate the Scryfall columns on existing deck_cards rows still missing art.

        A one-time pass over rows not yet fully enriched. `image_url` is the
        completeness sentinel: it is the last Scryfall column written, so
        `image_url is null` covers both never-mapped rows and rows mapped before
        the image column existed (identity set, image null). Pages those rows by
        ascending id (a cursor, so unresolvable rows don't loop forever), collects
        the distinct scraped card names, and PATCHes each resolvable name's
        still-null rows in a single request. Requires a card_resolver. Idempotent:
        the `image_url=is.null` filter excludes fully-enriched rows, and a re-run
        only revisits rows that still miss. Returns the number of rows updated.
        """
        if self._card_resolver is None:
            raise RuntimeError("backfill_scryfall requires a card_resolver")

        names: set[str] = set()
        cursor = 0
        while True:
            resp = self._session.get(
                f"{self._rest}/deck_cards"
                f"?image_url=is.null&id=gt.{cursor}"
                f"&select=id,card_name&order=id.asc&limit={page_size}",
                headers=self._headers,
            )
            resp.raise_for_status()
            rows = resp.json()
            if not rows:
                break
            names.update(row["card_name"] for row in rows)
            cursor = rows[-1]["id"]

        updated = 0
        for name in names:
            printing = self._card_resolver.resolve(name)
            if printing is None:
                continue
            # Percent-encode the whole value (safe="" so commas and slashes are
            # escaped too) so names like "Ral, Crackling Wit" or "Fire // Ice"
            # match. Do NOT wrap in double quotes — PostgREST compares a
            # double-quoted value literally, which matches zero rows.
            patch = self._session.patch(
                f"{self._rest}/deck_cards"
                f"?card_name=eq.{quote(name, safe='')}&image_url=is.null",
                headers={**self._headers, "Prefer": "return=representation"},
                json={
                    "scryfall_name": printing.name,
                    "set_code": printing.set_code,
                    "collector_number": printing.collector_number,
                    "image_url": printing.image_url,
                },
            )
            patch.raise_for_status()
            updated += len(patch.json())
        return updated

    def backfill_metadata(self, *, page_size: int = 1000) -> int:
        """Populate the card-metadata columns on existing deck_cards rows.

        A one-time pass over rows missing the newer metadata. `type_line` is the
        completeness sentinel (the first metadata column written for the refined
        signature selection), so `type_line is null` covers both never-mapped rows
        and rows enriched with identity/image before the metadata columns existed.
        Pages those rows by ascending id (a cursor, so unresolvable rows don't loop
        forever), collects the distinct scraped names, and PATCHes each resolvable
        name's still-null rows, (re)writing all identity/image/metadata columns.
        Requires a card_resolver. Idempotent: the `type_line=is.null` filter
        excludes rows already carrying metadata; a re-run only revisits rows that
        still miss (e.g. resolution misses). Returns the number of rows updated.
        """
        if self._card_resolver is None:
            raise RuntimeError("backfill_metadata requires a card_resolver")

        names: set[str] = set()
        cursor = 0
        while True:
            resp = self._session.get(
                f"{self._rest}/deck_cards"
                f"?type_line=is.null&id=gt.{cursor}"
                f"&select=id,card_name&order=id.asc&limit={page_size}",
                headers=self._headers,
            )
            resp.raise_for_status()
            rows = resp.json()
            if not rows:
                break
            names.update(row["card_name"] for row in rows)
            cursor = rows[-1]["id"]

        updated = 0
        for name in names:
            printing = self._card_resolver.resolve(name)
            if printing is None:
                continue
            # Percent-encode the whole value (safe="" so commas/slashes escape too)
            # and do NOT double-quote it — see backfill_scryfall for the rationale.
            patch = self._session.patch(
                f"{self._rest}/deck_cards"
                f"?card_name=eq.{quote(name, safe='')}&type_line=is.null",
                headers={**self._headers, "Prefer": "return=representation"},
                json={
                    "scryfall_name": printing.name,
                    "set_code": printing.set_code,
                    "collector_number": printing.collector_number,
                    "image_url": printing.image_url,
                    "type_line": printing.type_line,
                    "rarity": printing.rarity,
                    "cmc": printing.cmc,
                    "released_at": printing.released_at,
                },
            )
            patch.raise_for_status()
            updated += len(patch.json())
        return updated

    def refresh_archetype_art(self, fmt: str) -> int:
        """Set each archetype's signature card + art for a format.

        The signature card is the highest-ranked non-land mainboard card across the
        archetype's stored decks — ranked by total quantity desc, then rarity desc
        (mythic>rare>uncommon>common), then set release date desc, then converted
        mana cost desc, then card name asc (see ``_signature_card``). It is resolved
        to a printing and stored as ``signature_card_name`` + ``art_image_url`` +
        ``art_crop_url``; an archetype with no non-land card (only lands) or whose
        chosen card does not resolve is left null. Requires a card_resolver.
        Idempotent — recomputed from current decks each run. Returns the number of
        archetypes updated.
        """
        if self._card_resolver is None:
            raise RuntimeError("refresh_archetype_art requires a card_resolver")

        archetypes = self._session.get(
            f"{self._rest}/archetypes?format_code=eq.{quote(fmt)}&select=id,name",
            headers=self._headers,
        )
        archetypes.raise_for_status()

        updated = 0
        for arch in archetypes.json():
            signature = self._signature_card(arch["id"])
            if signature is None:
                continue
            printing = self._card_resolver.resolve(signature)
            if printing is None or printing.image_url is None:
                continue
            patch = self._session.patch(
                f"{self._rest}/archetypes?id=eq.{arch['id']}",
                headers=self._headers,
                json={
                    "signature_card_name": signature,
                    "art_image_url": printing.image_url,
                    "art_crop_url": printing.art_crop_url,
                },
            )
            patch.raise_for_status()
            updated += 1
        return updated

    @staticmethod
    def _signature_sort_key(name: str, quantity: int, meta: dict) -> tuple:
        """Ranking key for signature-card selection (``min`` picks the best).

        Priority: total quantity desc, then rarity desc, then set release date
        desc, then converted mana cost desc, then card name asc. A null/unknown
        value for any criterion sorts last, so a card with resolved metadata beats
        one without at equal quantity, and selection stays deterministic.
        """
        rarity_rank = _RARITY_RANK.get((meta.get("rarity") or "").lower(), len(_RARITY_RANK))
        ordinal = _release_ordinal(meta.get("released_at"))
        release_key = (0, -ordinal) if ordinal is not None else (1, 0)
        cmc = meta.get("cmc")
        cmc_key = (0, -cmc) if cmc is not None else (1, 0)
        return (-quantity, rarity_rank, release_key, cmc_key, name)

    def _signature_card(self, archetype_id: int, *, page_size: int = 1000) -> str | None:
        """Highest-ranked non-land mainboard card across an archetype's decks.

        Sums quantities per card name over the archetype's mainboard deck_cards
        (paged by ascending id), excludes any card whose ``type_line`` contains
        "land" (all lands, basic and nonbasic; a null type_line is treated as
        non-land so an unresolved card can still be a candidate), and returns the
        top-ranked name via ``_signature_sort_key``, or None if there is no such
        card.
        """
        totals: dict[str, int] = {}
        meta: dict[str, dict] = {}
        cursor = 0
        while True:
            resp = self._session.get(
                f"{self._rest}/deck_cards"
                f"?board=eq.main&decks.archetype_id=eq.{archetype_id}&id=gt.{cursor}"
                f"&select=id,card_name,quantity,type_line,rarity,cmc,released_at,decks!inner(archetype_id)"
                f"&order=id.asc&limit={page_size}",
                headers=self._headers,
            )
            resp.raise_for_status()
            rows = resp.json()
            if not rows:
                break
            for row in rows:
                if "land" in (row.get("type_line") or "").lower():
                    continue
                name = row["card_name"]
                totals[name] = totals.get(name, 0) + row["quantity"]
                # Capture the first non-null value seen per field, so a printing
                # that resolved on one deck row still informs ranking even if
                # another row for the same name is unresolved.
                m = meta.setdefault(name, {"rarity": None, "cmc": None, "released_at": None})
                for field in ("rarity", "cmc", "released_at"):
                    if m[field] is None and row.get(field) is not None:
                        m[field] = row[field]
            cursor = rows[-1]["id"]

        if not totals:
            return None
        return min(totals, key=lambda name: self._signature_sort_key(name, totals[name], meta[name]))

    def existing_event_ids(self, fmt: str) -> set[str]:
        """Return the set of source event ids already stored for a format.

        Lets the scraper skip events it has already scraped (a past event's
        decklists do not change), keeping daily runs cheap after the backfill.
        """
        response = self._session.get(
            f"{self._rest}/events?format_code=eq.{quote(fmt)}&select=source_event_id",
            headers=self._headers,
        )
        response.raise_for_status()
        return {row["source_event_id"] for row in response.json()}

    def prune_events_before(self, cutoff_date: str) -> None:
        """Delete events with an event_date before ``cutoff_date`` (ISO YYYY-MM-DD).

        Decks and deck_cards are removed via ON DELETE CASCADE. Events with a null
        date are left untouched.
        """
        delete = self._session.delete(
            f"{self._rest}/events?event_date=lt.{quote(cutoff_date)}",
            headers=self._headers,
        )
        delete.raise_for_status()

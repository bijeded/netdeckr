"""Supabase writer for the scraper.

Talks to Supabase's PostgREST API with the service-role key (which bypasses RLS).
Kept dependency-light: only `requests`. Network I/O lives here; the orchestration
in pipeline.py is pure and injected with this writer.
"""
from __future__ import annotations

from urllib.parse import quote

import requests

from mtgtop8 import Archetype


class SupabaseWriter:
    """Replace-on-run writer, scoped per (format, meta_window) snapshot slice."""

    def __init__(self, url: str, service_role_key: str, session: requests.Session | None = None):
        if not url.startswith("https://"):
            # The service-role key must never travel over cleartext http.
            raise ValueError("Supabase URL must use https")
        self._rest = f"{url.rstrip('/')}/rest/v1"
        self._session = session or requests.Session()
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

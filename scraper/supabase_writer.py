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
    """Replace-on-run writer for a format's metagame breakdown."""

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

    def replace_breakdown(self, fmt: str, archetypes: list[Archetype]) -> None:
        """Delete the format's archetypes (cascading snapshots), then insert fresh
        archetypes and their ranked snapshots. Leaves no stale rows behind."""
        delete = self._session.delete(
            f"{self._rest}/archetypes?format_code=eq.{quote(fmt)}",
            headers=self._headers,
        )
        delete.raise_for_status()

        if not archetypes:
            return

        insert_archetypes = self._session.post(
            f"{self._rest}/archetypes",
            headers={**self._headers, "Prefer": "return=representation"},
            json=[
                {"format_code": fmt, "name": a.name, "color_identity": a.color_identity}
                for a in archetypes
            ],
        )
        insert_archetypes.raise_for_status()

        id_by_name = {row["name"]: row["id"] for row in insert_archetypes.json()}
        snapshots = [
            {
                "archetype_id": id_by_name[a.name],
                "format_code": fmt,
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

    def stamp_updated(self, fmt: str, now_iso: str) -> None:
        """Set the format's last_updated_at timestamp."""
        patch = self._session.patch(
            f"{self._rest}/formats?code=eq.{quote(fmt)}",
            headers=self._headers,
            json={"last_updated_at": now_iso},
        )
        patch.raise_for_status()

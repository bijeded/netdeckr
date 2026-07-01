import os
import sys
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mtgtop8 import Archetype  # noqa: E402
from supabase_writer import SupabaseWriter  # noqa: E402

URL = "https://example.supabase.co"
KEY = "service-role-key"


def _response(json_data=None, status=200):
    resp = MagicMock()
    resp.status_code = status
    resp.json.return_value = json_data if json_data is not None else []
    resp.raise_for_status.return_value = None
    return resp


def _writer(session):
    return SupabaseWriter(URL, KEY, session=session)


def test_headers_carry_service_role_key():
    writer = _writer(MagicMock())
    headers = writer._headers
    assert headers["apikey"] == KEY
    assert headers["Authorization"] == f"Bearer {KEY}"


def test_rejects_non_https_url():
    # The service-role key must never travel over cleartext http.
    with pytest.raises(ValueError):
        SupabaseWriter("http://example.supabase.co", KEY, session=MagicMock())


def test_replace_breakdown_clears_only_the_window_slice_then_upserts():
    session = MagicMock()
    session.delete.return_value = _response(status=204)
    # First POST upserts archetypes (returns rows with ids); second inserts snapshots.
    session.post.side_effect = [
        _response([{"id": 10, "name": "Izzet Control"}, {"id": 11, "name": "Selesnya Aggro"}]),
        _response(status=201),
    ]

    archetypes = [
        Archetype(name="Izzet Control", share_pct=24.0, color_identity="UR", rank=1),
        Archetype(name="Selesnya Aggro", share_pct=21.0, color_identity="WG", rank=2),
    ]
    _writer(session).replace_breakdown("ST", "52", archetypes)

    # DELETE clears ONLY this (format, window) snapshot slice — never the shared
    # archetypes (which are referenced by other windows).
    delete_url = session.delete.call_args[0][0]
    assert "/rest/v1/metagame_snapshots" in delete_url
    assert "format_code=eq.ST" in delete_url
    assert "meta_window=eq.52" in delete_url
    assert "/archetypes" not in delete_url

    # First POST upserts archetypes on the (format_code, name) unique key.
    first_post_url = session.post.call_args_list[0][0][0]
    assert "/rest/v1/archetypes" in first_post_url
    assert "on_conflict=format_code,name" in first_post_url
    assert "merge-duplicates" in session.post.call_args_list[0][1]["headers"]["Prefer"]

    # Second POST inserts this window's snapshots with mapped ids and meta_window.
    second_post_url = session.post.call_args_list[1][0][0]
    assert "/rest/v1/metagame_snapshots" in second_post_url
    snapshots = session.post.call_args_list[1][1]["json"]
    by_id = {s["archetype_id"]: s for s in snapshots}
    assert by_id[10]["rank"] == 1 and by_id[10]["format_code"] == "ST"
    assert all(s["meta_window"] == "52" for s in snapshots)
    assert by_id[11]["share_pct"] == 21.0


def test_replace_breakdown_with_no_archetypes_only_clears_the_slice():
    session = MagicMock()
    session.delete.return_value = _response(status=204)
    _writer(session).replace_breakdown("ST", "50", [])

    delete_url = session.delete.call_args[0][0]
    assert "/rest/v1/metagame_snapshots" in delete_url
    assert "meta_window=eq.50" in delete_url
    session.post.assert_not_called()  # nothing to upsert/insert


def test_stamp_updated_upserts_the_window_freshness_row():
    session = MagicMock()
    session.post.return_value = _response(status=201)
    _writer(session).stamp_updated("ST", "52", "2026-07-01T00:00:00Z")

    post_url = session.post.call_args[0][0]
    assert "/rest/v1/format_window_freshness" in post_url
    assert "on_conflict=format_code,meta_window" in post_url
    assert "merge-duplicates" in session.post.call_args[1]["headers"]["Prefer"]
    body = session.post.call_args[1]["json"]
    # PostgREST accepts either a dict or a single-item list for upsert.
    row = body[0] if isinstance(body, list) else body
    assert row["format_code"] == "ST"
    assert row["meta_window"] == "52"
    assert row["last_updated_at"] == "2026-07-01T00:00:00Z"


def test_http_error_propagates():
    session = MagicMock()
    failing = _response(status=500)
    failing.raise_for_status.side_effect = RuntimeError("500")
    session.delete.return_value = failing
    with pytest.raises(RuntimeError):
        _writer(session).replace_breakdown("ST", "50", [])

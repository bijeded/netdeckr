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


def test_replace_breakdown_deletes_then_inserts_archetypes_and_snapshots():
    session = MagicMock()
    session.delete.return_value = _response(status=204)
    # First POST (archetypes) returns rows with ids; second POST (snapshots) returns 201.
    session.post.side_effect = [
        _response([{"id": 10, "name": "Izzet Control"}, {"id": 11, "name": "Selesnya Aggro"}]),
        _response(status=201),
    ]

    archetypes = [
        Archetype(name="Izzet Control", share_pct=24.0, color_identity="UR", rank=1),
        Archetype(name="Selesnya Aggro", share_pct=21.0, color_identity="WG", rank=2),
    ]
    _writer(session).replace_breakdown("ST", archetypes)

    # DELETE targets archetypes filtered by format (cascades snapshots).
    delete_url = session.delete.call_args[0][0]
    assert "/rest/v1/archetypes" in delete_url
    assert "format_code=eq.ST" in delete_url

    # First POST inserts archetypes; second inserts snapshots with mapped ids.
    first_post_url = session.post.call_args_list[0][0][0]
    second_post_url = session.post.call_args_list[1][0][0]
    assert "/rest/v1/archetypes" in first_post_url
    assert "/rest/v1/metagame_snapshots" in second_post_url

    snapshots = session.post.call_args_list[1][1]["json"]
    by_id = {s["archetype_id"]: s for s in snapshots}
    assert by_id[10]["rank"] == 1 and by_id[10]["format_code"] == "ST"
    assert by_id[11]["share_pct"] == 21.0


def test_replace_breakdown_with_no_archetypes_only_deletes():
    session = MagicMock()
    session.delete.return_value = _response(status=204)
    _writer(session).replace_breakdown("ST", [])
    session.delete.assert_called_once()
    session.post.assert_not_called()


def test_stamp_updated_patches_format_row():
    session = MagicMock()
    session.patch.return_value = _response(status=204)
    _writer(session).stamp_updated("ST", "2026-07-01T00:00:00Z")

    patch_url = session.patch.call_args[0][0]
    assert "/rest/v1/formats" in patch_url
    assert "code=eq.ST" in patch_url
    assert session.patch.call_args[1]["json"]["last_updated_at"] == "2026-07-01T00:00:00Z"


def test_http_error_propagates():
    session = MagicMock()
    failing = _response(status=500)
    failing.raise_for_status.side_effect = RuntimeError("500")
    session.delete.return_value = failing
    with pytest.raises(RuntimeError):
        _writer(session).replace_breakdown("ST", [])

import os
import sys
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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


def test_stamp_format_updated_patches_the_format_row():
    session = MagicMock()
    session.patch.return_value = _response(status=204)
    _writer(session).stamp_format_updated("ST", "2026-07-03T00:00:00Z")

    patch_url = session.patch.call_args[0][0]
    assert "/rest/v1/formats" in patch_url
    assert "code=eq.ST" in patch_url  # the single format row, by its primary key
    body = session.patch.call_args[1]["json"]
    assert body["last_updated_at"] == "2026-07-03T00:00:00Z"
    assert set(body) == {"last_updated_at"}  # only the freshness column is written


def test_http_error_propagates():
    session = MagicMock()
    failing = _response(status=500)
    failing.raise_for_status.side_effect = RuntimeError("500")
    session.patch.return_value = failing
    with pytest.raises(RuntimeError):
        _writer(session).stamp_format_updated("ST", "2026-07-03T00:00:00Z")

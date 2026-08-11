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


# -- banlist reconcile -----------------------------------------------------
# The banlist is reconciled against what is already stored, so these drive the
# writer with a fake session whose GET returns the stored rows.

def _banlist_session(stored_rows):
    session = MagicMock()
    session.get.return_value = _response(stored_rows)
    session.post.return_value = _response([])
    session.delete.return_value = _response(status=204)
    return session


def _inserted(session):
    """The rows POSTed to banned_cards, or [] when no insert was issued."""
    if not session.post.called:
        return []
    return session.post.call_args[1]["json"]


def test_first_population_writes_null_first_seen():
    """Seeding must not announce a decade of historical bans on the first run."""
    session = _banlist_session([])
    count = _writer(session).refresh_banlist("MO", {"Old Ban", "Older Ban"}, "2026-08-10")

    assert count == 2
    rows = _inserted(session)
    assert {row["card_name"] for row in rows} == {"Old Ban", "Older Ban"}
    assert all(row["first_seen_at"] is None for row in rows)
    assert all(row["format_code"] == "MO" for row in rows)


def test_new_ban_against_an_existing_list_is_dated():
    stored = [{"id": 1, "card_name": "Old Ban", "first_seen_at": None}]
    session = _banlist_session(stored)
    _writer(session).refresh_banlist("ST", {"Old Ban", "Fresh Ban"}, "2026-08-10")

    rows = _inserted(session)
    assert rows == [{"format_code": "ST", "card_name": "Fresh Ban", "first_seen_at": "2026-08-10"}]


def test_existing_ban_keeps_its_original_date():
    """An unchanged row must not be rewritten — a re-stamped date would make the
    same ban announce itself again on every run."""
    stored = [{"id": 1, "card_name": "Old Ban", "first_seen_at": "2026-08-01"}]
    session = _banlist_session(stored)
    _writer(session).refresh_banlist("ST", {"Old Ban"}, "2026-08-10")

    assert not session.post.called
    assert not session.delete.called


def test_repeat_run_over_unchanged_data_writes_nothing():
    stored = [
        {"id": 1, "card_name": "Old Ban", "first_seen_at": None},
        {"id": 2, "card_name": "Fresh Ban", "first_seen_at": "2026-08-10"},
    ]
    session = _banlist_session(stored)
    count = _writer(session).refresh_banlist("ST", {"Old Ban", "Fresh Ban"}, "2026-08-11")

    assert count == 2
    assert not session.post.called
    assert not session.delete.called


def test_unban_deletes_the_row():
    stored = [
        {"id": 7, "card_name": "Unbanned Now", "first_seen_at": "2026-07-01"},
        {"id": 8, "card_name": "Still Banned", "first_seen_at": "2026-07-01"},
    ]
    session = _banlist_session(stored)
    _writer(session).refresh_banlist("MO", {"Still Banned"}, "2026-08-10")

    delete_url = session.delete.call_args[0][0]
    assert "/rest/v1/banned_cards" in delete_url
    assert "id=in.(7)" in delete_url  # only the unbanned row, by id
    assert not session.post.called


def test_reban_after_an_unban_is_dated_again():
    """The row was deleted by the unban, so it reappears as a genuine addition —
    and the format still has other rows, so it is not treated as a seeding run."""
    stored = [{"id": 8, "card_name": "Still Banned", "first_seen_at": None}]
    session = _banlist_session(stored)
    _writer(session).refresh_banlist("MO", {"Still Banned", "Unbanned Now"}, "2026-08-10")

    rows = _inserted(session)
    assert rows == [
        {"format_code": "MO", "card_name": "Unbanned Now", "first_seen_at": "2026-08-10"}
    ]


def test_empty_banlist_for_a_format_clears_stored_rows():
    stored = [{"id": 3, "card_name": "Gone", "first_seen_at": None}]
    session = _banlist_session(stored)
    count = _writer(session).refresh_banlist("PREM", set(), "2026-08-10")

    assert count == 0
    assert "id=in.(3)" in session.delete.call_args[0][0]
    assert not session.post.called


def test_banlist_is_read_scoped_to_the_format():
    session = _banlist_session([])
    _writer(session).refresh_banlist("PAU", set(), "2026-08-10")

    get_url = session.get.call_args[0][0]
    assert "/rest/v1/banned_cards" in get_url
    assert "format_code=eq.PAU" in get_url

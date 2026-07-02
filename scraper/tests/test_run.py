import os
import sys
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import run  # noqa: E402
from mtgtop8 import FORMATS  # noqa: E402
from run import formats_to_scrape  # noqa: E402


def test_no_arg_scrapes_all_formats():
    assert formats_to_scrape(["run.py"], FORMATS) == list(FORMATS)


def test_single_format_arg_scrapes_only_that_format():
    assert formats_to_scrape(["run.py", "ST"], FORMATS) == ["ST"]


def test_format_arg_is_case_insensitive():
    assert formats_to_scrape(["run.py", "st"], FORMATS) == ["ST"]


def test_unknown_format_arg_raises():
    with pytest.raises(SystemExit):
        formats_to_scrape(["run.py", "XYZ"], FORMATS)


def test_backfill_flag_runs_backfill_and_skips_the_scrape(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc")
    resolver = object()
    monkeypatch.setattr(run, "build_card_resolver", lambda: resolver)
    writer = MagicMock()
    writer.backfill_scryfall.return_value = 5
    monkeypatch.setattr(run, "SupabaseWriter", MagicMock(return_value=writer))
    sync_all = MagicMock()
    monkeypatch.setattr(run, "sync_all", sync_all)

    rc = run.main(["run.py", "--backfill-scryfall"])

    assert rc == 0
    writer.backfill_scryfall.assert_called_once()
    sync_all.assert_not_called()  # backfill is a standalone mode, not a scrape
    # the writer was constructed with the resolver so it can map card names
    assert run.SupabaseWriter.call_args.kwargs.get("card_resolver") is resolver


def test_backfill_flag_fails_when_bulk_sync_unavailable(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc")
    monkeypatch.setattr(run, "build_card_resolver", lambda: None)  # Scryfall down

    assert run.main(["run.py", "--backfill-scryfall"]) == 1


def test_backfill_flag_also_refreshes_archetype_art(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc")
    monkeypatch.setattr(run, "build_card_resolver", lambda: object())
    writer = MagicMock()
    writer.backfill_scryfall.return_value = 3
    monkeypatch.setattr(run, "SupabaseWriter", MagicMock(return_value=writer))

    rc = run.main(["run.py", "--backfill-scryfall"])

    assert rc == 0
    writer.backfill_scryfall.assert_called_once()
    # Backfill also refreshes archetype art for every format.
    assert writer.refresh_archetype_art.call_count == len(FORMATS)

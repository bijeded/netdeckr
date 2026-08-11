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

    rc = run.main(["run.py", "--backfill-scryfall"])

    assert rc == 0
    writer.backfill_scryfall.assert_called_once()
    writer.existing_event_ids.assert_not_called()  # standalone mode — no scrape
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
    # Backfill also refreshes archetype art AND color identity for every format.
    assert writer.refresh_archetype_art.call_count == len(FORMATS)
    assert writer.refresh_archetype_color_identity.call_count == len(FORMATS)


def test_metadata_backfill_flag_runs_backfill_and_refreshes_art(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc")
    resolver = object()
    monkeypatch.setattr(run, "build_card_resolver", lambda: resolver)
    writer = MagicMock()
    writer.backfill_metadata.return_value = 7
    monkeypatch.setattr(run, "SupabaseWriter", MagicMock(return_value=writer))

    rc = run.main(["run.py", "--backfill"])

    assert rc == 0
    writer.backfill_metadata.assert_called_once()
    writer.backfill_scryfall.assert_not_called()  # this mode fills the metadata columns
    writer.existing_event_ids.assert_not_called()  # standalone mode — no scrape
    assert run.SupabaseWriter.call_args.kwargs.get("card_resolver") is resolver
    # Recomputes each archetype's signature card + art AND color identity.
    assert writer.refresh_archetype_art.call_count == len(FORMATS)
    assert writer.refresh_archetype_color_identity.call_count == len(FORMATS)


def test_metadata_backfill_flag_fails_when_bulk_sync_unavailable(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc")
    monkeypatch.setattr(run, "build_card_resolver", lambda: None)  # Scryfall down

    assert run.main(["run.py", "--backfill"]) == 1


def test_remap_flag_runs_remap_and_refreshes_art(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc")
    resolver = object()
    monkeypatch.setattr(run, "build_card_resolver", lambda: resolver)
    writer = MagicMock()
    writer.remap_scryfall.return_value = 12
    monkeypatch.setattr(run, "SupabaseWriter", MagicMock(return_value=writer))

    rc = run.main(["run.py", "--remap-scryfall"])

    assert rc == 0
    writer.remap_scryfall.assert_called_once()
    writer.backfill_scryfall.assert_not_called()
    writer.backfill_metadata.assert_not_called()
    writer.existing_event_ids.assert_not_called()  # standalone mode — no scrape
    assert run.SupabaseWriter.call_args.kwargs.get("card_resolver") is resolver
    # Recomputes each archetype's signature card + art AND color identity.
    assert writer.refresh_archetype_art.call_count == len(FORMATS)
    assert writer.refresh_archetype_color_identity.call_count == len(FORMATS)


def test_refresh_color_identity_flag_recomputes_all_formats_without_scraping(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc")
    resolver = object()
    monkeypatch.setattr(run, "build_card_resolver", lambda: resolver)
    writer = MagicMock()
    monkeypatch.setattr(run, "SupabaseWriter", MagicMock(return_value=writer))

    rc = run.main(["run.py", "--refresh-color-identity"])

    assert rc == 0
    # Only the color-identity pass runs — no scrape, no remap, no art refresh.
    assert writer.refresh_archetype_color_identity.call_count == len(FORMATS)
    writer.existing_event_ids.assert_not_called()
    writer.remap_scryfall.assert_not_called()
    writer.refresh_archetype_art.assert_not_called()
    assert run.SupabaseWriter.call_args.kwargs.get("card_resolver") is resolver


def test_refresh_color_identity_flag_fails_when_bulk_sync_unavailable(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc")
    monkeypatch.setattr(run, "build_card_resolver", lambda: None)  # Scryfall down

    assert run.main(["run.py", "--refresh-color-identity"]) == 1


def test_remap_flag_fails_when_bulk_sync_unavailable(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc")
    monkeypatch.setattr(run, "build_card_resolver", lambda: None)  # Scryfall down

    assert run.main(["run.py", "--remap-scryfall"]) == 1


def test_scrape_stamps_each_format_and_has_no_breakdown_pass(monkeypatch):
    # The metagame breakdown is now derived frontend-side from the decks, so the
    # scraper no longer runs a breakdown pass — it just scrapes decklists and stamps
    # each format's freshness on success.
    assert not hasattr(run, "sync_all")  # the breakdown pass is gone

    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc")
    monkeypatch.setattr(run, "build_card_resolver", lambda: object())
    writer = MagicMock()
    writer.existing_event_ids.return_value = set()
    monkeypatch.setattr(run, "SupabaseWriter", MagicMock(return_value=writer))
    # Mock the decklist pass so no network is touched; it reports 4 new decks.
    sync_decklists = MagicMock(return_value=4)
    monkeypatch.setattr(run, "sync_decklists", sync_decklists)

    rc = run.main(["run.py"])

    assert rc == 0
    # Every format was scraped and then stamped fresh.
    assert sync_decklists.call_count == len(FORMATS)
    assert writer.stamp_format_updated.call_count == len(FORMATS)
    stamped = {call.args[0] for call in writer.stamp_format_updated.call_args_list}
    assert stamped == set(FORMATS)
    # Each scraped format also refreshes its archetypes' color identity.
    assert writer.refresh_archetype_color_identity.call_count == len(FORMATS)


def test_scrape_returns_failure_when_every_format_fails(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc")
    monkeypatch.setattr(run, "build_card_resolver", lambda: object())
    writer = MagicMock()
    writer.existing_event_ids.return_value = set()
    monkeypatch.setattr(run, "SupabaseWriter", MagicMock(return_value=writer))
    # Every format's decklist pass blows up → the run fails and nothing is stamped.
    monkeypatch.setattr(run, "sync_decklists", MagicMock(side_effect=RuntimeError("down")))

    assert run.main(["run.py"]) == 1
    writer.stamp_format_updated.assert_not_called()


def test_scrape_fails_when_bulk_sync_unavailable(monkeypatch):
    """A scrape that cannot enrich must fail loudly rather than write null-enriched
    rows: nothing in the daily loop re-enriches them, so a silent pass is permanent
    data loss, and a green run is what let an upstream break go unnoticed."""
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc")
    monkeypatch.setattr(run, "build_card_resolver", lambda: None)  # Scryfall down
    monkeypatch.setattr(run, "SupabaseWriter", MagicMock())
    # Belt and braces: a regression that drops the guard must fail this test, not
    # fall through into a live MTGTop8 scrape.
    scrape = MagicMock(return_value=0)
    monkeypatch.setattr(run, "sync_decklists", scrape)

    rc = run.main(["run.py", "ST"])

    assert rc == 1
    # aborted before any write path was constructed — no unenriched rows
    run.SupabaseWriter.assert_not_called()
    scrape.assert_not_called()


def test_scrape_proceeds_when_resolver_available(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc")
    resolver = object()
    monkeypatch.setattr(run, "build_card_resolver", lambda: resolver)
    writer = MagicMock()
    writer.existing_event_ids.return_value = set()
    monkeypatch.setattr(run, "SupabaseWriter", MagicMock(return_value=writer))
    monkeypatch.setattr(run, "sync_decklists", MagicMock(return_value=3))

    rc = run.main(["run.py", "ST"])

    assert rc == 0
    assert run.SupabaseWriter.call_args.kwargs.get("card_resolver") is resolver


# -- banlist pass ----------------------------------------------------------

class _FakeResolver:
    """A card resolver that also reports per-format bans, like the real CardIndex."""

    def __init__(self, banned=None):
        self._banned = banned or {}

    def banned_cards(self, fmt):
        return self._banned.get(fmt, set())


def test_scrape_refreshes_every_formats_banlist(monkeypatch):
    """The banlist pass covers ALL formats, not just the ones this run scrapes —
    the crons are staggered per format, and a stale banlist for an unscraped
    format would keep counting decks that are no longer legal."""
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc")
    resolver = _FakeResolver({"ST": {"Banned Card"}})
    monkeypatch.setattr(run, "build_card_resolver", lambda: resolver)
    writer = MagicMock()
    writer.existing_event_ids.return_value = set()
    writer.refresh_banlist.return_value = 1
    monkeypatch.setattr(run, "SupabaseWriter", MagicMock(return_value=writer))
    monkeypatch.setattr(run, "sync_decklists", MagicMock(return_value=0))

    # Scrape a single format; the banlist pass must still cover all five.
    rc = run.main(["run.py", "ST"])

    assert rc == 0
    refreshed = {call.args[0] for call in writer.refresh_banlist.call_args_list}
    assert refreshed == set(FORMATS)
    st_call = next(c for c in writer.refresh_banlist.call_args_list if c.args[0] == "ST")
    assert st_call.args[1] == {"Banned Card"}


def test_banlist_failure_does_not_fail_the_scrape(monkeypatch):
    """The banlist is a correction, not worth failing a scrape over."""
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc")
    monkeypatch.setattr(run, "build_card_resolver", lambda: _FakeResolver())
    writer = MagicMock()
    writer.existing_event_ids.return_value = set()
    writer.refresh_banlist.side_effect = RuntimeError("banlist table missing")
    monkeypatch.setattr(run, "SupabaseWriter", MagicMock(return_value=writer))
    sync_decklists = MagicMock(return_value=4)
    monkeypatch.setattr(run, "sync_decklists", sync_decklists)

    rc = run.main(["run.py", "ST"])

    assert rc == 0
    assert sync_decklists.called  # the scrape went ahead regardless

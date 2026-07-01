import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline import sync_all, sync_format  # noqa: E402

FIXTURE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "fixtures", "format_ST_meta52.html"
)


def _fixture_html():
    with open(FIXTURE, encoding="utf-8") as fh:
        return fh.read()


class FakeWriter:
    def __init__(self, fail_on_replace=False):
        self.replace_calls = []
        self.stamp_calls = []
        self._fail_on_replace = fail_on_replace

    def replace_breakdown(self, fmt, meta_window, archetypes):
        if self._fail_on_replace:
            raise RuntimeError("db write failed")
        self.replace_calls.append((fmt, meta_window, archetypes))

    def stamp_updated(self, fmt, meta_window, now):
        self.stamp_calls.append((fmt, meta_window, now))


def test_sync_format_passes_window_through_then_stamps():
    writer = FakeWriter()
    order = []
    fetched = []
    writer.replace_breakdown = lambda fmt, w, arch: order.append("replace") or writer.replace_calls.append((fmt, w, arch))
    writer.stamp_updated = lambda fmt, w, now: order.append("stamp") or writer.stamp_calls.append((fmt, w, now))

    def fetch(fmt, meta_window):
        fetched.append((fmt, meta_window))
        return _fixture_html()

    count = sync_format("ST", "52", fetch=fetch, writer=writer, now="NOW")

    assert count == 3  # the meta=52 fixture has three archetypes
    assert fetched == [("ST", "52")]  # window forwarded to fetch
    fmt, meta_window, archetypes = writer.replace_calls[0]
    assert (fmt, meta_window) == ("ST", "52")
    assert archetypes[0].rank == 1  # ranked before writing
    assert writer.stamp_calls == [("ST", "52", "NOW")]
    assert order == ["replace", "stamp"]  # stamp only after replace


def test_source_failure_leaves_data_intact_and_unstamped():
    writer = FakeWriter()

    def failing_fetch(fmt, meta_window):
        raise RuntimeError("mtgtop8 down")

    with pytest.raises(RuntimeError):
        sync_format("ST", "50", fetch=failing_fetch, writer=writer, now="NOW")

    assert writer.replace_calls == []  # nothing written
    assert writer.stamp_calls == []  # not stamped


def test_stamp_skipped_when_write_fails():
    writer = FakeWriter(fail_on_replace=True)

    with pytest.raises(RuntimeError):
        sync_format("ST", "50", fetch=lambda fmt, w: _fixture_html(), writer=writer, now="NOW")

    assert writer.stamp_calls == []  # never stamped after a failed write


def test_sync_all_iterates_every_format_window_pair():
    writer = FakeWriter()

    results = sync_all(
        ["ST", "PI"],
        ["50", "52"],
        fetch=lambda fmt, w: _fixture_html(),
        writer=writer,
        now="NOW",
    )

    # A result per (format, window) pair.
    assert set(results) == {("ST", "50"), ("ST", "52"), ("PI", "50"), ("PI", "52")}
    assert all(count == 3 for count in results.values())
    written = {(fmt, w) for fmt, w, _ in writer.replace_calls}
    assert written == set(results)


def test_sync_all_isolates_a_single_pair_failure():
    writer = FakeWriter()
    errors = []

    def fetch(fmt, meta_window):
        if fmt == "ST" and meta_window == "52":
            raise RuntimeError("ST/52 down")
        return _fixture_html()

    results = sync_all(
        ["ST", "PI"],
        ["50", "52"],
        fetch=fetch,
        writer=writer,
        now="NOW",
        on_error=lambda fmt, w, exc: errors.append((fmt, w)),
    )

    assert results[("ST", "52")] is None  # the one failing pair
    assert results[("ST", "50")] == 3  # other windows of the same format still run
    assert results[("PI", "52")] == 3  # other formats unaffected
    assert ("ST", "52") not in {(fmt, w) for fmt, w, _ in writer.replace_calls}
    assert errors == [("ST", "52")]

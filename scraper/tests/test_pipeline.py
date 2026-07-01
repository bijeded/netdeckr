import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline import sync_all, sync_format  # noqa: E402

FIXTURE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "fixtures", "format_ST_meta50.html"
)


def _fixture_html():
    with open(FIXTURE, encoding="utf-8") as fh:
        return fh.read()


class FakeWriter:
    def __init__(self, fail_on_replace=False):
        self.replace_calls = []
        self.stamp_calls = []
        self._fail_on_replace = fail_on_replace

    def replace_breakdown(self, fmt, archetypes):
        if self._fail_on_replace:
            raise RuntimeError("db write failed")
        self.replace_calls.append((fmt, archetypes))

    def stamp_updated(self, fmt, now):
        self.stamp_calls.append((fmt, now))


def test_sync_format_writes_ranked_breakdown_then_stamps():
    writer = FakeWriter()
    calls_order = []
    writer.replace_breakdown = lambda fmt, arch: calls_order.append("replace") or writer.replace_calls.append((fmt, arch))
    writer.stamp_updated = lambda fmt, now: calls_order.append("stamp") or writer.stamp_calls.append((fmt, now))

    count = sync_format("ST", fetch=lambda fmt: _fixture_html(), writer=writer, now="NOW")

    assert count == 23
    fmt, archetypes = writer.replace_calls[0]
    assert fmt == "ST"
    assert archetypes[0].rank == 1  # ranked before writing
    assert writer.stamp_calls == [("ST", "NOW")]
    assert calls_order == ["replace", "stamp"]  # stamp only after replace


def test_source_failure_leaves_data_intact_and_unstamped():
    writer = FakeWriter()

    def failing_fetch(fmt):
        raise RuntimeError("mtgtop8 down")

    with pytest.raises(RuntimeError):
        sync_format("ST", fetch=failing_fetch, writer=writer, now="NOW")

    assert writer.replace_calls == []  # nothing written
    assert writer.stamp_calls == []  # not stamped


def test_stamp_skipped_when_write_fails():
    writer = FakeWriter(fail_on_replace=True)

    with pytest.raises(RuntimeError):
        sync_format("ST", fetch=lambda fmt: _fixture_html(), writer=writer, now="NOW")

    assert writer.stamp_calls == []  # never stamped after a failed write


def test_sync_all_continues_after_one_format_fails():
    writer = FakeWriter()
    errors = []

    def fetch(fmt):
        if fmt == "ST":
            raise RuntimeError("ST down")
        return _fixture_html()

    results = sync_all(
        ["ST", "PI"],
        fetch=fetch,
        writer=writer,
        now="NOW",
        on_error=lambda fmt, exc: errors.append(fmt),
    )

    assert results["ST"] is None  # failed
    assert results["PI"] == 23  # succeeded
    assert [fmt for fmt, _ in writer.replace_calls] == ["PI"]  # only PI written
    assert errors == ["ST"]

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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

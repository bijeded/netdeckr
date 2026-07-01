import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mtgtop8 import (  # noqa: E402
    color_identity_for,
    parse_meta_breakdown,
    rank_archetypes,
)

FIXTURE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "fixtures", "format_ST_meta50.html"
)
FIXTURE_META52 = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "fixtures", "format_ST_meta52.html"
)


def _load():
    with open(FIXTURE, encoding="utf-8") as fh:
        return fh.read()


def _load_meta52():
    with open(FIXTURE_META52, encoding="utf-8") as fh:
        return fh.read()


def _by_name(archetypes, name):
    return next(a for a in archetypes if a.name == name)


# --- parse_meta_breakdown ---------------------------------------------------


def test_parses_all_archetypes():
    archetypes = parse_meta_breakdown(_load())
    assert len(archetypes) == 23


def test_excludes_category_headers():
    names = {a.name for a in parse_meta_breakdown(_load())}
    # Category headers like "AGGRO 51%" must not appear as archetypes.
    assert not any(n.isupper() for n in names)
    assert "Selesnya Aggro" in names
    assert "Izzet Control" in names


def test_share_of_top_archetype():
    archetypes = parse_meta_breakdown(_load())
    assert _by_name(archetypes, "Selesnya Aggro").share_pct == 21.0
    assert _by_name(archetypes, "Izzet Control").share_pct == 24.0


def test_tail_archetype_has_decimal_share():
    # The low-share tail carries sub-1% decimal shares (not integers).
    archetypes = parse_meta_breakdown(_load())
    assert _by_name(archetypes, "Bant Aggro").share_pct == 0.8


def test_archetype_without_share_defaults_to_zero():
    # Synthetic block with an archetype link but no "N %" → 0.0.
    html = (
        '<div class="hover_tr">'
        '<div class=S14><a href="archetype?a=999&meta=50&f=ST">Mystery Brew</a></div>'
        "<div></div></div>"
    )
    archetypes = parse_meta_breakdown(html)
    assert len(archetypes) == 1
    assert archetypes[0].share_pct == 0.0


def test_parse_clamps_share_and_caps_name_length():
    # Defensive bounds against adversarial/malformed HTML.
    long_name = "X" * 300
    html = (
        '<div class="hover_tr">'
        f'<div class=S14><a href="archetype?a=1&meta=50&f=ST">{long_name}</a></div>'
        '<div class=S14>500 %</div></div>'
    )
    archetype = parse_meta_breakdown(html)[0]
    assert archetype.share_pct == 100.0
    assert len(archetype.name) == 200


def test_parse_attaches_color_identity():
    archetypes = parse_meta_breakdown(_load())
    assert _by_name(archetypes, "Selesnya Aggro").color_identity == "WG"


def test_parses_a_second_window_fixture():
    # The parser is window-agnostic: a different meta window (52 = Last 2 Months)
    # parses independently, with its own archetypes/shares distinct from meta=50.
    archetypes = parse_meta_breakdown(_load_meta52())
    names = {a.name for a in archetypes}
    assert names == {"Dimir Midrange", "Mono Red Aggro", "Azorius Control"}
    assert _by_name(archetypes, "Dimir Midrange").share_pct == 18.0
    assert _by_name(archetypes, "Azorius Control").share_pct == 9.5  # decimal tail
    assert _by_name(archetypes, "Dimir Midrange").color_identity == "UB"


# --- color_identity_for -----------------------------------------------------


def test_color_identity_guild():
    assert color_identity_for("Selesnya Aggro") == "WG"
    assert color_identity_for("Izzet Control") == "UR"
    assert color_identity_for("Golgari Aggro") == "BG"


def test_color_identity_explicit_letters():
    assert color_identity_for("UR Aggro") == "UR"
    assert color_identity_for("UW Control") == "WU"


def test_color_identity_mono():
    assert color_identity_for("Mono Green Aggro") == "G"
    assert color_identity_for("Mono Red") == "R"


def test_color_identity_shard_wedge():
    assert color_identity_for("Mardu Aggro") == "WBR"
    assert color_identity_for("Bant Aggro") == "WUG"
    assert color_identity_for("Grixis Aggro") == "UBR"


def test_color_identity_color_word():
    assert color_identity_for("Red Deck Wins") == "R"


def test_color_identity_multicolor():
    assert color_identity_for("4/5C Control") == "WUBRG"


def test_color_identity_unknown_is_colorless():
    assert color_identity_for("Reanimator") == ""


def test_color_identity_canonical_wubrg_order():
    # Regardless of input order, output is in WUBRG order.
    assert color_identity_for("RW Aggro") == "WR"


def test_explicit_letters_require_uppercase_code():
    # A lowercase word that happens to be WUBRG letters is NOT a color code.
    assert color_identity_for("Grub") == ""
    # An uppercase code still works.
    assert color_identity_for("UR Aggro") == "UR"


def test_guild_requires_word_boundary():
    # "bant" inside "Bantam" must not match the Bant wedge.
    assert color_identity_for("Bantam Brew") == ""


def test_color_word_requires_word_boundary():
    # "red" inside "Predator" must not match Red.
    assert color_identity_for("Predator") == ""


# --- rank_archetypes --------------------------------------------------------


def test_rank_sorts_by_share_desc_and_is_one_based():
    ranked = rank_archetypes(parse_meta_breakdown(_load()))
    assert ranked[0].name == "Izzet Control"
    assert ranked[0].rank == 1
    ranks = [a.rank for a in ranked]
    assert ranks == list(range(1, len(ranked) + 1))
    shares = [a.share_pct for a in ranked]
    assert shares == sorted(shares, reverse=True)

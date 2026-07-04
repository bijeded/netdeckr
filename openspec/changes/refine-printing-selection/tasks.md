## 1. Refine printing selection (TDD)

- [ ] 1.1 Write failing tests in `scraper/tests/` for the new selection behavior: plain vs borderless in the same set (plain wins), plain-old vs showcase/extended-new (plain wins over recency), `full_art` and `textless` demotion, white/silver/gold border stays plain (not demoted), `expansion`/`core`/`masters` preferred over `commander`/`draft_innovation` reprint, and determinism regardless of bulk-row order. Assert the chosen `set_code`/`collector_number`/`image_url`.
- [ ] 1.2 Broaden `_is_special_printing` in `scraper/scryfall.py` to also flag `full_art`, `textless`, `border_color == "borderless"`, and `frame_effects` ∩ {`showcase`, `extendedart`, `inverted`} — without demoting non-borderless border colors.
- [ ] 1.3 Add a set-type tier helper (`expansion`/`core`/`masters` → 2, `commander`/`draft_innovation` → 0, else 1) and update `_selection_key` to rank `(plain, set_type_tier, released_at, set_code)` with plain treatment as the top priority.
- [ ] 1.4 Update module/docstrings in `scraper/scryfall.py` to describe the plain-treatment-first ranking; confirm signature-card art inherits the fix through the shared resolver (no code change needed in `supabase_writer.py`).
- [ ] 1.5 Run `cd scraper && ./venv/bin/pytest` — all tests green.

## 2. Review and merge

- [ ] 2.1 Subagent code-review (clean context) against spec + conventions.
- [ ] 2.2 PR via github-pr; human merges.

## 3. Post-merge maintenance

- [ ] 3.1 After merge, run the one-time remap: `gh workflow run scrape.yml -f format=remap-scryfall` to re-resolve existing `deck_cards` rows and refresh archetype signature-card art with the corrected printings.

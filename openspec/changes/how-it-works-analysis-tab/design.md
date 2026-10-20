# Design

## Context

How It Works content is a typed `Section[]` per locale (`src/content/legal/howItWorks.{en,es}.ts`), rendered by the shared `LegalPage`. `parity.test.ts` checks that both locales have the same section-type sequence. `howItWorks.test.ts` checks the trending-table bullets by their leading term (`"<Term> — "`). See proposal.md for why.

## Goals / Non-Goals

**Goals:**
- One Analysis tab section in both locales that fits the page's existing patterns.
- Tests that pin what the spec requires, not exact wording.

**Non-Goals:**
- Any change to the Analysis tab itself, including the pager's reset mechanism.
- Rewording existing How It Works sections.

## Decisions

**Placement and shape.** Insert `heading` + `paragraph` + `list` right after the dashboard list, before "What we know about you". The paragraph states the fixed scope; the list has one `"<On-screen name> — <explanation>"` bullet per part, in the tab's top-to-bottom order: Stock list, Power Score, the performance figures (Share, Tier, Top 8 rate, Wins, Decks in one bullet, since the dashboard section already defines share and tier), Consensus with its bands, Sideboard plan, Card types, Arena wildcards, Small sample. Bullets use the ES on-screen names in Spanish (Lista base, Consenso, Plan de sideboard, Tipos de carta, Comodines de Arena, Muestra pequeña); Power Score and Tier stay as they are labelled in both locales. *Alternative:* fold the content into the existing dashboard list. Rejected: it would mix two scopes (sidebar-filtered dashboard vs fixed 2-week tab) in one list.

**Copy tests check terms, not prose.** Extend `howItWorks.test.ts` in the existing `it.each` style. Each listed part must have a bullet starting with `"<name> — "`, and a few facts must appear in that bullet: the thresholds `90%`, `25%`; `5` in the small-sample entry; Standard and Pioneer in the wildcards entry. The scope paragraph must mention 2 weeks. Parity is covered by the existing `parity.test.ts` unchanged.

**Pager reset test, behaviour unchanged.** In `ArchetypeAnalysis.test.tsx`, render archetype A with 24 consensus rows, page to 2 / 3, rerender with archetype B's rows, expect `1 / N` in both the consensus table and the sideboard plan. The effect-based reset in `ConsensusTable` stays. *Alternative:* `key={archetypeName}` to drop the effect and its one stale render. Deferred: it changes runtime code in a copy-and-tests change, and the stale render has not been observed.

**Pill assertion.** Add `toHaveClass('view-all-pill--analysis')` to the existing `"Analysis →"` test in `App.test.tsx`. It asserts the class that carries the spec's "distinct accent", not a colour value.

**Stylesheet comment.** Replace "Pending preview confirmation." on `.view-all-pill--analysis` with "Confirmed on the PR #220 preview.", matching the archived archetype-analysis design.

## Risks / Trade-offs

- [The explanations drift from the tab's behaviour when it changes later] → Bullets name concrete thresholds that the tests pin, so changing a threshold in code without updating the copy is caught only for those facts; the rest relies on review.
- [The page gets long on phones] → One added section of eight short bullets; effect on reading length is pending visual confirmation on the preview.

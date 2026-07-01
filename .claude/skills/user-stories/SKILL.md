---
name: user-stories
description: Structured elicitation of user stories with acceptance criteria — runs before /opsx:propose to ensure the feature is well-defined before OpenSpec formalizes it
triggers: When a feature needs to be defined before running /opsx:propose, especially when requirements are unclear or incomplete
---

# User Stories

## Purpose
Convert a rough feature idea into a structured set of user stories with clear acceptance criteria, ready to hand off to `/opsx:propose`. This skill asks the right questions in the right order so OpenSpec receives a complete, unambiguous description of what to build — not a vague prompt.

## When to activate
Before `/opsx:propose` when:
- The feature is not yet clearly defined
- You have an idea but haven't thought through edge cases
- You want to make sure all user types and scenarios are covered before implementation begins

Skip this skill when the feature is already well-defined with acceptance criteria — go directly to `/opsx:propose`.

---

## Process

### Phase 1 — Load existing context (no questions)

Before asking anything, read:
- `openspec/project.md` → "Users" section: the known user types and their goals
- `openspec/project.md` → "Out of scope": what the project explicitly does not do
- `CLAUDE.md` → "Project overview": the app's purpose

Use this to avoid asking questions already answered by the project context. If `openspec/project.md` does not exist yet, ask for a brief description of the app and its primary user types before proceeding.

---

### Phase 2 — Feature definition

Ask these questions as a group. Wait for answers before moving to Phase 3.

- Which user type(s) from the project does this feature serve? (Reference the Users section from context)
- In one sentence: what does the user want to accomplish with this feature?
- Why? What's the concrete benefit or outcome for them?
- Is this feature new functionality, a modification of existing behavior, or both?

---

### Phase 3 — Happy path

Ask these questions as a group. Wait for answers before moving to Phase 4.

- Walk through the main flow from the user's perspective: what do they do, step by step?
- What does success look like for the user? What do they see or get at the end?
- Are there meaningful variations of the happy path? (e.g., different roles, different starting states, optional steps)

---

### Phase 4 — Edge cases and failures

Ask these questions as a group. Wait for answers before moving to Phase 5.

- What can go wrong? What are the most likely failure scenarios?
- Are there boundary conditions? (empty states, maximum values, invalid inputs, timeouts)
- Are there permission or role constraints? (who can and cannot use this feature)
- Does this feature depend on another feature being in place first?
- Is anything in this feature explicitly out of scope? (reference `openspec/project.md` → "Out of scope")

---

### Phase 5 — Generate user stories

With the answers from Phases 2–4, generate structured user stories. Follow these rules:

**Story format:**
```
As a [specific user type from openspec/project.md]
I want to [specific action]
So that [concrete benefit]
```

**Acceptance criteria format** (GIVEN/WHEN/THEN — one per scenario):
```
- GIVEN [precondition or starting state]
  WHEN [user action]
  THEN [expected result]
```

**Rules for writing stories:**
- One story per distinct user goal — do not combine multiple goals into one story
- Each story must have at least one acceptance criterion for the happy path
- Each identified failure scenario becomes a separate acceptance criterion
- Each permission constraint becomes a separate acceptance criterion
- Use specific, observable language — avoid vague terms like "easy", "fast", "properly"
- User type must match one defined in `openspec/project.md` → "Users"

**Scope check before outputting:**
- If the feature produces more than 5–6 stories, flag it: it may need to be split into multiple OpenSpec changes
- If any story touches functionality marked as "Out of scope" in `openspec/project.md`, flag it as a SCOPE CONFLICT before including it

---

## Output format

```
USER STORIES: [feature name in kebab-case]
──────────────────────────────────────────

Story 1 — [Short title]
As a [user type]
I want to [action]
So that [benefit]

Acceptance criteria:
- GIVEN [state] WHEN [action] THEN [result]  ← happy path
- GIVEN [state] WHEN [action] THEN [result]  ← failure scenario
- GIVEN [state] WHEN [action] THEN [result]  ← edge case / permission

---

Story 2 — [Short title]
...

──────────────────────────────────────────
SCOPE NOTES:
[Any stories flagged as potential scope conflicts or candidates for a separate change — or "none"]

SUGGESTED CHANGE ID: [kebab-case name for /opsx:propose]

READY FOR:
> /opsx:propose [suggested-change-id]

Paste these stories as context when running the command above.
```

---

## Stop conditions
- If Phase 2 answers are too vague to identify a clear user goal, ask targeted follow-up questions before proceeding. Do not generate stories from insufficient input.
- If a story conflicts with `openspec/project.md` → "Out of scope", flag it and ask the human to confirm intent before including it.
- If the feature has no clear acceptance criteria after Phase 4, do not output stories. Return to Phase 3 and ask for a more concrete description of success.

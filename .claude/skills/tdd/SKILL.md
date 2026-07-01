---
name: tdd
description: Test-Driven Development cycle — stack-agnostic, reads test runner and commands from CLAUDE.md
triggers: Before implementing any feature, component, function, hook, or fix from tasks.md
---

# TDD — Test-Driven Development

## Purpose
Enforce red/green/refactor discipline before writing any implementation code. Tests define the contract; implementation satisfies it. Never the other way around.

## When to activate
Activate before implementing any task from `tasks.md`. Do not write implementation code before this skill completes the RED phase successfully.

## Stack context
Before writing any test, read `CLAUDE.md` and confirm:
- Which test runner is in use
- Which testing library applies to this file type (component, hook, API route, screen, utility)
- The exact command to run tests for this target

Do not assume a framework or test runner. If `CLAUDE.md` does not specify, stop and ask before writing any test.

---

## Process

### Phase 1 — RED (Write failing tests first)

1. Read the task's acceptance criteria from `openspec/changes/[change-id]/tasks.md`
2. Identify the unit of work: component, hook, utility, API route, or screen
3. Write tests that describe **expected behavior — not implementation details**
4. Each test must map to at least one acceptance criterion
5. Run tests using the command defined in `CLAUDE.md` under "Test commands"

**GATE — RED**: All tests must fail. If any test passes before implementation exists, the test is testing nothing. Fix it before proceeding.

> **Modifying existing behavior** (a change with a `MODIFIED`/`REMOVED` spec delta, not a brand-new feature): update or replace the existing tests so they encode the *new* expected behavior. They must fail against the *current* implementation — that failing state is the RED for a modification. Then proceed to GREEN to change the code.

---

### Phase 2 — GREEN (Minimum implementation)

1. Write the minimum code necessary to make every failing test pass
2. No gold-plating: do not implement anything not covered by a test
3. Run tests using the command defined in `CLAUDE.md` under "Test commands"

**GATE — GREEN**: All tests must pass. If any test fails, debug the implementation — not the test. Tests are the contract.

---

### Phase 3 — REFACTOR (Clean without breaking)

1. Review the implementation for: duplication, readability, naming, structure
2. Apply project conventions from `CLAUDE.md`
3. Run tests after **each individual refactor step** using the command defined in `CLAUDE.md` under "Test commands"

**GATE — REFACTOR**: Tests must remain green throughout every step. A failing test after a refactor means behavior changed — revert that step and retry.

---

## Stop conditions
- If after 3 attempts the GREEN phase cannot make all tests pass, stop and report the blocker. Do not proceed to the next task.
- If acceptance criteria in the spec are ambiguous, stop and ask for clarification **before writing tests**.

## Output (required before returning to task-execution Step 4)
```
TDD COMPLETE: [task description]
Tests written: [n] — mapped to [n] acceptance criteria
RED verified: YES
GREEN verified: YES
REFACTOR applied: [brief summary or "none needed"]
All tests passing: YES
```

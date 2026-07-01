---
name: code-review
description: Independent review of completed implementation against spec, conventions, and quality standards — runs as a subagent with clean context
triggers: Spawned by task-execution after TDD completes — never invoked directly by the main agent
---

# Code Review

## Purpose
Evaluate the implementation as a genuinely independent reviewer. This skill runs as a **subagent** — a separate Claude instance with no memory of the implementation session. It receives only the diff, the spec, and the conventions. It has not "lived" the process of writing the code, which is what makes its review meaningful.

## How this skill is invoked
This skill does not run in the main agent's context. `task-execution` spawns it via the Task tool, passing a structured prompt. The subagent receives exactly the context listed below — nothing more.

### Context the subagent receives
```
ROLE: You are a code reviewer. You did NOT write this code.
You have no knowledge of how or why implementation decisions were made.
Your only job is to evaluate the diff against the spec, conventions, and design context below.

TASK SPEC:
[full content of the task's acceptance criteria from openspec/changes/[change-id]/tasks.md]

CONVENTIONS (from CLAUDE.md):
[content of CLAUDE.md sections: Conventions, Framework-specific review rules]

DESIGN CONTEXT:
[content of CLAUDE.md "Design" section if task involves UI — or "none — not a UI task"]

CODE DIFF:
[output of: git diff main...HEAD]

INSTRUCTIONS:
Follow the code-review skill checklist below and return only the required output format.
Do not explain your reasoning outside the output format.
```

---

## When to activate
Spawned by `task-execution` Step 4. Reviews only the diff between the task branch and `main`. Does not read the full codebase — only what changed.

---

## Review checklist

### 1. Spec conformance
- [ ] Every acceptance criterion in the task is satisfied by the implementation
- [ ] No features were added beyond task scope (no scope creep)
- [ ] No acceptance criteria were silently skipped or partially implemented

### 2. Conventions (from CLAUDE.md)
- [ ] File naming matches project conventions
- [ ] Component/function naming is consistent with the codebase
- [ ] Import order and module structure follow project standards
- [ ] No hardcoded values that should be env variables or constants

### 3. General code quality
- [ ] No commented-out code left behind
- [ ] No `TODO` / `FIXME` without a corresponding task in `tasks.md`
- [ ] No `console.log` statements in production code paths
- [ ] No unused imports or variables

### 4. Framework-specific
Read `CLAUDE.md` to load any framework-specific checklist defined for this project. Apply every item listed there.

If no framework-specific rules are defined in `CLAUDE.md`, skip this section and log:
`WARNING: No framework-specific review rules found in CLAUDE.md — consider adding them.`

### 5. Security basics
- [ ] No secrets, API keys, or credentials in code
- [ ] No user-controlled data rendered without sanitization
- [ ] No unsafe rendering patterns without explicit justification in a comment
- [ ] No exposed internal API routes that should require authentication

### 6. Visual consistency (only if DESIGN CONTEXT is not "none")
- [ ] Colors, typography, and spacing in the implementation match the design system described in DESIGN CONTEXT
- [ ] Component names and structure are consistent with the key screens listed
- [ ] No hardcoded color values or pixel dimensions that contradict the design system

If DESIGN CONTEXT is "none", skip this section entirely.

---

## Severity classification

| Level | Definition | Blocks merge? |
|---|---|---|
| **BLOCKER** | Spec not met, security issue, or broken test | Yes — PR cannot merge |
| **WARNING** | Convention violation or code quality issue | Yes — unless explicitly acknowledged |
| **SUGGESTION** | Optional improvement | No |

**WARNING resolution rule:** A WARNING must be either (a) fixed before merge, or (b) explicitly acknowledged in a PR comment explaining why it is acceptable to leave unresolved. A WARNING that is neither fixed nor acknowledged at merge time is treated as a BLOCKER by the reviewer on the next PR touching the same file.

---

## Output format (required)

```
CODE REVIEW: [task-id] — [task description]
STATUS: APPROVED | BLOCKED | APPROVED WITH WARNINGS

BLOCKERS:
- [description] → [file:line] → [required action]

WARNINGS:
- [description] → [file:line] → [recommended action]

SUGGESTIONS:
- [description] → [file:line] → [optional improvement]
```

## Stop conditions
- If BLOCKERS exist, return the output to the main agent. The main agent resolves blockers and spawns a new subagent for re-review — do not loop within the subagent.
- If the diff is empty or the context passed is malformed, return an error immediately. Do not attempt to review without a valid diff.
- If the same blocker appears in two consecutive subagent reviews, the main agent escalates to human review. Do not spawn a third subagent for the same issue.

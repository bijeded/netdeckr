---
name: task-execution
description: Master workflow for executing a single task from OpenSpec — orchestrates tdd, code-review (subagent), security-review (conditional subagent), and github-pr skills
triggers: When starting work on any task from tasks.md
---

# Task Execution

## Purpose
Define a repeatable, disciplined sequence for taking a task from OpenSpec's `tasks.md` to merged and archived. This skill is the main entry point for implementation work — it orchestrates the `tdd`, `code-review` (subagent), `security-review` (conditional subagent), and `github-pr` skills in order.

## When to activate
Before starting any implementation. This skill is the single entry point for implementation work: it first selects the implementation mode, then (in disciplined mode) runs the full per-task sequence.

---

## Mode selection (do this first)
Before any code, decide how this change will be built. The default comes from `CLAUDE.md` → "Implementation mode"; the human may override now. Decide **once per change** — do not switch mid-change.

| Mode | Use when | What runs |
|---|---|---|
| **Disciplined** (default) | Production code, or anything that needs review, CI, or an audit trail | This skill, **per task**: TDD + subagent code-review + PR + post-merge |
| **Fast** | Prototype, MVP validation, spike, or low-risk internal tooling | `/opsx:apply [change-id]` — implements **all tasks at once** on one branch |

- **Fast mode** → stop here. Tell the human to run `/opsx:apply [change-id]` to implement the whole change, then open a **single PR for the change** so CI and branch protection still gate the merge to `main`. Do not run the disciplined steps below. Note explicitly that fast mode does **not** guarantee per-task TDD or independent review.
- **Disciplined mode (default)** → continue to the pre-execution checklist and Steps 1–7. This is the path when `CLAUDE.md` has no "Implementation mode" field.

The modes differ in granularity: disciplined is one branch + PR **per task**; fast is one `/opsx:apply` pass + one PR **per change**.

---

## Pre-execution checklist

Before writing any code:
- [ ] Read the task fully in `openspec/changes/[change-id]/tasks.md`
- [ ] Read `openspec/changes/[change-id]/proposal.md` to understand the broader context this task belongs to
- [ ] Confirm the task status is `apply` (not `proposal` or `archive`)
- [ ] Confirm no blocking dependency task is still in progress
- [ ] Re-read `CLAUDE.md` to confirm stack and conventions are fresh in context
- [ ] If this task involves UI: check `CLAUDE.md` under "Design" for Claude Design project URL and review the relevant frame or screen before proceeding
- [ ] Explicitly state what files will be **created**, **modified**, and **must not be touched**

If any item in this checklist cannot be confirmed, stop and clarify before proceeding.

---

## Execution sequence

### Step 1 — Scope definition
State explicitly before doing anything:
- Files to be created
- Files to be modified
- Files that must NOT be touched

If scope is unclear from the spec, stop and ask. Do not infer scope — confirm it.

---

### Step 2 — Branch isolation
Create a git branch for this task:
```bash
git checkout -b task/[task-id]-[short-kebab-description]
```
Never implement directly on `main` or `develop`. No exceptions.

---

### Step 3 — TDD cycle
Invoke the `tdd` skill.

**GATE**: Do not proceed to Step 4 until `tdd` outputs `All tests passing: YES`.

---

### Step 4 — Code review (subagent)
Do not run the `code-review` skill in the current context. Spawn a subagent via the Task tool with clean context.

**Gather the following before spawning:**
```bash
# 1. The diff — what actually changed
git diff main...HEAD

# 2. The task spec — what was supposed to change
cat openspec/changes/[change-id]/tasks.md   # the specific task entry

# 3. The conventions — how code should be written
# Extract from CLAUDE.md: sections "Conventions" and "Framework-specific review rules"

# 4. Design context — only if this task involves UI
# If CLAUDE.md "Design" section has a project URL, extract:
# - Claude Design project URL
# - Design system description (colors, typography, style)
# - Key screens relevant to this task
# If no Design section or task is not UI-related, set to "none"
```

**Spawn the subagent using the Task tool with this prompt structure:**
```
ROLE: You are a code reviewer. You did NOT write this code.
You have no knowledge of how or why implementation decisions were made.
Your only job is to evaluate the diff against the spec, conventions, and design context below.

TASK SPEC:
[paste full task entry from tasks.md]

CONVENTIONS:
[paste CLAUDE.md sections: Conventions + Framework-specific review rules]

DESIGN CONTEXT:
[paste CLAUDE.md "Design" section if task involves UI, or "none — not a UI task"]

CODE DIFF:
[paste full output of git diff main...HEAD]

INSTRUCTIONS:
You are running the code-review skill. Apply the full checklist:
1. Spec conformance — every acceptance criterion satisfied, no scope creep
2. Conventions — naming, structure, no hardcoded values
3. General quality — no dead code, no console.log, no unused imports
4. Framework-specific — apply every rule in the CONVENTIONS section above
5. Security — no secrets, no unsanitized input, no exposed routes
6. Visual consistency — only if DESIGN CONTEXT is not "none": verify UI implementation is consistent with the design system described

Return ONLY this output format, nothing else:

CODE REVIEW: [task-id] — [task description]
STATUS: APPROVED | BLOCKED | APPROVED WITH WARNINGS

BLOCKERS:
- [description] → [file:line] → [required action]

WARNINGS:
- [description] → [file:line] → [recommended action]

SUGGESTIONS:
- [description] → [file:line] → [optional improvement]
```

**Receive and evaluate the subagent's output:**
- `STATUS: APPROVED` or `STATUS: APPROVED WITH WARNINGS` → proceed to Step 5
- `STATUS: BLOCKED` → fix the listed blockers, then spawn a new subagent for re-review
- If the same blocker appears after 2 subagent reviews → escalate to human review, stop

**GATE**: Do not proceed to Step 5 while STATUS is BLOCKED.

---

### Step 4.5 — Security review (subagent, conditional)
Run this **only if** the task touches a security-sensitive surface: authentication/authorization, sessions/tokens, payments, PII or sensitive data, file uploads, deserialization, dynamic SQL/shell, cryptography, secrets/config, external input parsing, webhooks/redirects, CORS/CSP/security headers, or native permissions/secure storage (mobile).

If it does, spawn the `security-review` skill as a subagent — same clean-context pattern as Step 4. Pass: the task spec, CONVENTIONS (Conventions + Framework-specific review rules from `CLAUDE.md`), the specific sensitive surface(s) that triggered it, and the diff (`git diff main...HEAD`).

If the task touches **no** sensitive surface, skip this step — `code-review` §5 already covered the security baseline.

- `STATUS: APPROVED` / `APPROVED WITH WARNINGS` → proceed to Step 5
- `STATUS: BLOCKED` → fix the blockers, then spawn a new `security-review` subagent

**GATE**: Do not proceed to Step 5 while the security STATUS is BLOCKED. A security BLOCKER cannot be downgraded or acknowledged away — fix it, or obtain explicit human sign-off recorded in the PR.

---

### Step 5 — Regression check
Run the full test suite using the command defined in `CLAUDE.md` under "Test commands".
Verify:
- [ ] No previously passing tests are now failing (no regressions)
- [ ] Coverage did not decrease for files touched in this task

**GATE**: If regressions exist, fix them before proceeding. If the same regression persists after 2 attempts, escalate to human review.

---

### Step 6 — Commit, push, and PR
Commit all changes on the task branch:
```bash
git add .
git commit -m "[task-id]: [task description in imperative form]"
git push origin task/[task-id]-[short-kebab-description]
```

Then invoke the `github-pr` skill to create the pull request.

**GATE**: Do not mark the task done in `tasks.md` or archive the change until the PR is merged. The task is not done until it lands on `main`.

---

### Step 7 — Post-merge (after human merges the PR on GitHub)
Once the human confirms the PR has been merged:

```bash
git checkout main
git pull origin main
```

Then mark the task as complete in `openspec/changes/[change-id]/tasks.md` by checking its checkbox.

Finally, check whether all tasks in the change are now complete:
- **If tasks remain:** output the next pending task and stop. The human will invoke `task-execution` for it.
- **If all tasks are done:** notify the human that the change is ready to archive:

```
All tasks in [change-id] are complete.
Run: /opsx:archive [change-id]
```

Do not run `/opsx:archive` automatically — the human reviews and confirms before archiving.

---

## Scope creep rule
If during Step 1 or Step 3 you discover the task requires touching files or implementing logic beyond the defined scope, **do not expand scope**. Instead:
1. Note the additional work
2. Add a new task to `tasks.md` for it
3. Complete the original task as scoped
4. Execute the new task separately

---

## Output after commit + PR (required)
```
TASK READY FOR REVIEW: [task-id] — [task description]
Branch: [branch-name]
Files created: [list or "none"]
Files modified: [list]
Tests written: [n]
Tests passing: [n/n]
Coverage delta: [+/-n%]
Code review: [APPROVED / APPROVED WITH WARNINGS]
Security review: [APPROVED / APPROVED WITH WARNINGS / N/A — no sensitive surface]
Regressions: NONE
PR: [URL]
```

## Output after post-merge (required)
```
TASK COMPLETE: [task-id] — [task description]
Merged via PR: [PR URL]
Task marked done in tasks.md: YES
Main pulled: YES
Remaining tasks in [change-id]: [n or "none — change ready to archive"]
```

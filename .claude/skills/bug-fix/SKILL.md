---
name: bug-fix
description: Lightweight, reproduce-first workflow for fixing a defect — TDD-driven, reuses code-review/security-review/github-pr, with an urgent hotfix variant
triggers: When fixing a bug or defect (not building a new feature). Invoked directly — does not require an OpenSpec change.
---

# Bug Fix

## Purpose
Fix a defect with the same discipline as `task-execution`, but without the feature ceremony. The defining rule: **a bug is not understood until it is reproduced as a failing test.** This skill is reproduce-first, then fix, then prove no regression.

## When to activate
Invoked directly by the human: "Run bug-fix for [description/issue]". Use this instead of `/opsx:propose` + `task-execution` when the work is a **defect**, not new behavior.

Two modes:
- **Standard** (default) — normal-priority defect. Lightweight: no OpenSpec change, branch + PR direct.
- **Hotfix** — production is broken right now and needs a fast, safe fix. Same reproduce-first discipline, branched from `main`, fast-tracked review and merge, with a mandatory follow-up.

State the mode at the start. If unspecified, it is Standard.

## Relationship to OpenSpec (lightweight)
Most bugs do **not** get an OpenSpec change — branch, fix, PR, merge.

Exception: if the bug reveals that a **spec is wrong** (the code matched the spec, but the spec itself was incorrect), stop. That is not a bug-fix — it needs `/opsx:propose` to correct the spec delta, then `task-execution`. Do not silently change code to contradict an approved spec.

---

## Process

### Step 1 — Triage and scope
- Confirm this is a **defect** (behavior differs from intended), not a missing feature and not a spec change.
- Capture from the human: observed behavior, expected behavior, and reproduction steps.
- Decide the mode: Standard or Hotfix.
- State the files you expect to touch. If the fix balloons beyond a localized change, stop and reconsider — it may be a feature (use `task-execution`).

### Step 2 — Branch
- **Standard:** `git checkout -b fix/[short-kebab-description]` (from `main`).
- **Hotfix:** `git checkout main && git pull origin main && git checkout -b hotfix/[short-kebab-description]` — branch from the exact production state.

### Step 3 — Reproduce (RED) — non-negotiable
Write a failing test that reproduces the bug, following the `tdd` skill discipline (read the test command from `CLAUDE.md` → "Test commands").
- The test must fail for **the reason the bug exists**, not incidentally.
- Required even for hotfixes — this is the regression guard that stops the bug from returning.
- If the bug genuinely cannot be reproduced in a test (e.g. infra/config-only), document why and add the closest possible automated check.

**GATE**: Do not write any fix until a test reproduces the bug (RED confirmed).

### Step 4 — Diagnose root cause
State the **root cause**, not the symptom, in one or two sentences. If you cannot name the root cause, keep investigating — do not patch blindly.

### Step 5 — Fix (GREEN)
Write the minimum change that makes the reproduction test pass.
- **Standard:** a small REFACTOR pass is allowed if it improves clarity without risk.
- **Hotfix:** minimal fix only — defer any non-critical cleanup to the follow-up (Step 9).

**GATE**: The reproduction test passes and no other test regresses.

### Step 6 — Review
- Spawn `code-review` as a subagent (clean context), same pattern as `task-execution` Step 4: pass the diff (`git diff main...HEAD`) + the bug description + `CLAUDE.md` Conventions and Framework-specific review rules.
- If the fix touches a security-sensitive surface (auth, payments, PII, uploads, crypto, secrets, CORS/CSP, native permissions/secure storage), also spawn `security-review`.
- Hotfix does **not** skip review — it fast-tracks it: BLOCKERS are fixed; a WARNING may be explicitly acknowledged in the PR to merge now and harden in the follow-up. A security BLOCKER is never bypassed.

### Step 7 — Regression check
Run the full suite (`CLAUDE.md` → "Test commands"). No previously passing test may now fail.

### Step 8 — Commit, push, PR
```bash
git add .
git commit -m "fix: [description]"          # hotfix: "hotfix: [description]"
git push origin [branch]
```
Invoke `github-pr` with a bug-flavored body:
- Root cause
- Reproduction steps
- The failing test that was added
- Fix summary

CI still gates the merge — branch protection is unchanged. The human performs the merge.

### Step 9 — Post-merge and follow-up
After the human confirms the PR is merged:
```bash
git checkout main && git pull origin main
```
- **Standard:** done. If a GitHub issue tracked this bug, close it referencing the PR.
- **Hotfix:**
  - Confirm the fix is deployed to production (`CLAUDE.md` → "Deploy"; mobile: `eas update` or `eas build` + `eas submit`).
  - If the hotfix was a patch rather than the full root-cause fix, file a follow-up task/issue so the proper fix is scheduled — do not let "temporary" become permanent silently.
  - Confirm the regression test remains in the suite.

---

## Mode summary

| | Standard | Hotfix |
|---|---|---|
| Trigger | Normal-priority defect | Production broken now |
| Branch from | `main` → `fix/...` | `main` (pulled to exact prod state) → `hotfix/...` |
| Reproduce-first | Required | Required |
| Review | Full | Fast-tracked (BLOCKERS fixed; WARNING may be acknowledged) |
| CI gate | Yes | Yes (unchanged — never bypassed) |
| Refactor | Small pass allowed | Deferred to follow-up |
| After merge | Close issue | Deploy + file root-cause follow-up |

## Output (required)
```
BUG FIX [STANDARD / HOTFIX]: [description]
Root cause: [one or two sentences]
Reproduction test: [test name] — RED confirmed: YES
Fix: [summary]
Code review: [APPROVED / APPROVED WITH WARNINGS]
Security review: [APPROVED / APPROVED WITH WARNINGS / N/A — no sensitive surface]
Regressions: NONE
PR: [URL]
Follow-up (hotfix): [issue/task ref or "none — full root-cause fix"]
```

## Stop conditions
- If the bug reveals the spec is wrong → stop, route to `/opsx:propose` (not bug-fix).
- If the bug cannot be reproduced and cannot be approximated by any automated check → escalate to the human; do not ship an unverifiable fix.
- If the fix scope grows beyond a localized change → stop; it is likely a feature — use `task-execution`.
- Hotfix: if CI cannot run or branch protection is down, stop and tell the human — do not bypass the gate to merge faster.

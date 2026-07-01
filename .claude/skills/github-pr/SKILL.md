---
name: github-pr
description: Creates a standardized GitHub pull request after a task branch is pushed — invoked by task-execution
triggers: After task branch is committed and pushed to origin, before archiving in OpenSpec
---

# GitHub PR

## Purpose
Create a pull request that links the implementation to its OpenSpec task, gives the reviewer enough context to evaluate the change without reading the full codebase, and establishes a clean merge record on GitHub.

## When to activate
Invoked by `task-execution` after Step 6 (commit + push), or by `bug-fix` at Step 8. Do not create PRs manually — always go through this skill to ensure consistency.

## Pre-conditions
- [ ] Branch is pushed to `origin`
- [ ] All tests pass on the branch
- [ ] `code-review` output is `APPROVED` or `APPROVED WITH WARNINGS` (not `BLOCKED`)
- [ ] If `security-review` ran (sensitive surface), its output is `APPROVED` or `APPROVED WITH WARNINGS` (not `BLOCKED`)
- [ ] `gh` CLI is authenticated (`gh auth status`)

---

## PR creation

Run:
```bash
gh pr create \
  --title "[task-id]: [task description in imperative form]" \
  --body "$(cat <<'EOF'
## OpenSpec reference
- Change: [change-id]
- Task: [task-id]
- Proposal: openspec/changes/[change-id]/proposal.md
- Tasks file: openspec/changes/[change-id]/tasks.md

## What this PR does
[One paragraph: what was implemented, not how]

## Acceptance criteria
[Copy the GIVEN/WHEN/THEN scenarios from the task spec — one line each]
- GIVEN [condition] WHEN [action] THEN [outcome]

## Tests
- Written: [n]
- All passing: YES
- Coverage delta: [+/-n%]

## Code review result
[APPROVED / APPROVED WITH WARNINGS]
[If warnings: list them here]

## Security review result
[APPROVED / APPROVED WITH WARNINGS / N/A — no sensitive surface]
[If warnings: list them and the acknowledgement here]

## Notes for reviewer
[Anything non-obvious about the implementation choices, or "none"]

## Pre-merge checklist
- [ ] Acceptance criteria verified
- [ ] No unresolved code review warnings
- [ ] No unresolved security review blockers; any security warnings acknowledged
- [ ] CI passing
- [ ] No requested changes pending
EOF
)" \
  --base main \
  --head task/[task-id]-[short-kebab-description]
```

---

## Bug / hotfix variant

When invoked by `bug-fix` (a defect, not an OpenSpec task), the change has no OpenSpec artifacts. Use the same command but swap two sections of the body:
- Replace **OpenSpec reference** with **Bug reference**: linked issue (or "none"), and `[fix | hotfix]`.
- Replace **Acceptance criteria** with **Root cause** (one or two sentences) and **Reproduction steps** (including the failing test that was added).

Title uses `fix:` or `hotfix:` instead of the `[task-id]:` prefix, and `--head fix/...` or `hotfix/...`. Keep the Tests, Code review result, Security review result, Notes, and Pre-merge checklist sections as-is.

---

## Merge rules

**Do not add automated merge or auto-approval.** The human always performs the final merge on GitHub after verifying the pre-merge checklist above.

---

## After PR is created

Output the PR URL and wait. Do not proceed with Step 7 of `task-execution` until the human confirms the PR has been merged.

```
PR CREATED
──────────
Title: [task-id]: [task description]
Branch: task/[task-id]-[short-kebab-description] → main
URL: [PR URL]
Status: AWAITING REVIEW AND MERGE
──────────
When merged, say: "PR [task-id] merged" to continue.
```

---

## Stop conditions
- If `gh auth status` fails, stop and ask the human to run `gh auth login` in Cursor's integrated terminal before continuing.
- If the push was rejected (e.g. branch already exists on remote), stop and report. Do not force-push.
- If the PR already exists for this branch, output its URL instead of creating a duplicate.

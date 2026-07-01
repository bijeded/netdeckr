---
name: project-init
description: Scaffolds the code project from an approved CLAUDE.md — git, framework, OpenSpec, design sync, skills, CI pipeline, and hosting connection
triggers: After discovery skill completes and CLAUDE.md + openspec/project.md are approved
---

# Project Init

## Purpose
Take the approved `CLAUDE.md` and create a working, runnable project: git repo, code scaffold, dependencies, OpenSpec structure, CI pipeline, and hosting connection. After this skill completes, the project is ready for the first OpenSpec change and every future PR will be validated automatically before it can be merged.

## When to activate
Immediately after `discovery` completes and both `CLAUDE.md` and `openspec/project.md` have been approved. Run this skill exactly once per project.

## Pre-execution checklist
- [ ] `CLAUDE.md` exists and has been approved by the human
- [ ] `openspec/project.md` exists and has been approved
- [ ] Target directory is empty (or only contains these two files)
- [ ] Required CLI tools for the chosen stack are installed (verify before running)

---

## Execution sequence

### Step 1 — Git initialization
```bash
git init
echo "node_modules/\n.env\n.env.local\ndist/\n.next/\nbuild/" > .gitignore
```
Adjust `.gitignore` entries based on the stack in `CLAUDE.md`.

### Step 2 — Code scaffold
Read the stack **and the `Platform` field** from `CLAUDE.md`, then run the appropriate scaffold command for the framework (e.g. `create-next-app` for web, `create-expo-app` for an Expo mobile app). Do not manually create files that a scaffold command would generate.

After scaffolding, verify the generated structure matches the "Project structure" section in `CLAUDE.md`. If it differs, align the structure before continuing — update `CLAUDE.md` to reflect the actual scaffold output if needed.

### Step 3 — Install dependencies
Run the install command defined in `CLAUDE.md` under "Key commands". Do not add any dependencies beyond what the scaffold generates unless `CLAUDE.md` explicitly lists them.

### Step 4 — Environment setup
Create `.env.local` (or the equivalent for the stack) with the variables listed in `CLAUDE.md` under "Environment variables". Leave values blank — note to the human which ones need real values before the dev server will work.

### Step 5 — OpenSpec initialization
```bash
openspec init --tools claude,cursor
```
This creates `openspec/`, installs `.claude/skills/` integration, and generates OpenSpec's managed files. After it runs, copy the approved `openspec/project.md` into the generated `openspec/` folder.

### Step 5.5 — Design system sync (only if Phase 1.5 was completed)
Read `CLAUDE.md` under "Design". If a Claude Design project URL is present:

```bash
/design-sync
```

This links the Claude Design project to the codebase so Claude Code has visual context for UI tasks. If no Claude Design project exists, skip this step.

### Step 6 — Reference project skills
The development-loop skills (`tdd`, `code-review`, `task-execution`, `github-pr`), the conditional `security-review` subagent, and the `bug-fix` skill are installed in `~/.claude/skills/` and load automatically in every project — there is nothing to copy. They are stack-agnostic; everything project-specific lives in `CLAUDE.md`.

Just ensure `CLAUDE.md` has a "Skills" section listing the skills this project relies on, so the workflow is self-documenting:
```
## Skills
- task-execution, tdd, code-review, github-pr (in ~/.claude/skills/ — dev loop)
- security-review (in ~/.claude/skills/ — conditional subagent, runs only on security-sensitive tasks)
- bug-fix (in ~/.claude/skills/ — reproduce-first defect workflow, lightweight; with hotfix variant)
```
Only if this project needs a *different* version of a skill, place an overriding copy in the project's local `.claude/skills/` (project-local takes precedence over global). This is rare — default to the global skills.

### Step 7 — Verify the project runs
Run the dev server command from `CLAUDE.md` and confirm it starts without errors. Then run the full test suite command. A passing baseline (even with zero tests) is required before proceeding.

For a mobile (Expo) project, "dev server" means the Metro bundler (`expo start`). Confirm Metro boots and bundles without errors — that is the required check. Actually loading the app on a simulator/emulator or physical device (via the Expo Go QR or a dev build) is an optional extra confirmation, not required to pass this gate, since it needs a simulator or device that may not be available in the terminal.

**GATE**: If the dev server (or Metro) fails to start, or the test suite fails, resolve the issue before continuing. Do not proceed with a broken baseline.

### Step 8 — CI pipeline
Read `CLAUDE.md` under "CI" for the commands that must run on each PR. Generate `.github/workflows/ci.yml` using exactly those commands — do not invent commands not listed in `CLAUDE.md`.

The workflow must:
- Trigger on every pull request targeting `main`
- Run install, then each CI command in order
- Fail the PR if any command exits with a non-zero code

Use the runtime and package manager defined in `CLAUDE.md` to set up the correct environment in the workflow. If `CLAUDE.md` does not specify a Node version or runtime, ask before generating the file.

Verify the generated `.yml` is valid before committing.

### Step 9 — Initial commit
Commit everything generated so far. The repo does not yet exist on GitHub — this is a local commit only.

```bash
git add .
git commit -m "init: project scaffold with CLAUDE.md, OpenSpec, and CI"
```

---

### Step 10 — Create GitHub repository and push
```bash
gh repo create [project-name] --private --source=. --push
```

Use `--public` if the project is open source. After this step, the remote `origin` is established and the initial commit is on GitHub.

---

### Step 11 — Configure branch protection
Now that the repo exists on GitHub, enforce CI as a required check before any PR can merge to `main`.

The required status check `context` must match **exactly** the check name GitHub will report. That name is the job's `name:` field in `.github/workflows/ci.yml` if set, otherwise the job key under `jobs:`. Read it carefully — a mismatch means the rule silently never blocks anything.

```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

gh api repos/$REPO/branches/main/protection \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  --input - << 'EOF'
{
  "required_status_checks": {
    "strict": false,
    "contexts": ["[exact CI check name — see note above]"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null
}
EOF
```

Notes:
- `required_pull_request_reviews` is `null` on purpose: a solo developer cannot approve their own PR, so requiring reviews would deadlock merges. The subagent code-review in `task-execution` is the quality gate, not a GitHub required reviewer.
- CI triggers on pull requests, not on the initial push to `main`, so until the **first PR** runs, the required check shows as *Expected — waiting for status*. That is normal, not a failure. The first PR will exercise it and the gate becomes live.

Verify the rule is active:

```bash
gh api repos/$REPO/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  --jq '.required_status_checks.contexts'
```

**GATE**: Confirm the branch protection rule is active before proceeding to hosting. Confirm the check name actually blocks a PR the first time CI runs (re-verified in production-checklist §2).

---

### Step 12 — Hosting / delivery connection
Read `CLAUDE.md` under "Platform" and "Deploy". The setup depends on the target — do not assume a specific provider.

**Web hosting:**
- Connect the GitHub repo to the hosting platform
- Configure production environment variables (from `CLAUDE.md` under "Environment variables → Production")
- Confirm that a merge to `main` triggers a deploy (automatic or manual, as defined in `CLAUDE.md`)

**Mobile (Expo / EAS):** there is no git-connected host — set up EAS delivery instead:
```bash
npm install -g eas-cli      # if not already installed
eas login
eas build:configure         # generates eas.json with build profiles
```
- Confirm `eas.json` has at least `preview` and `production` profiles
- Set up signing credentials (let EAS manage them, or supply your own certs/keystore)
- Store any build-time secrets with `eas secret:create`
- Record the exact delivery commands in `CLAUDE.md` → "Deploy": `eas build`, `eas submit`, `eas update`

If any step cannot be done from the terminal (e.g. a web dashboard, App Store Connect / Play Console enrollment), list it clearly and ask the human to complete it. Do not skip this step.

**GATE**: Confirm with the human that the hosting/delivery connection is established before closing out.

---

## Stop conditions
- If a required CLI tool is missing (e.g. no `npx`, no framework CLI), stop and list what needs to be installed. Do not attempt to work around missing tools.
- If the scaffold command fails, stop and report the error. Do not attempt an alternative scaffold.
- If Step 7 fails after one fix attempt, stop and escalate to human review. Do not loop.

## Output (required)
```
PROJECT INIT COMPLETE
─────────────────────
Framework scaffolded: YES
Dependencies installed: YES
OpenSpec initialized: YES
Design sync: YES / SKIPPED (no Claude Design project)
Skills referenced in CLAUDE.md: YES (in ~/.claude/skills/)
CI pipeline: CONFIGURED / SKIPPED (reason)
Initial commit: [commit hash]
GitHub repo: [URL]
Branch protection: CONFIGURED / FAILED (reason)
Hosting connected: YES / PENDING MANUAL STEPS (list steps)
Dev server verified: YES / NO (reason if NO)
Test baseline: PASSING / FAILING (reason if FAILING)
Env vars needing values (local): [list or "none"]
Env vars needing values (production): [list or "none"]
─────────────────────
READY FOR FIRST OPENSPEC CHANGE: YES / NO
```

## Handoff
Once complete, the project is ready. For each new feature: optionally run the `user-stories` skill to structure requirements, then create the first OpenSpec change with `/opsx:propose` or `/opsx:explore`.

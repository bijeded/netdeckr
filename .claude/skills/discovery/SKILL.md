---
name: discovery
description: Structured discovery session to go from a rough app idea to CLAUDE.md and openspec/project.md — includes stack recommendation
triggers: At the start of a new project, before any file is created or openspec init is run
---

# Discovery

## Purpose
Turn a rough idea into enough information to write `CLAUDE.md` and `openspec/project.md` with confidence. No code is written during this skill. No files are created until the human approves the outputs.

## When to activate
At the very beginning of a new project, when no codebase exists yet. If a `CLAUDE.md` or `openspec/project.md` already exist, do not run this skill — use `/opsx:explore` in OpenSpec instead.

---

## Process

### Phase 1 — Understand the idea

Ask these questions **one group at a time**, not all at once. Wait for answers before moving to the next group.

**Group A — Purpose**
- What does this app do, in one or two sentences?
- Who are the primary users?
- What is the single most important thing a user should be able to do?

**Group B1 — Platform and integrations**
- Is this a web app, a mobile app, or both?
- If mobile: Expo / React Native (recommended — keeps tooling unified with this workflow), or pure native (Swift/Kotlin — advanced path, different toolchain)?
- Are there any existing systems it needs to integrate with (APIs, databases, auth providers)?
- Any technologies you already know you want to use or explicitly want to avoid?

**Group B2 — Infrastructure and constraints**
- Where will this be hosted? Any platform preferences or restrictions?
- Does it need a staging environment, or just production?
- Will there be database schema changes that need migration management?
- Are there hard constraints: budget, timeline, or team size?

**Group C — Quality bar**
- Is this a prototype/MVP to validate an idea, or a production app that needs to scale?
- Is offline support required (mobile)?
- Are there accessibility, localization, or compliance requirements?

---

### Phase 2 — Stack recommendation

After Phase 1 is complete, reason through a stack recommendation.

**Reasoning framework:**

| Dimension | Questions to answer before recommending |
|---|---|
| Rendering needs | Does the app need SEO? Server-side data? Static content? |
| Data complexity | Simple CRUD, real-time, or complex relational? |
| Team familiarity | What does the human already know? |
| Mobile target | Web only, native feel, or true native distribution? |
| Hosting constraints | Any platform lock-in mentioned? |
| Scale expectations | MVP or production-scale from day one? |

Present the recommendation in this format:

```
RECOMMENDED STACK
─────────────────
Frontend: [framework] — [one-sentence reason]
Backend/API: [approach] — [one-sentence reason]
Database: [choice] — [one-sentence reason]
Auth: [choice] — [one-sentence reason]
Hosting: [choice] — [one-sentence reason]
CI: [approach] — [one-sentence reason]
Testing: [runner + library] — [one-sentence reason]
─────────────────
ALTERNATIVES CONSIDERED
[alternative A]: ruled out because [reason]
[alternative B]: ruled out because [reason]
─────────────────
OPEN QUESTIONS (if any)
[questions that would change the recommendation]
```

If the human already specified part of the stack, include it as-is and only recommend the missing pieces. If you disagree with a stated choice, flag it as a WARNING with your reasoning — but respect the human's decision.

**Mobile default:** when the platform is mobile or both, recommend Expo / React Native by default — it keeps the toolchain unified with the rest of this workflow (npm, Jest, EAS for build and deploy). Use this shape for the mobile recommendation: App = Expo (RN); Testing = Jest (jest-expo preset) + React Native Testing Library; E2E = Maestro; Build = EAS Build; Deploy = EAS Update (OTA) + EAS Submit (stores); Error tracking = Sentry (Expo plugin). Pure native (Swift/Kotlin) is an advanced path that breaks the JS/TS tooling assumption of these skills — flag it as such and only take it if the human explicitly requires it.

**GATE**: Do not proceed to Phase 3 until the human explicitly approves or adjusts the stack.

---

### Phase 3 — Generate outputs

With approved stack and answers from Phase 1, generate both files for review.

Set the "Implementation mode" field from the Group C quality bar: production app → `disciplined`; prototype/MVP/spike → `fast` is a reasonable default. State the choice and note it is overridable per change.

#### Output A — `CLAUDE.md`

```markdown
# [Project Name]

## Project overview
[One paragraph: what the app does and who uses it]

## Platform
[web | mobile | both — read by production-checklist and CI to run the correct branch of checks]

## Stack
[Each layer: name + version if known]

## Project structure
[Expected top-level folder layout]

## Conventions
- File naming: [convention]
- Component naming: [convention]
- Branch naming: task/[task-id]-[description]
- Commit format: [task-id]: [imperative description]

## Test commands
- Unit/integration: [command]
- E2E (if applicable): [command]
- Full suite: [command]

## Key commands
- Install: [command]
- Dev server: [command]
- Build: [command]

## Do not modify
[Files or folders the agent must never touch]

## Environment variables
### Local (.env.local)
[List of required env vars for local development — values left blank]
### Production
[List of required env vars for production — values left blank, configured in hosting platform]

## Deploy
- Platform: [hosting platform — or "EAS" for Expo mobile]
- Production deploy: [command or "triggered automatically on merge to main"]
  [mobile: "eas build" + "eas submit" — note store review is an external human gate]
- Staging deploy: [command or "none — no staging environment"]
- Preview environments: [YES — auto-generated per PR / NO]
  [mobile: OTA via "eas update" for JS-only changes]

## CI
- Runs on: every PR targeting main
- Commands: [lint command] | [type-check command] | [test command]
- Merge blocked if CI fails: YES
[mobile: PR CI runs lint + type-check + jest on a standard runner; native EAS builds are on-demand, NOT part of PR CI]

## Database
- Platform: [name or "none"]
- Migration command: [command or "none"]
- Seed command: [command or "none"]

## Error tracking
- Platform: [Sentry / Datadog / other / none]
- Setup: [brief note or "not configured"]

## Design
- Claude Design project: [URL or "not created"]
- Design system: [brief description of colors, typography, style — or "see Claude Design project"]
- Key screens: [list of main screens with frame URLs — or "not defined"]

## Framework-specific review rules
[Checklist items for code-review.md to apply — specific to the chosen stack]
[If Platform is mobile or both (Expo / React Native), seed mobile review rules here, e.g.: no secrets in the JS bundle; auth tokens in secure storage (Keychain/Keystore), not plain AsyncStorage; no blocking work on the JS thread; long lists use FlatList/virtualization; touch targets and accessibility labels present; images sized/optimized for device.]

## Implementation mode
- Mode: [disciplined | fast]
  - **disciplined** — task-execution per task: TDD + subagent code-review + PR + post-merge. Default for production.
  - **fast** — /opsx:apply: all tasks at once on one branch + a single PR for the change. Reasonable for prototypes/MVP/low-risk.
- Overridable per change when implementation starts (task-execution confirms the mode in its first step).

## Skills
- task-execution, tdd, code-review, github-pr (in ~/.claude/skills/ — dev loop)
- security-review (in ~/.claude/skills/ — conditional subagent, runs only on security-sensitive tasks)
- bug-fix (in ~/.claude/skills/ — reproduce-first defect workflow, lightweight; with hotfix variant)
```

#### Output B — `openspec/project.md`

```markdown
# [Project Name]

## Purpose
[What the app does and why it exists]

## Users
[Primary user types and their main goals]

## Stack
[Same as CLAUDE.md — single source synchronized]

## Architecture
[High-level description: layers, data flow, key boundaries]

## Conventions
[Same as CLAUDE.md — must stay in sync]

## Out of scope
[Explicit list of what this project does NOT do — prevents scope creep]
```

**GATE**: Present both files to the human for review. Do not run `openspec init` or create any file until both are explicitly approved. Apply any requested changes and re-present before proceeding.

---

## Stop conditions
- If Phase 1 answers are too vague to make a stack recommendation, ask targeted follow-up questions before proceeding. Do not guess.
- If the human cannot answer Group C questions (quality bar), default to MVP assumptions and state them explicitly in the recommendation.
- If there is a fundamental conflict between stated constraints and the idea (e.g. "needs to scale to millions of users" + "no backend"), flag it as a BLOCKER before recommending anything.

## Handoff
Once both files are approved, this skill is complete. The next step is `project-init`.

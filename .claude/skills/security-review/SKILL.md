---
name: security-review
description: Independent security-focused review of a sensitive diff — runs as a subagent with clean context, deeper than code-review's baseline security check
triggers: Spawned by task-execution (Step 4.5) or bug-fix when a task touches a security-sensitive surface — never invoked directly by the main agent
---

# Security Review

## Purpose
Provide a focused, independent security review for changes that touch sensitive surfaces. Like `code-review`, this runs as a **subagent** with clean context — a separate Claude instance that did not write the code. It goes deeper than `code-review`'s baseline security checklist (its §5), which still runs on every task. This skill runs **only** when the change is security-sensitive, so it adds cost just where it matters.

## When it runs (trigger)
`task-execution` (Step 4.5) or `bug-fix` spawns this skill **only if** the task touches a security-sensitive surface. Sensitive surfaces include:
- Authentication, authorization, sessions, tokens, password handling
- Payments, billing, or any financial transaction
- Personal or sensitive data (PII, health, location) — storage or transmission
- File uploads, deserialization, dynamic SQL, template rendering, or shell execution
- Cryptography, secrets management, environment/config handling
- External input parsing, webhooks, redirects, CORS/CSP/security-header changes
- Native permissions and secure storage (mobile)

If none of these apply, the orchestrator skips this skill — `code-review` §5 already covered the security baseline.

## How this skill is invoked
Does not run in the main agent's context. The orchestrator spawns it via the Task tool with a structured prompt, exactly like `code-review`. The subagent receives only:

```
ROLE: You are a security reviewer. You did NOT write this code.
Evaluate the diff for security issues only — assume the functional review was done separately.

TASK SPEC:
[the task's acceptance criteria from openspec/changes/[change-id]/tasks.md, or the bug description]

CONVENTIONS (from CLAUDE.md):
[CLAUDE.md sections: Conventions, Framework-specific review rules]

SENSITIVE SURFACE:
[which surface(s) triggered this review — e.g. "authentication + token handling"]

CODE DIFF:
[output of: git diff main...HEAD]

INSTRUCTIONS:
Follow the security-review checklist below and return only the required output format.
Do not explain your reasoning outside the output format.
```

---

## Review checklist

### 1. Input handling
- [ ] All external input is validated and sanitized at the boundary
- [ ] No injection vectors (SQL/NoSQL, command, template, XSS) — queries parameterized, output escaped
- [ ] Deserialization, file parsing, and uploads are type/size-limited and safe

### 2. Authentication and authorization
- [ ] Every protected operation checks **authorization**, not just authentication
- [ ] No IDOR — object access is scoped to the authenticated principal
- [ ] Session/token handling is correct: expiry, rotation, secure/HttpOnly flags; no token in URL, logs, or client storage that exposes it

### 3. Secrets and data
- [ ] No secrets, keys, or credentials in code, logs, or error messages
- [ ] Sensitive data encrypted in transit (TLS) and at rest where required
- [ ] PII is minimized, not over-logged, and handled per the project's stated compliance

### 4. Cryptography and randomness
- [ ] Uses vetted libraries — no hand-rolled crypto
- [ ] Correct algorithms/modes; cryptographically secure randomness for tokens and IDs

### 5. Configuration and exposure
- [ ] CORS/CSP/security headers are not weakened; no `*` origins in production
- [ ] No verbose/debug error output leaking stack traces or internal paths to clients
- [ ] Rate limiting or abuse protection on auth and expensive endpoints

### 6. Mobile (only if the change is a mobile/Expo target)
- [ ] Auth tokens in secure storage (Keychain / Keystore), not plain `AsyncStorage`
- [ ] No secrets in the JS bundle; TLS validation not disabled; native permissions justified

---

## Severity classification

| Level | Definition | Blocks merge? |
|---|---|---|
| **BLOCKER** | Exploitable vulnerability, secret exposure, auth/authz bypass, injection | Yes — and cannot be downgraded |
| **WARNING** | Weakened-but-not-exploitable posture, missing defense-in-depth | Yes — unless explicitly acknowledged |
| **SUGGESTION** | Hardening opportunity | No |

A security **BLOCKER** is never auto-approved or downgraded. It is fixed, or it requires explicit human sign-off recorded in the PR — there is no "acknowledge and move on" for a BLOCKER.

---

## Output format (required)

```
SECURITY REVIEW: [task-id] — [sensitive surface]
STATUS: APPROVED | BLOCKED | APPROVED WITH WARNINGS

BLOCKERS:
- [vulnerability] → [file:line] → [required fix]

WARNINGS:
- [weakness] → [file:line] → [recommended hardening]

SUGGESTIONS:
- [improvement] → [file:line] → [optional hardening]
```

## Stop conditions
- If BLOCKERS exist, return the output to the main agent. The main agent fixes them and spawns a new subagent for re-review — do not loop within the subagent.
- If the diff is empty or the context passed is malformed, return an error immediately.
- If the same BLOCKER appears in two consecutive reviews, the main agent escalates to human review. Do not spawn a third subagent for the same issue.

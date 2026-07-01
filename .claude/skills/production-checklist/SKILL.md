---
name: production-checklist
description: Pre-launch verification checklist — runs once before the app goes live for the first time, or before a major release
triggers: When the app is functionally complete and ready to launch to real users
---

# Production Checklist

## Purpose
Catch the class of problems that tests don't catch — configuration gaps, security oversights, performance regressions, and operational blind spots — before real users encounter them. This skill does not write features. It verifies readiness.

## When to activate
Once: before the first public launch. Optionally before major releases if the architecture or infrastructure changes significantly. Do not run on every PR — that is what CI is for.

## Pre-conditions
- [ ] All OpenSpec changes for the launch milestone are archived
- [ ] CI is passing on `main`
- [ ] The app is deployed to the production environment (even if not yet publicly accessible)
- [ ] Production environment variables are configured in the hosting platform

---

## Checklist

Read `CLAUDE.md` → `Platform` first. Sections 1–5 and 9 apply to every project. Sections 6–8 are the **web** path; if `Platform` is `mobile` or `both`, also run the **Mobile path** block below (and for a pure mobile app it replaces §6–§8). The checklist is always 9 concerns — the mobile path maps the same concerns to stores, signing, and devices.

### 1. Environment and configuration
- [ ] All environment variables listed in `CLAUDE.md` under "Environment variables → Production" are set in the hosting platform — not just locally
- [ ] No `.env` or `.env.local` files are committed to the repository
- [ ] No API keys, secrets, or credentials appear anywhere in the codebase or git history
- [ ] The app starts and serves requests in the production environment without errors

### 2. CI gate enforcement
Branch protection and CI requirements were configured during `project-init`. This section verifies they are active and working correctly.

```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
gh api repos/$REPO/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  --jq '.required_status_checks'
```

- [ ] The command above returns the CI check name (not null or empty)
- [ ] `enforce_admins` and `required_pull_request_reviews` match the project-init config (reviews `null` for a solo dev)
- [ ] At least one successful CI run exists on the current `main` commit
- [ ] The CI workflow covers all commands listed in `CLAUDE.md` under "CI"

> Note on `strict`: project-init sets `strict: false` (a branch need not be up to date with `main` before merging). That is the chosen default — fine for a solo dev merging one task at a time. If this project has concurrent PRs that could conflict semantically, consider flipping it to `strict: true`; otherwise leave it.

If the protection rule is missing or misconfigured, it must be corrected before launch — not after.

### 3. Performance baseline
Run a performance audit using the tool appropriate for the platform (Lighthouse for web, platform profiler for native). Record the baseline scores — you need these to detect regressions later.

For web apps, minimum acceptable scores before launch:
- Performance: 75+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 80+ (if public-facing)

If scores are below threshold, report them as WARNINGs — do not block launch unless Performance is below 50.

### 4. Error tracking
- [ ] An error tracking platform is configured (read `CLAUDE.md` under "Error tracking")
- [ ] A test error has been triggered and confirmed to appear in the tracking platform
- [ ] Alerts are configured for error spikes (email or notification channel)

If `CLAUDE.md` says "none" for error tracking, log a WARNING: launching without error tracking means production failures will be invisible until a user reports them.

### 5. Database and migrations
Read `CLAUDE.md` under "Database".
- [ ] All pending migrations have been run against the production database
- [ ] The migration command was run explicitly — not assumed to auto-run on deploy
- [ ] A database backup exists before the launch (manual or automatic)

If `CLAUDE.md` says "none" for database, skip this section.

### 6. Security basics (web)
- [ ] HTTPS is enforced — HTTP redirects to HTTPS
- [ ] Authentication is required on all routes that contain user data
- [ ] No admin or debug routes are publicly accessible
- [ ] CORS is configured to allow only expected origins (not `*` in production)
- [ ] Rate limiting is in place on auth endpoints
- [ ] No verbose error messages are exposed to the client (stack traces, internal paths)

### 7. Domain and routing (web)
- [ ] The production domain resolves correctly
- [ ] SSL certificate is valid and not expiring within 30 days
- [ ] `www` and non-`www` variants both work (or redirect correctly)
- [ ] 404 and 500 error pages are handled gracefully — not blank screens or framework defaults

### 8. Smoke test in production (web)
Run a manual end-to-end check of the single most important user flow (identified in `openspec/project.md` under "Users"). This is a human step — not automated.

- [ ] The critical user flow completes successfully in the production environment
- [ ] The flow was tested with a real account, not a test/seed account
- [ ] Any email or notification triggers in the flow were verified to actually send

### 9. Operational readiness
- [ ] Someone knows how to roll back if a deploy breaks production (documented or understood)
- [ ] The hosting platform has uptime monitoring or alerting configured
- [ ] The deploy command (or process) is documented in `CLAUDE.md` — not only in someone's head

---

## Mobile path (Platform = mobile or both)

For an Expo / React Native app, apply §1–§5 and §9 as written (with EAS in place of a web host), and use these in place of the web §6–§8:

### M6. Mobile security and permissions
- [ ] No secrets bundled into the app binary — only public config is shipped client-side; secrets live behind the backend
- [ ] Native permissions (camera, location, notifications, etc.) are declared and justified in `app.json` (Info.plist / AndroidManifest)
- [ ] API calls use HTTPS; certificate handling is not weakened (no disabled TLS validation)
- [ ] Auth tokens are stored in secure storage (Keychain / Keystore), not plain `AsyncStorage`

### M7. Build, signing, and store metadata
- [ ] `version` and `ios.buildNumber` / `android.versionCode` are incremented for this release
- [ ] Signing credentials are configured (EAS-managed credentials or your own certs/keystore)
- [ ] Store listing metadata is ready: name, description, icon, screenshots per required device sizes
- [ ] The build passes store review guidelines you can check ahead of time (no private APIs, permission usage strings present)

### M8. Smoke test on a real device
- [ ] A release build was installed on a **physical device** via TestFlight / Play internal testing
- [ ] The critical user flow completes on-device with a real account
- [ ] Crash reporting (Sentry / Crashlytics) captured a deliberately triggered test error
- [ ] The OTA channel (EAS Update) and a build-level rollback plan are confirmed

---

## Severity classification

| Level | Definition |
|---|---|
| **BLOCKER** | Secrets in repo, no HTTPS, auth bypass, CI not enforcing on main, app not loading in production |
| **WARNING** | No error tracking, no performance baseline, missing migration confirmation, SSL expiring soon |
| **NOTE** | Suggestions for post-launch improvements — do not block launch |

---

## Output (required)

```
PRODUCTION CHECKLIST: [project name]
Date: [date]
Environment: [production URL]
─────────────────────────────────────
BLOCKERS: [n] — launch must not proceed
  - [item] → [required action]

WARNINGS: [n] — address before or shortly after launch
  - [item] → [recommended action]

NOTES: [n]
  - [item]

Performance baseline:
  - [metric]: [score]

Critical user flow smoke test: PASSED / FAILED
─────────────────────────────────────
READY TO LAUNCH: YES / NO
```

---

## Stop conditions
- If BLOCKERS exist, do not launch. Resolve them and re-run only the blocked sections.
- If the production environment is not accessible (Step 1 fails), stop immediately — the remaining checks cannot be completed.
- Do not attempt to fix security issues found in Step 6 without human review. Report and wait for explicit instruction.

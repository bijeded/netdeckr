## Context

MetaStack is a single-page dashboard with no router. All "which view is showing" state today lives in `useState` (filters, sidebar open/closed) or in URL query params written/read by hand-rolled hooks (`useFormatSelection` → `?f=`, `useWindowSelection` → `?w=`), each syncing via `URLSearchParams` + `window.history.replaceState` and listening to `popstate` for back/forward. `App.tsx` is a single ~500-line component that owns all dashboard state and renders the topbar, sidebar, and main content in one tree; there is no footer today and nothing in `design/` (the design system) specifies one.

This change adds two static-content pages (How It Works, Privacy Policy) reachable from a new footer, without introducing a router. It also introduces the first non-i18next content-authoring path in the app, since the existing `en.json`/`es.json` convention wasn't built for multi-paragraph legal prose.

## Goals / Non-Goals

**Goals:**
- Add a footer, visible on the dashboard and on both legal pages, carrying the "How it works" / "Privacy policy" links, the language toggle, and the Wizards Fan Content Policy legend.
- Make the two legal pages reachable via a shareable/bookmarkable URL, using the same URL-param pattern already established in the codebase.
- Keep the two pages' long-form content out of `en.json`/`es.json`, in a form that's easy to review as a content diff and doesn't require a new rendering dependency.
- Ship a privacy policy that's honest about what's live (Vercel Analytics) vs. planned (error tracking, possible future ads).

**Non-Goals:**
- No router library (react-router, etc.) — out of scope, and against the grain of the codebase's existing URL-state pattern.
- No CMS, no markdown pipeline, no user-editable content — the two pages are developer-authored, same as everything else in `src/`.
- No SSR/prerendering of the legal pages for SEO — the app is a client-rendered SPA on Vercel today; server-rendering just these two routes is a much bigger change and isn't requested here.
- No implementation of Vercel Analytics, error tracking, or ads themselves — the privacy policy describes them (per the proposal, present vs. future tense), but wiring them up is separate future work.

## Decisions

### 1. Navigation: a `?page=` query param, not a router

Mirrors `useFormatSelection`/`useWindowSelection` exactly: a new `useLegalPage` hook (or equivalently named) reads `?page=` from `URLSearchParams`, exposes `null | 'how-it-works' | 'privacy'`, and a setter that does `params.set('page', value)` / `params.delete('page')` + `history.pushState` (not `replaceState` — see below) while preserving other params (`f`, `w`), plus a `popstate` listener so back/forward works.

**`pushState` vs `replaceState`:** the existing hooks use `replaceState` because changing format/window is "still the same conceptual page." Navigating to a legal page is a distinct navigation the user expects to be able to back out of with the browser back button, so this hook uses `pushState` when entering/leaving a legal page. This is a deliberate, small divergence from the existing hooks, called out here so it isn't mistaken for an inconsistency.

Alternatives considered:
- **Modal overlay** (reusing the `DecklistModal` pattern): rejected — not linkable/bookmarkable, and legal pages are exactly the content people want to link to or open in a new tab.
- **react-router**: rejected — first router-shaped dependency in an app that has twice already solved "URL-addressable state" without one; not justified for two static pages.

### 2. Shell chrome: hide the sidebar, keep topbar + footer

When `?page=` is set, `App.tsx` renders the `LegalPage` content in place of the dashboard's `<main>` body, but keeps the `<header className="topbar">` (logo, format switcher) and the new `<footer>` unchanged. The `<aside className="sidebar">` (filters) is not rendered at all in this state — filters have no meaning on a legal page, and hiding them (rather than rendering a disabled state) keeps the change simple.

Consequence: the `LanguageToggle` component, currently rendered inside `.sidebar-inner`, moves into the footer, since the footer is the one piece of chrome guaranteed present in both states. This is a relocation, not a rewrite — same component, new mount point.

### 3. Content format: typed per-locale `Section[]` modules, not JSON or Markdown

```ts
// src/content/legal/types.ts
export type Section =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'link'; text: string; href: string }
```

`src/content/legal/howItWorks.en.ts`, `howItWorks.es.ts`, `privacy.en.ts`, `privacy.es.ts` each export a `Section[]`. A single `LegalPage` component (`src/components/LegalPage.tsx`) takes a `title` (i18n key, short) and `sections: Section[]` and renders them with the existing design tokens (Sora for headings, IBM Plex Sans for body, the same spacing rhythm as the rest of the app). `App.tsx` (or the `useLegalPage` consumer) picks `howItWorksEn`/`howItWorksEs` etc. based on `i18n.language`, the same branching pattern used everywhere else in the app — no second i18next namespace, no markdown parser, no new dependency.

Alternatives considered:
- **`en.json`/`es.json`**: rejected per Thread 2 of exploration — multi-paragraph legal prose as JSON string values is hard to review and bloats the files the parity test (`parity.test.ts`) already covers for short UI labels.
- **Markdown files** (`.md` + a renderer): rejected — the content is fully first-party and never user-submitted, so a markdown parser buys nothing but an extra dependency and a rendering step; hand-authored typed sections give the same authoring ergonomics with type safety and zero new deps.
- **Raw JSX per locale** (a full custom component per page per locale): rejected — loses the ability to render both pages through one shared component/test, and makes it harder to keep the two locales structurally in sync (see Risks below).

Footer-level and nav-level copy (the "How it works" / "Privacy policy" link text, the footer's Wizards Fan Content Policy legend, any headings that are just short labels) stays in `en.json`/`es.json` via `t()`, per the existing convention — only the long-form page bodies move to the new content modules.

### 4. Wizards Fan Content Policy legend — exact template, MetaStack-specific fill-in

The footer legend uses Wizards' own required template (confirmed via their published Fan Content Policy), not MTGTop8's footer wording:

> "MetaStack is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC."

This string is short enough to live in `en.json`/`es.json` as an ordinary translation (it's the same length class as other footer copy, and per Wizards' policy the operative words — "unofficial," "not approved/endorsed" — shouldn't drift between locales, so keeping it in the reviewed translation-parity path is safer than a bespoke content module for one string).

### 5. Privacy policy tense discipline

The Privacy Policy content module explicitly separates what's live today (Vercel Analytics — cookieless, described in present tense) from what's planned (error tracking — "we use tools to help us find and fix errors," present-tense-but-generic since no vendor is chosen; ads — explicit future tense, "we may in the future work with an advertising partner," with a commitment that the policy will be updated when/if that happens). This avoids the page claiming capabilities (e.g. a named error-tracking vendor) that don't exist in the codebase yet.

## Risks / Trade-offs

- **[Risk]** The two locale content modules (`howItWorks.en.ts` / `.es.ts`, `privacy.en.ts` / `.es.ts`) can drift structurally (one locale gets a section the other doesn't) with nothing enforcing parity, unlike `en.json`/`es.json` which has `parity.test.ts`. → **Mitigation**: add a lightweight parity test comparing section *types* (not text) between each locale pair, analogous to the existing JSON parity test; flagged as a task.
- **[Risk]** Hiding the sidebar entirely on legal pages (rather than disabling it) means a user who deep-links to `?page=privacy&f=modern&w=5days` and then navigates back to the dashboard relies on `f`/`w` still being in the URL to restore their prior view. → **Mitigation**: since `useLegalPage`'s setter only touches the `page` param and explicitly preserves other existing params (same as `useFormatSelection`/`useWindowSelection` already do), `f`/`w` survive round-trip automatically; no extra state needed.
- **[Risk]** Vercel Analytics and error tracking aren't implemented yet, so the Privacy Policy describes intended behavior ahead of the code. If those plans change (different vendor, decision to drop ads entirely), the policy goes stale. → **Mitigation**: proposal.md flags updating this content as a follow-up whenever those capabilities actually ship; not a blocker for this change since the policy is already written in careful present/future tense.
- **[Trade-off]** No SSR means the legal pages (like the rest of the app) aren't crawlable/pre-rendered for search engines out of the box. Accepted as a non-goal; revisit only if organic discovery of the privacy policy specifically becomes a requirement.

## Migration Plan

Purely additive — no existing data, schema, or API changes. Deploys via the normal Vercel merge-to-main flow. No feature flag needed (footer and pages are new UI surface, not a behavior change to existing flows). Rollback is a normal revert.

## Open Questions

None outstanding — all four exploration threads (navigation mechanism, content storage, legal wording, DMM Studios attribution) and the shell-chrome question were resolved during `/opsx:explore` before this proposal was written.

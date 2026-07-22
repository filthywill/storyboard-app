# StoryboardFlow AI Development Guide

> Version: 2026-07-11  
> Audience: Cursor agents, ChatGPT sessions, and human engineers directing AI work  
> Authority: implementation behavior in the repository; `.cursorrules`; then this guide  
> References: [`StoryboardFlow-Engineering-Handbook.md`](./StoryboardFlow-Engineering-Handbook.md), [`StoryboardFlow-Engineering-Decisions.md`](./StoryboardFlow-Engineering-Decisions.md)

This document defines **how AI agents should contribute to StoryboardFlow**. It is not a repository audit and does not replace the Handbook or Decisions documents. Use those for architecture and intent; use this guide for day-to-day implementation discipline.

---

# 1. Project Philosophy

StoryboardFlow’s engineering philosophy can be inferred from the codebase and existing documentation. AI agents should treat these as default assumptions unless a human explicitly requests a different direction.

| Principle | What it means for AI work |
|---|---|
| **Local-first** | Browser-resident state and project-scoped snapshots are authoritative for editing. Cloud sync is additive, not blocking. Never make cloud success a prerequisite for a successful local edit. |
| **Defensive data handling** | Prefer visible conflict, validation failure, or read-only state over silent overwrite. Preserve cloud data when local data is empty, corrupt, or ambiguous. |
| **State-driven UI** | Transient auth/project states belong in `Index.tsx`, not new routes. Every state must render a meaningful recovery path. |
| **Explicit user control** | Takeover, conflict resolution, workspace choice, billing changes, and destructive actions require visible user action. |
| **Separation of concerns** | UI coordinates; stores hold state; services own external I/O and policy; utilities own orchestration and serialization; export uses explicit payloads. |
| **Additive, narrowly scoped changes** | Extend existing seams (`useAppStore`, services, gates, export contracts) instead of introducing parallel systems. |
| **Production-first safety** | Treat auth, sync, billing, export, and analytics as production-critical even when the repo lacks automated tests. |
| **Maintainability over cleverness** | Match established patterns. Avoid large refactors, speculative abstractions, and “cleanup” outside the requested scope. |
| **Graceful degradation** | Missing analytics, offline status, billing uncertainty, or cloud unavailability must not break core editing. |
| **Privacy by default** | Analytics must never capture storyboard content, filenames, dialogue, notes, or project payloads. |

When documentation and code disagree, **code is authoritative**. When `.cursorrules` and older docs disagree with current `Index.tsx`, verify the implementation before changing behavior.

---

# 2. AI Development Workflow

Use this workflow for non-trivial work. Skip steps only for trivial, isolated edits with no architectural impact.

## Phase 0 — Read before writing

1. Read the user request and identify affected subsystems.
2. Read the relevant Handbook sections and Decisions entries.
3. Read `.cursorrules` if the task touches auth, routing, sync, stores, billing, export, or styling.
4. Inspect the exact files you will modify. Do not assume filenames, counts, or wiring from memory.

## Phase 1 — Architecture review

Before coding, produce a short plan covering:

- Problem being solved
- Files likely to change
- Invariants that must be preserved
- Risk class: safe / coordinated migration / architectural redesign
- Manual QA states to verify

If the task spans multiple high-risk systems, split it into phases.

## Phase 2 — Narrow implementation

- Implement the smallest correct diff.
- Prefer extending existing services, facade actions, and typed helpers over new abstractions.
- Do not refactor adjacent code unless required for correctness.
- Do not modify unrelated files, formatting, or naming.

## Phase 3 — Verification

After implementation:

- Re-read the diff and confirm scope stayed narrow.
- Run available checks (`lint`, `build`, targeted grep/read) appropriate to the change.
- Manually reason through affected state transitions.
- Confirm no handbook/decisions invariants were violated.

## Phase 4 — Documentation and debt notes

Update docs only when:

- Behavior changed materially
- A new invariant or seam was introduced
- The Handbook or Decisions doc would now be misleading

If you discover pre-existing defects, note them as **technical debt** rather than silently expanding scope to fix them unless the user asked for that fix.

## Manual testing expectations

There is no checked-in automated test suite. For changes affecting auth, project switching, sync, billing, export, or offline behavior, perform **manual QA** using the checklists in `.cursorrules` and the Handbook verification report.

Minimum state matrix to consider:

| Area | States to verify |
|---|---|
| Auth | guest, unconfirmed, confirmed, forced logout, sign-in/out |
| Projects | no projects, picker, active project, switch, delete |
| Cloud | offline, reconnect, conflict, read-only lease, takeover |
| Billing | free limit, pro access, checkout return, portal return |
| Export | single/multi-page PDF and PNG, theme/layout parity |

---

# 3. Coding Standards

These are **observed conventions**, not aspirational rules. Match the surrounding code.

## React organization

| Pattern | Convention |
|---|---|
| Components | PascalCase filenames and component names |
| Pages | Route-level screens under `src/pages/` |
| Feature UI | Mostly flat under `src/components/` with subdirs: `ui`, `layout`, `shot-card`, `export`, `system` |
| Editor coordination | `src/pages/Index.tsx` owns app-state rendering and major side effects |
| Mutations | Prefer `useAppStore()` for coordinated editor changes |
| Async effects | Dynamic imports and `void` for fire-and-forget work are common |
| Browser APIs | Guard with `typeof window` where needed |

## Zustand usage

| Pattern | Convention |
|---|---|
| Store hooks | `useDomainStore` naming |
| Domain stores | Separate page, shot, project, UI, project-manager, auth, lease, conflict stores |
| Facade | `useAppStore()` in `src/store/index.ts` composes cross-store editor actions |
| Persistence | Most core stores use `persist`; ephemeral dialog/conflict/lease stores generally do not |
| External access | Services use `useXStore.getState()` outside React |
| Canonical model | `shotStore.shotOrder` is authoritative; page shot lists are projections |

**Do not** mutate modular stores directly from components when a facade action exists for the same operation.

## Services

| Pattern | Convention |
|---|---|
| Naming | PascalCase static classes or singleton exports |
| Location | `src/services/` for Supabase, sync, billing access, analytics, leases, themes |
| Responsibility | External I/O, policy, validation, orchestration of remote systems |
| React coupling | Services must not assume UI state or navigate users |
| Access checks | Use `CloudAccessService`, `projectOpenGate`, `ProjectService`, `WriterLeaseService`, `AnalyticsService` instead of duplicating policy |

Project lifecycle orchestration also lives in `src/utils/projectSwitcher.ts`; treat it as part of the application service layer even though it is not under `services/`.

## Hooks

| Pattern | Convention |
|---|---|
| Shared hooks | `src/hooks/` (`useNetworkStatus`, cleanup hooks, toast hook) |
| shadcn duplicate | `src/components/ui/use-toast.ts` also exists; follow local import conventions |
| New hooks | Add only when reuse is real; do not extract one-off helpers prematurely |

## Utilities

| Pattern | Convention |
|---|---|
| Naming | camelCase module names |
| Examples | `autoSave.ts`, `projectSwitcher.ts`, export helpers under `src/utils/export/` |
| Role | Serialization, debouncing, validation, reconciliation, diagnostics |
| Registration patterns | Callback registration (`registerAutoSave`) is an established pattern |

## Naming and constants

- Routes and billing constants live in `src/config/`.
- Analytics events use typed constants in `src/services/analytics/events.ts`.
- Domain errors use stable string codes where established.

## Async and error handling

| Area | Pattern |
|---|---|
| User-facing errors | Toasts or dialogs |
| Analytics | Never throw; swallow adapter failures |
| Storage | Usually wrapped in `try/catch` |
| Sync | Custom errors, conflict states, in-flight deduplication |
| Cloud save | Local-first, then optional cloud work |

## Comments

- Prefer self-explanatory code.
- Comment only non-obvious business rules, conflict semantics, or cross-module assumptions.
- Do not add narrative comments that restate obvious code.

## Styling

- Tailwind for layout/utilities.
- App chrome uses centralized glassmorphism helpers and semantic color categories.
- Storyboard appearance uses `StoryboardTheme`, separate from app chrome.
- **Do not** combine centralized inline styles with conflicting shadcn `variant` props.

## Type safety

- TypeScript strict mode is disabled in this repo.
- Do not “fix the whole project” by enabling strictness in unrelated work.
- Supabase types are handwritten and incomplete; validate critical boundaries at runtime where existing code does.

---

# 4. Safe Development Rules

## Rules AI Must Follow

| Rule | Why |
|---|---|
| **Change only what the task requires** | Prevents regressions and review noise. StoryboardFlow has many coupled subsystems. |
| **Read affected files before editing** | Naming, render order, and wiring drift from docs. |
| **Preserve local-first ordering** | Local/project-scoped persistence must succeed before cloud work depends on it. |
| **Use `useAppStore` for coordinated editor mutations** | Direct store writes can bypass autosave, analytics, and redistribution. |
| **Do not add transient auth/project routes** | `/app` state machine is intentional. New routes create 404 and dead-end risk. |
| **Do not navigate on sign-out or auth-state changes** | State updates must drive UI; `.cursorrules` forbids `/logout`-style flows. |
| **Clear project data when auth identity changes** | Use `ProjectSwitcher.clearCurrentProjectData()` on sign-out/forced logout paths. |
| **Never call `initializeAppContent()` for authenticated users** | Creates phantom project data and can corrupt real projects. |
| **Validate `currentProjectId` before saving** | Prevents cross-project writes and empty/cloud-destructive saves. |
| **Compare cloud revision before overwrite** | Use `baseCloudUpdatedAt` / atomic RPC semantics; no blind last-write-wins. |
| **Respect writer lease semantics** | Cloud writes require valid lease ownership; UI read-only is not sufficient protection. |
| **Pause autosave on unresolved conflict** | Silent overwrite during conflict is worse than paused sync. |
| **Preserve export contracts** | PDF uses server static renderer; PNG uses offscreen DOM capture; do not depend on visible page state. |
| **Do not send blob URLs to server export payloads** | Server cannot resolve browser-only blob references. |
| **Keep analytics behind `AnalyticsService`** | Preserves sanitization and no-throw behavior. |
| **Do not capture user content in analytics** | Privacy invariant; use counts, enums, and IDs only. |
| **Use logical billing plan IDs in client code** | Never trust browser-supplied Stripe price IDs or amounts. |
| **Treat Stripe webhooks as entitlement source of truth** | Success redirects alone do not prove subscription state. |
| **Keep secrets server-side** | Stripe and Supabase service-role keys belong in Edge Functions only. |
| **Preserve backwards compatibility in persisted data** | Project snapshots, export payload schema, and cloud JSON must remain loadable. |
| **Avoid drive-by refactors and dependency upgrades** | High coupling and no automated regression suite make broad changes risky. |
| **Do not create commits, PRs, or docs unless asked** | Follow user instructions precisely. |
| **Note discovered debt instead of silently fixing it** | Example: `lastModified` currently advances on some switch paths despite intended invariant. |

---

# 5. High-Risk Systems

These systems need extra caution, narrower diffs, and explicit validation.

## Writer lease

| | |
|---|---|
| **Why risky** | Cross-tab/device concurrency; DB RPC enforcement; heartbeat/takeover races |
| **Preserve** | One writer per cloud project; 30s heartbeat vs 60s lease; takeover reload; tab-scoped writer ID |
| **Validate** | Open same cloud project in two tabs; confirm read-only overlay; forced takeover; save blocked without lease |
| **Primary files** | `writerLeaseService.ts`, `writerLeaseStore.ts`, `cloudSyncService.ts`, lease migration SQL |

## Autosave

| | |
|---|---|
| **Why risky** | Global flags (`intentDepth`, batch mode, switch lock, pause) affect every editor mutation |
| **Preserve** | `beginIntent`/`endIntent`, 2s debounce, suppression during switch/conflict/batch |
| **Validate** | Multi-store edit saves once; project switch does not serialize half-updated state; conflict pauses autosave |
| **Primary files** | `autoSave.ts`, `store/index.ts`, `projectSwitcher.ts` |

## Synchronization

| | |
|---|---|
| **Why risky** | Data loss, stale overwrite, offline replay, guest migration |
| **Preserve** | Local-first save, validation, atomic RPC, revision anchor updates, timestamp tolerance on guest migration |
| **Validate** | Offline edit → reconnect; cloud-newer vs local-newer; empty/corrupt local data rejected; conflict UI |
| **Primary files** | `cloudSyncService.ts`, `projectService.ts`, `guestProjectSyncService.ts`, `cloudProjectSyncService.ts` |

## Project loading and switching

| | |
|---|---|
| **Why risky** | Multi-slice snapshots, gate checks, stale cloud refresh, store replacement |
| **Preserve** | Final save before switch; parse/validate all slices; open gate checks; atomic store apply |
| **Validate** | Switch between local/cloud projects; open blocked project shows correct modal; refresh resumes project |
| **Primary files** | `projectSwitcher.ts`, `projectOpenGate.ts`, `projectManagerStore.ts`, `Index.tsx` |

## Authentication and sessions

| | |
|---|---|
| **Why risky** | Dual session model (Supabase Auth + app `user_sessions`), forced logout, persisted auth UI state |
| **Preserve** | Sign-out clears project data and analytics identity; forced logout screen precedence; confirmed-email gating for cloud |
| **Validate** | Sign-in/out, OAuth callback, forced logout, unconfirmed banner, billing auth guard |
| **Primary files** | `authService.ts`, `authStore.ts`, `AuthCallback.tsx`, `Index.tsx`, `main.tsx` |

## Stripe billing

| | |
|---|---|
| **Why risky** | Real money, webhook timing, grandfathered prices, offer families |
| **Preserve** | Server-side plan allowlist; webhook-driven entitlement; portal/checkout return routes; fail-closed create on unknown billing state |
| **Validate** | Free limit, upgrade flow, portal open, interval change rules, no client-side price tampering |
| **Primary files** | `src/config/billing.ts`, `src/pages/billing/`, `supabase/functions/*`, `cloudAccessService.ts` |

## Export pipeline

| | |
|---|---|
| **Why risky** | Multiple render paths; server/runtime limits; WYSIWYG expectations |
| **Preserve** | PDF via `/api/export-pdf` → `/export/pdf/render-static`; PNG via offscreen React/DOM capture; explicit payload |
| **Validate** | Single/multi-page export; dynamic and fixed page sizes; images/logo/theme parity; failure messaging |
| **Primary files** | `exportManager.ts`, `serverPdfPayload.ts`, `api/export-pdf.ts`, `export-pdf-static.ts`, export modals |

## Analytics taxonomy

| | |
|---|---|
| **Why risky** | Privacy violations are irreversible; registry ≠ wired events; silent failures hide breakage |
| **Preserve** | `AnalyticsService` adapter boundary, sanitization, no autocapture, event constants, suppression during batch/switch |
| **Validate** | New event uses registry constant; properties are counts/enums only; no content/filenames/emails |
| **Primary files** | `services/analytics/*`, `store/index.ts`, tracking helper modules |

## `Index.tsx` state coordinator

| | |
|---|---|
| **Why risky** | Large side-effect surface; render precedence matters; easy to break auth/project UX |
| **Preserve** | Top-level forced logout/loading order; overlay-based welcome/picker/conflict/read-only UI |
| **Validate** | Every auth/project combination renders a valid UI; no user-facing 404 in normal flow |
| **Primary files** | `Index.tsx`, `EmptyProjectState.tsx`, `ProjectPickerModal.tsx`, related overlays |

---

# 6. Preferred Cursor Workflow

Recommended session structure for Cursor agents:

```text
1. Intake
   └─ Restate task, boundaries, and affected subsystems

2. Read
   └─ Handbook + Decisions + .cursorrules + target files

3. Plan
   └─ Small implementation plan with invariants and QA matrix

4. Implement
   └─ Minimal diff, one concern at a time

5. Verify
   └─ Lint/build as applicable; targeted reads/greps; state reasoning

6. Manual QA
   └─ Run only the flows touched by the change

7. Report
   └─ Summarize diff, risks, debt found, and recommended follow-up tests

8. Document
   └─ Update docs only if behavior or invariants changed
```

## Work splitting guidance

| If the task touches… | Prefer… |
|---|---|
| 1 high-risk system | Single focused PR/prompt |
| 2+ high-risk systems | Separate prompts per subsystem |
| Schema + client + Edge Functions | Phase 1 schema/RPC, Phase 2 client, Phase 3 functions, Phase 4 QA |
| Export + editor state | Separate rendering/payload work from store mutations |
| Billing + sync gates | Change entitlement read path first, then UI |

## Prompt hygiene for Cursor sessions

- Start with the subsystem name and user-visible goal.
- Link or name exact files when known.
- State forbidden side effects explicitly (“do not change routing”, “do not alter Stripe webhook verification”).
- Ask for a verification report at the end of non-trivial tasks.

---

# 7. Preferred Model Selection

These recommendations optimize for **capability, reliability, and cost-efficiency** on StoryboardFlow-style work: tightly coupled SPA state, sync/auth/billing invariants, and small diffs.

| Model | Prefer for | Avoid for |
|---|---|---|
| **Composer 2.5** | Everyday implementation, scoped bug fixes, multi-file edits, refactors within one subsystem, follow-up verification | Long-form architecture synthesis with no code changes |
| **GPT-5.6 Terra** | Balanced default for medium-complexity features, service/store changes, export/billing tasks requiring careful reasoning | Very large repo-wide audits when a dedicated explore pass is cheaper |
| **GPT-5.6 Sol** | Fast iteration on narrow, well-bounded tasks; small UI tweaks; quick grep-and-fix loops | Writer lease/sync/auth/billing changes with subtle invariants |
| **Claude Sonnet 5** | Architecture plans, handbook/decision docs, conflict analysis, state-matrix reasoning, verification reports | — |
| **Claude Opus (when available)** | Cross-cutting redesign proposals, complex bug root-cause analysis, multi-subsystem migration planning | Simple one-file edits where cost matters more than depth |
| **Grok 4.5** | Broad exploratory searches, alternative approach brainstorming, large-scale code reading summaries | Final implementation of high-risk sync/billing/export changes without verification |

### Practical defaults

| Task type | Recommended model |
|---|---|
| Small bug fix in one component | Composer 2.5 or GPT-5.6 Sol |
| Sync/autosave/lease/auth change | GPT-5.6 Terra or Claude Sonnet 5 |
| Billing/Edge Function work | GPT-5.6 Terra or Claude Sonnet 5 |
| Export/PDF/PNG change | GPT-5.6 Terra or Composer 2.5 |
| Documentation only | Claude Sonnet 5 |
| Pre-implementation architecture audit | Claude Sonnet 5 or Opus |
| Post-implementation verification pass | Claude Sonnet 5 or Composer 2.5 |

When in doubt, choose the **cheaper model for reading/searching** and the **more careful model for writing** in high-risk areas.

---

# 8. Prompt Design Guidelines

Good prompts reduce regressions more than model choice alone.

## Scope

- One primary outcome per prompt.
- Name allowed files or subsystems when possible.
- Explicitly forbid unrelated refactors, dependency upgrades, and doc churn.

## Success criteria

Include concrete completion conditions, for example:

- “Guest sign-out returns to welcome screen without navigation”
- “Cloud save still sends `p_expected_updated_at`”
- “PDF export still uses `/export/pdf/render-static`”
- “No new analytics properties beyond approved schema”

## Separate analysis from implementation

Use two-step prompts for risky work:

1. **Analysis prompt:** identify files, invariants, risks, and test matrix. No code changes.
2. **Implementation prompt:** execute the approved plan only.

## Required deliverables

Ask the agent to return:

- Files changed
- Behavior changed
- Invariants checked
- Manual QA performed or still required
- Known debt discovered
- Docs updated (if any)

## Verification expectations

For non-trivial tasks, require the agent to:

- Run applicable commands (`lint`, `build`, targeted tests if added later)
- Trace affected state transitions
- Confirm scope did not expand
- Call out anything that could not be verified from the repo alone

## Anti-patterns

| Bad prompt pattern | Better pattern |
|---|---|
| “Clean up the codebase” | “Extract project-open gate checks from `Index.tsx` without changing render order” |
| “Fix sync” | “Fix offline queue replay to revalidate `baseCloudUpdatedAt` before RPC save; do not change lease logic” |
| “Add analytics everywhere” | “Wire `sync_conflict_shown` at conflict dialog open using existing registry constant and sanitization” |
| “Make billing work” | “Ensure billing success page clears `CloudAccessService` cache; do not change webhook handler” |

---

# 9. Definition of Done

An AI implementation is **not complete** until these items are satisfied or explicitly deferred by the user.

## Implementation

- [ ] Requested behavior implemented
- [ ] Scope remained narrow; no unrelated edits
- [ ] Established patterns reused (`useAppStore`, services, gates, analytics adapter, export manager)
- [ ] High-risk invariants preserved (see Decisions doc)

## Verification

- [ ] Affected files re-read after editing
- [ ] `lint` and/or `build` run when relevant
- [ ] State transitions manually reasoned or tested
- [ ] Edge cases considered: offline, conflict, unauthenticated, unconfirmed, read-only lease, free-plan limits

## Manual QA

- [ ] Required user flows executed or explicitly listed for human verification
- [ ] No user-facing 404/dead-end introduced in normal auth/project/export flow
- [ ] Sign-out/sign-in behavior checked when auth/store code changed

## Analytics and privacy

- [ ] New telemetry uses `AnalyticsEvent` constants and `AnalyticsService`
- [ ] Properties sanitized; no user content or filenames
- [ ] Registry-only events not described as live telemetry

## Billing and security

- [ ] No secrets added to client bundle
- [ ] No client-trusted Stripe price IDs
- [ ] Webhook/JWT rules unchanged unless explicitly requested

## Documentation

- [ ] Handbook/Decisions updated only if behavior or invariants changed
- [ ] This AI guide updated if team workflow or model guidance changed
- [ ] Technical debt noted when discovered but out of scope

## Handoff note

Every completed task should leave a short summary:

```text
Changed:
Verified:
Manual QA:
Remaining risks:
Docs updated:
```

---

# 10. Living Document

This guide should evolve with StoryboardFlow, but less frequently than the Handbook.

## Update this guide when

- Team workflow changes (e.g., CI/tests added, new deployment process)
- A repeated AI regression reveals a missing rule
- Model recommendations change based on team experience
- A new high-risk subsystem becomes central to the product

## Update the Handbook when

- Implementation changes materially
- New services, routes, env vars, or integrations are introduced
- Verification passes reveal factual drift

## Update the Decisions doc when

- A design choice changes
- A new invariant or tradeoff becomes settled
- An inferred rationale becomes confirmed or disproved

## Do not duplicate across docs

| Document | Owns |
|---|---|
| **Handbook** | What exists now |
| **Decisions** | Why it exists and what must not break |
| **AI Development Guide** | How agents should implement and verify work |

## Suggested review cadence

| Frequency | Action |
|---|---|
| After any major auth/sync/billing/export change | Check whether invariants or QA steps need adding here |
| After incidents or data-loss scares | Add a rule and validation step |
| Quarterly | Refresh model guidance and prompt templates |
| When `.cursorrules` changes | Reconcile this guide with critical rules |

## Maintenance rule for AI agents

If you change behavior in a high-risk subsystem and the user asked for documentation updates, update the **Handbook** first, then **Decisions** if intent/invariants changed, and only then this guide if workflow or agent rules changed.

---

## Quick reference links

- Architecture and current behavior: [`StoryboardFlow-Engineering-Handbook.md`](./StoryboardFlow-Engineering-Handbook.md)
- Rationale, invariants, and risk classes: [`StoryboardFlow-Engineering-Decisions.md`](./StoryboardFlow-Engineering-Decisions.md)
- Non-negotiable implementation rules: [`../.cursorrules`](../.cursorrules)
- UI state matrix: [`architecture/UI_STATE_HANDLING.md`](./architecture/UI_STATE_HANDLING.md)
- Sync/conflict behavior: [`sync-and-data/TIMESTAMP_SYNC_IMPLEMENTATION.md`](./sync-and-data/TIMESTAMP_SYNC_IMPLEMENTATION.md)

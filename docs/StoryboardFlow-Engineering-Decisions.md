# StoryboardFlow Engineering Decisions

> Decision review date: 2026-07-11  
> Companion to: `docs/StoryboardFlow-Engineering-Handbook.md`  
> Authority: checked-in source and configuration; documentation is supporting context

## Purpose and evidence

The Engineering Handbook describes what StoryboardFlow currently implements. This document explains the architectural choices visible in that implementation: the problems they solve, the likely reasons they were selected, their costs, and how they constrain future work.

Intent is not always recoverable from code. The following labels distinguish evidence from interpretation:

- **✅ Confirmed** — directly implemented or explicitly stated in current repository guidance and consistent with code.
- **⚠️ Inference** — a conservative explanation of why the implementation was likely selected.
- **❓ Unknown** — intent or production behavior cannot be established from the repository.

Historical documents are useful evidence of intent, but the current implementation remains authoritative when they disagree.

# Architectural Principles

## 1. Local work is the primary editing path

**✅ Confirmed:** Editor mutations update browser-resident Zustand state first. Project-scoped local snapshots are written before cloud saves. Guests can edit without an account, and authenticated users can continue locally when cloud work is unavailable.

**⚠️ Inference:** Storyboard editing must remain responsive and resilient to unreliable connectivity. Treating the cloud as backup, synchronization, and multi-device transport avoids putting network latency in the interaction loop.

Implications:

- Cloud failure must not invalidate a successful local edit.
- Local persistence and recovery are product-critical, not merely caches.
- Any server-authoritative redesign would change the product's offline and guest guarantees.

## 2. User intent is more important than incidental state transitions

**✅ Confirmed:** Autosave is bracketed by `beginIntent`/`endIntent`; project switching suppresses saves; guest migration compares meaningful modification timestamps.

**⚠️ Declared intent with a current violation:** Repository rules and `ProjectSwitcher` callsites say `lastModified` should change for content mutations, not project loads or views. However, `projectManagerStore.setCurrentProject()` and `updateProjectMetadata()` currently assign a new `lastModified`, including switch paths that request `updateTimestamp: false`. Timestamp consumers must account for this defect until it is fixed.

**⚠️ Inference:** The system tries to distinguish an intentional edit from state hydration, navigation, rendering, or reconciliation so that synchronization decisions reflect user work rather than implementation activity.

## 3. Data loss prevention outranks automatic convergence

**✅ Confirmed:** Saves validate project identity and payload shape, persist locally first, use optimistic concurrency, require a writer lease for cloud-backed projects, and pause on unresolved conflict. Guest migration preserves cloud data when timestamps or payload integrity are ambiguous.

**⚠️ Inference:** The application prefers a visible conflict or stale cloud copy over silently overwriting valid work. This is why the design combines several overlapping safeguards rather than relying on last-write-wins.

## 4. Application states are state-driven, not route-driven

**✅ Confirmed:** `/app` hosts guest, authenticated, loading, project-picker, conflict, and read-only states. `Index.tsx` renders these states and overlays; routing is reserved for durable screens such as marketing, OAuth callback, recovery, billing, and legal pages.

**⚠️ Inference:** Keeping transient auth/project states out of URLs reduces invalid-route and dead-end behavior while asynchronous stores initialize.

## 5. Rendering, persistence, and external integrations are separate concerns

**✅ Confirmed:** Components generally invoke store facades or services; project serialization lives in orchestration utilities; Supabase access is concentrated in services; production PDF rendering uses a dedicated static Vite entry rather than the editor SPA.

**⚠️ Inference:** Separation makes editor rendering reusable across local/cloud contexts and prevents external-system side effects from contaminating deterministic export rendering.

## 6. Product capabilities degrade gracefully

**✅ Confirmed:** Missing analytics configuration selects a no-op adapter; offline edits remain local; unavailable cloud creation fails closed while existing cloud reads/writes may remain available; unknown routes redirect to the app; UI conflicts produce dialogs or overlays.

**⚠️ Inference:** Optional or remote capabilities should not make the core editor unusable.

## 7. User control is explicit at destructive or ambiguous boundaries

**✅ Confirmed:** The user chooses workspace mode when required, may explicitly take over a writer lease, receives project/save conflict UI, and manages payment details or cancellation through Stripe's portal.

**⚠️ Inference:** Automatic behavior is appropriate for routine saving, but ownership transfer, data replacement, workspace restrictions, and billing changes require visible user action.

## 8. Cross-cutting policy belongs behind reusable boundaries

**✅ Confirmed:** `CloudAccessService`, `projectOpenGate`, `ProjectService`, `WriterLeaseService`, `AnalyticsService`, and `ExportManager` centralize policy used from multiple UI paths.

**⚠️ Inference:** These boundaries were selected to reduce inconsistent entitlement, validation, synchronization, privacy, and export behavior across components.

# Core Application Decisions

## Decision 1: Use a state-driven SPA shell

### Problem

Authentication, cloud loading, project selection, email confirmation, forced logout, offline status, and writer ownership can change without a conventional page navigation. Representing each transient combination as a route would create invalid combinations and 404-prone transitions.

### Decision

**✅ Confirmed:** Keep durable routes in React Router, but coordinate editor state in `src/pages/Index.tsx`. Render forced logout and loading as top-level branches; render welcome, project picker, confirmation, workspace locks, conflicts, and read-only behavior in the main shell.

### Why this approach

**⚠️ Inference:** A single coordinator makes the state matrix explicit and guarantees a meaningful UI while multiple stores and services initialize.

### Tradeoffs

- `Index.tsx` has become large and side-effect-heavy.
- State ordering can drift from architecture documentation.
- Local component state and Zustand state coexist in one coordinator.
- Testing every combination requires a state-matrix approach.

### Alternatives considered

- Route per state: easier deep linking, but exposes transient or inconsistent URLs.
- Formal state machine: clearer transitions, but would require a substantial migration.
- Server-routed application: conflicts with current local-first browser ownership.

### Future evolution

- **Safe:** Extract pure selectors, state predicates, and effect-specific hooks while preserving render precedence.
- **Safe:** Add state-matrix tests around `Index.tsx`.
- **High risk:** Adding `/login`, `/logout`, or project-state routes without reconciling stores.
- **High risk:** Initializing authenticated users with guest/default project data.

**Evidence:** `src/App.tsx`, `src/pages/Index.tsx`, `src/pages/NotFound.tsx`, `.cursorrules`.

## Decision 2: Make editing local-first

### Problem

Storyboard editing involves frequent text, image, ordering, and layout mutations. Network-bound writes would add latency, make offline work impossible, and increase the impact of cloud failures.

### Decision

**✅ Confirmed:** Mutate Zustand immediately, persist project-scoped local snapshots, and then attempt cloud synchronization when enabled and authorized.

### Why this approach

**⚠️ Inference:** Immediate local mutation provides optimistic UI without maintaining a speculative server mutation layer. The same editor can support guests, offline work, and cloud-backed projects.

### Tradeoffs

- Browser storage becomes part of the durable data model.
- Global Zustand persistence and project-scoped snapshots can diverge.
- Base64 images can exhaust localStorage quota.
- Cross-device convergence requires explicit conflict handling.

### Alternatives considered

- Server-authoritative writes: simpler source of truth, worse latency and offline behavior.
- IndexedDB-only persistence: better capacity and transactions, more migration complexity.
- Event log/operation queue: stronger replay semantics, larger architectural change.

### Future evolution

- **Safe:** Add versioned snapshot schemas, stronger validation, and recovery diagnostics.
- **Safe:** Move large image payloads to IndexedDB while retaining stable project contracts.
- **High risk:** Treat local snapshots as disposable caches.
- **High risk:** Save to cloud before the local durable copy succeeds.

**Evidence:** `src/store/`, `src/utils/projectSwitcher.ts`, `src/utils/storageManager.ts`, `src/services/cloudSyncService.ts`.

## Decision 3: Organize Zustand by domain with a composition facade

### Problem

A storyboard contains normalized shots, page membership, project settings, project metadata, authentication, UI state, conflicts, and writer state. A single store makes unrelated updates tightly coupled, while fully independent stores make multi-domain operations unsafe.

### Decision

**✅ Confirmed:** Use focused Zustand stores and compose coordinated editor operations through `useAppStore()` in `src/store/index.ts`. Keep `shotStore.shotOrder` canonical and project page shot arrays as projections. Retain the legacy `storyboardStore` for compatibility.

### Why this approach

**⚠️ Inference:** Domain stores reduce render and ownership coupling; the facade provides a migration path from the legacy monolith and a place to bracket cross-store intent.

### Tradeoffs

- Zustand cannot provide a native transaction across stores.
- Services use `getState()` and can create hidden dependencies.
- Direct domain-store calls can bypass autosave and analytics.
- Legacy and modular data models coexist.

### Alternatives considered

- One monolithic store: simpler atomic updates, increasing coupling and migration cost.
- Redux Toolkit: stronger conventions and tooling, more ceremony.
- React context/reducers: insufficient for extensive external service access.
- State machine plus normalized store: clearer orchestration, higher migration cost.

### Future evolution

- **Safe:** Move all coordinated mutations behind facade commands.
- **Safe:** Add selectors and serialization tests for `shotOrder`/page reconciliation.
- **Safe:** Retire legacy exports incrementally after contract parity tests.
- **High risk:** Introduce a second canonical shot order.
- **High risk:** Mutate multiple stores directly without intent/autosave coordination.

**Evidence:** `src/store/index.ts`, `src/store/pageStore.ts`, `src/store/shotStore.ts`, `src/store/storyboardStore.ts`.

## Decision 4: Use a service layer for external systems and policy

### Problem

Components need authentication, project persistence, storage, billing access, synchronization, themes, analytics, and leases. Direct API calls from components would duplicate policy and make behavior inconsistent.

### Decision

**✅ Confirmed:** Place external-system access and reusable business rules in focused services. Services may read/write Zustand through `getState()` where they must coordinate outside React.

### Why this approach

**⚠️ Inference:** Static services provide simple imperative boundaries for browser APIs and Supabase without requiring dependency injection throughout an existing SPA.

### Tradeoffs

- Static mutable state complicates isolation and testing.
- Store access from services creates implicit coupling.
- Some orchestration remains duplicated among `Index.tsx`, `ProjectSwitcher`, and services.
- UI policy can leak into toast-producing services.

### Alternatives considered

- Repository/use-case interfaces with dependency injection: more testable, more refactoring.
- React Query for all server state: useful for queries, less suited to local-first project snapshots and imperative lease state.
- Direct component API calls: less code initially, inconsistent policy.

### Future evolution

- **Safe:** Add interfaces around Supabase and clock/network dependencies.
- **Safe:** Split large services by use case while preserving public contracts.
- **High risk:** Bypass `ProjectService` validation or `CloudAccessService` gates.
- **High risk:** Allow services to navigate or decide component rendering.

**Evidence:** `src/services/`, `src/utils/projectSwitcher.ts`.

## Decision 5: Model autosave around completed intents

### Problem

A single user action can mutate several stores. Saving on every low-level mutation creates redundant writes and can serialize half-completed state; never saving automatically risks lost work.

### Decision

**✅ Confirmed:** Bracket coordinated operations with `beginIntent`/`endIntent`, defer changes during nested intents and batch mode, then trigger a two-second debounced save. Provide immediate save for critical operations. Suppress saving while project switching or while a conflict has paused saves.

### Why this approach

**⚠️ Inference:** Intent boundaries approximate a transaction across independent Zustand stores and create one meaningful autosave/analytics unit per user operation.

### Tradeoffs

- Correctness depends on every mutation path honoring the protocol.
- Module-level flags are implicit global state.
- A crash inside an unmatched intent can defer saving.
- Debounce behavior can be difficult to test.

### Alternatives considered

- Subscribe to all stores and diff state: catches direct mutations but may save intermediate reconciliation state.
- Explicit command bus: stronger semantics, larger rewrite.
- Fixed-interval snapshots: simpler, less responsive and less intentional.

### Future evolution

- **Safe:** Add timeout/assertion diagnostics for unbalanced intents.
- **Safe:** Make facade commands return a unified mutation result and save reason.
- **High risk:** Trigger cloud save from individual store setters.
- **High risk:** Remove project-switch and conflict suppression.

**Evidence:** `src/utils/autoSave.ts`, `src/store/index.ts`, `src/pages/Index.tsx`.

## Decision 6: Load and switch projects through validated project-scoped snapshots

### Problem

The editor's live Zustand state represents one project, but users can own many projects and can switch while unsaved work, cloud refreshes, or corrupt browser data exist.

### Decision

**✅ Confirmed:** Before switching, finalize the current project save; optionally refresh cloud-backed data when stale; parse and validate the destination's page, shot, project, and UI snapshots; then apply stores and current-project metadata as a coordinated operation.

### Why this approach

**⚠️ Inference:** A project-scoped snapshot is a stable interchange boundary between live stores, project switching, recovery, and cloud downloads.

### Tradeoffs

- Serialization logic must evolve with every persisted field.
- Applying several stores is only operationally atomic.
- Snapshot duplication increases storage usage.
- Exact cloud timestamp comparison can force refreshes.
- `projectManagerStore` currently advances `lastModified` during project selection/metadata updates, contradicting the intended “viewing is not editing” rule.

### Alternatives considered

- Keep every project live in Zustand: high memory and persistence complexity.
- Fetch every open from cloud: loses offline/guest operation.
- Database per project in IndexedDB: stronger transactions, larger migration.

### Future evolution

- **Safe:** Add explicit snapshot versioning and migrations.
- **Safe:** Centralize serialization/deserialization in one tested contract.
- **Safe:** Correct switch-only metadata updates so `lastModified` advances only for user data changes, then add regression coverage.
- **High risk:** Update `currentProjectId` before destination validation succeeds.
- **High risk:** Update `lastModified` merely because a project was opened.

**Evidence:** `src/utils/projectSwitcher.ts`, `src/services/cloudProjectSyncService.ts`, `src/store/projectManagerStore.ts`.

# Data, Access, and Synchronization Decisions

## Decision 7: Synchronize with optimistic concurrency and timestamp revisions

### Problem

Local-first copies can be edited from multiple devices or after offline periods. Blind last-write-wins saves can silently destroy newer cloud work.

### Decision

**✅ Confirmed:** Cache `project_data.updated_at` as `baseCloudUpdatedAt`; send it to `save_project_if_unchanged`; update the anchor only after success. On mismatch, retry only where safe or pause cloud autosave and expose conflict resolution. Guest migration separately compares local and cloud modification timestamps with a five-second tolerance and validates payload integrity.

### Why this approach

**⚠️ Inference:** Timestamp revisions reuse an existing database field and are simpler to deploy than content hashes or operation logs while still preventing silent overwrite.

### Tradeoffs

- Timestamp precision and equality semantics differ across flows.
- A timestamp identifies change order, not content identity.
- Clock skew matters for client-originated guest timestamps.
- Conflict resolution is project-level rather than field-level.

### Alternatives considered

- Last-write-wins: simpler, unacceptable silent data loss.
- Monotonic integer revision: clearer equality, requires schema and RPC changes.
- Content hash: detects identity, not ordering or mergeability.
- CRDT/OT: enables collaboration, far more complex for images and layout.

### Future evolution

- **Safe:** Add a server-generated integer revision alongside timestamps.
- **Safe:** Persist conflict diagnostics and test equal/precision edge cases.
- **High risk:** Save without `p_expected_updated_at`.
- **High risk:** Reuse guest clock-skew logic as a substitute for atomic save concurrency.

**Evidence:** `src/services/cloudSyncService.ts`, `src/services/projectService.ts`, `src/services/guestProjectSyncService.ts`, `supabase/migrations/20260209_add_writer_leases.sql`.

## Decision 8: Enforce one writer per cloud project

### Problem

Optimistic concurrency detects a collision only at save time. Two actively editing tabs can accumulate divergent work and repeatedly conflict.

### Decision

**✅ Confirmed:** Give each tab an ephemeral UUID. Claim a 60-second database lease, renew every 30 seconds, validate the writer in the atomic save RPC, and show non-holders a read-only overlay. Allow explicit forced takeover and notify same-browser tabs through `BroadcastChannel`.

### Why this approach

**⚠️ Inference:** A renewable lease prevents most concurrent editing before divergence while avoiding the complexity of real-time collaborative editing.

### Tradeoffs

- Heartbeat/network races can temporarily misclassify ownership.
- Users can be unexpectedly read-only.
- Takeover requires a cloud reload to avoid writing stale local state.
- `beforeunload` release is best effort; expiry remains essential.

### Alternatives considered

- Optimistic concurrency only: fewer moving parts, worse conflict experience.
- Permanent lock: simpler, vulnerable to abandoned locks.
- Presence without enforcement: informative but does not prevent overwrite.
- CRDT/OT collaboration: richer behavior, different data and UI architecture.

### Future evolution

- **Safe:** Improve holder/device labels and lease telemetry without weakening RPC enforcement.
- **Safe:** Tune duration only with multi-tab, sleep/wake, and poor-network tests.
- **High risk:** Treat the UI overlay as the only enforcement point.
- **High risk:** Force takeover without refreshing the latest cloud revision.
- **High risk:** Persist writer IDs across tabs.

**Evidence:** `src/services/writerLeaseService.ts`, `src/store/writerLeaseStore.ts`, `src/utils/writerTabId.ts`, `supabase/migrations/20260209_add_writer_leases.sql`.

## Decision 9: Separate project-data replay from image background sync

### Problem

Project JSON saves and binary image uploads have different payloads, durability needs, and failure modes.

### Decision

**✅ Confirmed:** `CloudSyncService` maintains an in-memory project-data queue for temporary offline/paused saves. `BackgroundSyncService` separately persists image tasks and deleted-shot markers in localStorage and resumes them on reconnect.

### Why this approach

**⚠️ Inference:** Binary uploads need durable, independently retryable tasks; project data already has a durable local snapshot and can often be reconstructed from current state.

### Tradeoffs

- The two queues can advance independently.
- Project replay intent is lost on refresh even though local project data survives.
- Reconciliation between uploaded objects and project JSON is complex.

### Alternatives considered

- One durable operation queue: stronger ordering, requires idempotency and migration design.
- Service worker background sync: better lifecycle, inconsistent browser support and more deployment complexity.
- Immediate upload only: no offline image support.

### Future evolution

- **Safe:** Persist project save intents with project ID, revision anchor, and idempotency key.
- **Safe:** Document ordering between image completion and JSON save.
- **High risk:** Assume `CloudSyncService.offlineQueue` survives refresh.
- **High risk:** Replay stale project JSON without current revision validation.

**Evidence:** `src/services/cloudSyncService.ts`, `src/services/backgroundSyncService.ts`, `src/components/OfflineBanner.tsx`.

## Decision 10: Gate project opening through workspace and entitlement policy

### Problem

Free users may have both local and cloud projects but are limited in cloud creation. Components need a consistent answer about which project can be opened and what recovery action to show.

### Decision

**✅ Confirmed:** `CloudAccessService` derives plan and cloud permissions, caches them for 30 seconds, and fails closed for new cloud creation on unknown billing state. `projectOpenGate` combines entitlement, project kind, project inventory, and per-user workspace mode into typed allow/block results.

### Why this approach

**⚠️ Inference:** Typed gates separate commercial policy from project-loading mechanics and let multiple entry points present the same workspace-choice or upgrade UI.

### Tradeoffs

- Cached client state can be stale.
- Some policy depends on local project metadata.
- The workspace rule is more complex than a simple project-count limit.
- Client checks still require database authorization as final protection.

### Alternatives considered

- UI-only gating: easy to bypass and inconsistent.
- Server check on every interaction: authoritative but adds latency and offline problems.
- No workspace modes: simpler product, different free-plan behavior.

### Future evolution

- **Safe:** Add typed reasons and UI recovery actions through the existing gate.
- **Safe:** Invalidate access cache after webhook-confirmed or user-triggered billing refresh.
- **High risk:** Duplicate plan limits in components.
- **High risk:** Interpret cached entitlement as database authorization.

**Evidence:** `src/services/cloudAccessService.ts`, `src/services/projectOpenGate.ts`, `src/services/workspaceModeService.ts`, `src/utils/projectCreationGate.ts`.

## Decision 11: Support guest mode as a first-class local workspace

### Problem

Requiring an account before editing creates onboarding friction and makes the editor dependent on authentication and cloud availability.

### Decision

**✅ Confirmed:** Unauthenticated users can initialize local editor content, create local projects, autosave to browser storage, and later sign in. Authenticated initialization must not create default guest content. Guest migration validates local data and timestamps before cloud upload.

### Why this approach

**⚠️ Inference:** Immediate product trial improves activation while local-first persistence makes guest work technically feasible.

### Tradeoffs

- Guest data is bound to one browser profile.
- Sign-in creates a complex migration/reconciliation boundary.
- Clearing auth/project state can expose or hide local projects unexpectedly.
- Browser storage loss has no remote recovery.

### Alternatives considered

- Account required: simpler ownership, higher onboarding friction.
- Anonymous Supabase users: cloud recovery, additional identity/cleanup complexity.
- Temporary server sessions: backend cost and expiration semantics.

### Future evolution

- **Safe:** Make migration status and recovery options explicit.
- **Safe:** Preserve local projects unless a deliberate migration succeeds.
- **High risk:** Call `initializeAppContent()` for authenticated users.
- **High risk:** Upload guest data without timestamp and corruption checks.

**Evidence:** `src/pages/Index.tsx`, `src/services/guestProjectSyncService.ts`, `src/services/localProjectRecoveryService.ts`, `src/utils/projectSwitcher.ts`.

# Identity and Platform Decisions

## Decision 12: Use Supabase Auth plus application-level session records

### Problem

The product needs email/password, Google OAuth, recovery, persistent JWT sessions, and a product-specific forced-logout experience when another session becomes active.

### Decision

**✅ Confirmed:** Use Supabase Auth for identity and tokens. Maintain `user_sessions` records, polling/Realtime observation, and broadcast behavior for application-level single-device enforcement. Keep auth state in persisted Zustand and let `Index.tsx` render logout/confirmation states.

### Why this approach

**⚠️ Inference:** Supabase removes the need to build credential and OAuth infrastructure, while application session rows add product policy not provided by the basic client session alone.

### Tradeoffs

- Two session concepts must remain consistent.
- Persisted auth UI state can outlive a valid JWT.
- Realtime/RLS behavior is not reproducible from checked-in migrations.
- OAuth callback currently crosses private `AuthService` APIs.

### Alternatives considered

- Supabase sessions only: simpler, no application-level single-device policy.
- Server-managed cookies: stronger server route protection, larger SPA/backend change.
- Third-party auth platform: different operational and migration costs.

### Future evolution

- **Safe:** Expose a public session-establishment method from `AuthService`.
- **Safe:** Derive protected-route decisions from a fresh Supabase session.
- **High risk:** Clear auth without clearing active project data and analytics identity.
- **High risk:** Navigate to transient login/logout routes instead of updating state.

**Evidence:** `src/services/authService.ts`, `src/store/authStore.ts`, `src/pages/AuthCallback.tsx`, `src/pages/Index.tsx`.

## Decision 13: Use Supabase as the integrated cloud backend

### Problem

Cloud projects require relational metadata, JSON project documents, authentication, file storage, Realtime session signals, atomic server-side checks, and server-side billing helpers.

### Decision

**✅ Confirmed:** Use one Supabase project for Auth, Postgres tables, `project-images` Storage, Realtime session observation, security-definer RPCs, and Deno Edge Functions.

### Why this approach

**⚠️ Inference:** A single managed platform minimizes custom backend infrastructure and allows client-direct data access while retaining atomic database operations for critical saves.

### Tradeoffs

- Correctness depends heavily on RLS and schema not fully checked into the repository.
- Handwritten database types are incomplete.
- Client-direct queries distribute data-access logic.
- Platform migration would span identity, database, storage, Realtime, and functions.

### Alternatives considered

- Custom API/backend: centralized authorization and contracts, higher operational burden.
- Firebase: strong client platform, less natural relational/RPC model.
- Separate vendors per capability: flexibility, more integration boundaries.

### Future evolution

- **Safe:** Check in complete schema/RLS/Storage/Realtime definitions and generate types.
- **Safe:** Move critical multi-step operations into versioned RPCs or server functions.
- **High risk:** Assume inferred production RLS exists.
- **High risk:** Expose service-role credentials to Vite/browser code.

**Evidence:** `src/lib/supabase.ts`, `src/services/projectService.ts`, `src/services/storageService.ts`, `supabase/`.

## Decision 14: Keep project content as a JSON document with relational metadata

### Problem

Storyboard pages, normalized shots, ordering, layout, themes, and transforms evolve together and are commonly loaded/saved as one project unit, while project lists and ownership need efficient relational queries.

### Decision

**✅ Confirmed:** Store project metadata in `projects`, project payloads in `project_data` JSONB, and image metadata separately in `project_images`. Save the document atomically through an RPC.

### Why this approach

**⚠️ Inference:** Document storage matches whole-project local snapshots and simplifies schema evolution for nested editor state, while relational metadata supports lists, ownership, deletion, and billing counts.

### Tradeoffs

- Field-level querying and merging are limited.
- The whole document participates in conflicts.
- Runtime validation must compensate for flexible JSON.
- Large payloads and embedded images are expensive.

### Alternatives considered

- Fully normalized pages/shots: better queries and partial writes, much more synchronization complexity.
- Opaque object storage document: simpler payload storage, weaker transactions/querying.
- Event sourcing: strong history, major replay and migration burden.

### Future evolution

- **Safe:** Version the JSON contract and migrate at load boundaries.
- **Safe:** Keep large binary data out of JSON while retaining references.
- **High risk:** Add a persisted field to only one of local, cloud, validation, or export contracts.
- **High risk:** Permit empty/partial document saves over valid cloud content.

**Evidence:** `src/services/projectService.ts`, `src/services/storageService.ts`, `src/utils/projectSwitcher.ts`, `supabase/migrations/20260209_add_writer_leases.sql`.

## Decision 15: Run privileged integration logic in Supabase Edge Functions

### Problem

Stripe secrets, webhook verification, service-role writes, and customer/subscription mutations cannot safely run in the browser.

### Decision

**✅ Confirmed:** Implement Checkout, Portal, interval change, and webhook handlers as four Supabase Edge Functions. Require user JWTs on customer-initiated functions; disable Supabase JWT verification for Stripe webhooks and verify Stripe signatures instead.

### Why this approach

**⚠️ Inference:** Co-locating functions with Supabase simplifies authenticated user lookup and administrative billing-table writes without adding a second backend deployment.

### Tradeoffs

- Deno runtime and deployment are separate from the Vite/Vercel build.
- Shared billing logic can drift across functions.
- Deployment scripts and production configuration are not checked in.
- Hardcoded price mappings couple code releases to Stripe catalog changes.

### Alternatives considered

- Vercel functions for all billing: one deployment platform, separate Supabase auth/service wiring.
- Direct browser Stripe calls: cannot protect secrets or service-role operations.
- Dedicated billing service: stronger isolation, more infrastructure.

### Future evolution

- **Safe:** Extract shared plan/customer/subscription helpers used by all functions.
- **Safe:** Add idempotency and structured logs around webhook processing.
- **High risk:** Enable webhook JWT verification instead of Stripe signature verification.
- **High risk:** Accept arbitrary browser-supplied Stripe price IDs.

**Evidence:** `supabase/config.toml`, `supabase/functions/`.

# Commercial Decisions

## Decision 16: Model billing as entitlement, not editor ownership

### Problem

The core local editor must remain useful for free and guest users while cloud project creation funds the hosted service.

### Decision

**✅ Confirmed:** Derive Pro from `billing_subscriptions.status` (`active` or `trialing`). Allow authenticated users to read/write existing cloud projects; gate creation for Free at one cloud project; keep local projects available. Use logical plan IDs in the client.

### Why this approach

**⚠️ Inference:** Gating cloud capacity preserves a functional free editor and avoids holding existing user data hostage after downgrade or billing uncertainty.

### Tradeoffs

- Local/cloud workspace policy is more complicated than a universal feature lock.
- Entitlement updates can lag behind Stripe webhooks and a 30-second cache.
- Project-count enforcement must agree between client and database.

### Alternatives considered

- Gate exports or editor features: simpler monetization, reduces free product value.
- Read-only existing projects after downgrade: stronger pressure, poor data-access experience.
- Usage-based billing: more metering and customer complexity.

### Future evolution

- **Safe:** Add new entitlement fields through `CloudAccessService` and typed gates.
- **Safe:** Preserve access to existing user data when changing limits.
- **High risk:** Scatter plan checks through components.
- **High risk:** Treat marketing page/shot limits as enforced without matching runtime policy.

**Evidence:** `src/config/billing.ts`, `src/services/cloudAccessService.ts`, `src/utils/projectCreationGate.ts`, `src/pages/billing/`.

## Decision 17: Use Stripe-hosted Checkout for subscription acquisition

### Problem

Starting a subscription requires secure payment collection, tax/payment-method handling, customer creation, promotions, and redirect outcomes.

### Decision

**✅ Confirmed:** Send a logical plan ID to `create-checkout-session`; map it to an allowlisted Stripe price server-side; create/reuse a Stripe customer; redirect to hosted Checkout; return to protected success/canceled routes; synchronize entitlement through webhooks.

### Why this approach

**⚠️ Inference:** Hosted Checkout minimizes PCI-sensitive UI and lets Stripe own payment UX while keeping allowed products under server control.

### Tradeoffs

- Users leave the application for payment.
- Return-page success is not itself proof of entitlement.
- Price IDs are currently embedded in Edge Function code and labeled as test values.
- Webhook delay can produce temporary stale UI.

### Alternatives considered

- Payment Element: more integrated UX, more frontend/payment-state complexity.
- Payment Links: simplest, less control over user/customer mapping.
- Direct subscription API from browser: insecure.

### Future evolution

- **Safe:** Move environment-specific price mapping to validated server configuration.
- **Safe:** Poll/refetch entitlement after returning while retaining webhook authority.
- **High risk:** Grant Pro solely from the success redirect.
- **High risk:** Trust amount or price ID supplied by the browser.

**Evidence:** `src/config/billing.ts`, `src/pages/billing/`, `supabase/functions/create-checkout-session/`, `supabase/functions/stripe-webhook/`.

## Decision 18: Delegate account management to Stripe Customer Portal

### Problem

Payment-method updates, cancellation, invoices, and customer billing details are security-sensitive flows with many edge cases.

### Decision

**✅ Confirmed:** Create authenticated Stripe Portal sessions for general management, payment method, or cancellation flows, then return users to `/billing`. Keep interval-change behavior in a separate controlled function.

### Why this approach

**⚠️ Inference:** Stripe Portal reduces custom billing UI and keeps sensitive account operations within Stripe's maintained experience.

### Tradeoffs

- Portal configuration is external to the repository.
- The visual flow leaves the app.
- Not every plan transition fits generic Portal behavior.

### Alternatives considered

- Fully custom billing management: maximum control, high compliance and edge-case burden.
- Portal-only plan changes: simpler, may not support desired proration/scheduling policy.

### Future evolution

- **Safe:** Add portal modes through a strict server-side allowlist.
- **Safe:** Document external Portal configuration as deployment state.
- **High risk:** Perform payment-method or cancellation changes from the browser with secret API access.

**Evidence:** `src/pages/billing/BillingPage.tsx`, `supabase/functions/create-portal-session/`.

## Decision 19: Encode subscription interval changes as explicit server policy

### Problem

Monthly-to-annual and annual-to-monthly changes have different proration and customer-expectation semantics; founding and standard offers should not be crossed accidentally.

### Decision

**✅ Confirmed:** Use `change-subscription` to apply monthly-to-annual immediately with proration/invoicing, schedule annual-to-monthly at period end, and block cross-offer-family changes. Let webhooks update local entitlement records.

### Why this approach

**⚠️ Inference:** Explicit directional policy avoids surprising immediate downgrades and protects grandfathered/founding pricing.

### Tradeoffs

- Policy is coupled to current plan taxonomy and price maps.
- Scheduled Stripe state can be more complex than the local subscription row.
- UI must explain immediate versus deferred changes.

### Alternatives considered

- Let Stripe Portal decide all changes: less code, less product-specific control.
- Always prorate immediately: simpler, potentially surprising downgrades.
- Cancel/re-subscribe: poor continuity and promotion handling.

### Future evolution

- **Safe:** Add transition-matrix tests and explicit pending-change fields.
- **High risk:** Infer offer family only from display price.
- **High risk:** Update entitlement optimistically before Stripe/webhook confirmation.

**Evidence:** `src/components/ChangeBillingIntervalDialog.tsx`, `supabase/functions/change-subscription/`, `supabase/functions/stripe-webhook/`.

# Export Decisions

## Decision 20: Give export a stable data contract separate from live UI state

### Problem

Exports must include selected pages, layout, theme, images, fonts, and project metadata consistently even though the editor uses modular stores and legacy export code still exists.

### Decision

**✅ Confirmed:** Build an export-compatible storyboard payload from modular stores; select current/all/range pages in export modals; route PDF and PNG through `ExportManager`; render offscreen rather than depending on the currently visible page.

### Why this approach

**⚠️ Inference:** A stable export contract decouples output generation from viewport state and provides a compatibility bridge during the store migration.

### Tradeoffs

- Legacy and modular models can drift.
- Multiple render implementations increase maintenance.
- Every new persisted visual field must cross the export boundary.

### Alternatives considered

- Print the visible editor DOM: simple, dependent on viewport and active page.
- Export directly from stores in each format: less shared code, inconsistent output.
- Server-only export for all formats: consistent runtime, higher latency/cost.

### Future evolution

- **Safe:** Define and test one versioned normalized export schema.
- **Safe:** Share layout primitives between editor, PDF, and PNG.
- **High risk:** Read only the active rendered page for multi-page exports.
- **High risk:** Remove legacy compatibility before proving output parity.

**Evidence:** `src/components/PDFExportModal.tsx`, `src/components/PNGExportModal.tsx`, `src/utils/export/exportManager.ts`, `src/utils/types/exportTypes.ts`.

## Decision 21: Render production PDFs in a minimal server-controlled browser

### Problem

Browser-generated PDFs vary by environment, while the full SPA introduces authentication, synchronization, routing, and live-store side effects that are irrelevant and potentially nondeterministic during export.

### Decision

**✅ Confirmed:** POST a serialized payload to the Vercel `/api/export-pdf` function. Launch headless Chromium, navigate to `/export/pdf/render-static`, inject the payload into a dedicated static Vite entry, wait for readiness/fonts/final paint, print each page, and merge PDFs with `pdf-lib`.

### Why this approach

**⚠️ Inference:** Chromium provides browser-faithful CSS rendering, while the minimal static entry makes server rendering deterministic and avoids booting the product application.

### Tradeoffs

- Chromium cold starts and a 60-second function limit constrain scale.
- Payloads containing images can be large.
- Static renderer styles can drift from the editor.
- PDF generation consumes server CPU and memory.

### Alternatives considered

- Client `jsPDF`/canvas: lower server cost, harder visual parity.
- Full SPA in Chromium: reuses routes, adds auth/sync side effects.
- Dedicated PDF layout engine: deterministic, substantial styling duplication.
- Screenshot-to-PDF: simpler, poor text/vector quality.

### Future evolution

- **Safe:** Add contract snapshots, renderer versioning, timing telemetry, and image optimization.
- **Safe:** Cache Chromium/runtime assets without caching user payloads.
- **High risk:** Point production API at `/export/pdf/render` or the full SPA.
- **High risk:** Remove readiness/font waits without visual regression tests.

**Evidence:** `api/export-pdf.ts`, `export-pdf-static.html`, `src/export-pdf-static.ts`, `vercel.json`, `vite.config.ts`.

## Decision 22: Generate PNG exports client-side with layered fallbacks

### Problem

PNG export needs direct file/directory/ZIP delivery, should avoid server cost, and must capture layouts that may not currently be visible.

### Decision

**✅ Confirmed:** Mount export content in an offscreen React surface, wait for layout/images, capture DOM to canvas, and save one PNG, a directory, or ZIP. Retain legacy canvas/data-transformation rendering as a fallback.

### Why this approach

**⚠️ Inference:** Browser-side capture gives fast, private output and access to browser file APIs; offscreen rendering preserves fidelity without changing editor navigation.

### Tradeoffs

- DOM/canvas capture is sensitive to CORS, fonts, memory, and browser differences.
- Large/multi-page exports can block the main thread.
- Fallback paths can render differently.
- File System Access API support varies.

### Alternatives considered

- Server-side PNG: consistent environment, added upload/compute latency and privacy surface.
- Visible-DOM capture: simpler, cannot reliably export all pages.
- Pure canvas renderer: performant but duplicates CSS layout.

### Future evolution

- **Safe:** Add browser coverage and pixel-diff fixtures.
- **Safe:** Move image processing to workers where contracts permit.
- **High risk:** Remove fallback before testing unsupported browsers and image failure cases.
- **High risk:** Assume blob URLs are portable to the server PDF process.

**Evidence:** `src/utils/export/exportManager.ts`, `src/utils/export/domCapture.ts`, `src/components/export/`.

# Observability Decisions

## Decision 23: Make analytics optional, private, and non-blocking

### Problem

Product analytics is useful for activation and feature decisions, but storyboard content can contain sensitive creative material and analytics failures must never break editing.

### Decision

**✅ Confirmed:** Put analytics behind `AnalyticsAdapter`; select PostHog only when enabled and keyed, otherwise use `NoopAdapter`; sanitize properties at every service boundary; disable PostHog autocapture and automatic page views; swallow adapter errors.

### Why this approach

**⚠️ Inference:** Explicit events and property filtering minimize accidental collection of user content while preserving the ability to replace or disable the provider.

### Tradeoffs

- Silent failures reduce operational visibility into analytics health.
- Blocklist sanitization can miss novel sensitive keys.
- Disabled autocapture requires deliberate event maintenance.
- Separate development telemetry can confuse event ownership.

### Alternatives considered

- Direct PostHog calls: less abstraction, tighter vendor coupling and privacy risk.
- Autocapture: broader data, less controlled semantics and potentially sensitive UI text.
- Server-side analytics: stronger control, misses local-only/guest actions without a transport.

### Future evolution

- **Safe:** Add allowlisted schemas per event and development validation.
- **Safe:** Add adapter-health diagnostics that never include user content.
- **High risk:** Capture captions, dialogue, notes, project names, filenames, images, or serialized project data.
- **High risk:** Let analytics exceptions propagate into product actions.

**Evidence:** `src/services/analytics/AnalyticsService.ts`, `src/services/analytics/privacy.ts`, `src/services/analytics/PostHogAdapter.ts`, `src/services/analytics/NoopAdapter.ts`.

## Decision 24: Use a typed, intent-oriented PostHog taxonomy

### Problem

Low-level UI events are noisy and unstable. Product analysis needs stable concepts such as project creation, completed editor actions, configuration changes, activation, and export completion.

### Decision

**✅ Confirmed:** Define event names in a typed registry and emit through domain tracking helpers. Editor events are captured after completed intents and suppressed during batch/switch/pause states. Shared properties describe workspace mode, guest status, and aggregate counts rather than content.

The repository declares 72 registry event strings; 33 have confirmed PostHog capture callsites, including `$pageview`.

### Why this approach

**⚠️ Inference:** Intent-oriented events remain meaningful as components change and align autosave, product behavior, and analytics around the same user action.

### Tradeoffs

- Registry presence can be mistaken for runtime instrumentation.
- Billing, sync, and reliability events are mostly unwired.
- In-memory deduplication resets between sessions.
- Event schemas are conventions rather than runtime-enforced contracts.

### Alternatives considered

- Raw component/click events: easy coverage, weak product semantics.
- Fully generated event schemas: stronger governance, more tooling.
- PostHog autocapture: broad but privacy-incompatible with current philosophy.

### Future evolution

- **Safe:** Require every registry addition to include a callsite, property schema, and owner.
- **Safe:** Wire sync/billing/reliability events through privacy-reviewed helpers.
- **High risk:** Rename events without migration/dashboard impact review.
- **High risk:** Include raw user-generated content for debugging.

**Evidence:** `src/services/analytics/events.ts`, `src/services/analytics/editorTracking.ts`, `src/services/analytics/configTracking.ts`, `src/services/analytics/activationTracking.ts`, `src/services/analytics/workspaceTracking.ts`.

# Deployment Decisions

## Decision 25: Split static SPA, PDF compute, and Supabase integrations by runtime

### Problem

The browser editor is a static SPA, PDF generation needs Node-compatible Chromium and longer compute, and billing integrations need secret-bearing server functions close to Supabase.

### Decision

**✅ Confirmed:** Deploy the Vite SPA and `/api/export-pdf` on Vercel; use a second static export entry reached by rewrite; deploy Auth/Postgres/Storage/Realtime/RPC and Stripe Edge Functions on Supabase; use Stripe and PostHog as managed external systems.

### Why this approach

**⚠️ Inference:** Each workload runs where its required capabilities already exist: static delivery and Chromium on Vercel, data/auth/service-role access on Supabase, and payment/analytics concerns in specialist platforms.

### Tradeoffs

- Two application deployment surfaces plus external configuration must remain compatible.
- Environment variables and release ordering are not centrally documented.
- Browser-to-Supabase and browser-to-Vercel failures have different diagnostics.
- Production configuration cannot be reconstructed fully from the repository.

### Alternatives considered

- Put all server work on Vercel: one deploy, more Supabase authorization plumbing.
- Put PDF on Supabase Edge: runtime incompatibility with current Chromium stack.
- Custom unified backend: simpler topology conceptually, higher operations burden.

### Future evolution

- **Safe:** Add a deployment runbook, environment validation, and coordinated smoke tests.
- **Safe:** Version browser/export/function contracts for independent rollout.
- **High risk:** Deploy schema/RPC changes independently of clients that require them.
- **High risk:** Rewrite `/api/*` or `/export/pdf/render-static` into the SPA fallback.

**Evidence:** `vercel.json`, `vite.config.ts`, `api/export-pdf.ts`, `supabase/config.toml`, `supabase/functions/`.

## Decision 26: Centralize visual semantics while separating storyboard themes

### Problem

Application chrome needs consistent glassmorphism colors, while exported storyboard appearance is user-configurable and must remain independent from controls, modals, and inputs.

### Decision

**✅ Confirmed:** Use semantic color categories and glassmorphism helpers for application UI; keep `StoryboardTheme` as a separate model used by storyboard/editor/export rendering; avoid combining centralized inline styles with conflicting shadcn variants.

### Why this approach

**⚠️ Inference:** Semantic separation lets button, container, input, and storyboard appearance evolve without unintended cascading changes.

### Tradeoffs

- Inline style helpers and Tailwind/shadcn classes can still conflict.
- Export renderers must reproduce theme semantics.
- Historical styling paths remain in the repository.

### Alternatives considered

- Tailwind classes only: simpler tooling, harder runtime theme values.
- One universal color category: less structure, high accidental coupling.
- CSS-in-JS theme provider: stronger composition, broad migration.

### Future evolution

- **Safe:** Add semantic categories and shared rendering tokens.
- **High risk:** Reuse container colors for interactive controls.
- **High risk:** Change storyboard theme fields without updating both export paths.

**Evidence:** `src/styles/glassmorphism-styles.ts`, `src/styles/storyboard-theme.ts`, `src/services/themeService.ts`, `.cursorrules`.

# Architectural Invariants

These invariants describe assumptions embedded across multiple modules. Violating one usually requires a coordinated migration, not a local edit.

## State and routing invariants

1. `/app` remains capable of rendering every normal auth/project state without navigating to transient routes.
2. Forced logout and loading precedence must remain deterministic.
3. Every state must render a meaningful recovery path; normal transitions must not expose a user-facing 404.
4. Auth state, current project identity, live editor stores, and project list must be cleared or established coherently.
5. Authenticated users must not receive guest/default project initialization.

## Local persistence invariants

6. A successful editor mutation reaches local durable state before cloud success is required.
7. Project-scoped snapshots represent one project only and must be validated before replacing live stores.
8. `shotStore.shotOrder` is the canonical global shot sequence; page shot arrays are projections.
9. Loading, viewing, or switching projects must not advance user-modification timestamps. **Known violation:** current `projectManagerStore.setCurrentProject()` / `updateProjectMetadata()` behavior advances `lastModified`; treat this as debt, not a new precedent.
10. New persisted fields must be added to live state, snapshot serialization, validation, cloud contracts, migration logic, and exports together.

## Autosave invariants

11. Cross-store user operations complete as one intent before autosave runs.
12. Batch operations and project switching suppress intermediate saves.
13. Unresolved cloud conflicts pause automatic cloud saving.
14. Direct store mutations must not bypass dirty marking unless explicitly read-only/hydration behavior.
15. Immediate saves are reserved for operations whose durability cannot wait for debounce.

## Synchronization invariants

16. Cloud saves require a non-null, matching project ID and validated non-corrupt payload.
17. Existing cloud data must not be overwritten blindly by empty or materially suspect local data.
18. Atomic saves use the last observed cloud revision (`baseCloudUpdatedAt` / `p_expected_updated_at`).
19. Revision anchors update only after confirmed cloud success or authoritative cloud load.
20. Offline/reconnect replay must re-check current cloud revision; queue order alone is not authorization to overwrite.
21. Guest migration retains the five-second timestamp tolerance and corruption checks unless replaced by a stronger documented revision protocol.

## Writer lease invariants

22. A cloud project has at most one accepted writer at a time.
23. Database save enforcement is authoritative; UI read-only state is only a user-experience layer.
24. Writer IDs are unique per tab and are not shared through persistent storage.
25. The heartbeat interval must remain safely shorter than lease expiry.
26. Takeover refreshes authoritative cloud data before resuming writes.
27. Lease release is best effort; expiry must always recover abandoned leases.

## Workspace and billing invariants

28. Client plan gates improve UX but do not replace database ownership/RLS enforcement.
29. Browser code sends logical plan IDs, never trusted arbitrary Stripe prices or amounts.
30. Stripe webhooks, not success redirects, are the entitlement source of truth.
31. Existing cloud data remains readable/writable under the current Free/Pro policy; creation limits are a separate capability.
32. Unknown billing state fails closed for new cloud creation.
33. Founding and standard offer families are not crossed implicitly.

## Authentication invariants

34. Supabase Auth is authoritative for identity/JWT validity; persisted Zustand state alone is insufficient for privileged operations.
35. Manual or forced logout clears project state and analytics identity as well as local auth state.
36. OAuth, recovery, and confirmation redirects must resolve through configured canonical origins.
37. Application-session enforcement and writer leases solve different problems and must not be conflated. Page-lifetime auth infrastructure (the cleanup interval and Supabase auth-state listener) is singleton, while current-user/session reconciliation remains repeatable.

## Export invariants

38. Exports use an explicit payload independent of the currently visible page.
39. Production PDF uses the minimal static renderer at `/export/pdf/render-static`, not the full SPA renderer.
40. PDF readiness includes payload application, images/layout, fonts, and final paint.
41. Server-bound payloads cannot depend on browser-only blob URLs.
42. Theme/layout changes are incomplete until editor, PDF, and PNG output remain equivalent.

## Analytics invariants

43. Analytics never throws into product behavior.
44. Analytics never includes storyboard content, captions, dialogue, notes, project names, filenames, image contents, or serialized project/theme payloads.
45. Page views and feature events remain explicit; autocapture stays disabled unless privacy assumptions are deliberately revisited.
46. Registry-only events must not be documented as collected telemetry.
47. Logout resets analytics identity.

## Platform and deployment invariants

48. Service-role and Stripe secrets remain server-side.
49. Stripe webhook requests are authenticated by Stripe signature, not user JWT.
50. SPA fallback rewrites must preserve `/api/*` and the static PDF renderer.
51. Database/RPC changes that affect saves are deployed compatibly with browser clients.
52. Production schema, RLS, Storage policy, and Edge Function configuration are part of the architecture even where currently missing from source control.

# Future Evolution by Risk Class

## Generally safe changes

- Extract pure coordination helpers from `Index.tsx` without changing state precedence.
- Add typed commands around `useAppStore` and reduce direct domain-store mutations.
- Version project snapshots and export payloads.
- Generate Supabase types from a checked-in schema.
- Add test seams around clocks, network status, Supabase, storage, and Stripe.
- Persist project save intents with revision and idempotency metadata.
- Add privacy-reviewed analytics for currently unwired reliability and billing events.
- Consolidate visual rendering primitives across editor, PDF, and PNG.
- Add CI covering state matrix, autosave, sync conflicts, lease takeover, and export readiness.

## Changes requiring coordinated migration

- Replacing timestamp revisions with integer versions or content hashes.
- Moving local project persistence from localStorage to IndexedDB.
- Removing `storyboardStore` and the legacy export model.
- Changing JSON project structure or separating pages/shots into relational rows.
- Changing plan limits, workspace behavior, or access to existing cloud projects.
- Moving Edge Functions between Supabase and Vercel.
- Replacing PostHog or changing identity/persistence behavior.

## Architectural redesigns

- Real-time collaborative editing (requires CRDT/OT or another merge model, not just lease removal).
- Shared/team project ownership (requires roles, invitations, RLS, and gate redesign).
- Server-authoritative editing (changes local-first, guest, offline, autosave, and conflict assumptions).
- Fully custom payment UI (changes compliance and billing-state responsibilities).
- Native/mobile clients sharing cloud projects (requires explicit cross-client versioning and durable sync protocol).

# Decision Log

| ID | Decision | Status | Primary consequence |
|---|---|---|---|
| D-01 | State-driven `/app` shell | ✅ Implemented | Transient UI states stay out of routing |
| D-02 | Local-first editing | ✅ Implemented | Cloud failure does not invalidate local edits |
| D-03 | Modular Zustand plus facade | ✅ Implemented; legacy remains | Domain ownership with coordinated commands |
| D-04 | Focused static service layer | ✅ Implemented | Shared external-system and policy boundaries |
| D-05 | Intent-based autosave | ✅ Implemented | One debounced save per completed user operation |
| D-06 | Validated project-scoped snapshots | ✅ Implemented | Reliable local switching and recovery |
| D-07 | Timestamp optimistic concurrency | ✅ Implemented | Cloud saves reject stale revisions |
| D-08 | Renewable single-writer lease | ✅ Implemented | Concurrent editors become read-only/takeover |
| D-09 | Separate project/image offline queues | ✅ Implemented | Different durability; project queue remains memory-only |
| D-10 | Typed workspace/entitlement gates | ✅ Implemented | Consistent Free/Pro project access decisions |
| D-11 | First-class guest mode | ✅ Implemented | Trial and offline work without authentication |
| D-12 | Supabase Auth plus app sessions | ✅ Implemented | OAuth/recovery plus product forced logout |
| D-13 | Integrated Supabase backend | ✅ Implemented | Auth, Postgres, Storage, Realtime, RPC, functions |
| D-14 | JSON project document + relational metadata | ✅ Implemented | Whole-project save and conflict boundary |
| D-15 | Privileged billing in Edge Functions | ✅ Implemented | Secrets and service-role writes stay server-side |
| D-16 | Cloud capacity as billing entitlement | ✅ Implemented | Free local editor; one Free cloud project |
| D-17 | Stripe-hosted Checkout | ✅ Implemented | Server-allowlisted plans and hosted payment UI |
| D-18 | Stripe Customer Portal | ✅ Implemented | Hosted account/payment/cancellation management |
| D-19 | Directional interval-change policy | ✅ Implemented | Immediate upgrades, scheduled downgrades |
| D-20 | Stable export contract | ✅ Implemented; legacy bridge remains | Export independent of visible editor state |
| D-21 | Static Chromium PDF renderer | ✅ Implemented | Deterministic server PDF without SPA side effects |
| D-22 | Client offscreen PNG with fallbacks | ✅ Implemented | Low server cost and direct file delivery |
| D-23 | Optional privacy-filtered analytics | ✅ Implemented | Analytics cannot break or inspect storyboard content |
| D-24 | Typed intent-oriented event taxonomy | ✅ Partially instrumented | Stable semantics; 33 of 72 registry events wired |
| D-25 | Split Vercel/Supabase deployment | ✅ Implemented | Workloads run on capability-appropriate platforms |
| D-26 | Semantic UI colors separate from storyboard themes | ✅ Implemented | Independent app chrome and export appearance |

# Open Architectural Questions

These are not decisions that can be confirmed from the repository:

1. Is npm or Bun the canonical package manager?
2. What are the complete production Supabase schema, RLS, Storage, trigger, and Realtime definitions?
3. How are production Stripe live prices supplied in place of checked-in test mappings?
4. Must project-data offline replay survive a full browser refresh, or is reconstruction from snapshots sufficient?
5. Is single-device application session enforcement a permanent product requirement?
6. Are page/shot limits intended as billing entitlements or only technical request limits?
7. What is the required retention/deletion policy for project images, billing rows, sessions, and analytics identities?
8. What release ordering and rollback policy coordinates Vercel, Supabase schema/RPCs, and Edge Functions?
9. Is the long-term export direction a shared renderer or intentionally separate PDF/PNG implementations?
10. Is collaborative or shared project editing on the product roadmap? It would supersede several current lease and ownership assumptions.

# Source Map

The most important evidence for this decision record is:

- `docs/StoryboardFlow-Engineering-Handbook.md`
- `.cursorrules`
- `docs/architecture/ARCHITECTURE_PRINCIPLES.md`
- `docs/architecture/UI_STATE_HANDLING.md`
- `docs/sync-and-data/TIMESTAMP_SYNC_IMPLEMENTATION.md`
- `src/pages/Index.tsx`
- `src/store/`
- `src/utils/autoSave.ts`
- `src/utils/projectSwitcher.ts`
- `src/services/`
- `src/utils/export/`
- `src/services/analytics/`
- `src/config/billing.ts`
- `src/lib/supabase.ts`
- `api/export-pdf.ts`
- `export-pdf-static.html`
- `src/export-pdf-static.ts`
- `supabase/functions/`
- `supabase/migrations/`
- `vercel.json`
- `vite.config.ts`

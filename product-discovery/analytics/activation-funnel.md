# Activation Funnel

Defines the primary activation path for StoryboardFlow alpha. Event names match `src/services/analytics/events.ts` (snake_case strings sent to PostHog).

---

## North star (alpha)

**Activated user:** Creates a project, adds their first shot, and completes an export in the same week.

Secondary activation (partial): `first_shot_added` without export — still valuable but not full activation.

---

## Primary funnel

```
app_started
    ↓
project_created  (or project_opened for returning users)
    ↓
first_shot_added
    ↓
export_completed
```

### Optional parallel paths

| Branch | Events | Notes |
|--------|--------|-------|
| Guest → signup | `guest_session_started` → `guest_project_initialized` → `signup_completed` | Track guest migration via `guest_projects_migrated` |
| Auth during onboarding | `welcome_viewed` → `auth_modal_opened` → `auth_completed` / `signup_completed` | Failures: `auth_failed` |
| Returning user | `app_started` → `project_opened` → `shot_added` | `first_shot_added` fires once per project only |

---

## Step definitions

### 1. `app_started`

**Meaning:** First app load in session after auth bootstrap completes.

**Implementation:** `captureAppStarted()` in `src/services/analytics/activationTracking.ts` (fires once per page load).

**Properties:**
| Property | Description |
|----------|-------------|
| `route` | Current URL path + query + hash |
| `environment` | Vite mode (`development`, `production`) |
| `app_version` | Optional `VITE_APP_VERSION` |
| `auth_status` | Auth state at capture time |

**Funnel role:** Top of funnel — all sessions.

---

### 2. `project_created`

**Meaning:** User created a new project.

**Implementation:** `captureProjectCreated()` in `activationTracking.ts`.

**Properties:**
| Property | Description |
|----------|-------------|
| `is_guest` | Boolean |
| `is_cloud` | Boolean |
| `project_count` | User's project count after creation |
| `source` | Optional creation source string |

**Funnel role:** Commitment step — user intends to work.

**Related events:** `project_create_blocked`, `project_picker_shown`, `project_opened`, `project_switched`, `project_deleted`.

---

### 3. `first_shot_added`

**Meaning:** First shot added to a project (once per `project_id`).

**Implementation:** `trackFirstShotAddedAfterIntent()` — triggered after add-shot intent with `reason` in `add_shot` | `create_shot`.

**Properties:**
| Property | Description |
|----------|-------------|
| `shot_count` | Shots after add |
| `page_count` | Pages in project |
| `is_guest` | Boolean |
| `workspace_mode` | `local` or cloud workspace mode |

**Funnel role:** **Core activation milestone** — user experiences editor value.

**Related events:** `shot_added`, `shot_deleted`, `shots_reordered`, `page_created`, `page_deleted`, `layout_changed`.

---

### 4. `export_completed`

**Meaning:** User successfully exported storyboard output.

**Implementation:** `captureExportCompleted()` in `activationTracking.ts`.

**Properties:**
| Property | Description |
|----------|-------------|
| `format` | `pdf` or `png` |
| `page_count` | Pages exported |
| `shot_count` | Shots exported |
| `duration_ms` | Optional export duration |

**Funnel role:** **Value delivery** — deliverable produced.

**Related events:** `export_started`, `export_failed`.

---

## Signup funnel (secondary)

For alpha cohorts emphasizing account creation:

```
welcome_viewed
    ↓
auth_modal_opened
    ↓
signup_completed  (or auth_completed for returning sign-in)
```

**`signup_completed` properties:** `method` (`email` | `google` | `unknown`), `auth_status`.

---

## Drop-off diagnosis events

Use these to explain funnel leaks:

| Symptom | Events to inspect |
|---------|-------------------|
| Never creates project | `welcome_viewed`, `auth_modal_opened`, `project_create_blocked` |
| Creates project, no shots | `project_created` without `first_shot_added`; check `page_created` |
| Shots but no export | `first_shot_added` without `export_completed`; check `export_started`, `export_failed` |
| Sync friction | `offline_mode_entered`, `online_restored`, `sync_conflict_shown`, `sync_conflict_resolved` |
| Billing blocks | `plan_limit_reached`, `upgrade_prompt_shown`, `upgrade_required_error` |
| Crashes | `app_error_boundary`, `storage_critical_detected` |

---

## Alpha funnel targets

| Step | Metric | Alpha target |
|------|--------|--------------|
| 1 → 2 | Project creation rate | ≥ 70% of `app_started` |
| 2 → 3 | First shot rate | ≥ 60% of `project_created` |
| 3 → 4 | Export rate | ≥ 40% of `first_shot_added` |
| End-to-end | Full activation | ≥ 25% of `app_started` |

See `../launch/success-metrics.md` for full goals.

---

## Cohort analysis (PostHog)

Recommended breakdowns:

- `is_guest` on `project_created` and `first_shot_added`
- `workspace_mode` on `first_shot_added`
- `format` on `export_completed`
- `method` on `signup_completed`
- Cohort property: Test user alias (manual person property after identify)

---

## Event registry reference

Full list of instrumented event constants in `src/services/analytics/events.ts`. Not all events are wired to `AnalyticsService.capture()` yet; alpha dashboards should prioritize events with confirmed implementations:

| Event | Implemented capture |
|-------|---------------------|
| `app_started` | Yes |
| `project_created` | Yes |
| `first_shot_added` | Yes |
| `export_completed` | Yes |
| `signup_completed` | Yes |
| `$pageview` | Yes (route listener) |
| Others in registry | Defined; wire as needed |

When adding new captures, update this document and `metrics-definition.md` in the same PR as code changes (future phase — no code changes in Phase A).

# Metrics Definitions

Canonical KPI definitions for StoryboardFlow Product Discovery. PostHog event names match `src/services/analytics/events.ts`.

---

## Conventions

- **Event names:** snake_case strings (e.g. `app_started`), not TypeScript constant names.
- **Page views:** PostHog receives `$pageview` with `path` property via `AnalyticsRouteListener`.
- **Person profiles:** PostHog configured with `person_profiles: 'identified_only'` — identify users after `signup_completed` / auth for cohort analysis.
- **Sanitization:** Properties pass through `sanitizeAnalyticsProperties()` before send.

---

## Activation metrics

### `app_sessions_unique`

| Field | Value |
|-------|-------|
| **Definition** | Count of unique users (or anonymous IDs) with at least one `app_started` per period |
| **PostHog event** | `app_started` |
| **Formula** | Unique users, event = `app_started`, interval = week |
| **Alpha target** | ≥ 10 distinct testers per week during active alpha |

### `project_creation_rate`

| Field | Value |
|-------|-------|
| **Definition** | Share of sessions that create a project |
| **PostHog events** | `app_started` → `project_created` |
| **Formula** | Funnel conversion step 1→2, window 7 days |
| **Alpha target** | ≥ 70% |

### `activation_first_shot_rate`

| Field | Value |
|-------|-------|
| **Definition** | Share of new projects that reach first shot |
| **PostHog events** | `project_created` → `first_shot_added` |
| **Formula** | Funnel conversion, same session or 7-day window |
| **Alpha target** | ≥ 60% |
| **Notes** | `first_shot_added` fires once per project |

### `export_completion_rate`

| Field | Value |
|-------|-------|
| **Definition** | Share of activated projects (first shot) that export |
| **PostHog events** | `first_shot_added` → `export_completed` |
| **Formula** | Funnel conversion, 14-day window |
| **Alpha target** | ≥ 40% |

### `full_activation_rate`

| Field | Value |
|-------|-------|
| **Definition** | End-to-end activation in one funnel |
| **PostHog events** | `app_started` → `project_created` → `first_shot_added` → `export_completed` |
| **Formula** | 4-step funnel, 14-day window |
| **Alpha target** | ≥ 25% |

### `signup_completion_rate`

| Field | Value |
|-------|-------|
| **Definition** | Share of auth modal opens that complete signup |
| **PostHog events** | `auth_modal_opened` → `signup_completed` |
| **Formula** | Funnel conversion, 7-day window |
| **Alpha target** | ≥ 50% |

---

## Engagement metrics

### `shots_per_active_project`

| Field | Value |
|-------|-------|
| **Definition** | Average shot count among projects with `shot_added` |
| **PostHog events** | `shot_added` (property aggregation if available) or `first_shot_added.shot_count` |
| **Alpha target** | Median ≥ 6 shots among activated users |

### `pages_per_project`

| Field | Value |
|-------|-------|
| **Definition** | Average pages per project at first shot |
| **PostHog events** | `first_shot_added` → `page_count` property |
| **Alpha target** | Informational |

### `export_format_split`

| Field | Value |
|-------|-------|
| **Definition** | PDF vs PNG share of exports |
| **PostHog events** | `export_completed` breakdown by `format` |
| **Alpha target** | Informational |

### `session_page_views`

| Field | Value |
|-------|-------|
| **Definition** | Pages viewed per session |
| **PostHog events** | `$pageview` |
| **Alpha target** | Informational |

---

## Quality and reliability metrics

### `export_failure_rate`

| Field | Value |
|-------|-------|
| **Definition** | Failed exports / started exports |
| **PostHog events** | `export_failed` / `export_started` |
| **Alpha target** | < 5% |

### `sync_conflict_rate`

| Field | Value |
|-------|-------|
| **Definition** | Users with `sync_conflict_shown` per week / active sync users |
| **PostHog events** | `sync_conflict_shown`, `sync_completed` |
| **Alpha target** | < 10% of users who sync |

### `app_error_rate`

| Field | Value |
|-------|-------|
| **Definition** | Sessions with `app_error_boundary` |
| **PostHog events** | `app_error_boundary` |
| **Alpha target** | < 2% of sessions |

### `project_save_failure_rate`

| Field | Value |
|-------|-------|
| **Definition** | Save failures / save attempts |
| **PostHog events** | `project_save_failed` / `project_saved` |
| **Alpha target** | < 3% |

---

## Monetization metrics (alpha baseline)

Track for instrumentation readiness; targets may be informational during alpha.

### `upgrade_prompt_exposure`

| Field | Value |
|-------|-------|
| **PostHog events** | `upgrade_prompt_shown`, `upgrade_dismissed`, `upgrade_clicked` |

### `checkout_funnel`

| Field | Value |
|-------|-------|
| **PostHog events** | `billing_page_viewed` → `checkout_started` → `checkout_completed` / `checkout_canceled` |

### `plan_limit_reached`

| Field | Value |
|-------|-------|
| **PostHog events** | `plan_limit_reached`, `theme_limit_reached`, `project_create_blocked` |

---

## Alpha ops metrics

### `feedback_response_rate`

| Field | Value |
|-------|-------|
| **Definition** | Test users with form submitted / active testers |
| **Source** | Notion Test Users (`Form Submitted` / `Status = Active`) |
| **Alpha target** | ≥ 80% |

### `interview_completion_rate`

| Field | Value |
|-------|-------|
| **Definition** | Test users with interview done / completed sessions |
| **Source** | Notion Test Users |
| **Alpha target** | ≥ 50% of activated testers |

### `time_to_first_shot_median`

| Field | Value |
|-------|-------|
| **Definition** | Median time from `project_created` to `first_shot_added` |
| **PostHog** | Funnel time-to-convert |
| **Alpha target** | < 10 minutes |

---

## Event property reference (implemented captures)

### `app_started`
`route`, `environment`, `app_version`, `auth_status`

### `project_created`
`is_guest`, `is_cloud`, `project_count`, `source`

### `first_shot_added`
`shot_count`, `page_count`, `is_guest`, `workspace_mode`

### `export_completed`
`format`, `page_count`, `shot_count`, `duration_ms`

### `signup_completed`
`method`, `auth_status`

### `$pageview`
`path` (+ merged route properties)

---

## Full event catalog (`events.ts`)

Events defined in code (use for future instrumentation and dashboard planning):

**Lifecycle:** `app_started`, `app_initialized`, `app_entry`, `$pageview`

**Landing:** `landing_page_viewed`, `cta_clicked`

**Auth / welcome:** `welcome_viewed`, `guest_session_started`, `guest_project_initialized`, `auth_modal_opened`, `auth_completed`, `auth_failed`, `signup_completed`, `email_verification_prompt_shown`

**Projects:** `project_picker_shown`, `project_created`, `project_opened`, `project_deleted`, `project_create_blocked`, `project_saved`, `project_save_failed`, `project_switched`

**Shots / pages:** `first_shot_added`, `shot_added`, `shot_deleted`, `shots_reordered`, `guest_projects_migrated`, `page_created`, `page_deleted`, `layout_changed`

**Themes:** `theme_applied`, `theme_saved`, `theme_deleted`, `theme_limit_reached`

**Export:** `export_started`, `export_completed`, `export_failed`

**Billing:** `upgrade_prompt_shown`, `upgrade_clicked`, `upgrade_dismissed`, `billing_page_viewed`, `checkout_started`, `checkout_completed`, `checkout_canceled`, `billing_portal_opened`, `plan_limit_reached`

**Sync:** `sync_completed`, `sync_conflict_shown`, `sync_conflict_resolved`, `offline_mode_entered`, `online_restored`

**Errors:** `session_forced_logout_viewed`, `app_error_boundary`, `storage_critical_detected`, `upgrade_required_error`

---

## Update process

1. Change event in `src/services/analytics/events.ts` (engineering).
2. Update this file and `activation-funnel.md`.
3. Update `notion/metrics.csv` and PostHog insights.
4. Note in weekly review if definitions change mid-alpha.

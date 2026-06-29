# PostHog Dashboard Plan

Plan for StoryboardFlow alpha analytics in PostHog. Aligns with `src/services/analytics/` and `metrics-definition.md`.

**PostHog host (default):** `https://us.i.posthog.com` (override via `VITE_POSTHOG_HOST`)

---

## Dashboard 1 — Alpha Activation (primary)

**Audience:** Product, design, alpha coordinators  
**Refresh:** Daily during active alpha  
**Filter:** `environment = production` (or staging for pre-prod cohort)

### Row 1 — Funnel overview

| Insight | Type | Configuration |
|---------|------|---------------|
| Core activation funnel | Funnel | `app_started` → `project_created` → `first_shot_added` → `export_completed` |
| Conversion window | | 14 days |
| Breakdown | | `is_guest` on steps 2–3 |

### Row 2 — Step conversion rates

| Insight | Type | Configuration |
|---------|------|---------------|
| Project creation rate | Formula or funnel step | Step 1→2 % |
| First shot rate | Funnel step | Step 2→3 % |
| Export rate | Funnel step | Step 3→4 % |
| Target lines | | 70% / 60% / 40% (annotation) |

### Row 3 — Volume

| Insight | Type | Configuration |
|---------|------|---------------|
| Weekly `app_started` | Trends | Unique users, weekly |
| Weekly `export_completed` | Trends | Total count, weekly |
| `first_shot_added` | Trends | Total count, weekly |

### Row 4 — Time to activate

| Insight | Type | Configuration |
|---------|------|---------------|
| Median time to first shot | Funnel time-to-convert | `project_created` → `first_shot_added` |
| Median time to export | Funnel time-to-convert | `first_shot_added` → `export_completed` |

---

## Dashboard 2 — Auth and onboarding

### Insights

| Name | Events | Notes |
|------|--------|-------|
| Welcome funnel | `welcome_viewed` → `auth_modal_opened` → `signup_completed` | |
| Auth failures | `auth_failed` trend | Breakdown by error if property added |
| Guest path | `guest_session_started`, `guest_project_initialized`, `guest_projects_migrated` | |
| Signup method | `signup_completed` breakdown | Property: `method` |

---

## Dashboard 3 — Editor engagement

| Insight | Events |
|---------|--------|
| Shot activity | `shot_added`, `shot_deleted`, `shots_reordered` |
| Page activity | `page_created`, `page_deleted`, `layout_changed` |
| First shot properties | `first_shot_added` — avg `shot_count`, `page_count` |
| Theme usage | `theme_applied`, `theme_saved`, `theme_limit_reached` |

---

## Dashboard 4 — Export health

| Insight | Events |
|---------|--------|
| Export funnel | `export_started` → `export_completed` |
| Failure rate | `export_failed` / `export_started` |
| Format split | `export_completed` by `format` |
| Duration | `export_completed` — `duration_ms` distribution |

---

## Dashboard 5 — Sync and reliability

| Insight | Events |
|---------|--------|
| Offline usage | `offline_mode_entered`, `online_restored` |
| Sync conflicts | `sync_conflict_shown`, `sync_conflict_resolved` |
| Save health | `project_saved`, `project_save_failed` |
| Errors | `app_error_boundary`, `storage_critical_detected` |
| Forced logout | `session_forced_logout_viewed` |

---

## Dashboard 6 — Billing (alpha instrumentation)

| Insight | Events |
|---------|--------|
| Upgrade prompts | `upgrade_prompt_shown`, `upgrade_clicked`, `upgrade_dismissed` |
| Checkout | `checkout_started` → `checkout_completed` / `checkout_canceled` |
| Limits | `plan_limit_reached`, `project_create_blocked`, `upgrade_required_error` |

---

## Cohorts to create

| Cohort name | Definition | Use |
|-------------|------------|-----|
| Alpha testers | Person property `alpha_cohort` is set | Filter all dashboards |
| Activated | Performed `first_shot_added` | Retention analysis |
| Fully activated | Completed 4-step funnel | Success interviews |
| Guest only | `project_created` with `is_guest = true` never `signup_completed` | Onboarding fixes |
| Exporters | `export_completed` at least once | Export quality feedback |
| At risk | `project_created` without `first_shot_added` within 7 days | Coordinator outreach |

**Note:** Set `alpha_cohort` via PostHog `identify` or manual person property when onboarding testers.

---

## Alerts (recommended)

| Alert | Condition | Channel |
|-------|-----------|---------|
| Export failure spike | `export_failed` > 10% of `export_started` in 24h | Slack / email |
| Error boundary spike | `app_error_boundary` > 5 in 1h | Slack |
| Activation drop | Weekly `first_shot_added` rate drops > 15% WoW | Email product lead |

---

## Session replay (optional)

If enabled in PostHog project settings:

- Filter replays where `export_failed` or `app_error_boundary` fired
- Sample 10% of sessions with `project_created` but no `first_shot_added`

Respect privacy policy; disable sensitive field capture.

---

## Linking to Notion

1. Copy insight URLs into **Metrics** database `Dashboard Link` column.
2. Paste weekly snapshot numbers into **Weekly Reviews** `Metrics Snapshot`.
3. Reference funnel screenshots in experiment `Learnings`.

---

## Implementation checklist (Phase B)

- [ ] Confirm `VITE_POSTHOG_KEY` set in production/staging
- [ ] Verify `app_started` fires once per load (not duplicated)
- [ ] Build Dashboard 1 (Activation) first
- [ ] Create alpha tester cohort property
- [ ] Add dashboard links to Notion Home (`dashboard-layout.md`)
- [ ] Document any staging vs production project split

---

## Gaps and future instrumentation

Events defined in `events.ts` but not yet confirmed in `AnalyticsService.capture()` calls should be wired before relying on Dashboards 2–6. Prioritize for alpha:

1. `auth_modal_opened`, `auth_failed` — signup funnel
2. `export_started`, `export_failed` — export health
3. `welcome_viewed`, `project_picker_shown` — onboarding drop-off

Track wiring progress in GitHub Issues labeled `analytics`.

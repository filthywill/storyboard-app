# Notion Database Schema

Documentation for all Product Discovery databases. Property types follow Notion conventions. Example values use placeholders only.

---

## 1. Test Users

**Purpose:** Track alpha testers, cohort assignment, and participation status.

| Property | Type | Options / notes |
|----------|------|-----------------|
| Name | Title | Display name or alias (e.g. `Tester A`) |
| Email | Email | Optional until recruited; leave blank in templates |
| Cohort | Select | `Cohort A`, `Cohort B`, `Friends & Family`, `Waitlist` |
| Status | Select | `Invited`, `Active`, `Completed`, `Dropped`, `On Hold` |
| Role | Select | `Filmmaker`, `Animator`, `Storyboard Artist`, `Student`, `Other` |
| Invited Date | Date | When invite sent |
| First Session Date | Date | First `app_started` or manual entry |
| Sessions Count | Number | From PostHog or manual tally |
| Activated | Checkbox | True if `first_shot_added` observed |
| Exported | Checkbox | True if `export_completed` observed |
| Interview Done | Checkbox | Completed structured interview |
| Form Submitted | Checkbox | Post-session Google Form received |
| Notes | Text | Freeform coordinator notes |
| Feedback | Relation | → Feedback Inbox (many) |

**Recommended views:**
- **Active testers** — `Status = Active`
- **Needs follow-up** — `Form Submitted` unchecked AND `First Session Date` is not empty
- **By cohort** — Board grouped by `Cohort`

---

## 2. Feedback Inbox

**Purpose:** Single intake for all qualitative feedback (forms, interviews, ad-hoc).

| Property | Type | Options / notes |
|----------|------|-----------------|
| Summary | Title | One-line description |
| Tester | Relation | → Test Users |
| Date | Date | When feedback received |
| Source | Select | `Google Form`, `Interview`, `Email`, `Slack`, `In-app`, `Other` |
| Sentiment | Select | `Positive`, `Neutral`, `Negative`, `Mixed` |
| Theme | Multi-select | `Onboarding`, `Editing`, `Export`, `Sync`, `Themes`, `Billing`, `Performance`, `Other` |
| Verbatim Quote | Text | Optional direct quote |
| Full Response | Text | Long-form content |
| Actionable | Checkbox | Requires follow-up |
| Linked UX Issue | Relation | → UX Issues (optional) |
| Linked Feature Request | Relation | → Feature Requests (optional) |
| GitHub Issue | URL | If filed |
| Status | Select | `New`, `Reviewed`, `Triaged`, `Closed` |

**Recommended views:**
- **Inbox (new)** — `Status = New`, sort by Date desc
- **By theme** — Table grouped by `Theme`
- **Negative this week** — `Sentiment = Negative`, Date within 7 days

---

## 3. UX Issues

**Purpose:** Usability problems, confusion, and friction (not net-new features).

| Property | Type | Options / notes |
|----------|------|-----------------|
| Issue | Title | Short description |
| Severity | Select | `Blocker`, `Major`, `Minor`, `Cosmetic` |
| Status | Select | `Open`, `Investigating`, `In Progress`, `Fixed`, `Won't Fix`, `Cannot Reproduce` |
| Area | Select | `Welcome`, `Auth`, `Project Picker`, `Storyboard Editor`, `Export`, `Sync`, `Settings`, `Billing`, `Other` |
| Reported By | Relation | → Test Users (optional) |
| Feedback Source | Relation | → Feedback Inbox (optional) |
| Steps to Reproduce | Text | |
| Expected Behavior | Text | |
| Actual Behavior | Text | |
| PostHog Event | Text | Related event name if applicable (e.g. `export_failed`) |
| Priority | Select | `P0`, `P1`, `P2`, `P3` |
| Assignee | Person | |
| GitHub Issue | URL | |
| Roadmap Item | Relation | → Roadmap (optional) |
| Created | Created time | Auto |
| Resolved Date | Date | |

**Recommended views:**
- **Open by severity** — Filter `Status` not in Fixed/Won't Fix; sort Severity
- **Editor issues** — `Area = Storyboard Editor`
- **P0/P1 board** — Board by `Status`

---

## 4. Feature Requests

**Purpose:** New capabilities and enhancements.

| Property | Type | Options / notes |
|----------|------|-----------------|
| Feature | Title | |
| Description | Text | |
| Requested By | Relation | → Test Users (optional) |
| Feedback Source | Relation | → Feedback Inbox (optional) |
| Category | Select | `Core Editing`, `Collaboration`, `Export`, `Integrations`, `Themes`, `Mobile`, `Admin`, `Other` |
| Impact | Select | `High`, `Medium`, `Low` |
| Effort | Select | `Large`, `Medium`, `Small`, `Unknown` |
| Status | Select | `New`, `Under Review`, `Planned`, `In Progress`, `Shipped`, `Declined` |
| Priority | Select | `P0`, `P1`, `P2`, `P3` |
| Votes | Number | Tally from testers (manual) |
| Roadmap Item | Relation | → Roadmap (optional) |
| GitHub Issue | URL | |
| Created | Created time | Auto |

**Recommended views:**
- **Backlog** — `Status = New | Under Review`, sort Impact desc
- **Planned** — `Status = Planned | In Progress`
- **By category** — Board grouped by `Category`

---

## 5. Roadmap

**Purpose:** Prioritized delivery plan linked to discovery outcomes.

| Property | Type | Options / notes |
|----------|------|-----------------|
| Initiative | Title | |
| Description | Text | |
| Quarter | Select | `Q1 2026`, `Q2 2026`, `Q3 2026`, `Q4 2026`, `Backlog` |
| Horizon | Select | `Now`, `Next`, `Later` |
| Theme | Select | `Activation`, `Retention`, `Monetization`, `Quality`, `Platform`, `Alpha Ops` |
| Status | Select | `Not Started`, `In Progress`, `Done`, `Paused` |
| Priority | Select | `P0`, `P1`, `P2`, `P3` |
| Owner | Person | |
| UX Issues | Relation | → UX Issues (many) |
| Feature Requests | Relation | → Feature Requests (many) |
| Target Date | Date | |
| Success Metric | Relation | → Metrics (optional) |
| Notes | Text | |

**Recommended views:**
- **Now / Next / Later board** — Board by `Horizon`
- **This quarter** — Filter `Quarter` = current
- **Activation theme** — `Theme = Activation`

---

## 6. Experiments

**Purpose:** Hypothesis-driven tests during alpha.

| Property | Type | Options / notes |
|----------|------|-----------------|
| Experiment | Title | |
| Hypothesis | Text | "If we … then … because …" |
| Status | Select | `Draft`, `Running`, `Completed`, `Cancelled` |
| Start Date | Date | |
| End Date | Date | |
| Variant A | Text | Control description |
| Variant B | Text | Treatment description |
| Primary Metric | Relation | → Metrics |
| Secondary Metrics | Relation | → Metrics (many) |
| Result | Select | `Win`, `Loss`, `Inconclusive`, `Pending` |
| Learnings | Text | |
| Decision | Select | `Ship`, `Iterate`, `Revert`, `Pending` |
| Owner | Person | |

**Recommended views:**
- **Running** — `Status = Running`
- **Completed** — `Status = Completed`, sort End Date desc

---

## 7. Weekly Reviews

**Purpose:** Weekly synthesis of feedback, metrics, and decisions.

| Property | Type | Options / notes |
|----------|------|-----------------|
| Week | Title | e.g. `Week of 2026-06-23` |
| Week Start | Date | Monday of review week |
| Author | Person | |
| Summary | Text | Executive summary |
| Wins | Text | Bullet list |
| Pain Points | Text | Bullet list |
| Metrics Snapshot | Text | Key numbers from PostHog |
| Decisions | Text | What we committed to |
| Next Week Focus | Text | Top 3 priorities |
| Feedback Count | Number | Items triaged this week |
| Issues Opened | Number | New UX issues |
| Issues Closed | Number | Resolved UX issues |

**Recommended views:**
- **Timeline** — Table sorted by Week Start desc
- **Latest** — Limit 1

---

## 8. Metrics

**Purpose:** KPI registry with PostHog event mapping (canonical definitions in `../analytics/metrics-definition.md`).

| Property | Type | Options / notes |
|----------|------|-----------------|
| Metric | Title | Display name |
| Key | Text | Stable slug (e.g. `activation_first_shot_rate`) |
| Category | Select | `Activation`, `Engagement`, `Retention`, `Revenue`, `Quality`, `Alpha Ops` |
| Definition | Text | How calculated |
| PostHog Event | Text | Primary event (snake_case from `events.ts`) |
| PostHog Formula | Text | Funnel or insight description |
| Target (Alpha) | Text | Alpha goal (e.g. `≥ 60%`) |
| Current Value | Text | Updated weekly |
| Last Updated | Date | |
| Owner | Person | |
| Dashboard Link | URL | PostHog insight URL |
| Experiments | Relation | → Experiments (many) |
| Roadmap | Relation | → Roadmap (many) |

**Recommended views:**
- **Activation** — `Category = Activation`
- **Needs update** — `Last Updated` older than 7 days

---

## Relationship diagram

```
                    ┌─────────────┐
                    │ Test Users  │
                    └──────┬──────┘
                           │ 1:N
                           ▼
                    ┌─────────────┐
         ┌─────────│  Feedback   │─────────┐
         │         │   Inbox     │         │
         │         └─────────────┘         │
         │ N:1 (optional)                  │ N:1 (optional)
         ▼                                 ▼
  ┌─────────────┐                   ┌──────────────┐
  │ UX Issues   │                   │   Feature    │
  └──────┬──────┘                   │   Requests   │
         │                          └──────┬───────┘
         │ N:1                             │ N:1
         └────────────┬────────────────────┘
                      ▼
               ┌─────────────┐
               │   Roadmap   │◄──── Metrics ◄──── Experiments
               └─────────────┘
```

---

## Import notes (Phase B)

1. Create databases first, then add Relation properties (Notion may require both databases to exist).
2. Map CSV column headers to property names exactly.
3. Select/Multi-select options must be created before import or added during column mapping.
4. Delete or archive template rows after validating import.
5. Keep `Key` and `PostHog Event` fields aligned with `src/services/analytics/events.ts`.

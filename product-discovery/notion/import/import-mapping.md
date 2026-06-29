# Notion Import Mapping

Maps each import CSV to its Notion database, property types, and post-import steps. Canonical schema: `../database-schema.md`.

**Legend:** Properties marked **create after import** are not in the CSV and must be added manually in Notion.

---

## 1. Test Users

| Field | Value |
|-------|-------|
| **Database name** | Test Users |
| **CSV filename** | `test-users-import.csv` |
| **Import order** | 1 (no dependencies) |

### CSV columns → Notion properties

| # | CSV column | Notion property | Type | Select / multi-select options | Notes |
|---|------------|-----------------|------|-------------------------------|-------|
| 1 | Name | Name | Title | — | First column becomes title |
| 2 | Email | Email | Email | — | |
| 3 | Cohort | Cohort | Select | `Cohort A`, `Cohort B`, `Friends & Family`, `Waitlist` | |
| 4 | Status | Status | Select | `Invited`, `Active`, `Completed`, `Dropped`, `On Hold` | |
| 5 | Role | Role | Select | `Filmmaker`, `Animator`, `Storyboard Artist`, `Student`, `Other` | |
| 6 | Invited Date | Invited Date | Date | — | Date only or include time |
| 7 | First Session Date | First Session Date | Date | — | |
| 8 | Sessions Count | Sessions Count | Number | — | Integer |
| 9 | Activated | Activated | Checkbox | — | Import `Yes`/`No` or leave empty |
| 10 | Exported | Exported | Checkbox | — | |
| 11 | Interview Done | Interview Done | Checkbox | — | |
| 12 | Form Submitted | Form Submitted | Checkbox | — | |
| 13 | Notes | Notes | Text | — | |

### Properties not in CSV (create after import)

| Property | Type | Relation target | Notes |
|----------|------|-----------------|-------|
| Feedback | Relation | Feedback Inbox | **create after import** — Many feedback items to one tester |

---

## 2. Feedback Inbox

| Field | Value |
|-------|-------|
| **Database name** | Feedback Inbox |
| **CSV filename** | `feedback-inbox-import.csv` |
| **Import order** | 2 (after Test Users) |

### CSV columns → Notion properties

| # | CSV column | Notion property | Type | Select / multi-select options | Notes |
|---|------------|-----------------|------|-------------------------------|-------|
| 1 | Summary | Summary | Title | — | |
| 2 | Tester | Tester | Text → **Relation** | — | Import as Text first; convert to Relation → Test Users after both DBs exist, or leave Text and add Relation column |
| 3 | Date | Date | Date | — | |
| 4 | Source | Source | Select | `Google Form`, `Interview`, `Email`, `Slack`, `In-app`, `Other` | |
| 5 | Sentiment | Sentiment | Select | `Positive`, `Neutral`, `Negative`, `Mixed` | |
| 6 | Theme | Theme | Multi-select | `Onboarding`, `Editing`, `Export`, `Sync`, `Themes`, `Billing`, `Performance`, `Other` | Comma-separated in CSV if multiple |
| 7 | Verbatim Quote | Verbatim Quote | Text | — | |
| 8 | Full Response | Full Response | Text | — | |
| 9 | Actionable | Actionable | Checkbox | — | |
| 10 | Status | Status | Select | `New`, `Reviewed`, `Triaged`, `Closed` | |

### Properties not in CSV (create after import)

| Property | Type | Relation target | Notes |
|----------|------|-----------------|-------|
| Tester (Relation) | Relation | Test Users | **create after import** — Replace or supplement Text `Tester` column |
| Linked UX Issue | Relation | UX Issues | **create after import** |
| Linked Feature Request | Relation | Feature Requests | **create after import** |
| GitHub Issue | URL | — | **create after import** |

---

## 3. UX Issues

| Field | Value |
|-------|-------|
| **Database name** | UX Issues |
| **CSV filename** | `ux-issues-import.csv` |
| **Import order** | 3 (after Test Users, Feedback Inbox) |

### CSV columns → Notion properties

| # | CSV column | Notion property | Type | Select / multi-select options | Notes |
|---|------------|-----------------|------|-------------------------------|-------|
| 1 | Issue | Issue | Title | — | |
| 2 | Severity | Severity | Select | `Blocker`, `Major`, `Minor`, `Cosmetic` | |
| 3 | Status | Status | Select | `Open`, `Investigating`, `In Progress`, `Fixed`, `Won't Fix`, `Cannot Reproduce` | |
| 4 | Area | Area | Select | `Welcome`, `Auth`, `Project Picker`, `Storyboard Editor`, `Export`, `Sync`, `Settings`, `Billing`, `Other` | |
| 5 | Steps to Reproduce | Steps to Reproduce | Text | — | |
| 6 | Expected Behavior | Expected Behavior | Text | — | |
| 7 | Actual Behavior | Actual Behavior | Text | — | |
| 8 | PostHog Event | PostHog Event | Text | — | snake_case event name |
| 9 | Priority | Priority | Select | `P0`, `P1`, `P2`, `P3` | |
| 10 | GitHub Issue | GitHub Issue | URL | — | Empty until issue filed |

### Properties not in CSV (create after import)

| Property | Type | Relation target | Notes |
|----------|------|-----------------|-------|
| Reported By | Relation | Test Users | **create after import** |
| Feedback Source | Relation | Feedback Inbox | **create after import** |
| Assignee | Person | — | **create after import** |
| Roadmap Item | Relation | Roadmap | **create after import** |
| Created | Created time | — | **create after import** — Notion auto property |
| Resolved Date | Date | — | **create after import** |

---

## 4. Feature Requests

| Field | Value |
|-------|-------|
| **Database name** | Feature Requests |
| **CSV filename** | `feature-requests-import.csv` |
| **Import order** | 4 (after Test Users, Feedback Inbox) |

### CSV columns → Notion properties

| # | CSV column | Notion property | Type | Select / multi-select options | Notes |
|---|------------|-----------------|------|-------------------------------|-------|
| 1 | Feature | Feature | Title | — | |
| 2 | Description | Description | Text | — | |
| 3 | Category | Category | Select | `Core Editing`, `Collaboration`, `Export`, `Integrations`, `Themes`, `Mobile`, `Admin`, `Other` | |
| 4 | Impact | Impact | Select | `High`, `Medium`, `Low` | |
| 5 | Effort | Effort | Select | `Large`, `Medium`, `Small`, `Unknown` | |
| 6 | Status | Status | Select | `New`, `Under Review`, `Planned`, `In Progress`, `Shipped`, `Declined` | |
| 7 | Priority | Priority | Select | `P0`, `P1`, `P2`, `P3` | |
| 8 | Votes | Votes | Number | — | Integer |
| 9 | GitHub Issue | GitHub Issue | URL | — | |

### Properties not in CSV (create after import)

| Property | Type | Relation target | Notes |
|----------|------|-----------------|-------|
| Requested By | Relation | Test Users | **create after import** |
| Feedback Source | Relation | Feedback Inbox | **create after import** |
| Roadmap Item | Relation | Roadmap | **create after import** |
| Created | Created time | — | **create after import** |

---

## 5. Roadmap

| Field | Value |
|-------|-------|
| **Database name** | Roadmap |
| **CSV filename** | `roadmap-import.csv` |
| **Import order** | 5 (before relation back-links from UX/Features) |

### CSV columns → Notion properties

| # | CSV column | Notion property | Type | Select / multi-select options | Notes |
|---|------------|-----------------|------|-------------------------------|-------|
| 1 | Initiative | Initiative | Title | — | |
| 2 | Description | Description | Text | — | |
| 3 | Quarter | Quarter | Select | `Q1 2026`, `Q2 2026`, `Q3 2026`, `Q4 2026`, `Backlog` | |
| 4 | Horizon | Horizon | Select | `Now`, `Next`, `Later` | |
| 5 | Theme | Theme | Select | `Activation`, `Retention`, `Monetization`, `Quality`, `Platform`, `Alpha Ops` | |
| 6 | Status | Status | Select | `Not Started`, `In Progress`, `Done`, `Paused` | |
| 7 | Priority | Priority | Select | `P0`, `P1`, `P2`, `P3` | |
| 8 | Target Date | Target Date | Date | — | |
| 9 | Notes | Notes | Text | — | |

### Properties not in CSV (create after import)

| Property | Type | Relation target | Notes |
|----------|------|-----------------|-------|
| Owner | Person | — | **create after import** |
| UX Issues | Relation | UX Issues | **create after import** — Many to many |
| Feature Requests | Relation | Feature Requests | **create after import** — Many to many |
| Success Metric | Relation | Metrics | **create after import** |

---

## 6. Experiments

| Field | Value |
|-------|-------|
| **Database name** | Experiments |
| **CSV filename** | `experiments-import.csv` |
| **Import order** | 6 (after Metrics) |

### CSV columns → Notion properties

| # | CSV column | Notion property | Type | Select / multi-select options | Notes |
|---|------------|-----------------|------|-------------------------------|-------|
| 1 | Experiment | Experiment | Title | — | |
| 2 | Hypothesis | Hypothesis | Text | — | |
| 3 | Status | Status | Select | `Draft`, `Running`, `Completed`, `Cancelled` | |
| 4 | Start Date | Start Date | Date | — | |
| 5 | End Date | End Date | Date | — | |
| 6 | Variant A | Variant A | Text | — | |
| 7 | Variant B | Variant B | Text | — | |
| 8 | Result | Result | Select | `Win`, `Loss`, `Inconclusive`, `Pending` | |
| 9 | Learnings | Learnings | Text | — | |
| 10 | Decision | Decision | Select | `Ship`, `Iterate`, `Revert`, `Pending` | |

### Properties not in CSV (create after import)

| Property | Type | Relation target | Notes |
|----------|------|-----------------|-------|
| Primary Metric | Relation | Metrics | **create after import** |
| Secondary Metrics | Relation | Metrics | **create after import** — Many to many |
| Owner | Person | — | **create after import** |

---

## 7. Weekly Reviews

| Field | Value |
|-------|-------|
| **Database name** | Weekly Reviews |
| **CSV filename** | `weekly-reviews-import.csv` |
| **Import order** | 7 (no relation dependencies) |

### CSV columns → Notion properties

| # | CSV column | Notion property | Type | Select / multi-select options | Notes |
|---|------------|-----------------|------|-------------------------------|-------|
| 1 | Week | Week | Title | — | e.g. `Week of 2026-06-23` |
| 2 | Week Start | Week Start | Date | — | |
| 3 | Author | Author | Person | — | May import as Text; convert to Person |
| 4 | Summary | Summary | Text | — | |
| 5 | Wins | Wins | Text | — | |
| 6 | Pain Points | Pain Points | Text | — | |
| 7 | Metrics Snapshot | Metrics Snapshot | Text | — | |
| 8 | Decisions | Decisions | Text | — | |
| 9 | Next Week Focus | Next Week Focus | Text | — | |
| 10 | Feedback Count | Feedback Count | Number | — | |
| 11 | Issues Opened | Issues Opened | Number | — | |
| 12 | Issues Closed | Issues Closed | Number | — | |

### Properties not in CSV (create after import)

None required by schema.

---

## 8. Metrics

| Field | Value |
|-------|-------|
| **Database name** | Metrics |
| **CSV filename** | `metrics-import.csv` |
| **Import order** | 6 (before Experiments; same tier as Roadmap) |

### CSV columns → Notion properties

| # | CSV column | Notion property | Type | Select / multi-select options | Notes |
|---|------------|-----------------|------|-------------------------------|-------|
| 1 | Metric | Metric | Title | — | |
| 2 | Key | Key | Text | — | Stable slug |
| 3 | Category | Category | Select | `Activation`, `Engagement`, `Retention`, `Revenue`, `Quality`, `Alpha Ops` | |
| 4 | Definition | Definition | Text | — | |
| 5 | PostHog Event | PostHog Event | Text | — | |
| 6 | PostHog Formula | PostHog Formula | Text | — | |
| 7 | Target (Alpha) | Target (Alpha) | Text | — | Parentheses in name — keep exact |
| 8 | Current Value | Current Value | Text | — | |
| 9 | Last Updated | Last Updated | Date | — | |
| 10 | Dashboard Link | Dashboard Link | URL | — | |

### Properties not in CSV (create after import)

| Property | Type | Relation target | Notes |
|----------|------|-----------------|-------|
| Owner | Person | — | **create after import** |
| Experiments | Relation | Experiments | **create after import** |
| Roadmap | Relation | Roadmap | **create after import** |

---

## Recommended import order (summary)

| Order | Database | CSV | Est. time |
|-------|----------|-----|-----------|
| 1 | Test Users | `test-users-import.csv` | 8 min |
| 2 | Feedback Inbox | `feedback-inbox-import.csv` | 10 min |
| 3 | UX Issues | `ux-issues-import.csv` | 10 min |
| 4 | Feature Requests | `feature-requests-import.csv` | 10 min |
| 5 | Roadmap | `roadmap-import.csv` | 8 min |
| 6 | Metrics | `metrics-import.csv` | 10 min |
| 7 | Experiments | `experiments-import.csv` | 8 min |
| 8 | Weekly Reviews | `weekly-reviews-import.csv` | 8 min |
| 9 | Relations pass | — | 25 min |

**Total estimated time (databases only):** ~97 min (~1 hr 40 min)

---

## Checkbox import values

When adding rows later (not in header-only import), use:

- Checked: `Yes`, `true`, `1`, or checkbox checked in Notion UI
- Unchecked: empty cell or `No`

Header-only import creates zero rows — no checkbox conversion needed on import.

---

## Multi-select import (Theme)

When importing Feedback Inbox rows with multiple themes, use comma-separated values in the `Theme` column, e.g. `Onboarding, Export`. Notion CSV import may require semicolon depending on locale — verify on first test row in Browser Pass 1.

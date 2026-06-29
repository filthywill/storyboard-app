# Browser Import Playbook

Step-by-step instructions for the Browser Agent to create the StoryboardFlow Product Discovery Notion workspace. **Databases only** — dashboard creation is Pass 2.

**Prerequisites:**
- Notion account with permission to create pages and databases
- Access to `product-discovery/notion/import/*.csv` files
- Reference docs: `import-mapping.md`, `relation-matrix.md`, `validation-checklist.md`

**Workspace name:** `StoryboardFlow Product Discovery`

---

## Phase 0 — Workspace shell (5 min)

1. Create a new Notion page titled **StoryboardFlow Product Discovery**.
2. Add a short description: *Alpha product discovery hub — databases imported from repository.*
3. Create a child page **Databases** (all eight databases will live here or link from here).
4. Do **not** build the dashboard home layout yet (Pass 2).

---

## Phase 1 — Import order overview

Import databases in this order to minimize relation blockers:

```
Test Users → Feedback Inbox → UX Issues → Feature Requests → Roadmap → Metrics → Experiments → Weekly Reviews → Relations pass
```

---

## Database 1 — Test Users

**CSV:** `test-users-import.csv`  
**Estimated time:** 8 minutes

### Steps

1. **Create database**
   - Inside **Databases**, create a new **Table – Full page** database named `Test Users`.

2. **Import CSV**
   - Click `···` menu → **Merge with CSV** (or **Import** → CSV).
   - Upload `test-users-import.csv`.
   - Confirm first row is headers.

3. **Convert properties to correct types**

   | Column | Target type | Select options (create if prompted) |
   |--------|-------------|-------------------------------------|
   | Name | Title | (default) |
   | Email | Email | |
   | Cohort | Select | Cohort A, Cohort B, Friends & Family, Waitlist |
   | Status | Select | Invited, Active, Completed, Dropped, On Hold |
   | Role | Select | Filmmaker, Animator, Storyboard Artist, Student, Other |
   | Invited Date | Date | |
   | First Session Date | Date | |
   | Sessions Count | Number | |
   | Activated | Checkbox | |
   | Exported | Checkbox | |
   | Interview Done | Checkbox | |
   | Form Submitted | Checkbox | |
   | Notes | Text | |

4. **Create relation properties**
   - Skip for now. Add `Feedback` relation after Feedback Inbox exists (Phase 9).

5. **Verify column mappings**
   - [ ] 13 columns present, names match CSV headers exactly
   - [ ] Title column is `Name`
   - [ ] Zero data rows (header-only import)
   - [ ] All Select options listed above exist

6. **Continue** to Database 2.

---

## Database 2 — Feedback Inbox

**CSV:** `feedback-inbox-import.csv`  
**Estimated time:** 10 minutes

### Steps

1. **Create database** — Table named `Feedback Inbox`.

2. **Import CSV** — Upload `feedback-inbox-import.csv`.

3. **Convert properties**

   | Column | Target type | Select / multi-select options |
   |--------|-------------|------------------------------|
   | Summary | Title | |
   | Tester | Text | (temporary; Relation added in Phase 9) |
   | Date | Date | |
   | Source | Select | Google Form, Interview, Email, Slack, In-app, Other |
   | Sentiment | Select | Positive, Neutral, Negative, Mixed |
   | Theme | Multi-select | Onboarding, Editing, Export, Sync, Themes, Billing, Performance, Other |
   | Verbatim Quote | Text | |
   | Full Response | Text | |
   | Actionable | Checkbox | |
   | Status | Select | New, Reviewed, Triaged, Closed |

4. **Create relation properties** — Skip until Phase 9.

5. **Verify**
   - [ ] 10 columns, zero rows
   - [ ] `Theme` is Multi-select, not Select

6. **Continue** to Database 3.

---

## Database 3 — UX Issues

**CSV:** `ux-issues-import.csv`  
**Estimated time:** 10 minutes

### Steps

1. **Create database** — Table named `UX Issues`.

2. **Import CSV** — Upload `ux-issues-import.csv`.

3. **Convert properties**

   | Column | Target type | Select options |
   |--------|-------------|----------------|
   | Issue | Title | |
   | Severity | Select | Blocker, Major, Minor, Cosmetic |
   | Status | Select | Open, Investigating, In Progress, Fixed, Won't Fix, Cannot Reproduce |
   | Area | Select | Welcome, Auth, Project Picker, Storyboard Editor, Export, Sync, Settings, Billing, Other |
   | Steps to Reproduce | Text | |
   | Expected Behavior | Text | |
   | Actual Behavior | Text | |
   | PostHog Event | Text | |
   | Priority | Select | P0, P1, P2, P3 |
   | GitHub Issue | URL | |

4. **Create relation properties** — Skip until Phase 9.

5. **Verify**
   - [ ] 10 columns, zero rows
   - [ ] `GitHub Issue` is URL type

6. **Continue** to Database 4.

---

## Database 4 — Feature Requests

**CSV:** `feature-requests-import.csv`  
**Estimated time:** 10 minutes

### Steps

1. **Create database** — Table named `Feature Requests`.

2. **Import CSV** — Upload `feature-requests-import.csv`.

3. **Convert properties**

   | Column | Target type | Select options |
   |--------|-------------|----------------|
   | Feature | Title | |
   | Description | Text | |
   | Category | Select | Core Editing, Collaboration, Export, Integrations, Themes, Mobile, Admin, Other |
   | Impact | Select | High, Medium, Low |
   | Effort | Select | Large, Medium, Small, Unknown |
   | Status | Select | New, Under Review, Planned, In Progress, Shipped, Declined |
   | Priority | Select | P0, P1, P2, P3 |
   | Votes | Number | |
   | GitHub Issue | URL | |

4. **Create relation properties** — Skip until Phase 9.

5. **Verify**
   - [ ] 9 columns, zero rows

6. **Continue** to Database 5.

---

## Database 5 — Roadmap

**CSV:** `roadmap-import.csv`  
**Estimated time:** 8 minutes

### Steps

1. **Create database** — Table named `Roadmap`.

2. **Import CSV** — Upload `roadmap-import.csv`.

3. **Convert properties**

   | Column | Target type | Select options |
   |--------|-------------|----------------|
   | Initiative | Title | |
   | Description | Text | |
   | Quarter | Select | Q1 2026, Q2 2026, Q3 2026, Q4 2026, Backlog |
   | Horizon | Select | Now, Next, Later |
   | Theme | Select | Activation, Retention, Monetization, Quality, Platform, Alpha Ops |
   | Status | Select | Not Started, In Progress, Done, Paused |
   | Priority | Select | P0, P1, P2, P3 |
   | Target Date | Date | |
   | Notes | Text | |

4. **Create relation properties** — Skip until Phase 9.

5. **Verify**
   - [ ] 9 columns, zero rows

6. **Continue** to Database 6.

---

## Database 6 — Metrics

**CSV:** `metrics-import.csv`  
**Estimated time:** 10 minutes

### Steps

1. **Create database** — Table named `Metrics`.

2. **Import CSV** — Upload `metrics-import.csv`.

3. **Convert properties**

   | Column | Target type | Select options |
   |--------|-------------|----------------|
   | Metric | Title | |
   | Key | Text | |
   | Category | Select | Activation, Engagement, Retention, Revenue, Quality, Alpha Ops |
   | Definition | Text | |
   | PostHog Event | Text | |
   | PostHog Formula | Text | |
   | Target (Alpha) | Text | Keep parentheses in property name |
   | Current Value | Text | |
   | Last Updated | Date | |
   | Dashboard Link | URL | |

4. **Create relation properties** — Skip until Phase 9.

5. **Verify**
   - [ ] 10 columns, zero rows
   - [ ] Property named exactly `Target (Alpha)`

6. **Continue** to Database 7.

---

## Database 7 — Experiments

**CSV:** `experiments-import.csv`  
**Estimated time:** 8 minutes

### Steps

1. **Create database** — Table named `Experiments`.

2. **Import CSV** — Upload `experiments-import.csv`.

3. **Convert properties**

   | Column | Target type | Select options |
   |--------|-------------|----------------|
   | Experiment | Title | |
   | Hypothesis | Text | |
   | Status | Select | Draft, Running, Completed, Cancelled |
   | Start Date | Date | |
   | End Date | Date | |
   | Variant A | Text | |
   | Variant B | Text | |
   | Result | Select | Win, Loss, Inconclusive, Pending |
   | Learnings | Text | |
   | Decision | Select | Ship, Iterate, Revert, Pending |

4. **Create relation properties** — Skip until Phase 9.

5. **Verify**
   - [ ] 10 columns, zero rows

6. **Continue** to Database 8.

---

## Database 8 — Weekly Reviews

**CSV:** `weekly-reviews-import.csv`  
**Estimated time:** 8 minutes

### Steps

1. **Create database** — Table named `Weekly Reviews`.

2. **Import CSV** — Upload `weekly-reviews-import.csv`.

3. **Convert properties**

   | Column | Target type | Notes |
   |--------|-------------|-------|
   | Week | Title | |
   | Week Start | Date | |
   | Author | Person | If CSV import fails for Person, use Text and convert manually |
   | Summary | Text | |
   | Wins | Text | |
   | Pain Points | Text | |
   | Metrics Snapshot | Text | |
   | Decisions | Text | |
   | Next Week Focus | Text | |
   | Feedback Count | Number | |
   | Issues Opened | Number | |
   | Issues Closed | Number | |

4. **Create relation properties** — None required.

5. **Verify**
   - [ ] 12 columns, zero rows

6. **Continue** to Phase 9.

---

## Phase 9 — Relations pass (25 min)

Create relations in this order. For each: **Add property → Relation → select target database → configure cardinality.**

| # | Source database | Property name | Target | Cardinality |
|---|-----------------|---------------|--------|-------------|
| 1 | Feedback Inbox | Tester (Relation) | Test Users | Many → One |
| 2 | Test Users | Feedback | Feedback Inbox | One → Many (inverse of #1) |
| 3 | Feedback Inbox | Linked UX Issue | UX Issues | Many → One |
| 4 | Feedback Inbox | Linked Feature Request | Feature Requests | Many → One |
| 5 | Feedback Inbox | GitHub Issue | — | URL property (not relation) |
| 6 | UX Issues | Reported By | Test Users | Many → One |
| 7 | UX Issues | Feedback Source | Feedback Inbox | Many → One |
| 8 | UX Issues | Assignee | — | Person |
| 9 | UX Issues | Roadmap Item | Roadmap | Many → One |
| 10 | UX Issues | Created | — | Created time (auto) |
| 11 | UX Issues | Resolved Date | — | Date |
| 12 | Feature Requests | Requested By | Test Users | Many → One |
| 13 | Feature Requests | Feedback Source | Feedback Inbox | Many → One |
| 14 | Feature Requests | Roadmap Item | Roadmap | Many → One |
| 15 | Feature Requests | Created | — | Created time (auto) |
| 16 | Roadmap | Owner | — | Person |
| 17 | Roadmap | UX Issues | UX Issues | Many ↔ Many |
| 18 | Roadmap | Feature Requests | Feature Requests | Many ↔ Many |
| 19 | Roadmap | Success Metric | Metrics | Many → One |
| 20 | Experiments | Primary Metric | Metrics | Many → One |
| 21 | Experiments | Secondary Metrics | Metrics | Many ↔ Many |
| 22 | Experiments | Owner | — | Person |
| 23 | Metrics | Owner | — | Person |
| 24 | Metrics | Experiments | Experiments | Many ↔ Many |
| 25 | Metrics | Roadmap | Roadmap | Many ↔ Many |

**Tester column note:** After creating `Tester (Relation)` on Feedback Inbox, hide or delete the imported Text column `Tester` if redundant.

---

## Phase 10 — Final verification (10 min)

Run every item in `validation-checklist.md`. Do not proceed to dashboard (Pass 2) until all database checks pass.

---

## Time summary

| Phase | Task | Est. time |
|-------|------|-----------|
| 0 | Workspace shell | 5 min |
| 1 | Test Users | 8 min |
| 2 | Feedback Inbox | 10 min |
| 3 | UX Issues | 10 min |
| 4 | Feature Requests | 10 min |
| 5 | Roadmap | 8 min |
| 6 | Metrics | 10 min |
| 7 | Experiments | 8 min |
| 8 | Weekly Reviews | 8 min |
| 9 | Relations pass | 25 min |
| 10 | Validation | 10 min |
| **Total** | | **~112 min (~1 hr 52 min)** |

---

## Browser Agent tips

- Prefer **full-page databases** over inline for easier CSV import.
- When Notion auto-detects wrong types, fix types **before** adding relations.
- If header-only import creates one empty row, delete it and confirm zero rows.
- Copy Select option spelling exactly from `import-mapping.md` (including `Won't Fix`, `Friends & Family`).
- Screenshot each database schema view if validation fails — aids debugging in Pass 2.

---

## Out of scope (Pass 2)

- Product Discovery Home dashboard (`../dashboard-layout.md`)
- Linked database views on Home page
- Populating Metrics from `../metrics.csv` example data
- Google Form or PostHog links on Home page

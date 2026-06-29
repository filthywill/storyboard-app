# StoryboardFlow Product Discovery Kit

This folder contains the **Product Discovery Kit** for StoryboardFlow — a version-controlled, human-readable workspace that captures alpha testing, feedback, metrics, and launch planning. It is designed to be imported into Notion in Phase B while remaining useful directly from the repository.

## Purpose of Product Discovery

Product Discovery is the structured process of learning whether StoryboardFlow solves real problems for storyboard creators before and during alpha launch. This kit provides:

- **A single source of truth** for qualitative feedback (interviews, forms, UX issues, feature requests)
- **Operational templates** for running alpha tests with consistent scripts and instructions
- **Analytics alignment** with the existing PostHog implementation (`src/services/analytics/`)
- **Launch readiness** checklists and measurable success criteria

The goal is not to collect data in isolation, but to connect tester behavior, product analytics, and team decisions into a repeatable loop.

## Workflow

```
Tester
  ↓
StoryboardFlow
  ↓
PostHog
  ↓
Google Form
  ↓
Notion
  ↓
GitHub Issues
```

### How each component interacts

| Component | Role | Inputs | Outputs |
|-----------|------|--------|---------|
| **Tester** | Alpha participant who exercises core flows | Invitation, tester instructions, alpha test script | Session behavior, interview notes, form responses |
| **StoryboardFlow** | The product under test | Tester actions (create project, add shots, export, sign up) | In-app experience; no direct feedback capture |
| **PostHog** | Product analytics (events, funnels, retention) | Instrumented events from the app (`app_started`, `project_created`, `first_shot_added`, `export_completed`, etc.) | Dashboards, cohorts, activation metrics |
| **Google Form** | Structured post-session feedback | Tester completes form after session (questions in `testing/google-form-questions.md`) | CSV export or manual entry into Notion Feedback Inbox |
| **Notion** | Product discovery hub (Phase B) | CSV imports, manual notes, weekly reviews | Prioritized roadmap, UX issue tracking, experiment log |
| **GitHub Issues** | Engineering execution | Triaged items from Notion (bugs, features, experiments) | Fixes, features, PRs linked back to discovery records |

### End-to-end flow

1. **Recruit** — Add testers to `notion/test-users.csv` (template rows only until real recruits are confirmed).
2. **Onboard** — Send `testing/tester-instructions.md` and schedule optional interviews using `testing/interview-guide.md`.
3. **Test** — Tester follows `testing/alpha-test-script.md` while using StoryboardFlow.
4. **Measure** — PostHog captures activation events automatically; see `analytics/` for funnel and dashboard definitions.
5. **Collect feedback** — Tester submits the Google Form; responses are logged in `notion/feedback-inbox.csv` or imported to Notion.
6. **Synthesize** — Weekly review (`notion/weekly-reviews.csv`) summarizes themes; UX issues and feature requests are triaged.
7. **Execute** — Actionable items become GitHub Issues with links to Notion records.

## Repository structure

```
product-discovery/
├── README.md                 ← This file
├── notion/                   ← Notion import templates and schema docs
├── testing/                  ← Alpha test materials
├── analytics/                ← PostHog funnel, metrics, dashboard plan
└── launch/                   ← Launch checklist and success metrics
```

## Conventions

- **CSV files** use generic example rows (`Tester A`, `Sample Issue`) — replace with real data during alpha; do not treat examples as customers.
- **Dates** in examples use ISO 8601 (`YYYY-MM-DD`).
- **Status values** are documented in `notion/database-schema.md` and should stay consistent across CSVs and Notion.
- **Event names** match `src/services/analytics/events.ts` exactly (snake_case strings).

## Phase B (Notion import)

Before importing:

1. Review `notion/database-schema.md` and create matching Notion databases.
2. Import CSVs from `notion/` using Notion's CSV import (map columns to properties).
3. Build the dashboard using `notion/dashboard-layout.md` as the wireframe.
4. Link PostHog project to the same metric definitions in `analytics/metrics-definition.md`.

See **Recommendations before Phase B** in the verification section of the Phase A deliverable (or ask the team lead for the latest checklist).

## What this kit does not include

- Application code changes (`src/`, `public/` are out of scope)
- Live Notion workspace, Google Form, or PostHog configuration
- Real customer or tester PII — use placeholders until recruitment is complete

---

*StoryboardFlow Product Discovery Kit — Phase A (Repository Only)*

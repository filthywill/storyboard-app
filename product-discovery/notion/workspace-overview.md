# StoryboardFlow — Notion Workspace Overview

This document describes the intended Notion workspace for Product Discovery. Create these pages and databases in Phase B using the schema and CSV templates in this folder.

## Workspace purpose

Centralize alpha testing, feedback triage, roadmap planning, and metric tracking for StoryboardFlow — a cloud-synced storyboard creation tool for filmmakers, animators, and creative teams.

## Top-level pages

| Page | Purpose |
|------|---------|
| **Product Discovery Home** | Dashboard (see `dashboard-layout.md`) |
| **Feedback** | Feedback Inbox database + linked UX Issues and Feature Requests |
| **Roadmap** | Roadmap database with quarterly views |
| **Experiments** | A/B tests and hypothesis tracking |
| **Metrics** | KPI definitions linked to PostHog |
| **Alpha Testing** | Test users, scripts (link to repo `testing/`) |
| **Weekly Reviews** | Recurring synthesis notes |

## Databases

| Database | CSV template | Primary use |
|----------|--------------|-------------|
| Test Users | `test-users.csv` | Alpha cohort roster and status |
| Feedback Inbox | `feedback-inbox.csv` | Raw qualitative input from forms and interviews |
| UX Issues | `ux-issues.csv` | Usability bugs and friction points |
| Feature Requests | `feature-requests.csv` | Enhancement ideas with priority |
| Roadmap | `roadmap.csv` | Planned work by quarter and theme |
| Experiments | `experiments.csv` | Hypothesis-driven tests |
| Weekly Reviews | `weekly-reviews.csv` | Team synthesis cadence |
| Metrics | `metrics.csv` | KPI registry with PostHog mapping |

Full property definitions: `database-schema.md`.

## Relationships (summary)

```
Test Users ──< Feedback Inbox
Feedback Inbox ──> UX Issues (optional link)
Feedback Inbox ──> Feature Requests (optional link)
UX Issues ──> Roadmap (when scheduled)
Feature Requests ──> Roadmap (when accepted)
Experiments ──> Metrics (success criteria)
Weekly Reviews ──> all databases (rollup references)
```

## Roles and permissions (recommended)

| Role | Access |
|------|--------|
| Product lead | Full edit on all databases |
| Engineering | Edit UX Issues, Roadmap, Experiments; comment on Feedback |
| Design | Edit UX Issues, Feature Requests; comment on Feedback |
| Alpha coordinators | Edit Test Users, Feedback Inbox |
| Stakeholders | Read-only on Home, Roadmap, Metrics |

## Integration points

| External system | How it connects |
|-----------------|-----------------|
| **PostHog** | Metric names and event mapping in `../analytics/`; paste dashboard links into Metrics database |
| **Google Form** | Responses imported to Feedback Inbox weekly |
| **GitHub** | URL property on UX Issues and Feature Requests for issue links |
| **Repository** | This `product-discovery/` folder remains source of templates; sync major schema changes via PR |

## Suggested tags (workspace-wide)

- `alpha` — Alpha program scope
- `activation` — Onboarding and first-value flows
- `export` — PDF/PNG export experience
- `sync` — Cloud sync and offline behavior
- `billing` — Plans and upgrade flows
- `accessibility` — A11y improvements

## Getting started (Phase B checklist)

1. [ ] Create workspace or teamspace: **StoryboardFlow Product Discovery**
2. [ ] Create all eight databases from `database-schema.md`
3. [ ] Import CSV templates (replace example rows or delete after import)
4. [ ] Build Home page from `dashboard-layout.md`
5. [ ] Add links to PostHog dashboards (`../analytics/dashboard-plan.md`)
6. [ ] Add link to Google Form (create from `../testing/google-form-questions.md`)
7. [ ] Document GitHub repo and issue label conventions

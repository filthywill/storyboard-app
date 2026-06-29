# Alpha Success Metrics

Measurable goals for the StoryboardFlow alpha. Pair with PostHog (quantitative) and Notion/Google Form (qualitative).

**Alpha duration (suggested):** 4–6 weeks  
**Cohort size (suggested):** 10–20 testers across 2 cohorts  

---

## Primary success criteria

Alpha is **successful** if we meet **at least 4 of 6** primary criteria below by end of week 6.

| # | Metric | Target | Source | Event / field |
|---|--------|--------|--------|---------------|
| 1 | First shot activation rate | ≥ 60% | PostHog | `project_created` → `first_shot_added` |
| 2 | Export completion rate (of activated) | ≥ 40% | PostHog | `first_shot_added` → `export_completed` |
| 3 | Full activation rate | ≥ 25% | PostHog | 4-step funnel from `app_started` |
| 4 | Median time to first shot | < 10 min | PostHog | Funnel time-to-convert |
| 5 | Export failure rate | < 5% | PostHog | `export_failed` / `export_started` |
| 6 | Tester satisfaction (NPS proxy) | ≥ 7/10 avg | Google Form | Q15 overall satisfaction |

---

## Secondary success criteria

| Metric | Target | Source |
|--------|--------|--------|
| Project creation rate | ≥ 70% of sessions | PostHog |
| Signup completion rate (of modal opens) | ≥ 50% | PostHog |
| Feedback response rate | ≥ 80% of active testers | Notion Test Users |
| Interview completion | ≥ 50% of activated testers | Notion Test Users |
| P0 UX issues open > 14 days | 0 | Notion UX Issues |
| `app_error_boundary` rate | < 2% of sessions | PostHog |

---

## Qualitative success signals

Alpha is **directionally positive** if weekly reviews consistently report:

- Testers describe StoryboardFlow as **faster or simpler** than their current tool (≥ 60% of interviews)
- **Export discoverability** theme decreases week-over-week after fixes
- At least **3 testers** volunteer for a second cohort or real-project pilot
- No unresolved **blocker** severity issues older than 7 days

---

## Failure signals (stop and fix)

Pause new invites if any occur:

| Signal | Threshold | Action |
|--------|-----------|--------|
| Data loss reports | ≥ 1 confirmed | Hotfix + cohort pause |
| Auth completely broken | > 50% failure rate | Hotfix |
| Export failure rate | > 15% for 48h | Hotfix |
| Zero `first_shot_added` in 7 days | Cohort n ≥ 5 | UX review of onboarding |
| Median satisfaction | < 4/10 for 2 consecutive weeks | Discovery reset |

---

## Cohort milestones

### Week 1 — Instrumentation and first sessions
- 5+ testers complete first session
- All 5 core events visible in PostHog
- First weekly review published

### Week 2–3 — Activation focus
- First shot rate ≥ 50% (ramp toward 60%)
- Top 3 UX issues identified and assigned
- 3+ interviews completed

### Week 4–5 — Export and retention
- Export rate ≥ 30% (ramp toward 40%)
- At least 3 testers return for second session
- One experiment completed (see `notion/experiments.csv`)

### Week 6 — Go / no-go for broader beta
- Primary criteria scorecard completed
- Roadmap updated for next quarter
- Decision: expand beta, iterate alpha, or pivot scope

---

## Go / no-go decision framework

| Outcome | Condition | Next step |
|---------|-----------|-----------|
| **Go — expand beta** | ≥ 4/6 primary + no failure signals | Widen invite list; keep discovery cadence |
| **Iterate — alpha extend** | 2–3/6 primary OR qualitative mixed | 4-week extension; focus on top funnel step |
| **Pivot scope** | < 2/6 primary OR critical failure signals | Re-scope MVP; user research sprint |

---

## Reporting template (weekly)

```
Week of YYYY-MM-DD
Primary: [_/6 criteria met cumulative]
Funnel: app_started __ | project_created __% | first_shot_added __% | export_completed __%
Qualitative: [1-2 sentences]
Decision: [continue / fix / pause invites]
```

Copy into `notion/weekly-reviews.csv` and Notion Weekly Reviews database.

---

## Alignment with product vision

Alpha proves:

1. **Storyboard creators can activate** without hand-holding (`first_shot_added`).
2. **StoryboardFlow delivers a deliverable** (`export_completed`).
3. **Feedback loop works** — issues become shipped fixes within 2-week cycles.

Long-term metrics (post-alpha) — retention, paid conversion, collaboration — are out of scope for this document.

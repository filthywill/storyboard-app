# Product Discovery Dashboard — Wireframe (Markdown)

Notion page: **Product Discovery Home**

Layout is top-to-bottom. Use linked database views (not full tables) where noted to keep the page scannable.

---

## Top section

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  StoryboardFlow · Product Discovery                          [Alpha Phase]  │
│  Last updated: YYYY-MM-DD · Owner: Product Lead                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  MISSION                                                                      │
│  Validate that new users reach first export within their first session       │
│  and that storyboard creators prefer StoryboardFlow over spreadsheets.       │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Blocks:**
- Page title + phase badge (`Alpha`)
- Last review date (manual or synced from Weekly Reviews)
- One-sentence current focus (updated each weekly review)

---

## Quick links

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│  PostHog         │  Google Form     │  Alpha Script    │  GitHub Issues   │
│  Dashboard       │  (Feedback)      │  (repo link)     │  (label: alpha)  │
├──────────────────┼──────────────────┼──────────────────┼──────────────────┤
│  Test Users DB   │  Interview       │  Metrics Defs    │  Launch          │
│                  │  Guide           │  (repo)          │  Checklist       │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

**Blocks:**
- Bookmark row: external URLs (PostHog, Form) + internal Notion pages
- Link to `product-discovery/` folder in GitHub for canonical templates

---

## Current priorities

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CURRENT PRIORITIES (this week)                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. [P0] Example: Reduce time-to-first-shot for guest users                 │
│  2. [P1] Example: Clarify export format choice (PDF vs PNG)                 │
│  3. [P1] Example: Interview 3 testers from Cohort A                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Blocks:**
- Bulleted list (manual, from weekly review)
- Optional: linked view — **Roadmap** filtered `Status = In Progress` AND `Priority = P0|P1`, limit 5

---

## Recent feedback

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  RECENT FEEDBACK                                    [View all → Inbox]       │
├──────────┬────────────┬─────────────────────────────────────┬───────────────┤
│  Date    │  Tester    │  Summary                            │  Sentiment    │
├──────────┼────────────┼─────────────────────────────────────┼───────────────┤
│  (linked database view: Feedback Inbox, sorted by Date desc, limit 5)      │
└──────────┴────────────┴─────────────────────────────────────┴───────────────┘
```

**Blocks:**
- Inline linked database: **Feedback Inbox**
- Properties visible: Date, Tester, Summary, Sentiment, Source
- Filter: `Date` is within past 14 days

---

## Activation metrics

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ACTIVATION METRICS (alpha cohort · last 7 days)                             │
├────────────────────┬────────────┬────────────┬────────────┬─────────────────┤
│  App started       │  Project   │  First shot│  Export    │  Signup         │
│                    │  created   │  added     │  completed │  completed      │
├────────────────────┼────────────┼────────────┼────────────┼─────────────────┤
│  ___               │  ___       │  ___       │  ___       │  ___            │
│  (from PostHog or Metrics DB · paste weekly)                                 │
└────────────────────┴────────────┴────────────┴────────────┴─────────────────┘
```

**Blocks:**
- Callout with 5 KPI numbers (manual refresh weekly, or embed PostHog insight if available)
- Link to full funnel: `../analytics/activation-funnel.md`
- Optional: linked view — **Metrics** where `Category = Activation`

---

## Weekly review

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LATEST WEEKLY REVIEW                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Week of YYYY-MM-DD                                                          │
│  • Wins: …                                                                   │
│  • Pain points: …                                                            │
│  • Decisions: …                                                              │
│  [Open full entry → Weekly Reviews DB]                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Blocks:**
- Linked database: **Weekly Reviews**, sorted by Week desc, limit 1, opened as preview
- Or: synced block from latest review page

---

## Roadmap snapshot

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ROADMAP SNAPSHOT · Q_ YYYY                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Now          │  Next         │  Later                                       │
│  ─────────    │  ─────────    │  ─────────                                   │
│  (Board view: Roadmap by Status column — Now / Next / Later)                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Blocks:**
- Linked database: **Roadmap**
- View: Board grouped by `Horizon` (Now, Next, Later)
- Filter: `Quarter` = current quarter OR `Status` = In Progress

---

## Footer (optional)

- Changelog note: "Schema v1 — see `database-schema.md` in repo"
- Contact: product lead email or Slack channel

---

## Mobile / narrow layout note

Stack sections vertically in this order on mobile: Mission → Quick links → Priorities → Activation → Feedback → Weekly review → Roadmap.

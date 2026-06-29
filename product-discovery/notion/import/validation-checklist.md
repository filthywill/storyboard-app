# Notion Import Validation Checklist

Run after Browser Pass 1 (database creation and relations). Check each item before starting Pass 2 (dashboard).

---

## Workspace

- [ ] Page **StoryboardFlow Product Discovery** exists
- [ ] Child page **Databases** (or equivalent) organizes all eight databases
- [ ] Dashboard Home **not** built yet (Pass 2)

---

## Database existence

- [ ] **Test Users** database exists (full page)
- [ ] **Feedback Inbox** database exists
- [ ] **UX Issues** database exists
- [ ] **Feature Requests** database exists
- [ ] **Roadmap** database exists
- [ ] **Metrics** database exists
- [ ] **Experiments** database exists
- [ ] **Weekly Reviews** database exists

---

## Column names correct

Compare each database to its import CSV header (exact spelling and order).

### Test Users (`test-users-import.csv`)

- [ ] Name, Email, Cohort, Status, Role, Invited Date, First Session Date, Sessions Count, Activated, Exported, Interview Done, Form Submitted, Notes

### Feedback Inbox (`feedback-inbox-import.csv`)

- [ ] Summary, Tester, Date, Source, Sentiment, Theme, Verbatim Quote, Full Response, Actionable, Status

### UX Issues (`ux-issues-import.csv`)

- [ ] Issue, Severity, Status, Area, Steps to Reproduce, Expected Behavior, Actual Behavior, PostHog Event, Priority, GitHub Issue

### Feature Requests (`feature-requests-import.csv`)

- [ ] Feature, Description, Category, Impact, Effort, Status, Priority, Votes, GitHub Issue

### Roadmap (`roadmap-import.csv`)

- [ ] Initiative, Description, Quarter, Horizon, Theme, Status, Priority, Target Date, Notes

### Experiments (`experiments-import.csv`)

- [ ] Experiment, Hypothesis, Status, Start Date, End Date, Variant A, Variant B, Result, Learnings, Decision

### Weekly Reviews (`weekly-reviews-import.csv`)

- [ ] Week, Week Start, Author, Summary, Wins, Pain Points, Metrics Snapshot, Decisions, Next Week Focus, Feedback Count, Issues Opened, Issues Closed

### Metrics (`metrics-import.csv`)

- [ ] Metric, Key, Category, Definition, PostHog Event, PostHog Formula, Target (Alpha), Current Value, Last Updated, Dashboard Link

---

## Property types correct

Spot-check each database (see `import-mapping.md` for full list).

### Test Users

- [ ] Title = Name
- [ ] Email, Date, Number, Checkbox, Text types correct
- [ ] Cohort, Status, Role = Select with full option sets

### Feedback Inbox

- [ ] Theme = **Multi-select** (not Select)
- [ ] Actionable = Checkbox
- [ ] Source, Sentiment, Status = Select

### UX Issues

- [ ] GitHub Issue = URL
- [ ] Severity, Status, Area, Priority = Select

### Feature Requests

- [ ] Votes = Number
- [ ] GitHub Issue = URL

### Roadmap

- [ ] Target Date = Date
- [ ] Quarter, Horizon, Theme, Status, Priority = Select

### Metrics

- [ ] Property name **Target (Alpha)** preserved (with parentheses)
- [ ] Dashboard Link = URL
- [ ] Last Updated = Date

### Experiments

- [ ] Start Date, End Date = Date
- [ ] Status, Result, Decision = Select

### Weekly Reviews

- [ ] Author = Person (or Text if Person import blocked — note for fix)
- [ ] Feedback Count, Issues Opened, Issues Closed = Number

---

## Select options match schema

Verify options exist (not necessarily every option used). Reference: `import-mapping.md`.

- [ ] Test Users: Cohort (4), Status (5), Role (5)
- [ ] Feedback Inbox: Source (6), Sentiment (4), Status (4), Theme (8 multi-select)
- [ ] UX Issues: Severity (4), Status (6), Area (10), Priority (4)
- [ ] Feature Requests: Category (8), Impact (3), Effort (4), Status (6), Priority (4)
- [ ] Roadmap: Quarter (5), Horizon (3), Theme (6), Status (4), Priority (4)
- [ ] Experiments: Status (4), Result (4), Decision (4)
- [ ] Metrics: Category (6)

**Critical spellings:**

- [ ] `Won't Fix` (UX Issues Status)
- [ ] `Friends & Family` (Test Users Cohort)
- [ ] `Storyboard Artist` (Test Users Role)
- [ ] `Cannot Reproduce` (UX Issues Status)

---

## Relations exist

See `relation-matrix.md` for full list.

### Test Users ↔ Feedback

- [ ] Feedback Inbox.**Tester** → Test Users (Relation, Many → One)
- [ ] Test Users.**Feedback** → Feedback Inbox (Relation, One → Many)

### Feedback Inbox

- [ ] **Linked UX Issue** → UX Issues
- [ ] **Linked Feature Request** → Feature Requests
- [ ] **GitHub Issue** (URL property)

### UX Issues

- [ ] **Reported By** → Test Users
- [ ] **Feedback Source** → Feedback Inbox
- [ ] **Roadmap Item** → Roadmap
- [ ] **Assignee** (Person)
- [ ] **Created** (Created time)
- [ ] **Resolved Date** (Date)

### Feature Requests

- [ ] **Requested By** → Test Users
- [ ] **Feedback Source** → Feedback Inbox
- [ ] **Roadmap Item** → Roadmap
- [ ] **Created** (Created time)

### Roadmap

- [ ] **UX Issues** ↔ UX Issues (Many ↔ Many)
- [ ] **Feature Requests** ↔ Feature Requests (Many ↔ Many)
- [ ] **Success Metric** → Metrics
- [ ] **Owner** (Person)

### Experiments

- [ ] **Primary Metric** → Metrics
- [ ] **Secondary Metrics** ↔ Metrics (Many ↔ Many)
- [ ] **Owner** (Person)

### Metrics

- [ ] **Owner** (Person)
- [ ] **Experiments** ↔ Experiments (if inverse not auto-created)
- [ ] **Roadmap** ↔ Roadmap (if inverse not auto-created)

### Weekly Reviews

- [ ] No relations required ✓

---

## Empty template rows removed

- [ ] Test Users: **0 rows** (header-only import)
- [ ] Feedback Inbox: **0 rows**
- [ ] UX Issues: **0 rows**
- [ ] Feature Requests: **0 rows**
- [ ] Roadmap: **0 rows**
- [ ] Metrics: **0 rows**
- [ ] Experiments: **0 rows**
- [ ] Weekly Reviews: **0 rows**

If Notion created a blank row on import, delete it.

---

## Data hygiene

- [ ] No example rows from `../test-users.csv` etc. copied into production
- [ ] Text column **Tester** on Feedback Inbox hidden or removed if Relation column replaces it
- [ ] No duplicate databases (e.g. two "Metrics" tables)

---

## Cross-reference integrity

- [ ] All relation targets point to correct database names
- [ ] No broken relation icons (red error state) in Notion
- [ ] Relation property names match `relation-matrix.md`

---

## Documentation alignment

- [ ] Notion schema matches `../database-schema.md` (CSV columns + post-import properties)
- [ ] Import CSV headers match `../import/*-import.csv` files in repo
- [ ] Select options match `import-mapping.md`

---

## Ready for Pass 2 (dashboard)

- [ ] All database checks above passed
- [ ] Team can add first real Test User row manually as smoke test
- [ ] `../dashboard-layout.md` reviewed for linked views to create
- [ ] PostHog and Google Form URLs ready to paste into Quick Links (optional in Pass 2)

---

## Sign-off

| Check | Pass? | Notes |
|-------|-------|-------|
| 8 databases | ☐ | |
| Column names | ☐ | |
| Property types | ☐ | |
| Select options | ☐ | |
| Relations | ☐ | |
| Zero template rows | ☐ | |
| Ready for Pass 2 | ☐ | |

**Validated by:** _______________  
**Date:** _______________

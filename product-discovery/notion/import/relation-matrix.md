# Relation Matrix

Complete map of every relation and post-import property between Product Discovery databases. Use with `browser-import-playbook.md` Phase 9.

**Cardinality notation:**
- **Many → One** — Many rows in source link to one row in target
- **One → Many** — Inverse of Many → One (Notion may create automatically)
- **Many ↔ Many** — Either side can link to multiple rows on the other side

---

## Summary table

| # | Source database | Property | Target database | Cardinality | Required | In CSV? |
|---|-----------------|----------|-----------------|-------------|----------|---------|
| 1 | Test Users | Feedback | Feedback Inbox | One → Many | No | No — create after import |
| 2 | Feedback Inbox | Tester | Test Users | Many → One | No | Text placeholder only |
| 3 | Feedback Inbox | Linked UX Issue | UX Issues | Many → One | No | No — create after import |
| 4 | Feedback Inbox | Linked Feature Request | Feature Requests | Many → One | No | No — create after import |
| 5 | UX Issues | Reported By | Test Users | Many → One | No | No — create after import |
| 6 | UX Issues | Feedback Source | Feedback Inbox | Many → One | No | No — create after import |
| 7 | UX Issues | Roadmap Item | Roadmap | Many → One | No | No — create after import |
| 8 | Feature Requests | Requested By | Test Users | Many → One | No | No — create after import |
| 9 | Feature Requests | Feedback Source | Feedback Inbox | Many → One | No | No — create after import |
| 10 | Feature Requests | Roadmap Item | Roadmap | Many → One | No | No — create after import |
| 11 | Roadmap | UX Issues | UX Issues | Many ↔ Many | No | No — create after import |
| 12 | Roadmap | Feature Requests | Feature Requests | Many ↔ Many | No | No — create after import |
| 13 | Roadmap | Success Metric | Metrics | Many → One | No | No — create after import |
| 14 | Experiments | Primary Metric | Metrics | Many → One | No | No — create after import |
| 15 | Experiments | Secondary Metrics | Metrics | Many ↔ Many | No | No — create after import |
| 16 | Metrics | Experiments | Experiments | Many ↔ Many | No | No — create after import (inverse) |
| 17 | Metrics | Roadmap | Roadmap | Many ↔ Many | No | No — create after import (inverse) |

---

## Detailed relations

### Test Users

#### Feedback Inbox → Test Users (via Feedback Inbox.Tester)

```
Feedback Inbox
  → Test Users
  Relation: Many Feedback to One Tester
```

| Field | Value |
|-------|-------|
| **Source** | Feedback Inbox |
| **Property** | Tester |
| **Target** | Test Users |
| **Cardinality** | Many → One |
| **Inverse (optional)** | Test Users.Feedback (One → Many) |
| **Use case** | Link form/interview feedback to alpha tester |
| **Create** | After both databases exist |

#### Test Users → Feedback Inbox (inverse)

```
Test Users
  → Feedback Inbox
  Relation: One Tester to Many Feedback
```

| Field | Value |
|-------|-------|
| **Source** | Test Users |
| **Property** | Feedback |
| **Target** | Feedback Inbox |
| **Cardinality** | One → Many |
| **Use case** | View all feedback from a tester on their profile row |
| **Create** | Notion may auto-create when defining inverse on Feedback Inbox |

---

### Feedback Inbox

#### Feedback Inbox → UX Issues

```
Feedback Inbox
  → UX Issues
  Relation: Many Feedback to One UX Issue (optional link)
```

| Field | Value |
|-------|-------|
| **Source** | Feedback Inbox |
| **Property** | Linked UX Issue |
| **Target** | UX Issues |
| **Cardinality** | Many → One |
| **Use case** | Triage feedback into a tracked UX issue |
| **Create** | After UX Issues exists |

#### Feedback Inbox → Feature Requests

```
Feedback Inbox
  → Feature Requests
  Relation: Many Feedback to One Feature Request (optional link)
```

| Field | Value |
|-------|-------|
| **Source** | Feedback Inbox |
| **Property** | Linked Feature Request |
| **Target** | Feature Requests |
| **Cardinality** | Many → One |
| **Use case** | Triage feedback into a feature request |
| **Create** | After Feature Requests exists |

---

### UX Issues

#### UX Issues → Test Users

```
UX Issues
  → Test Users
  Relation: Many Issues to One Reporter (optional)
```

| Field | Value |
|-------|-------|
| **Source** | UX Issues |
| **Property** | Reported By |
| **Target** | Test Users |
| **Cardinality** | Many → One |

#### UX Issues → Feedback Inbox

```
UX Issues
  → Feedback Inbox
  Relation: Many Issues to One Feedback Source (optional)
```

| Field | Value |
|-------|-------|
| **Source** | UX Issues |
| **Property** | Feedback Source |
| **Target** | Feedback Inbox |
| **Cardinality** | Many → One |
| **Note** | Often one feedback spawns one issue; many issues may share one feedback |

#### UX Issues → Roadmap

```
UX Issues
  → Roadmap
  Relation: Many Issues to One Roadmap Initiative (optional)
```

| Field | Value |
|-------|-------|
| **Source** | UX Issues |
| **Property** | Roadmap Item |
| **Target** | Roadmap |
| **Cardinality** | Many → One |
| **Inverse** | Roadmap.UX Issues (Many ↔ Many — see below) |

---

### Feature Requests

#### Feature Requests → Test Users

```
Feature Requests
  → Test Users
  Relation: Many Requests to One Requester (optional)
```

| Field | Value |
|-------|-------|
| **Source** | Feature Requests |
| **Property** | Requested By |
| **Target** | Test Users |
| **Cardinality** | Many → One |

#### Feature Requests → Feedback Inbox

```
Feature Requests
  → Feedback Inbox
  Relation: Many Requests to One Feedback Source (optional)
```

| Field | Value |
|-------|-------|
| **Source** | Feature Requests |
| **Property** | Feedback Source |
| **Target** | Feedback Inbox |
| **Cardinality** | Many → One |

#### Feature Requests → Roadmap

```
Feature Requests
  → Roadmap
  Relation: Many Requests to One Roadmap Initiative (optional)
```

| Field | Value |
|-------|-------|
| **Source** | Feature Requests |
| **Property** | Roadmap Item |
| **Target** | Roadmap |
| **Cardinality** | Many → One |
| **Inverse** | Roadmap.Feature Requests (Many ↔ Many) |

---

### Roadmap

#### Roadmap → UX Issues

```
Roadmap
  → UX Issues
  Relation: Many to Many
```

| Field | Value |
|-------|-------|
| **Source** | Roadmap |
| **Property** | UX Issues |
| **Target** | UX Issues |
| **Cardinality** | Many ↔ Many |
| **Use case** | One initiative fixes multiple issues; one issue may span initiatives |

#### Roadmap → Feature Requests

```
Roadmap
  → Feature Requests
  Relation: Many to Many
```

| Field | Value |
|-------|-------|
| **Source** | Roadmap |
| **Property** | Feature Requests |
| **Target** | Feature Requests |
| **Cardinality** | Many ↔ Many |

#### Roadmap → Metrics

```
Roadmap
  → Metrics
  Relation: Many Initiatives to One Success Metric (optional)
```

| Field | Value |
|-------|-------|
| **Source** | Roadmap |
| **Property** | Success Metric |
| **Target** | Metrics |
| **Cardinality** | Many → One |
| **Use case** | Initiative success measured by one primary KPI |

---

### Experiments

#### Experiments → Metrics (primary)

```
Experiments
  → Metrics
  Relation: Many Experiments to One Primary Metric
```

| Field | Value |
|-------|-------|
| **Source** | Experiments |
| **Property** | Primary Metric |
| **Target** | Metrics |
| **Cardinality** | Many → One |

#### Experiments → Metrics (secondary)

```
Experiments
  → Metrics
  Relation: Many to Many
```

| Field | Value |
|-------|-------|
| **Source** | Experiments |
| **Property** | Secondary Metrics |
| **Target** | Metrics |
| **Cardinality** | Many ↔ Many |
| **Use case** | Guardrail and secondary KPIs for an experiment |

---

### Metrics

#### Metrics → Experiments (inverse)

```
Metrics
  → Experiments
  Relation: Many to Many
```

| Field | Value |
|-------|-------|
| **Source** | Metrics |
| **Property** | Experiments |
| **Target** | Experiments |
| **Cardinality** | Many ↔ Many |
| **Create** | Often auto-created as inverse of Experiments.Secondary Metrics |

#### Metrics → Roadmap (inverse)

```
Metrics
  → Roadmap
  Relation: Many to Many
```

| Field | Value |
|-------|-------|
| **Source** | Metrics |
| **Property** | Roadmap |
| **Target** | Roadmap |
| **Cardinality** | Many ↔ Many |
| **Use case** | See which initiatives depend on a metric |

---

## Non-relation properties (create after import)

These are documented in schema but not in import CSVs:

| Database | Property | Type |
|----------|----------|------|
| Feedback Inbox | GitHub Issue | URL |
| UX Issues | Assignee | Person |
| UX Issues | Created | Created time |
| UX Issues | Resolved Date | Date |
| Feature Requests | Created | Created time |
| Roadmap | Owner | Person |
| Experiments | Owner | Person |
| Metrics | Owner | Person |

---

## Relation creation order (dependency-safe)

1. Test Users ↔ Feedback Inbox (`Tester` / `Feedback`)
2. Feedback Inbox → UX Issues, Feature Requests
3. UX Issues → Test Users, Feedback Inbox, Roadmap
4. Feature Requests → Test Users, Feedback Inbox, Roadmap
5. Roadmap ↔ UX Issues, Feature Requests; Roadmap → Metrics
6. Experiments → Metrics (Primary, Secondary)
7. Metrics ↔ Experiments, Roadmap (inverses if not auto-created)

---

## Diagram

```
                         ┌──────────────┐
                         │  Test Users  │
                         └──────┬───────┘
                                │ 1:N
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
       ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐
       │  Feedback   │   │  UX Issues  │   │ Feature Requests│
       │   Inbox     │──►│             │   │                 │
       └──────┬──────┘   └──────┬──────┘   └────────┬────────┘
              │                 │                    │
              │                 └────────┬───────────┘
              │                          │ M:N / M:1
              │                          ▼
              │                   ┌─────────────┐
              │                   │   Roadmap   │
              │                   └──────┬──────┘
              │                          │ M:1
              │                          ▼
              │                   ┌─────────────┐
              └──────────────────►│   Metrics   │◄──── Experiments
                                  └─────────────┘      (M:1 + M:N)
```

**Weekly Reviews** — No relations to other databases.

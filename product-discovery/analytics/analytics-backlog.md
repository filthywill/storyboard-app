# Analytics Backlog

Post-alpha analytics candidates **intentionally not implemented**. Prioritized for future phases.

---

## Implemented (Phases 2A–2C + polish)

| Phase | Events |
|-------|--------|
| 2A | Core editor: images, shots, text, imports |
| 2B | `project_opened`, `project_switched`, `page_created`, `page_deleted`, `login_completed`, `logout_completed` |
| 2C | `template_changed`, `layout_changed`, `page_size_changed`, `aspect_ratio_changed`, `theme_applied` |
| Polish | `theme_saved`, `shot_number_format_changed`; batch import suppresses per-shot `image_added` / `shot_added` |

See `analytics-event-taxonomy.md` for full definitions.

---

## High Priority (post-alpha)

| Event (proposed) | Rationale |
|------------------|-----------|
| `project_saved` | Closes the loop on persistence vs abandonment; requires `save_trigger: manual \| autosave` deduplication design |
| `sync_conflict_resolved` | Registry exists; measures cloud reliability and user recovery from conflicts |
| `upgrade_prompt_shown` | Required for monetization funnel once billing UX stabilizes |
| `plan_limit_reached` | Ties product limits to upgrade intent; pairs with `upgrade_prompt_shown` |

---

## Medium Priority

| Event (proposed) | Rationale |
|------------------|-----------|
| `theme_deleted` | Housekeeping signal for power users; low volume but useful for theme library health |
| `export_started` | Registry exists; pairs with `export_completed` for drop-off analysis |
| `export_failed` | Registry exists; operational reliability metric |
| `offline_mode_entered` / `online_restored` | Sync resilience; useful after alpha offline scenarios are exercised |
| `project_deleted` | Registry exists; churn / cleanup behavior |

---

## Low Priority

| Event (proposed) | Rationale |
|------------------|-----------|
| `border_color_changed` | Cosmetic theme edit; high noise, low product signal |
| `font_changed` | Subsumed by future aggregated theme-edit events if needed |
| `font_size_changed` | Granular; overlaps shot text spacing |
| `spacing_changed` | Theme editor detail; unlikely to drive alpha decisions |
| `margin_changed` | Export polish; defer until export analytics mature |
| `grid_visibility_changed` | Template toggle already partially covered by `template_changed` |
| `opacity_changed` | Rare interaction; minimal funnel value |
| `caption_style_changed` | Overlaps theme and template signals |
| `image_rotated` | No rotate control in Image Editor today |
| `image_flipped` | Feature not exposed in UI |
| Individual color picker events | Explicitly out of scope — use `theme_applied` + `theme_saved` instead |

---

## Milestone Events (Explicitly Out of Scope)

| Event (proposed) | Rationale |
|------------------|-----------|
| `storyboard_started` | Synthetic milestone; no agreed definition |
| `storyboard_completed` | Requires product definition (export? N shots? time?) |

---

## Alpha Readiness Notes

- All planned pre-alpha telemetry phases (0, 1, 2A, 2B, 2C) are instrumented at orchestration layer.
- Dashboard updates remain a separate pass — events are registry-complete for PostHog wiring.
- Next instrumentation pass should prioritize **High** backlog items tied to billing and sync reliability.

# Shot Order, Redistribution, and Cloud Switch Consistency — Consolidated Plan (2025-10-15)

This consolidates the latest active decisions from our Cursor Plan session on 2025-10-14 → 2025-10-15. It merges: minimal swap-prevention on first change, robust project switching/cloud-load sequencing, and the redistribution/shot-order rules.

## Objectives

- Prevent initial shot swapping after load without rewriting pages.
- Eliminate data mix-ups when loading a cloud project while another is active.
- Maintain a single source of truth for global shot order with reliable redistribution.
- Preserve user-visible layout on hydrate and during imports/batch loads.

## Scope

- App load and project switch reconciliation
- Cloud project load sequence and auto-save locking/validation
- Redistribution across pages following grid capacity
- Sub-shot group rules and numbering format

---

## A) Prevent First-Change Shot Swap (Reconciliation on Hydration)

- Add `reconcileShotsAndPagesOnLoad()` in unified store (`src/store/index.ts`).
  - Build `visibleOrder = pages.flatMap(p => p.shots)`.
  - If sets are equal and order differs from `shotOrder`, set `shotOrder = visibleOrder` and run a single renumber.
  - Do not mutate pages here; preserve what the user sees.
- Call once post-hydration (e.g., `src/pages/Index.tsx` `useEffect` after stores hydrate).
- Optionally call after project switch and after imports complete.

Validation: Load known sequence S1–S5 → perform first change → no visible swaps. Multi-page projects retain per-page order.

---

## B) Safe Cloud Project Load + Project Switching

- Keep auto-save lock + validation:
  - Lock during switch to block auto-saves.
  - Validation in save path ensures project data matches project metadata before saving.
- Fix cloud load race:
  - `CloudProjectSyncService.loadFullProject(projectId)` MUST NOT write to stores.
  - Correct sequence:
    1) Download full project from cloud.
    2) Save to localStorage only.
    3) Mark project as local in project manager.
    4) Call `switchToProject(projectId)` which sets `currentProjectId` and then loads from localStorage into stores.
  - In `ProjectSelector`, do not skip the final save for current project unless necessary.

Validation: Switching between projects yields correct data; no validation errors; lock/unlock pairs are balanced.

---

## C) Redistribution and Global Shot Order

- Single source of truth: `shotStore.shotOrder`.
- Page capacity: `gridRows × gridCols`. `redistributeShotsAcrossPages()` packs in order across pages, creating/removing pages as needed.
- Always run redistribution after operations that affect order or counts: add/delete, DnD, imports.
- Sub-shot rules:
  - Sub-shots are sequential letter suffixes (e.g., 2a, 2b, 2c).
  - Insert inside a sub-shot group → append to that group.
  - Insert before a sub-shot group → standard shot, pushes the group forward.

---

## D) Numbering and Formatting

- `formatShotNumber()` reads `projectStore.templateSettings.shotNumberFormat` (e.g., `1`, `01`, `001`, `100`).
- Renumber once per batch; avoid repeated renumbers in loops.

---

## E) Batch/Import UX (Incremental)

- Batch transaction helpers to defer redistribution/renumber until end of batch.
- Reintroduce Insert/Overwrite toggles in `BatchLoadModal` and `ShotListLoadModal`.
- Clamp custom inserts to sub-shot boundaries where applicable.

---

## Implementation Checklist

1) Add `reconcileShotsAndPagesOnLoad()`; call post-hydration and after project switch/imports.
2) Ensure `CloudProjectSyncService.loadFullProject()` saves to localStorage only; remove direct store writes.
3) In `ProjectSelector`, call `switchToProject(project.id, false)` after cloud save completes.
4) Keep auto-save lock/validation in place.
5) Verify `redistributeShotsAcrossPages()` is called on all order-affecting operations.
6) Confirm `formatShotNumber()` covers required formats; renumber batched.
7) Re-add Insert/Overwrite toggles and batch transaction helpers.

---

## Test Plan

- Fresh load, known order → first interaction → no swaps.
- Switch A ↔ B repeatedly; confirm data isolation and lock/validation logs.
- Multi-page redistribution under add/delete/DnD preserves global order.
- Sub-shot inserts behave per-group rules.
- Number formats render as configured.

---

## Rollback

- Disable reconciliation call if unexpected layout effects.
- Disable cloud load → stores path in favor of pure localStorage handoff via switcher.
- Keep validation enabled (safe to retain).





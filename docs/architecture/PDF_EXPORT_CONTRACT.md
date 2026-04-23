# PDF Export Contract & Drift Detection Checklist

**Status:** Current production contract

This document defines the current PDF export path used by Storyboard Flow and the checklist that must be used to prevent drift. It is the enforceable reference for the export contract, not a design proposal.

---

## 1. Overview

Storyboard Flow exports PDFs through a server-driven Headless Chromium pipeline. The export path exists to produce WYSIWYG output without booting the SPA, while failing fast when fonts, images, or layout are not ready.

---

## 2. Export Pipeline (High-Level)

- User starts export from `PDFExportModal`
- Frontend builds a `ServerPDFExportPayload`
- Frontend posts payload to `/api/export-pdf`
- Backend validates payload and launches Headless Chromium
- Chromium navigates to `/export/pdf/render-static`
- Payload is injected via `window.__SERVER_PDF_EXPORT__`
- Static route renders the export DOM
- Readiness checks pass: fonts, images, stable layout, final paint
- Backend calls `page.pdf()`
- PDF response is returned to the browser

---

## 3. Core Contract

The following rules are non-negotiable:

- Export **MUST** use `/api/export-pdf`
- Export **MUST** render through `/export/pdf/render-static`
- Export **MUST NOT** boot the SPA
- Export **MUST NOT** depend on React or Zustand at render time
- Export **MUST** be payload-driven only
- Export **MUST NOT** depend on live app state
- Export **MUST NOT** mutate visible app state to prepare export
- Export **MUST** remain WYSIWYG with the storyboard export canvas
- Export **MUST** fail fast on invalid payloads or invalid assets
- Export **MUST** fail fast on unresolved image sources
- Export **MUST** wait for Inter font readiness
- Export **MUST** wait for image load and decode
- Export **MUST** wait for stable layout before capture
- Export **MUST** enforce a final paint pass before `page.pdf()`

If any of these rules stop being true, the export contract has drifted.

---

## 4. Rendering Contract

- The rendered DOM **MUST** match the export subtree used by the storyboard canvas
- Export-facing classNames and wrapper structure **MUST** remain consistent
- Shared layout math **MUST NOT** diverge from `calculatePreviewDimensions()`
- Header, shot grid, shot cards, and footer layout **MUST** stay aligned with the live export presentation
- Image transforms **MUST** be resolved from stored percentage values using export-time dimensions
- The Inter font stack **MUST** remain pinned at the export subtree root
- Export rendering **MUST NOT** introduce runtime dependence on live app state

---

## 5. Performance Expectations

- The SPA **MUST NOT** be part of the export path
- The static route exists specifically to avoid roughly `~9s` of SPA boot cost in export
- Expected warm export: roughly `~1.5–3s`
- Expected cold export: roughly `~4–6s`
- Chromium startup is the main remaining bottleneck
- Large regressions in warm export time should be treated as contract drift

---

## 6. Paper Modes & Styling Rules

### `canvas`

- Uses measured export-root width and height
- Preserves the exact export surface size

### `letter`

- Uses `Letter`, landscape, zero margins, and `printBackground: true`
- Allows export-only print styling
- Current example: letter mode removes the page drop shadow

### Styling Rules

- Export-only styling is allowed when it is scoped to paper mode
- Export-only styling **MUST NOT** break WYSIWYG parity inside that mode
- Export changes **MUST NOT** break live UI styling

---

## 7. Drift Detection Checklist

### Contract Integrity

- [ ] Still using `/api/export-pdf`
- [ ] Still using `/export/pdf/render-static`
- [ ] No SPA dependency introduced
- [ ] No React/Zustand dependency introduced at render time
- [ ] No live state usage introduced
- [ ] No visible app-state mutation introduced

### Rendering / WYSIWYG

- [ ] Fonts still match the export canvas (`Inter`)
- [ ] DOM structure still matches the export subtree
- [ ] Layout still matches the export canvas
- [ ] Text wrapping still matches
- [ ] Image transforms still match
- [ ] Shared preview-dimension logic has not diverged

### Readiness Guarantees

- [ ] Font checks are still enforced
- [ ] Images still load before export
- [ ] Images still decode before export
- [ ] Layout stability is still enforced
- [ ] Final paint is still enforced before `page.pdf()`
- [ ] Invalid assets still fail fast

### Performance

- [ ] Warm export is still under roughly `~3s`
- [ ] No large new assets were added to the static route
- [ ] No new SPA boot or app-shell work was introduced
- [ ] Chromium startup remains the dominant fixed cost

### Paper Mode

- [ ] Canvas mode still preserves exact export dimensions
- [ ] Letter mode still renders cleanly
- [ ] Letter mode still removes the drop shadow
- [ ] Letter mode still uses the correct background treatment

---

## 8. Guidelines for Future Changes

- Do not modify export behavior without updating this document
- Any change affecting rendering, layout, fonts, paper mode, readiness, or performance must be checked against the drift checklist
- If a change weakens payload-only rendering, WYSIWYG parity, or fail-fast behavior, it is not contract-safe

---

*Last Updated: April 20, 2026*

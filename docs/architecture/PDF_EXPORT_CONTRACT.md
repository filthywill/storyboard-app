# PDF Export Contract & Drift Detection Checklist

**Status:** Current production contract

This document defines the current PDF export path used by Storyboard Flow and the checklist that must be used to prevent drift. It is the enforceable reference for the export contract, not a design proposal.

---

## 1. Overview

Storyboard Flow exports PDFs through a server-driven Headless Chromium pipeline. The export path produces WYSIWYG output without browser print, without loading the full SPA, and without switching the live app to the exported page.

The export contract is payload-driven. The frontend serializes a `ServerPDFExportPayload`; the backend injects that payload into the static export route; the route renders, verifies readiness, and only then allows `page.pdf()`.

---

## 2. Export Pipeline

- User starts export from `PDFExportModal`
- Frontend selects the export pages and builds a `ServerPDFExportPayload` with `buildServerPdfPayload()`
- Frontend posts the payload to `/api/export-pdf`
- Backend validates the payload and launches Headless Chromium with `puppeteer-core` and `@sparticuz/chromium-min`
- Chromium navigates to `/export/pdf/render-static`
- Backend injects the payload through `window.__SERVER_PDF_EXPORT__`
- Static route renders the export DOM and publishes readiness/error state through `window.__SERVER_PDF_EXPORT_RUNTIME__`
- Backend waits for the route to report `ready` or `error`
- Backend enforces a final paint check, then calls `page.pdf()`
- PDF response is saved through File System Access API when available, otherwise through browser download

Production PDF export **MUST NOT** use browser print, `window.print()`, `jsPDF`, or `html2canvas`.

---

## 3. Static Export Route

The static export route is a dedicated Vite entry:

- `export-pdf-static.html`
- `src/export-pdf-static.ts`
- `src/export-pdf-static.css`

`vercel.json` rewrites `/export/pdf/render-static` to `export-pdf-static.html`. This avoids booting the React SPA during export.

Observed branch timings:

- Previous SPA-oriented navigation was roughly `~9.5s`
- Static route navigation is roughly `~0.5–0.6s`
- Warm export is roughly `~1.5–3s`, depending on content
- Cold first export can still be roughly `~5–6s`, dominated by Chromium startup

Large regressions in warm export time should be treated as contract drift.

---

## 4. Core Contract

The following rules are non-negotiable:

- Export **MUST** use `/api/export-pdf`
- Export **MUST** render through `/export/pdf/render-static`
- Export **MUST NOT** boot the full React SPA
- Export **MUST NOT** use browser print
- Export **MUST NOT** depend on `activePageId`
- Export **MUST NOT** call `setActivePage()` to prepare export
- Export **MUST NOT** mutate visible app state to prepare export
- Export **MUST** be payload-driven only
- Export **MUST** remain WYSIWYG with the storyboard export canvas
- Export **MUST** fail fast on invalid payloads, invalid assets, missing fonts, or unstable layout

If any of these rules stop being true, the export contract has drifted.

---

## 5. Readiness & Fail-Fast Contract

Readiness requires all of the following:

- Payload was injected and validated
- Static DOM was rendered under `[data-export-root]`
- Export root font family is pinned to Inter
- Inter weights `400`, `600`, and `700` are loaded and verified
- Every rendered image has a valid source
- Every rendered image loads and has renderable dimensions
- Every rendered image decodes successfully when `HTMLImageElement.decode()` is available
- Layout dimensions stabilize before capture
- Backend performs a final image decode/layout/paint pass before `page.pdf()`

Fail-fast behavior must be preserved:

- Unresolved blob-only image sources **MUST** fail with an explicit error
- Invalid or missing image sources **MUST NOT** be silently omitted
- Image load/decode failures **MUST NOT** be hidden with placeholder output
- The static route **MUST NOT** fall back to live app state when payload validation fails

This behavior is intentional. A failed export is preferable to a PDF with missing or incorrect assets.

---

## 6. Rendering Contract

- The rendered DOM **MUST** match the export subtree used by the storyboard canvas
- Export-facing classNames and wrapper structure **MUST** remain consistent
- Shared layout math **MUST NOT** diverge from `calculatePreviewDimensions()`
- Header, shot grid, shot cards, and footer layout **MUST** stay aligned with the live export presentation
- Image transforms **MUST** be resolved from stored percentage values using export-time dimensions
- The storyboard/export subtree **MUST** stay pinned to the deterministic Inter stack
- Export rendering **MUST NOT** introduce runtime dependence on live app state
- Export styling **MUST NOT** leak shadows, borders, or app-shell styling into the PDF surface

Chrome's PDF viewer rendering correctly is a strong signal that the generated PDF is valid. Acrobat can be slower to display image-heavy PDFs and should not be used as the only validity signal.

---

## 7. Page Size Contract

Page size is project-level editor state, not export-modal state.

Supported `pageSizeMode` values:

- `dynamic`
- `letter-portrait`
- `letter-landscape`

Mapping:

- `dynamic` -> measured WYSIWYG canvas size
- `letter-portrait` -> Letter portrait, `8.5x11`
- `letter-landscape` -> Letter landscape, `11x8.5`

Rules:

- Export **MUST** trust `pageSizeMode`
- Export modal **MUST NOT** choose paper size independently
- Dynamic mode preserves the current content-driven canvas behavior
- Fixed modes use a `1000px` browser-friendly rendered width with a fixed frame aspect ratio
- Existing shot/page flow logic remains authoritative
- Grid layout remains `columns x rows`
- No overflow-based pagination tied to fixed page height has been introduced
- Invalid fixed-mode grid/page-size combinations are structurally constrained
- Incompatible page-size switches may use a confirmation flow that preserves columns and reduces rows only when confirmed

The export modal may show read-only page-size context, but editable Page Size belongs in the editor/template toolbar.

---

## 8. Multi-Page Export

Multi-page export is active.

- Selected pages are serialized as `pages[]`
- Backend renders each page independently through the static route
- Each rendered page is converted to a one-page PDF
- PDFs are merged server-side with `pdf-lib`

This preserves single-page parity and avoids CSS pagination issues. Performance scales roughly linearly with page count; memory and Chromium resource pressure are the primary multi-page risks.

---

## 9. Image & Logo Handling

Shot images are normalized before export:

- `imageData` is serialized as a data URL
- `imageFile` is converted to a data URL
- data URL `imageUrl` values are preserved
- non-blob URL `imageUrl` values are serialized as URLs
- blob-only URLs without a backing file/data URL fail fast

Current project images are generally already compressed upstream through the normal image import/compression pipeline. Export should not blindly recompress them.

Project logo persistence:

- Project logos previously could persist only as blob URLs
- Export correctly failed on blob-only logo state
- `projectLogoDataUrl` now provides durable logo data
- Export prefers `projectLogoDataUrl`, then `projectLogoFile`, then `projectLogoUrl`
- Existing unrecoverable blob-only legacy states still require the user to reattach the logo

Export-only image optimization exists but is disabled by default:

- `ENABLE_PDF_IMAGE_OPTIMIZATION = false`
- `pdfExportImageOptimizer` remains available for controlled testing
- Already-small JPEGs have a skip guard

Do not re-enable export-only optimization without measuring PDF size, export timing, and visual quality. Future asset pipeline optimization should happen at import/storage level, not blindly in export.

---

## 10. Export Modal Contract

- Paper Size dropdown is removed
- Page Size is shown as read-only context from `pageSizeMode`
- Filename field is editable
- Default filename comes from saved project name/title when available
- Filename is sanitized and `.pdf` is appended
- Save As uses `showSaveFilePicker()` when available
- Fallback remains standard browser download

`showSaveFilePicker()` must be called directly from the user gesture before async export generation. Do not move it behind payload building or the backend export request.

---

## 11. Known Caveats

- Cold export time is still impacted by Chromium startup
- Acrobat may render image-heavy PDFs more slowly than Chrome's PDF viewer
- Export image optimization is intentionally disabled
- Blob-only legacy logo/image states cannot be recovered automatically
- Multi-page export can increase memory/resource pressure as page count and image weight grow

---

## 12. QA Checklist

### Core Scenarios

- [ ] Dynamic single-page export
- [ ] Dynamic multi-page export
- [ ] Letter Portrait single-page export
- [ ] Letter Portrait multi-page export
- [ ] Letter Landscape single-page export
- [ ] Letter Landscape multi-page export
- [ ] Sparse pages export without layout collapse
- [ ] Range export
- [ ] All-pages export

### Layout / Visual Parity

- [ ] Page footer/page number is bottom-right
- [ ] No shadow/border leakage into fixed page PDF
- [ ] No portrait cropping
- [ ] Grid remains `columns x rows`
- [ ] Shot image transforms match live/export canvas
- [ ] Inter typography matches live/export canvas

### Assets / Failure Modes

- [ ] Blob-only shot asset fails fast with explicit error
- [ ] Blob-only logo state fails fast with explicit error
- [ ] Project logo exports after reload when `projectLogoDataUrl` is available
- [ ] Image-heavy PDF opens correctly in Chrome viewer
- [ ] Compare Chrome viewer vs Acrobat when investigating viewer-specific slowness

### Save / Filename

- [ ] Save As success path
- [ ] Save As cancel path
- [ ] Fallback browser download path
- [ ] Filename sanitization
- [ ] `.pdf` extension appended once

---

## 13. Guidelines for Future Changes

- Do not modify export behavior without updating this document
- Do not reintroduce `activePageId`/`setActivePage()` export preparation
- Do not reintroduce browser print or SPA route rendering for production PDF export
- Do not bypass fail-fast image validation
- Do not make export choose paper size independently from `pageSizeMode`
- Do not introduce overflow-based pagination tied to fixed page height
- Any change affecting rendering, layout, fonts, page size, readiness, assets, or performance must be checked against the drift checklist
- If a change weakens payload-only rendering, WYSIWYG parity, or fail-fast behavior, it is not contract-safe

---

*Last Updated: May 12, 2026*

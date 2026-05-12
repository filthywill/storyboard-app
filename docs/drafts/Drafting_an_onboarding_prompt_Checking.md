# Drafting an Onboarding Prompt

This draft is intended as a reusable onboarding prompt for future agents working on theming, styling, or PDF export.

All paths below use the current `docs/` structure.

---

## Prompt for new AI agent

```text
I'm working on Storyboard Flow. Before making any changes related to theming, styling, or PDF export, please read these files in order:

1. `.cursorrules`
   - Critical state/UI rules
   - Semantic color separation rules
   - Never-show-404 constraints

2. `docs/architecture/ARCHITECTURE_PRINCIPLES.md`
   - High-level application design
   - File responsibilities and critical paths

3. `docs/architecture/STORYBOARD_THEME_SYSTEM_PLAN.md`
   - Theme model and intended behavior

4. `docs/architecture/STORYBOARD_THEMEABLE_ARCHITECTURE.md`
   - CSS isolation and themeable component patterns

5. `docs/architecture/PDF_EXPORT_CONTRACT.md`
   - Current production PDF pipeline
   - Static export route contract
   - Readiness checks, fail-fast rules, page-size modes, and QA checklist

6. `docs/features/PDF_PERCENTAGE_FIX.md`
   - Historical context for the percentage-based image offset invariant

## Key context to understand

### Theme system
- App UI colors and storyboard theme colors are separate systems.
- Themeable storyboard surfaces use `.storyboard-themeable`.
- Theme values should be applied through the established CSS variable pattern when appropriate.

### PDF export
- Production PDF export is payload-driven and server-rendered.
- The active path is: `PDFExportModal` -> `buildServerPdfPayload()` -> `/api/export-pdf` -> `/export/pdf/render-static` -> `page.pdf()`.
- Do not rely on `activePageId`, call `setActivePage()`, or mutate visible app state to prepare export.
- Export trusts project-level `pageSizeMode`; the export modal must not choose paper size independently.
- Export DOM parity and readiness checks are hard requirements.

### Image transforms
- Image offsets are stored as percentages, not fixed pixels.
- Export must convert those percentages using actual export dimensions.
- Do not reintroduce logic that depends on stale live-view inline transforms.

## Key files to reference

### Theme definition and storage
- `src/styles/storyboardTheme.ts`
- `src/store/projectStore.ts`
- `src/services/themeService.ts`

### Themeable UI
- `src/components/MasterHeader.tsx`
- `src/components/ShotCard.tsx`
- `src/components/ShotGrid.tsx`
- `src/components/StoryboardPage.tsx`

### Production PDF export
- `src/components/PDFExportModal.tsx`
- `src/utils/export/exportManager.ts`
- `src/utils/export/serverPdfPayload.ts`
- `src/utils/export/previewDimensions.ts`
- `src/utils/pageSize.ts`
- `src/components/PageSizeModeSelector.tsx`
- `src/components/GridSizeSelector.tsx`
- `src/export-pdf-static.ts`
- `src/export-pdf-static.css`
- `api/export-pdf.ts`

## Before making changes

1. If modifying themeable components:
   - Preserve `.storyboard-themeable` behavior
   - Keep live UI and export DOM visually aligned

2. If modifying PDF export:
   - Follow `docs/architecture/PDF_EXPORT_CONTRACT.md`
   - Preserve payload-driven rendering
   - Preserve readiness and fail-fast behavior
   - Preserve DOM parity with the storyboard export subtree
   - Preserve `pageSizeMode` as the source of truth for PDF page size

3. If modifying image transform behavior:
   - Preserve percentage-based offsets
   - Keep export math aligned with shared preview-dimension logic

After reading these, confirm you understand:
1. the difference between app UI colors and storyboard theme colors
2. how `.storyboard-themeable` isolation works
3. how the current production PDF pipeline works
4. why image transforms must remain percentage-based
```

---

## Quick Reference Version

```text
Please read these files before making theming or PDF export changes:

1. `.cursorrules`
2. `docs/architecture/STORYBOARD_THEME_SYSTEM_PLAN.md`
3. `docs/architecture/STORYBOARD_THEMEABLE_ARCHITECTURE.md`
4. `docs/architecture/PDF_EXPORT_CONTRACT.md`
5. `docs/features/PDF_PERCENTAGE_FIX.md` (historical context only)

Key points:
- App UI colors and storyboard theme colors are separate systems.
- Themeable storyboard surfaces use `.storyboard-themeable`.
- Production PDF export is payload-driven through `/api/export-pdf` and `/export/pdf/render-static`.
- Export must not depend on live app state fallback, `activePageId`, or `setActivePage()`.
- Export page size comes from project-level `pageSizeMode`.
- Image transforms remain percentage-based and must be resolved using actual export dimensions.
```

---

This draft now points to the current docs tree and the active PDF export contract instead of the removed `shot-flow-builder/` paths.

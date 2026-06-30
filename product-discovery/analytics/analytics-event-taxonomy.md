# Analytics Event Taxonomy

Canonical catalog of StoryboardFlow analytics events. Event names match `src/services/analytics/events.ts`. Properties pass through `sanitizeAnalyticsProperties()` before send.

**Phase 2A:** Core editor telemetry — images, shots, text, imports.

**Phase 2B:** Project, page, and workspace telemetry — navigation, auth completion, page lifecycle.

**Phase 2C:** Configuration telemetry — layout, page size, aspect ratio, template visibility, theme selection.

---

## Conventions

| Rule | Detail |
|------|--------|
| **Naming** | snake_case event strings in PostHog |
| **Properties** | Operational metadata only — counts, modes, methods |
| **Never send** | Filenames, URLs, image contents, captions, dialogue, notes, project names, storyboard JSON |
| **Deduplication** | No events during bootstrap, template init, autosave, undo/redo replay, or cloud sync |
| **User-initiated only** | Instrumentation lives in `runIntent` orchestration and explicit import completion handlers |

---

## Phase 2A — Core Editor Events

### `image_added`

| Field | Value |
|-------|-------|
| **Purpose** | Measure single-image upload adoption per shot |
| **Trigger** | User adds an image to a shot that previously had none (`update_shot` intent via `ShotCard` file pick / drag-drop) |
| **Properties** | `workspace_mode`, `is_guest`, `shot_count_after`, `page_count`, `image_count` |
| **Privacy** | No file metadata or image payload |
| **Dashboard Usage** | Images-per-project funnel; editor engagement |
| **Status** | Implemented |
| **Notes** | Suppressed during batch image import (see `images_batch_imported`). Manual single-image assignment continues to emit this event. |

### `images_batch_imported`

| Field | Value |
|-------|-------|
| **Purpose** | Measure batch image import workflow completion |
| **Trigger** | User completes **Batch Load Images** modal (`BatchLoadModal`) |
| **Properties** | `workspace_mode`, `is_guest`, `shot_count_after`, `page_count`, `image_count`, `import_method` (`file`), optional `failed_count` |
| **Privacy** | Aggregate counts only; no filenames |
| **Dashboard Usage** | Batch import adoption vs single upload |
| **Status** | Implemented |
| **Notes** | Sole image telemetry for batch import. Per-shot `image_added` and `shot_added` are suppressed for the duration of the batch load. |

### `image_removed`

| Field | Value |
|-------|-------|
| **Purpose** | Track image removal from shots |
| **Trigger** | User clears image fields on a shot that previously had an image (`update_shot` intent) |
| **Properties** | `workspace_mode`, `is_guest`, `shot_count_after`, `page_count`, `image_count` |
| **Privacy** | No image content |
| **Dashboard Usage** | Edit iteration / rework signals |
| **Status** | Implemented (fires when removal update path is used) |

### `image_replaced`

| Field | Value |
|-------|-------|
| **Purpose** | Track deliberate image swap on an existing image |
| **Trigger** | User replaces an image on a shot that already had one (`update_shot` intent) |
| **Properties** | `workspace_mode`, `is_guest`, `shot_count_after`, `page_count`, `image_count` |
| **Privacy** | No file metadata |
| **Dashboard Usage** | Refinement rate after first upload |
| **Status** | Implemented |

### `image_edited`

| Field | Value |
|-------|-------|
| **Purpose** | Track zoom/position adjustments in the image editor |
| **Trigger** | User applies changes in **Image Editor** modal (`edit_image` intent via `applyImageEdit`) |
| **Properties** | `workspace_mode`, `is_guest`, `shot_count_after`, `page_count`, `image_count` |
| **Privacy** | No transform values tied to content |
| **Dashboard Usage** | Image polish depth |
| **Status** | Implemented |

### `shot_added`

| Field | Value |
|-------|-------|
| **Purpose** | Count user-initiated shot creation (beyond activation milestone) |
| **Trigger** | `add_shot` or `create_shot` intent completes in app store |
| **Properties** | `workspace_mode`, `is_guest`, `shot_count_after`, `page_count` |
| **Privacy** | Counts only |
| **Dashboard Usage** | Storyboard depth; shots-per-session |
| **Status** | Implemented |
| **Notes** | Suppressed during batch import. Coexists with `first_shot_added` (Phase 1 activation). |

### `shot_deleted`

| Field | Value |
|-------|-------|
| **Purpose** | Track explicit shot deletion |
| **Trigger** | `delete_shot` intent completes |
| **Properties** | `workspace_mode`, `is_guest`, `shot_count_after`, `page_count` |
| **Privacy** | Counts only |
| **Dashboard Usage** | Edit churn; structural changes |
| **Status** | Implemented |
| **Notes** | Does not fire for shots removed via page delete cascade |

### `shot_duplicated`

| Field | Value |
|-------|-------|
| **Purpose** | Track shot duplication |
| **Trigger** | `duplicate_shot` intent completes |
| **Properties** | `workspace_mode`, `is_guest`, `shot_count_after`, `page_count` |
| **Privacy** | Counts only |
| **Dashboard Usage** | Power-user editing patterns |
| **Status** | Implemented |

### `shots_reordered`

| Field | Value |
|-------|-------|
| **Purpose** | Track manual shot order changes |
| **Trigger** | `reorder_shots`, `move_shot`, `move_shot_group`, or `insert_sub_group` intent completes |
| **Properties** | `workspace_mode`, `is_guest`, `shot_count_after`, `page_count` |
| **Privacy** | Counts only |
| **Dashboard Usage** | Layout iteration |
| **Status** | Implemented (extended from registry; previously defined but not instrumented) |

### `subshot_added`

| Field | Value |
|-------|-------|
| **Purpose** | Track sub-shot creation |
| **Trigger** | `add_sub_shot` or `create_sub_shot` intent completes |
| **Properties** | `workspace_mode`, `is_guest`, `shot_count_after`, `page_count` |
| **Privacy** | Counts only |
| **Dashboard Usage** | Advanced storyboard structure usage |
| **Status** | Implemented |

### `action_text_added`

| Field | Value |
|-------|-------|
| **Purpose** | Measure first action-text entry on a shot |
| **Trigger** | First empty → non-empty transition for `actionText` on a shot (`update_shot` intent) |
| **Properties** | `workspace_mode`, `is_guest`, `shot_count_after`, `page_count` |
| **Privacy** | **Never captures text content** — transition only |
| **Dashboard Usage** | Text authoring funnel |
| **Status** | Implemented |
| **Notes** | Once per shot per session; resets on project switch |

### `dialogue_added`

| Field | Value |
|-------|-------|
| **Purpose** | Measure first script/dialogue entry on a shot |
| **Trigger** | First empty → non-empty transition for `scriptText` on a shot (`update_shot` intent) |
| **Properties** | `workspace_mode`, `is_guest`, `shot_count_after`, `page_count` |
| **Privacy** | **Never captures text content** — transition only |
| **Dashboard Usage** | Dialogue authoring funnel |
| **Status** | Implemented |
| **Notes** | Maps to in-app **Script Text** field; once per shot per session |

### `shot_list_loaded`

| Field | Value |
|-------|-------|
| **Purpose** | Measure shot-list text import completion |
| **Trigger** | User completes **Load Shot List** modal (`ShotListLoadModal`) |
| **Properties** | `workspace_mode`, `is_guest`, `shot_count_after`, `page_count`, `shot_count`, `import_method` (`paste` \| `file`), optional `failed_count` |
| **Privacy** | Aggregate counts only; no line content |
| **Dashboard Usage** | Import workflow adoption |
| **Status** | Implemented |

---

## Phase 2B — Project, Page & Workspace Events

### `project_created`

| Field | Value |
|-------|-------|
| **Purpose** | Measure new project creation (activation funnel) |
| **Trigger** | User completes project creation via `ProjectSwitcher.createAndSwitchToProject` |
| **Properties** | `is_guest`, `is_cloud`, `project_count`, `workspace_mode`, optional `source` |
| **Privacy** | Counts and modes only — no project names |
| **Dashboard Usage** | Activation funnel step 2 |
| **Status** | Implemented (Phase 0–1; extended with `workspace_mode` in 2B) |

### `project_opened`

| Field | Value |
|-------|-------|
| **Purpose** | Measure explicit open of an existing project when no project was active |
| **Trigger** | User-initiated successful `switchToProject` when `previousProjectId` was null |
| **Properties** | `workspace_mode`, `is_guest`, `project_count` |
| **Privacy** | No project IDs or names |
| **Dashboard Usage** | Project picker adoption; resume behavior |
| **Status** | Implemented |
| **Notes** | Not emitted during bootstrap, session restoration, or automatic guest project selection |

### `project_switched`

| Field | Value |
|-------|-------|
| **Purpose** | Measure navigation between projects |
| **Trigger** | User-initiated successful `switchToProject` when switching from project A to B (A ≠ B) |
| **Properties** | `workspace_mode`, `is_guest`, `project_count` |
| **Privacy** | No project IDs or names |
| **Dashboard Usage** | Multi-project usage depth |
| **Status** | Implemented |
| **Notes** | Requires `{ userInitiated: true }` on `switchToProject` calls |

### `page_created`

| Field | Value |
|-------|-------|
| **Purpose** | Measure intentional multi-page storyboard expansion |
| **Trigger** | `create_page` intent completes via app store `createPage` (e.g. PageTabs + button) |
| **Properties** | `workspace_mode`, `is_guest`, `page_count_after`, `shot_count_after` |
| **Privacy** | Counts only |
| **Dashboard Usage** | Multi-page storyboard depth |
| **Status** | Implemented |
| **Notes** | Not emitted for overflow/backflow page creation in `redistributeShotsAcrossPages` |

### `page_deleted`

| Field | Value |
|-------|-------|
| **Purpose** | Measure page removal |
| **Trigger** | `delete_page` intent completes via app store `deletePage` |
| **Properties** | `workspace_mode`, `is_guest`, `page_count_after`, `shot_count_after` |
| **Privacy** | Counts only |
| **Dashboard Usage** | Structural edit churn |
| **Status** | Implemented |
| **Notes** | Not emitted for automatic empty-page cleanup during redistribution |

### `login_completed`

| Field | Value |
|-------|-------|
| **Purpose** | Measure successful authentication |
| **Trigger** | Email sign-in success (`authStore.signIn`) or Google OAuth callback success (`AuthCallback`) |
| **Properties** | `auth_method` (`email` \| `google`), `workspace_mode` |
| **Privacy** | No email or user content |
| **Dashboard Usage** | Auth funnel; login method mix |
| **Status** | Implemented |
| **Notes** | Not emitted on session restore (`initialize`, `onAuthStateChange`) |

### `logout_completed`

| Field | Value |
|-------|-------|
| **Purpose** | Measure explicit sign-out |
| **Trigger** | Manual sign-out success (`authStore.signOut`) |
| **Properties** | `auth_method` (last login method or `unknown`), `workspace_mode` (`local`) |
| **Privacy** | No email |
| **Dashboard Usage** | Session lifecycle |
| **Status** | Implemented |
| **Notes** | Forced logout uses `session_forced_logout_viewed` — not this event |

### `signup_completed`

| Field | Value |
|-------|-------|
| **Purpose** | Measure successful registration |
| **Trigger** | Email signup (`authStore.signUp`) or new Google user on OAuth callback |
| **Properties** | `method`, `auth_status` |
| **Privacy** | No email |
| **Dashboard Usage** | Signup funnel |
| **Status** | Verified (Phase 0–1; unchanged in 2B) |

---

## Phase 2C — Configuration Events

### `template_changed`

| Field | Value |
|-------|-------|
| **Purpose** | Measure which header/shot/footer visibility combinations users choose |
| **Trigger** | `set_template_setting`, `set_template_settings`, or `reset_template_settings` intent completes with a changed visibility signature |
| **Properties** | `old_template`, `new_template`, `workspace_mode`, `is_guest` |
| **Privacy** | Compact signature of enabled visibility flags (e.g. `showProjectName+showActionText`) — no project text |
| **Dashboard Usage** | Template adoption; default vs customized layouts |
| **Status** | Implemented |
| **Notes** | Excludes `shotNumberFormat` (numbering, not visibility). No-op when toggling reverts to same signature |

### `layout_changed`

| Field | Value |
|-------|-------|
| **Purpose** | Measure grid layout customization |
| **Trigger** | `update_grid` intent completes via app store `updateGridSize` |
| **Properties** | `old_layout`, `new_layout` (`{cols}x{rows}`), `workspace_mode`, `is_guest` |
| **Privacy** | Grid dimensions only |
| **Dashboard Usage** | Default 4×2 vs custom grids |
| **Status** | Implemented |
| **Notes** | Not emitted when selecting the already-active grid size |

### `page_size_changed`

| Field | Value |
|-------|-------|
| **Purpose** | Measure page size mode selection |
| **Trigger** | `set_page_size_mode` intent completes via app store `setPageSizeMode` |
| **Properties** | `old_page_size`, `new_page_size`, `workspace_mode`, `is_guest` |
| **Privacy** | Mode identifiers only (`dynamic`, `letter-portrait`, `letter-landscape`) |
| **Dashboard Usage** | Fixed vs dynamic page sizing adoption |
| **Status** | Implemented |
| **Notes** | Not emitted when re-selecting the active mode |

### `aspect_ratio_changed`

| Field | Value |
|-------|-------|
| **Purpose** | Measure shot aspect ratio customization |
| **Trigger** | `update_aspect_ratio` intent completes via app store `updatePageAspectRatio` |
| **Properties** | `old_aspect_ratio`, `new_aspect_ratio`, `workspace_mode`, `is_guest` |
| **Privacy** | Ratio tokens only (e.g. `16/9`) |
| **Dashboard Usage** | Aspect ratio distribution |
| **Status** | Implemented |
| **Notes** | Not emitted when re-selecting the active ratio |

### `theme_applied`

| Field | Value |
|-------|-------|
| **Purpose** | Measure which storyboard themes users select |
| **Trigger** | `set_storyboard_theme` intent completes when theme ID changes |
| **Properties** | `theme_id`, `workspace_mode`, `is_guest` |
| **Privacy** | Theme ID only — no theme JSON or color values |
| **Dashboard Usage** | Preset vs saved theme usage |
| **Status** | Implemented |
| **Notes** | Not emitted for in-place color edits (same theme ID). Not emitted on project load or sync |

### `theme_saved`

| Field | Value |
|-------|-------|
| **Purpose** | Measure custom theme creation in the theme library |
| **Trigger** | User successfully completes **Save as New Theme** (`ThemeToolbar`, `ThemeEditorModal`) |
| **Properties** | `workspace_mode`, `is_guest`, optional `theme_id` (after save) |
| **Privacy** | Theme ID only — no theme JSON or color values |
| **Dashboard Usage** | Custom theme depth; theme library adoption |
| **Status** | Implemented |
| **Notes** | Not emitted for Update Existing Theme, color edits, preview, apply, rename, or delete |

### `shot_number_format_changed`

| Field | Value |
|-------|-------|
| **Purpose** | Measure shot numbering format customization |
| **Trigger** | `set_template_setting` intent completes when `shotNumberFormat` changes via `StartNumberSelector` |
| **Properties** | `old_format`, `new_format`, `workspace_mode`, `is_guest` |
| **Privacy** | Format tokens only (e.g. `01`, `#`) |
| **Dashboard Usage** | Numbering style distribution |
| **Status** | Implemented |
| **Notes** | Not emitted when re-entering the active format. Suppressed during batch image import auto-format detection. |

---

## Related Events (Prior Phases)

| Event | Phase | Status |
|-------|-------|--------|
| `app_started`, `first_shot_added`, `export_completed` | 0–1 Activation | Implemented |
| `auth_completed` | Registry only | Superseded by `login_completed` for login telemetry |
| `theme_saved`, `theme_deleted` | Registry only | `theme_saved` implemented; `theme_deleted` backlog |
| `storyboard_started`, `storyboard_completed` | — | **Intentionally excluded** (milestone events) |

---

## Insertion Architecture

| Layer | Role |
|-------|------|
| `src/store/index.ts` → `runIntent` | Shot/page lifecycle intents |
| `src/store/index.ts` → configuration methods | Template, layout, page size, aspect ratio, theme (Phase 2C) |
| `src/store/index.ts` → `updateShot` / `applyImageEdit` | Image + text field changes |
| `src/utils/projectSwitcher.ts` → `switchToProject` | `project_opened` / `project_switched` (user-initiated only) |
| `src/store/authStore.ts` | `login_completed`, `logout_completed` |
| `src/pages/AuthCallback.tsx` | Google `login_completed` (+ `signup_completed` for new users) |
| `src/services/analytics/editorTracking.ts` | Phase 2A editor capture helpers |
| `src/services/analytics/workspaceTracking.ts` | Phase 2B project/page/auth capture helpers |
| `src/services/analytics/configTracking.ts` | Phase 2C configuration capture helpers |
| `src/utils/autoSave.ts` → `isAnalyticsSuppressed()` | Blocks events during batch/sync/switch/project load |

Direct store mutations (cloud sync, redistribution, bootstrap, `loadProjectData`) bypass orchestration and do **not** emit events.

---

## Update Process

1. Add event to `src/services/analytics/events.ts`
2. Instrument via orchestration layer (not UI components when avoidable)
3. Update this taxonomy and `metrics-definition.md`
4. Update PostHog insights / `notion/metrics.csv` when dashboards change (Phase 2A: no dashboard changes)

# UI State Handling Guide

## 📋 Complete State Matrix

This document defines EXACTLY what the user should see in every possible state combination.

---

## 🎯 State Variables

The application UI is determined by these state variables:

| Variable | Type | Source | Purpose |
|----------|------|--------|---------|
| `isAuthenticated` | boolean | authStore | User logged in? |
| `authStatus` | `'guest'` \| `'authenticated_unconfirmed'` \| `'authenticated_confirmed'` | authStore | Full auth status including email confirmation |
| `authLoading` | boolean | authStore | Auth check in progress? |
| `currentProject` | Project \| null | projectManagerStore | Active project |
| `allProjects` | Project[] | projectManagerStore | All user's projects |
| `isLoadingCloudProjects` | boolean | Index.tsx state | Loading project list? |
| `showProjectPicker` | boolean | Index.tsx state | Show project selection modal? |
| `logoutReason` | string | authStore | Why user was logged out |
| `isOnline` | boolean | navigator.onLine | Internet connection status |
| `writerLease.mode` | `'unknown'` \| `'writer'` \| `'read_only'` | writerLeaseStore | Current writer lease status |
| `writerLease.projectId` | string \| null | writerLeaseStore | Which project the lease applies to |
| `showReadOnlyOverlay` | boolean | Index.tsx (derived) | Read-only overlay visible? |
| `isTakeoverPending` | boolean | Index.tsx state | Takeover in progress? |
| `showWorkspaceChoiceModal` | boolean | Index.tsx state | Workspace conflict modal visible? |
| `lockedProject` | object \| null | Index.tsx state | Project blocked by workspace mode |

---

## 🌳 State Decision Tree

This is the EXACT order Index.tsx evaluates states (top to bottom, first match wins):

```typescript
// STEP 1: Handle forced logout
IF logoutReason === 'expired' OR logoutReason === 'other_session'
  → RENDER: LoggedOutElsewhereScreen
  → STOP (don't evaluate further)

// STEP 2: Handle auth loading
ELSE IF authLoading === true
  → RENDER: Loading Spinner ("Loading...")
  → STOP

// STEP 3: Handle unconfirmed email
ELSE IF authStatus === 'authenticated_unconfirmed'
  → RENDER: ConfirmEmailScreen
  → STOP (blocks all access until email confirmed)

// STEP 4: Handle cloud project loading
ELSE IF isAuthenticated === true AND isLoadingCloudProjects === true
  → RENDER: Loading Spinner ("Loading your projects...")
  → STOP

// STEP 5: Main UI (all other states)
ELSE
  → RENDER: Main UI shell with conditional overlays:
    - IF showReadOnlyOverlay → Read-only overlay (writer lease)
    - IF showWorkspaceChoiceModal → WorkspaceChoiceModal
    - IF lockedProject → LockedProjectModal
    - IF showProjectPicker AND isAuthenticated → ProjectPickerModal
    - IF isAuthenticated AND allProjects.length === 0 → EmptyProjectState (Create)
    - IF !isAuthenticated AND !currentProject → EmptyProjectState (Welcome)
```

---

## 🎨 Required UI Components for Each State

### 1. LoggedOutElsewhereScreen

**When:**
- `logoutReason === 'expired'` OR `logoutReason === 'other_session'`

**Shows:** Full-screen message explaining forced logout with a single "Sign In Again" action.

**Actions:**
- **Sign In Button** → `setShowAuthModal(true)`

**Component:** `<LoggedOutElsewhereScreen />`

---

### 2. Loading (Auth Initialization)

**When:**
- `authLoading === true`

**Shows:** Inline loading spinner with "Loading..." text.

**Actions:** None (waiting for auth to complete)

**Component:** Inline div with spinner

---

### 3. ProjectPickerModal

**When:**
- `isAuthenticated === true`
- `showProjectPicker === true`
- `allProjects.length > 0`
- `currentProject === null`

**Shows:** Modal list of projects with a "Create New Project" option.

**Actions:**
- **Click Project** → `switchToProject(projectId)`
- **Create New** → `setShowCreateProjectDialog(true)`

**Component:** `<ProjectPickerModal />`

---

### 4. EmptyProjectState (Unauthenticated - Welcome)

**When:**
- `isAuthenticated === false`
- `logoutReason !== 'other_session'`

**Shows:** Welcome screen with sign-in and "Create Test Project" actions.

**Actions:**
- **Sign In Button** → `setShowAuthModal(true)`
- **Create Test Project** → `setShowCreateProjectDialog(true)` (creates local-only project)

**Component:** `<EmptyProjectState isAuthenticated={false} />`

**Background:** Dimmed/blurred empty storyboard template

---

### 5. Loading (Cloud Projects)

**When:**
- `isAuthenticated === true`
- `isLoadingCloudProjects === true`

**Shows:** Inline loading spinner with "Loading your projects..." text.

**Actions:** None (waiting for projects to load)

**Component:** Inline div with spinner

**Location:** In the storyboard content area (not full-screen)

---

### 6. EmptyProjectState (Authenticated - No Projects)

**When:**
- `isAuthenticated === true`
- `allProjects.length === 0`
- `!isLoadingCloudProjects`

**Shows:** Welcome screen prompting creation of the first cloud project.

**Actions:**
- **Create New Project** → `setShowCreateProjectDialog(true)` (creates cloud-synced project)

**Component:** `<EmptyProjectState isAuthenticated={true} />`

**Background:** Dimmed/blurred empty storyboard template

---

### 7. TemplateBackground Component

**When:**
- No active page exists AND (user is unauthenticated OR has no projects)
- Used as dimmed background behind EmptyProjectState overlays

**Shows:** Dimmed storyboard template background (non-interactive).

**Purpose:**
- Provides visual context for empty states
- Shows users what a storyboard looks like
- No interaction (dimmed with pointer-events-none)

**Component:** `<TemplateBackground />`

---

### 8. Main UI (Authenticated with Current Project)

**When:**
- `isAuthenticated === true`
- `currentProject !== null`

**Shows:** Full storyboard UI with header, page tabs, and shot grid.

**Actions:** Full application functionality
- Create/edit/delete shots
- Add/remove pages
- Upload images
- Export to PDF/PNG
- Switch projects
- Sign out

**Components:**
- `<OfflineBanner />` (if offline)
- `<SyncStatusIndicator />`
- `<PageTabs />`
- `<StoryboardPage />`

---

### 9. ConfirmEmailScreen

**When:**
- `authStatus === 'authenticated_unconfirmed'`
- User signed up but hasn't confirmed their email

**Shows:**
- Full-screen message asking user to confirm email
- "Resend confirmation email" button
- "Change email" button (signs out and reopens auth modal)
- "I've confirmed my email" manual check button

**Actions:**
- **Resend** → Sends new confirmation email
- **Change Email** → Signs out, opens auth modal
- **Check Confirmed** → Refreshes user session, checks `email_confirmed_at`

**Component:** `<ConfirmEmailScreen />`

---

### 10. Read-Only Overlay (Writer Lease)

**When:**
- `writerLease.mode === 'read_only'` AND `writerLease.projectId === currentProject.id`
- OR `isTakeoverPending === true`

**Shows:**
- Full-screen semi-transparent overlay (`z-40`, `bg-black/50`)
- "This project is being edited elsewhere." message
- "Take over editing" button (or "Taking over…" during takeover)
- Error message if takeover fails

**Actions:**
- **Take over editing** → Force-claims lease, reloads from cloud, broadcasts takeover
- **Switch project** → User can still switch to another project via project selector

**Component:** Inline overlay in `Index.tsx` (not a separate route)

**Note:** The overlay uses `pointer-events: auto` to block all interaction with the underlying UI.

---

### 11. WorkspaceChoiceModal

**When:**
- `showWorkspaceChoiceModal === true`
- Free plan user has both local and cloud projects (workspace conflict)

**Shows:**
- Modal with workspace choice options
- "Keep working locally" option
- "Switch to account project" option
- "Upgrade to Pro" option

**Actions:**
- **Keep local** → Sets workspace mode to `'local'`, filters to local projects
- **Switch to cloud** → Sets workspace mode to `'cloud'`, filters to cloud projects
- **Upgrade** → Navigates to `/billing`

**Component:** `<WorkspaceChoiceModal />`

---

### 12. LockedProjectModal

**When:**
- `lockedProject !== null`
- User tried to open a project that doesn't match current workspace mode (free plan restriction)

**Shows:**
- Modal explaining the project is in a different workspace
- "Switch workspace" button
- "Upgrade to Pro" button

**Component:** `<LockedProjectModal />`

---

## 🔄 State Transitions

**Summary (high-level):**
- **Sign in:** Welcome → Loading → ProjectPicker or EmptyProjectState (authenticated).
- **Sign out:** Blocked if offline with unsynced changes; otherwise clears auth + project data → Welcome.
- **Project select:** Optional cloud download → ProjectSwitcher updates stores → Main UI.
- **Offline → online (local newer):** Validate + sync → toast.
- **Offline → online (cloud newer):** Preserve cloud → reload → toast.
- **Forced logout:** Real-time invalidation → clear state → LoggedOutElsewhereScreen.
- **Email confirmation:** Authenticated unconfirmed → ConfirmEmailScreen → refresh → normal flow.
- **Writer lease takeover:** Read-only overlay → force claim → reload from cloud → broadcast.
- **Workspace conflict:** WorkspaceChoiceModal → set mode → filtered project list.

---

## 🚫 Common Mistakes and Fixes

**Short list:**
- Clear project data only via full sign-out flow (auth + project state together).
- Do not navigate for state changes; state drives UI.
- Always cover all state combinations (follow decision tree order).
- Never sync without timestamp comparison and validation.
- Block sign-out when offline with queued changes.
- Use `TemplateBackground` instead of fake page data.

---

## 🧪 Testing Essentials (Condensed)

- Sign in/out shows expected EmptyProjectState / ProjectPicker.
- Offline work + reconnect handles local-newer vs cloud-newer correctly.
- Multi-tab writer lease: second tab read-only; takeover reloads from cloud.
- Workspace conflict modal appears for free users with local + cloud projects.
- Project limit shows UpgradeToProDialog for free plan.

Full checklist lives in `docs/maintenance/QUICK_REFERENCE.md`.

---

## 📚 Related Documentation

- **`../../.cursorrules`** - Specific rules for AI assistants
- **`ARCHITECTURE_PRINCIPLES.md`** - High-level design philosophy
- **`shot-flow-builder` removed/merged (Feb 2026)** - Historical references only
- **`../bugs-and-fixes/CRITICAL-BUG-REPORT.md`** - Historical issues and fixes
- **`../sync-and-data/TIMESTAMP_SYNC_IMPLEMENTATION.md`** - Conflict resolution details
- **`../bugs-and-fixes/DATA_LOSS_FIX_SUMMARY.md`** - Validation layers

---

*Last Updated: February 9, 2026*
*Added: email confirmation, writer lease read-only overlay, workspace choice, locked project states.*
*Keep this document updated as new states or transitions are added.*


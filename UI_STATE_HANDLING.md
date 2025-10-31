# UI State Handling Guide

## 📋 Complete State Matrix

This document defines EXACTLY what the user should see in every possible state combination.

---

## 🎯 State Variables

The application UI is determined by these state variables:

| Variable | Type | Source | Purpose |
|----------|------|--------|---------|
| `isAuthenticated` | boolean | authStore | User logged in? |
| `authLoading` | boolean | authStore | Auth check in progress? |
| `currentProject` | Project \| null | projectManagerStore | Active project |
| `allProjects` | Project[] | projectManagerStore | All user's projects |
| `isLoadingCloudProjects` | boolean | Index.tsx state | Loading project list? |
| `showProjectPicker` | boolean | Index.tsx state | Show project selection modal? |
| `logoutReason` | string | authStore | Why user was logged out |
| `isOnline` | boolean | navigator.onLine | Internet connection status |

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

// STEP 3: Handle project picker for authenticated users
ELSE IF showProjectPicker === true AND isAuthenticated === true
  → RENDER: ProjectPickerModal
  → STOP

// STEP 4: Handle unauthenticated users
ELSE IF isAuthenticated === false
  → RENDER: EmptyProjectState (Welcome screen)
  → STOP

// STEP 5: Handle cloud project loading
ELSE IF isAuthenticated === true AND isLoadingCloudProjects === true
  → RENDER: Loading Spinner ("Loading your projects...")
  → STOP

// STEP 6: Handle authenticated user with no projects
ELSE IF isAuthenticated === true AND allProjects.length === 0
  → RENDER: EmptyProjectState (Create Project)
  → STOP

// STEP 7: Default - authenticated user with project
ELSE
  → RENDER: Main UI (full application)
```

---

## 🎨 Required UI Components for Each State

### 1. LoggedOutElsewhereScreen

**When:**
- `logoutReason === 'expired'` OR `logoutReason === 'other_session'`

**Shows:**
```
┌─────────────────────────────────────────┐
│                                         │
│    🔒 Logged Out from Another Device    │
│                                         │
│   You've been signed in from another   │
│   location. Please sign in again to    │
│   continue working.                     │
│                                         │
│   ┌─────────────────────────────────┐  │
│   │      Sign In Again              │  │
│   └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**Actions:**
- **Sign In Button** → `setShowAuthModal(true)`

**Component:** `<LoggedOutElsewhereScreen />`

---

### 2. Loading (Auth Initialization)

**When:**
- `authLoading === true`

**Shows:**
```
┌─────────────────────────────────────────┐
│                                         │
│              ⟳ Loading...               │
│                                         │
└─────────────────────────────────────────┘
```

**Actions:** None (waiting for auth to complete)

**Component:** Inline div with spinner

---

### 3. ProjectPickerModal

**When:**
- `isAuthenticated === true`
- `showProjectPicker === true`
- `allProjects.length > 0`
- `currentProject === null`

**Shows:**
```
┌─────────────────────────────────────────┐
│  Select a Project                       │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ProjectA          16 shots      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ProjectB           8 shots      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ProjectC          24 shots      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ + Create New Project              │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Actions:**
- **Click Project** → `switchToProject(projectId)`
- **Create New** → `setShowCreateProjectDialog(true)`

**Component:** `<ProjectPickerModal />`

---

### 4. EmptyProjectState (Unauthenticated - Welcome)

**When:**
- `isAuthenticated === false`
- `logoutReason !== 'other_session'`

**Shows:**
```
┌─────────────────────────────────────────┐
│                                         │
│       Welcome to Storyboard Flow        │
│                                         │
│   Create professional storyboards       │
│   with ease                             │
│                                         │
│   ┌─────────────────────────────────┐  │
│   │  🔑 Sign In / Sign Up           │  │
│   └─────────────────────────────────┘  │
│                                         │
│   ┌─────────────────────────────────┐  │
│   │  📁 Create a Test Project       │  │
│   └─────────────────────────────────┘  │
│                                         │
│   Test projects are saved locally.     │
│   Sign in to sync to the cloud.        │
│                                         │
└─────────────────────────────────────────┘
```

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

**Shows:**
```
┌─────────────────────────────────────────┐
│                                         │
│        ⟳ Loading your projects...      │
│                                         │
└─────────────────────────────────────────┘
```

**Actions:** None (waiting for projects to load)

**Component:** Inline div with spinner

**Location:** In the storyboard content area (not full-screen)

---

### 6. EmptyProjectState (Authenticated - No Projects)

**When:**
- `isAuthenticated === true`
- `allProjects.length === 0`
- `!isLoadingCloudProjects`

**Shows:**
```
┌─────────────────────────────────────────┐
│                                         │
│       Welcome to Storyboard Flow        │
│                                         │
│   Let's create your first project      │
│                                         │
│   ┌─────────────────────────────────┐  │
│   │  + Create New Project           │  │
│   └─────────────────────────────────┘  │
│                                         │
│   Your project will sync to the cloud  │
│   automatically.                        │
│                                         │
└─────────────────────────────────────────┘
```

**Actions:**
- **Create New Project** → `setShowCreateProjectDialog(true)` (creates cloud-synced project)

**Component:** `<EmptyProjectState isAuthenticated={true} />`

**Background:** Dimmed/blurred empty storyboard template

---

### 7. TemplateBackground Component

**When:**
- No active page exists AND (user is unauthenticated OR has no projects)
- Used as dimmed background behind EmptyProjectState overlays

**Shows:**
```
┌─────────────────────────────────────────┐
│  Template Header (logo, project info)   │
├─────────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│  │ S1 │ │ S2 │ │ S3 │ │ S4 │          │
│  └────┘ └────┘ └────┘ └────┘          │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│  │ S5 │ │ S6 │ │ S7 │ │ S8 │          │
│  └────┘ └────┘ └────┘ └────┘          │
│  Storyboard Template                   │
└─────────────────────────────────────────┘
```

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

**Shows:**
```
┌─────────────────────────────────────────────────┐
│  Header: Logo | ProjectSelector | User Menu    │
├─────────────────────────────────────────────────┤
│  Offline Banner (if offline)                   │
├─────────────────────────────────────────────────┤
│  Page Tabs: Page 1 | Page 2 | + Add Page       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Storyboard Grid (shots in pages)              │
│                                                 │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                  │
│  │ S1 │ │ S2 │ │ S3 │ │ S4 │                  │
│  └────┘ └────┘ └────┘ └────┘                  │
│                                                 │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                  │
│  │ S5 │ │ S6 │ │ S7 │ │ S8 │                  │
│  └────┘ └────┘ └────┘ └────┘                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

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

## 🔄 State Transitions

### Transition 1: Sign In

```
STATE A: EmptyProjectState (unauthenticated)
         ↓
USER ACTION: Click "Sign In" → AuthModal → User authenticates
         ↓
STATE B: Loading (authLoading = true, isLoadingCloudProjects = true)
         ↓
SYSTEM: Loads project list from cloud
         ↓
STATE C1 (if has projects): ProjectPickerModal
    OR
STATE C2 (if no projects): EmptyProjectState (authenticated)
```

**Key Points:**
- No navigation occurs
- State changes trigger UI updates
- User always has a clear path forward

---

### Transition 2: Sign Out

```
STATE A: Main UI (authenticated with project)
         ↓
USER ACTION: Click "Sign Out"
         ↓
SYSTEM CHECK: Is online?
    ├─ If OFFLINE with unsynced changes:
    │      → Block sign-out
    │      → Show message: "You have unsynced changes. Please connect to internet first."
    │      → STOP (stay in STATE A)
    │
    └─ If ONLINE or no unsynced changes:
           ↓
       1. AuthService.signOut()
       2. ProjectSwitcher.clearCurrentProjectData()
       3. Set isAuthenticated = false
           ↓
STATE B: EmptyProjectState (unauthenticated - Welcome)
```

**Key Points:**
- Sign-out is blocked if offline with unsynced changes
- All project data cleared
- User sees welcome screen with sign-in option

---

### Transition 3: Project Selection

```
STATE A: ProjectPickerModal
         ↓
USER ACTION: Click project "ProjectA"
         ↓
SYSTEM:
    1. setShowProjectPicker(false)
    2. If isCloudOnly:
       - CloudProjectSyncService.loadFullProject(projectId)
       - Waits for data to download
    3. ProjectSwitcher.switchToProject(projectId)
       - Saves current project (if any)
       - Loads ProjectA from localStorage
       - Updates stores
       - Sets currentProjectId
         ↓
STATE B: Main UI (with ProjectA loaded)
```

**Key Points:**
- Modal closes
- If cloud-only project, downloads first
- Then switches using ProjectSwitcher
- Main UI automatically renders

---

### Transition 4: Offline → Online (with changes)

```
STATE A: Main UI (working offline, offline banner visible)
         User makes changes to ProjectA
         Changes saved to localStorage only
         ↓
NETWORK: Connection restored
         ↓
SYSTEM:
    1. Offline banner disappears
    2. BackgroundSyncService detects online
    3. Processes offline queue:
         ↓
       Compare timestamps:
       Local lastModified: 10:15 AM
       Cloud data_updated_at: 10:10 AM
         ↓
       Local is newer (10:15 > 10:10 + 5s tolerance)
         ↓
       Validate data (check for corruption)
         ↓
       Sync to cloud
         ↓
    4. Show toast: "Synced 1 project to cloud"
         ↓
STATE A: Main UI (still working, now synced)
```

**Key Points:**
- Always compare timestamps
- Validate before syncing
- Preserve most recent intentional changes
- Notify user of sync result

---

### Transition 5: Offline → Online (cloud is newer)

```
STATE A: Main UI (working offline)
         User makes changes at 10:15 AM
         ↓
MEANWHILE: ProjectA edited on another device at 10:20 AM
         ↓
NETWORK: Connection restored at 10:25 AM
         ↓
SYSTEM:
    1. Offline banner disappears
    2. BackgroundSyncService detects online
    3. Processes offline queue:
         ↓
       Compare timestamps:
       Local lastModified: 10:15 AM
       Cloud data_updated_at: 10:20 AM
         ↓
       Cloud is newer (10:20 > 10:15 + 5s tolerance)
         ↓
       PRESERVE CLOUD DATA
       Discard local changes
         ↓
    4. Show toast: "Project was updated elsewhere. Loading latest version."
    5. Reload project from cloud
         ↓
STATE A: Main UI (with cloud version loaded)
```

**Key Points:**
- Cloud wins if timestamps show it's newer
- User is notified of conflict
- Most recent intentional change is preserved
- Local unsynced changes are lost (but this prevents data corruption)

---

### Transition 6: Forced Logout (Another Device)

```
STATE A: Main UI (Device A - working on project)
         ↓
EVENT: User logs in on Device B
       Device B invalidates Device A's session
       Real-time notification sent to Device A
         ↓
SYSTEM (Device A):
    1. Receives session invalidation
    2. Calls supabase.auth.signOut({ scope: 'local' })
    3. ProjectSwitcher.clearCurrentProjectData()
    4. Set isAuthenticated = false
    5. Set logoutReason = 'other_session'
         ↓
STATE B: LoggedOutElsewhereScreen
         User sees message and "Sign In Again" button
```

**Key Points:**
- Session invalidated immediately
- Data cleared
- Clear explanation to user
- Easy path to sign back in

---

## 🚫 Common Mistakes and Fixes

### Mistake 1: Clearing data without updating state

```typescript
// ❌ BAD
ProjectSwitcher.clearCurrentProjectData();
// User is still authenticated, but no project loaded
// Might show 404 or broken UI

// ✅ GOOD
await signOut(); // This handles both auth state AND data clearing
// User will see EmptyProjectState (Welcome)
```

---

### Mistake 2: Navigating to non-existent route

```typescript
// ❌ BAD
navigate('/logged-out'); // No such route → 404

// ✅ GOOD
useAuthStore.setState({ isAuthenticated: false });
// Index.tsx will automatically render EmptyProjectState
```

---

### Mistake 3: Not handling all state combinations

```typescript
// ❌ BAD
if (isAuthenticated) {
  return <MainUI />;
}
// What if isAuthenticated but no projects? → undefined UI

// ✅ GOOD
if (isAuthenticated && currentProject) {
  return <MainUI />;
}
if (isAuthenticated && allProjects.length === 0) {
  return <EmptyProjectState isAuthenticated={true} />;
}
if (isAuthenticated && !currentProject && allProjects.length > 0) {
  return <ProjectPickerModal />;
}
// All cases explicitly handled
```

---

### Mistake 4: Syncing without timestamp comparison

```typescript
// ❌ BAD
// User reconnects after offline work
await CloudSyncService.saveProject(projectId, localData);
// Blindly overwrites cloud data (might be newer)

// ✅ GOOD
const localTimestamp = projectManager.projects[projectId].lastModified;
const cloudProject = await ProjectService.getProject(projectId);
const cloudTimestamp = new Date(cloudProject.updated_at);

if (localTimestamp > cloudTimestamp + CLOCK_SKEW_TOLERANCE) {
  // Local is definitively newer
  await CloudSyncService.saveProject(projectId, localData);
} else {
  // Cloud is newer or within tolerance
  console.log('Preserving cloud data');
  // Load cloud version instead
}
```

---

### Mistake 5: Allowing sign-out while offline

```typescript
// ❌ BAD
const handleSignOut = async () => {
  await signOut();
  // User loses unsynced changes!
};

// ✅ GOOD
const handleSignOut = async () => {
  const isOnline = navigator.onLine;
  const hasUnsyncedChanges = CloudSyncService.hasQueuedChanges();
  
  if (!isOnline && hasUnsyncedChanges) {
    toast.error('You have unsynced changes. Please connect to internet first.');
    return;
  }
  
  await signOut();
};
```

---

### Mistake 6: Using fake page data for backgrounds

```typescript
// ❌ BAD
const fakePage = { id: 'template', name: 'Template' };
<StoryboardPage pageId={fakePage.id} /> // Causes "Page Not Found"

// ✅ GOOD
<TemplateBackground /> // Dedicated component for visual template
```

---

## 🧪 Testing Checklist

### Manual Test Scenarios

Before committing changes affecting UI state:

#### Authentication Tests:
- [ ] **Fresh login (never logged in before)**
  - Open app → See Welcome screen
  - Click "Sign In" → AuthModal opens
  - Sign in → See ProjectPicker or Create Project screen

- [ ] **Refresh page while logged in**
  - Working on ProjectA
  - Refresh browser
  - Should auto-load ProjectA (resume work)

- [ ] **Sign out**
  - Click "Sign Out"
  - Should see Welcome screen
  - Background should show empty template

- [ ] **Sign out + refresh**
  - Sign out
  - Refresh page
  - Should still see Welcome screen

#### Project Tests:
- [ ] **Authenticated user with no projects**
  - Sign in (first time)
  - Should see "Create New Project" prompt

- [ ] **Authenticated user with projects**
  - Sign in (has ProjectA, ProjectB)
  - Should see ProjectPickerModal

- [ ] **Switch projects**
  - From ProjectA, select ProjectB
  - Should load ProjectB correctly
  - Switch back to ProjectA
  - Should load ProjectA correctly

#### Offline Tests:
- [ ] **Go offline while working**
  - Disconnect internet
  - Should show offline banner
  - Should continue working
  - Changes should save to localStorage

- [ ] **Attempt sign out while offline**
  - Go offline
  - Make changes
  - Click "Sign Out"
  - Should be blocked with message

- [ ] **Reconnect after offline work (local newer)**
  - Work offline, make changes
  - Reconnect
  - Should sync changes to cloud
  - Should show "Synced" notification

- [ ] **Reconnect after offline work (cloud newer)**
  - Work offline on Device A
  - Meanwhile, edit on Device B (newer)
  - Reconnect Device A
  - Should preserve cloud version
  - Should notify user

#### Template Background Tests:
- [ ] **Unauthenticated user sees template**
  - Open app without signing in
  - Should see dimmed storyboard template in background
  - Should see EmptyProjectState overlay on top

- [ ] **Authenticated user with no projects sees template**
  - Sign in (first time user)
  - Should see dimmed storyboard template in background
  - Should see "Create New Project" overlay

- [ ] **No "Page Not Found" errors**
  - Template should never show "Page Not Found"
  - Should always show visual storyboard layout

#### Edge Cases:
- [ ] **Forced logout**
  - Login on Device B while logged in on Device A
  - Device A should show "Logged out elsewhere" screen

- [ ] **Invalid URL**
  - Type `/invalid-route` in browser
  - Should auto-redirect to main app
  - If authenticated with project → Main UI
  - If authenticated without project → ProjectPicker
  - If not authenticated → Welcome screen

- [ ] **Empty project data**
  - Try to save project with 0 shots (when cloud has shots)
  - Should be blocked by validation
  - Should show error in console

### Success Criteria:

Every test scenario must result in:
- ✅ NO "Page Not Found" or 404 screens
- ✅ Clear UI with available actions
- ✅ User can always proceed (no dead-ends)
- ✅ Data is preserved correctly
- ✅ Appropriate notifications shown

---

## 🔍 State Debugging

When debugging UI state issues:

### 1. Check Auth Store
```javascript
console.log('Auth State:', useAuthStore.getState());
// Expected output:
// {
//   isAuthenticated: true/false,
//   user: {...} or null,
//   isLoading: true/false,
//   logoutReason: 'none' | 'expired' | 'other_session'
// }
```

### 2. Check Project Manager Store
```javascript
console.log('Project State:', useProjectManagerStore.getState());
// Expected output:
// {
//   projects: {...},
//   currentProjectId: 'xxx' or null,
//   isInitialized: true/false
// }
```

### 3. Check Index.tsx Conditional Flow
Add temporary logs to each conditional block:
```typescript
if (logoutReason === 'expired' || logoutReason === 'other_session') {
  console.log('→ Rendering LoggedOutElsewhereScreen');
  return <LoggedOutElsewhereScreen />;
}

if (authLoading) {
  console.log('→ Rendering Auth Loading');
  return <LoadingState />;
}
// ... etc
```

### 4. Verify State Updates
Use React DevTools to watch store updates in real-time:
- Open React DevTools
- Select "Components" tab
- Watch state changes as you perform actions

### 5. Check Network State
```javascript
console.log('Online:', navigator.onLine);
console.log('Has Queued Changes:', CloudSyncService.hasQueuedChanges());
```

---

## 🚑 Emergency Fixes

### User Stuck on 404

**Immediate Action:**
1. User should click "Return to Home" link
2. If link doesn't work, manually navigate to `/`
3. If still broken, clear browser data

**Prevention:**
- NotFound.tsx should auto-redirect (see fix below)
- No code should navigate to non-existent routes

**Code Fix:**
Update `NotFound.tsx` to auto-redirect:
```typescript
const NotFound = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  
  useEffect(() => {
    console.error('404: Redirecting to home...');
    setTimeout(() => {
      navigate('/');
    }, 2000);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Redirecting...</h1>
        <p className="text-gray-600">Taking you back to the app</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mt-4"></div>
      </div>
    </div>
  );
};
```

---

## 📚 Related Documentation

- **`.cursorrules`** - Specific rules for AI assistants
- **`ARCHITECTURE_PRINCIPLES.md`** - High-level design philosophy
- **`CLAUDE.md`** - Technical architecture details
- **`CRITICAL-BUG-REPORT.md`** - Historical issues and fixes
- **`TIMESTAMP_SYNC_IMPLEMENTATION.md`** - Conflict resolution details
- **`DATA_LOSS_FIX_SUMMARY.md`** - Validation layers

---

*Last Updated: October 21, 2025*
*Keep this document updated as new states or transitions are added.*


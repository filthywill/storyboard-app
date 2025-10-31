# Storyboard Flow - Architecture Principles

## 🎯 Core Design Philosophy

### Single Page Application (SPA) with State-Driven UI
Storyboard Flow is fundamentally a single-page application where the UI is determined entirely by application state, not by URL routing.

---

## 🏗️ Principle 1: State-First, Not Route-First

**UI = f(authState, projectState, loadingState, offlineState)**

The Index.tsx component is the state machine that renders appropriate UI based on current application state.

### Routes Are ONLY For:
- `/` - Main application (Index.tsx) - **handles all UI states**
- `/auth/callback` - OAuth callback handler (required for Google/GitHub/Apple login)
- `/privacy` - Static privacy policy
- `/terms` - Static terms of service  
- `*` - Catch-all that **auto-redirects** back to `/` (never shows 404 to users)

### State-Driven, Not Route-Driven:
```typescript
// ✅ CORRECT: State change triggers UI update
setIsAuthenticated(false);
// Index.tsx automatically shows EmptyProjectState

// ❌ WRONG: Navigation without state change
navigate('/logout'); // This route doesn't exist, causes 404
```

---

## 🛡️ Principle 2: No User-Facing Errors Without Context

### Users Should NEVER See:
- ❌ Generic 404 pages during normal application flow
- ❌ "Something went wrong" without explanation
- ❌ Dead ends with no path forward
- ❌ Blank screens
- ❌ Undefined states

### Users MUST Always See:
- ✅ Clear indication of current state
- ✅ Available actions (buttons, links)
- ✅ Path forward (even if it's "sign in" or "create project")
- ✅ Meaningful loading states
- ✅ Helpful error messages with retry options

### Example:
```typescript
// ❌ BAD
if (error) {
  return <div>Error occurred</div>; // No action, no context
}

// ✅ GOOD
if (error) {
  return (
    <div>
      <h2>Failed to load project</h2>
      <p>Your internet connection may be unstable</p>
      <button onClick={retry}>Try Again</button>
      <button onClick={goToProjects}>View All Projects</button>
    </div>
  );
}
```

---

## 🔄 Principle 3: Graceful Degradation

**Fail-Safe Defaults:**
- If unsure of state → show EmptyProjectState with appropriate actions
- If network error → allow local work, show offline banner
- If authentication error → show sign-in option
- If data corruption detected → preserve cloud version, notify user
- If invalid route accessed → auto-redirect to main app

**Progressive Enhancement:**
- App works offline (localStorage)
- Syncs when online (Supabase)
- Shows real-time status (banners, indicators)
- Recovers from errors automatically where possible

---

## 📊 State Management Architecture

### Authentication States

```
┌─────────────────────────────────────────────────┐
│ NOT AUTHENTICATED                               │
├─────────────────────────────────────────────────┤
│ logoutReason: 'none'                           │
│ → EmptyProjectState (Welcome)                  │
│   - "Sign In / Sign Up" button                 │
│   - "Create a Test Project" button             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ AUTHENTICATED + LOADING                         │
├─────────────────────────────────────────────────┤
│ isAuthenticated: true                          │
│ authLoading: true OR isLoadingCloudProjects    │
│ → Loading Spinner (inline)                     │
│   - "Loading..." or "Loading your projects..." │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ AUTHENTICATED + NO PROJECTS                     │
├─────────────────────────────────────────────────┤
│ isAuthenticated: true                          │
│ allProjects: []                                │
│ → EmptyProjectState (Create)                   │
│   - "Create New Project" button                │
│   - Syncs to cloud automatically               │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ AUTHENTICATED + HAS PROJECTS + NO CURRENT       │
├─────────────────────────────────────────────────┤
│ isAuthenticated: true                          │
│ allProjects: [{...}]                           │
│ currentProject: null                           │
│ → ProjectPickerModal                           │
│   - List of user's projects                    │
│   - "Create New Project" button                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ AUTHENTICATED + CURRENT PROJECT                 │
├─────────────────────────────────────────────────┤
│ isAuthenticated: true                          │
│ currentProject: {...}                          │
│ → Main UI                                      │
│   - Full application interface                 │
│   - All features available                     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ FORCED LOGOUT (OTHER DEVICE)                    │
├─────────────────────────────────────────────────┤
│ logoutReason: 'expired' OR 'other_session'     │
│ → LoggedOutElsewhereScreen                     │
│   - Explanation message                        │
│   - "Sign In Again" button                     │
└─────────────────────────────────────────────────┘
```

### Project State Resume Behavior

**Page Refresh / Browser Reopen:**
- If user was working on ProjectA → Auto-load ProjectA (resume)
- Session persists until sign-out or forced logout

**Fresh Login:**
- User signed out, then signs back in → Show ProjectPicker
- Logged out from other device, signs back in → Show ProjectPicker

### Data Flow

```
User Action
    ↓
Store Update (Zustand)
    ↓
Index.tsx Re-renders
    ↓
Conditional Logic Evaluates State
    ↓
Appropriate UI Component Renders
```

### Never:
```
User Action
    ↓
navigate('/some-route')  ❌ WRONG
    ↓
Route-based component
    ↓
Might show 404
```

---

## 🔐 Principle 4: Offline-First with Cloud Sync

### User Experience:
1. **User works locally** (localStorage) - instant, always available
2. **Changes auto-save** to localStorage - no data loss
3. **Auto-sync to cloud** when online - backup & multi-device access
4. **Timestamp-based conflict resolution** - preserves most recent intentional changes

### Critical Offline Rules:

**When Going Offline:**
- ✅ Continue working (all features available)
- ✅ Show offline banner
- ✅ Queue changes for sync

**When Reconnecting:**
- ✅ Compare timestamps (local vs cloud)
- ✅ Sync newer changes to cloud
- ✅ Preserve cloud if it's newer
- ✅ Notify user of sync result

**When Signing Out Offline:**
- ❌ Block sign-out
- ✅ Show message: "You have unsynced changes. Please connect to internet first."
- ✅ Allow sign-out only when online OR no unsynced changes

### Timestamp-Based Conflict Resolution:
```
Local lastModified: 10:05:00 AM
Cloud data_updated_at: 10:10:00 AM
Clock skew tolerance: 5 seconds

Decision: Cloud is newer (10:10 > 10:05 + tolerance)
Action: Preserve cloud data, discard local changes
Notification: "Project was updated elsewhere. Loading latest version."
```

---

## 📁 File Responsibilities

### Index.tsx
**Role:** Application state machine and UI coordinator

**Responsibilities:**
- Initialize app services (auth, storage, sync)
- Monitor authentication state changes
- Monitor project state changes
- Monitor offline/online state
- Render appropriate UI for current state combination
- Handle state transitions
- Coordinate between stores and services

**Never:**
- Navigate to other routes based on state
- Rely on URL for state management
- Contain business logic
- Directly manipulate database

### Stores (authStore, projectManagerStore, etc.)
**Role:** Source of truth for application state

**Responsibilities:**
- Persist state to localStorage
- Provide state update methods
- Trigger component re-renders when state changes
- Maintain state consistency

**Never:**
- Directly manipulate DOM
- Trigger navigation/redirects
- Contain UI logic
- Make assumptions about what UI is displayed

### Services (AuthService, CloudSyncService, ProjectService, etc.)
**Role:** Business logic and external API communication

**Responsibilities:**
- Handle authentication with Supabase
- Sync data with cloud database
- Manage file storage
- Validate data before operations
- Update stores with results
- Queue offline changes

**Never:**
- Make assumptions about UI state
- Navigate or redirect users
- Directly update UI
- Skip validation checks

### Components (EmptyProjectState, ProjectPickerModal, etc.)
**Role:** Presentation and user interaction

**Responsibilities:**
- Render UI for specific states
- Capture user input
- Call store methods or service methods
- Show loading/error states

**Never:**
- Manage complex state internally (use stores)
- Navigate between application states
- Contain business logic
- Directly access database

### TemplateBackground.tsx
**Role:** Visual template for empty states

**Responsibilities:**
- Show storyboard layout preview
- Provide visual context for empty states
- Work as dimmed background behind overlays

**Never:**
- Contain real project data
- Be interactive
- Replace actual storyboard functionality

---

## 🚨 Critical Paths to Protect

### 1. Sign In Flow
```
1. User clicks "Sign In"
2. AuthModal opens
3. User authenticates via Google/GitHub/Apple
4. OAuth redirects to /auth/callback
5. Callback validates token
6. authStore updates (isAuthenticated = true)
7. Redirect to /
8. Index.tsx detects auth change
9. Loads cloud project list
10. Shows ProjectPicker or auto-loads last project
✅ NO 404, NO DEAD-ENDS
```

### 2. Sign Out Flow
```
1. User clicks "Sign Out"
2. Check if online:
   - If offline with unsynced → Block sign-out, show message
   - If online → Proceed
3. AuthService.signOut() called
4. ProjectSwitcher.clearCurrentProjectData() called
5. authStore updates (isAuthenticated = false)
6. Index.tsx detects auth change
7. Shows EmptyProjectState (Welcome screen)
✅ NO NAVIGATION, NO 404
```

### 3. Project Switch Flow
```
1. User selects project from ProjectSelector or ProjectPicker
2. ProjectSwitcher.switchToProject(projectId) called
3. Saves current project (if any)
4. Loads new project data from localStorage
5. Updates stores with new project data
6. Updates currentProjectId
7. Index.tsx re-renders with new project
✅ NO NAVIGATION, NO 404
```

### 4. Offline → Online Sync Flow
```
1. User reconnects to internet
2. Offline banner disappears
3. BackgroundSyncService detects online
4. Processes offline queue:
   a. For each queued change
   b. Compare local vs cloud timestamps
   c. If local newer → Validate, then sync
   d. If cloud newer → Preserve cloud, notify
5. Shows sync result notification
✅ PRESERVES MOST RECENT INTENTIONAL CHANGES
```

### 5. Forced Logout Flow (Other Device)
```
1. User logs in on Device B
2. Device B invalidates Device A's session
3. Device A receives real-time notification
4. Device A clears auth locally (no API call needed)
5. Device A clears project data
6. authStore updates (logoutReason = 'other_session')
7. Index.tsx shows LoggedOutElsewhereScreen
✅ CLEAR MESSAGING, PATH TO SIGN BACK IN
```

### 6. Template Background Flow
```
1. User sees empty state (unauthenticated or no projects)
2. TemplateBackground renders dimmed storyboard template
3. EmptyProjectState overlay shows on top
4. User sees visual preview + clear actions
✅ NO FAKE DATA, NO "PAGE NOT FOUND" ERRORS
```

---

## ✅ Success Criteria

A change is architecturally sound if:

1. ✅ User never sees 404 during normal operation
2. ✅ Every state has clear UI with available actions
3. ✅ State transitions are predictable and logged
4. ✅ Errors provide context and path forward
5. ✅ Index.tsx remains the single state machine
6. ✅ No business logic in routing
7. ✅ All user journeys tested end-to-end
8. ✅ Offline work is preserved and synced correctly
9. ✅ Timestamp-based conflict resolution protects data
10. ✅ Users can always recover from any state

---

## 🔄 Data Integrity Principles

### Multi-Layer Validation

**Layer 1: Client-Side (GuestProjectSyncService)**
- Validate data exists in localStorage
- Check shot/page counts match expectations
- Compare with cloud data before sync
- Skip sync if corruption detected

**Layer 2: Service-Layer (CloudSyncService)**
- Validate currentProjectId exists
- Check timestamp before overwriting
- Verify project scope for operations

**Layer 3: Database-Layer (ProjectService)**
- Validate data not empty when cloud has data
- Compare cloud vs new data
- Throw error if data loss detected
- Only allow empty saves for new projects

### Timestamp Management Rules

**Update lastModified ONLY when:**
- ✅ User adds/edits/deletes shots
- ✅ User adds/edits/deletes pages
- ✅ User changes project settings
- ✅ User uploads/removes images
- ✅ User modifies project metadata

**NEVER update lastModified when:**
- ❌ Loading project from cloud
- ❌ Switching between projects (just viewing)
- ❌ Opening a project (just accessing)
- ❌ Auto-save triggered by load
- ❌ Reading data for display

---

## 🧪 Testing Philosophy

### Manual Testing Requirements

Every PR affecting auth/navigation/data sync must include:

1. **Sign in/out flows** - All scenarios tested
2. **Project switching** - Between multiple projects
3. **Offline/online transitions** - With and without changes
4. **Multi-device scenarios** - Timestamp conflict resolution
5. **Edge cases** - Empty projects, corrupted data, network errors

### Test for Negative Cases:
- What happens if user does something unexpected?
- What if network fails mid-operation?
- What if data is corrupted?
- What if timestamps are identical?

### Success Metrics:
- No 404 pages shown during testing
- All states have clear UI
- User is never stuck without options
- Data is never lost
- Most recent intentional changes are preserved

---

## 🎨 Principle 7: Semantic Separation in Design Systems

### Overview
UI element types (buttons, containers, inputs) must have independent styling to prevent cascading changes and maintain clear separation of concerns.

### The Problem
Using the same color palette category for different UI element types creates unintended dependencies:

```typescript
// ❌ PROBLEMATIC: Shared colors across element types
background.primary → Used for BOTH containers AND buttons
// Changing button colors inadvertently changes container backgrounds
```

### The Solution: Semantic Separation
Each UI element type gets its own dedicated color space:

```typescript
// ✅ CORRECT: Semantic separation
background.* → Containers, panels, headers ONLY
button.*     → Interactive buttons ONLY
input.*      → Form fields ONLY
```

### Color Palette Organization

#### **Container Colors** (`background.*`)
Reserved for structural UI elements:
- `primary`: Main container backgrounds
- `secondary`: Dark surfaces (modals, dropdowns)
- `subtle`: Subtle container backgrounds
- `accent`: Accent surfaces

**Usage:**
```typescript
<div style={getGlassmorphismStyles('primary')} />   // Containers
<div style={getGlassmorphismStyles('dark')} />      // Modal cards
```

#### **Button Colors** (`button.*`)
Exclusively for interactive button elements:
- `primary`: Default button backgrounds
- `secondary`: Emphasized buttons (slightly brighter)
- `accent`: Call-to-action buttons
- `hover`: Hover state overlay

**Usage:**
```typescript
<Button style={getGlassmorphismStyles('button')} />         // Default
<Button style={getGlassmorphismStyles('buttonSecondary')} /> // Emphasized
<Button style={getGlassmorphismStyles('buttonAccent')} />    // CTA
```

#### **Input Colors** (`input.*`)
Specifically for form input fields:
- `background`: Input field backgrounds
- `border`: Input field borders

**Usage:**
```typescript
<Input style={{ 
  backgroundColor: getColor('input', 'background'),
  border: `1px solid ${getColor('input', 'border')}`
}} />
```

### Benefits

#### **1. Independent Control**
Update one element type without affecting others:
```typescript
// Change button colors only
COLOR_PALETTE.button.primary = 'rgba(255, 0, 0, 0.2)';
// → Only buttons change, containers unaffected ✅

// Change container backgrounds only
COLOR_PALETTE.background.primary = 'rgba(0, 255, 0, 0.2)';
// → Only containers change, buttons unaffected ✅
```

#### **2. Clear Intent**
Code explicitly communicates what's being styled:
```typescript
// Ambiguous (old way)
<Button style={getGlassmorphismStyles('primary')} />
// → Is this a container or button?

// Explicit (new way)
<Button style={getGlassmorphismStyles('button')} />
// → Clearly a button ✅
```

#### **3. Maintainability**
Easy to update styles without side effects:
- New developers understand the system quickly
- No cascading changes to debug
- Clear separation of concerns
- Follows single responsibility principle

#### **4. Scalability**
System grows cleanly as new element types are added:
- Add new category (e.g., `badge.*`, `tooltip.*`)
- Define colors for that category
- Use dedicated glassmorphism variants
- No risk of affecting existing elements

### Implementation

#### **File Location**
`src/styles/glassmorphism-styles.ts` - Single source of truth for all styling

#### **Color Palette Structure**
```typescript
export const COLOR_PALETTE = {
  border: { ... },        // All border colors
  background: { ... },    // Container colors ONLY
  button: { ... },        // Button colors ONLY
  input: { ... },         // Input colors ONLY
  text: { ... }           // Text colors
} as const;
```

#### **Glassmorphism Variants**
- `primary`, `dark`, `header`, `content`, `background` → For containers
- `button`, `buttonSecondary`, `buttonAccent` → For buttons
- No dedicated variants for inputs (use `getColor()` directly)

### Guidelines

#### **DO:**
- ✅ Use `button.*` colors for all interactive buttons
- ✅ Use `background.*` colors for all containers/panels/headers
- ✅ Use `input.*` colors for all form fields
- ✅ Keep each UI element type in its own semantic category
- ✅ Update documentation when adding new categories

#### **DON'T:**
- ❌ Use `background.*` colors for buttons
- ❌ Use `button.*` colors for containers
- ❌ Mix semantic categories across element types
- ❌ Create generic "primary" colors that serve multiple purposes
- ❌ Share color values across categories without clear intent

### Testing Semantic Separation

To verify the separation works:

**Test 1: Button Independence**
```typescript
// Change button.primary to red
// Verify: Only buttons change, not containers
```

**Test 2: Container Independence**
```typescript
// Change background.primary to green  
// Verify: Only containers change, not buttons
```

**Test 3: Input Independence**
```typescript
// Change input.background to blue
// Verify: Only input fields change, nothing else
```

### Why This Matters

1. **Prevents Bugs**: No unintended cascading changes
2. **Improves DX**: Clear, explicit code that's easy to understand
3. **Enhances Maintainability**: Update one element type without risk
4. **Follows Best Practices**: Industry-standard design system approach
5. **Scales Well**: Easy to add new element types without conflicts

### Related Documentation
- `shot-flow-builder/UNIFIED_COLOR_SYSTEM_IMPLEMENTATION.md` - Complete implementation guide
- `shot-flow-builder/GLASSMORPHISM_AUDIT.md` - Component migration tracking
- `.cursorrules` - Specific rules for semantic color usage

---

## 📚 Related Documentation

- **`.cursorrules`** - Specific rules for AI assistants
- **`UI_STATE_HANDLING.md`** - Complete state matrix and transitions
- **`CLAUDE.md`** - Technical architecture and component details
- **`CRITICAL-BUG-REPORT.md`** - Historical data corruption issues and fixes
- **`TIMESTAMP_SYNC_IMPLEMENTATION.md`** - Conflict resolution implementation
- **`DATA_LOSS_FIX_SUMMARY.md`** - Validation layers and protection mechanisms
- **`shot-flow-builder/UNIFIED_COLOR_SYSTEM_IMPLEMENTATION.md`** - Styling system and semantic separation

---

*Last Updated: October 30, 2025*
*Added Principle 7: Semantic Separation in Design Systems*
*This document should be reviewed and updated as the application evolves.*


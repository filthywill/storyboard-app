# Storyboard Flow - Documentation Index

## 📚 Quick Reference Guide

This index helps you find the right documentation for your needs.

---

## 🚨 **Start Here: Critical Rules**

### `.cursorrules` (Auto-loaded by Cursor AI)
**Location:** `/storyboard-app-claude/.cursorrules`

**Purpose:** Mandatory rules that AI assistants must follow

**Key Topics:**
- ✅ Never show 404 to users during normal operation
- ✅ State-driven UI (not route-driven)
- ✅ Auth state handling and sign-out flows
- ✅ Project state consistency
- ✅ Offline/online sync with timestamp validation
- ✅ Critical "never do this" rules
- ✅ Testing requirements
- ✅ Emergency fixes

**When to Read:** EVERY time before making changes to:
- Index.tsx
- Auth-related files
- ProjectSwitcher
- CloudSyncService
- Any navigation logic

---

## 🏗️ **Architecture & Design**

### `ARCHITECTURE_PRINCIPLES.md`
**Location:** `/storyboard-app-claude/ARCHITECTURE_PRINCIPLES.md`

**Purpose:** High-level design philosophy and patterns

**Key Topics:**
- Single-page application architecture
- State-first, not route-first principle
- No user-facing errors without context
- Graceful degradation strategies
- Offline-first with cloud sync
- File responsibilities (Index.tsx, stores, services, components)
- Critical paths to protect (sign in, sign out, project switch, sync)
- Data integrity principles
- Multi-layer validation

**When to Read:** 
- Planning new features
- Understanding why things work the way they do
- Making architectural decisions
- Refactoring existing code

---

## 🎨 **UI State Management**

### `UI_STATE_HANDLING.md`
**Location:** `/storyboard-app-claude/UI_STATE_HANDLING.md`

**Purpose:** Complete state matrix and UI decision tree

**Key Topics:**
- All state variables and their meanings
- Exact state decision tree (order matters!)
- Required UI components for each state
- Detailed state transitions with examples
- Common mistakes and how to fix them
- Comprehensive testing checklist
- State debugging guide
- Emergency fixes

**When to Read:**
- Implementing new UI states
- Debugging "why am I seeing this screen?" issues
- Understanding state transitions
- Writing tests for UI states
- Fixing 404 or blank screen issues

---

## 🛠️ **Technical Details**

### `shot-flow-builder/CLAUDE.md`
**Location:** `/storyboard-app-claude/shot-flow-builder/CLAUDE.md`

**Purpose:** Technical architecture and component details

**Key Topics:**
- Tech stack (React, Zustand, Vite, etc.)
- Project structure
- Zustand store architecture (page, shot, project, UI stores)
- Key components and their roles
- Export system architecture
- Development commands
- Performance optimizations
- References to other documentation

**When to Read:**
- Getting started with the codebase
- Understanding component architecture
- Working with stores
- Implementing export features
- Setting up development environment

---

## 🌐 **Hosting & Headers (Vercel)**

**Location:** `vercel.json`

**Purpose:** Define security headers at the edge (preferred over HTML meta).

**Defaults:**
- `X-Frame-Options: SAMEORIGIN`
- `Content-Security-Policy: frame-ancestors 'self';`

**Notes:**
- Remove `<meta http-equiv="X-Frame-Options">` from HTML (ineffective; causes console warning).
- If embedding is required later (e.g., partner sites), explicitly extend `frame-ancestors` with trusted origins.

**Files touched:**
- `vercel.json`
- `shot-flow-builder/index.html` (meta X-Frame-Options removed)

---

## 🎨 **Styling & Design System**

### `shot-flow-builder/UNIFIED_COLOR_SYSTEM_IMPLEMENTATION.md`
**Location:** `/storyboard-app-claude/shot-flow-builder/UNIFIED_COLOR_SYSTEM_IMPLEMENTATION.md`

**Purpose:** Complete guide to the unified color and styling system

**Key Topics:**
- Unified color palette with semantic separation
- Button, container, and input color categories
- Glassmorphism style variants
- Usage examples and migration patterns
- Progressive enhancement approach
- October 30, 2025 semantic separation update

**When to Read:**
- Styling components (buttons, containers, inputs)
- Understanding the color system architecture
- Adding new UI components
- Debugging styling issues
- Updating glassmorphism effects

**Key Principle:**
- Each UI element type (buttons, containers, inputs) has its own color space
- Prevents cascading changes when updating styles
- See also: Principle 7 in `ARCHITECTURE_PRINCIPLES.md`

---

### `shot-flow-builder/GLASSMORPHISM_AUDIT.md`
**Location:** `/storyboard-app-claude/shot-flow-builder/GLASSMORPHISM_AUDIT.md`

**Purpose:** Tracks glassmorphism styling migration and component updates

**Key Topics:**
- Component audit results
- White border fixes (Phase 2 completed)
- Semantic color separation implementation
- Migration status tracking
- Testing checklist

**When to Read:**
- Checking which components use unified styling
- Understanding migration progress
- Planning styling refactoring work

---

## 🐛 **Historical Issues & Fixes**

### `CRITICAL-BUG-REPORT.md`
**Location:** `/storyboard-app-claude/CRITICAL-BUG-REPORT.md`

**Purpose:** Documents the data corruption bug and its fixes

**Key Topics:**
- What happened (GoogleTest project corruption)
- Root cause analysis
- The bugs (unconditional initializeAppContent, auto-save without context)
- Fixes implemented
- Still missing safeguards (versioning, recovery tools)

**When to Read:**
- Understanding why certain rules exist
- Implementing data safety features
- Debugging data corruption issues
- Planning versioning/backup systems

---

### `DATA_LOSS_FIX_SUMMARY.md`
**Location:** `/storyboard-app-claude/DATA_LOSS_FIX_SUMMARY.md`

**Purpose:** Documents multi-layer validation implementation

**Key Topics:**
- Layer 1: GuestProjectSyncService validation
- Layer 2: ProjectService database-level validation
- Empty data detection
- Partial data loss detection
- Cloud data protection

**When to Read:**
- Understanding validation layers
- Debugging sync issues
- Implementing new validation checks

---

### `TIMESTAMP_SYNC_IMPLEMENTATION.md`
**Location:** `/storyboard-app-claude/TIMESTAMP_SYNC_IMPLEMENTATION.md`

**Purpose:** Documents timestamp-based conflict resolution

**Key Topics:**
- Hybrid timestamp-first approach
- Clock skew tolerance (5 seconds)
- Conflict resolution strategy
- When lastModified should/shouldn't update
- Toast notification fixes

**When to Read:**
- Understanding offline sync logic
- Debugging timestamp conflicts
- Implementing new sync features
- Understanding why cloud data sometimes "wins"

---

### `IMAGE_EDITOR_IMPLEMENTATION.md`
**Location:** `/storyboard-app-claude/IMAGE_EDITOR_IMPLEMENTATION.md`

**Purpose:** Documents the Image Editor feature and percentage-based offset system

**Key Topics:**
- Percentage-based positioning system
- Image Editor modal implementation
- PDF export integration
- Grid layout independence
- Troubleshooting guide
- Testing scenarios

**When to Read:**
- Working on image editing features
- Understanding transform data flow
- Debugging image positioning issues
- Implementing PDF export features

---

### `TESTING_GUIDE_TIMESTAMP_SYNC.md`
**Location:** `/storyboard-app-claude/TESTING_GUIDE_TIMESTAMP_SYNC.md`

**Purpose:** Comprehensive testing scenarios for timestamp sync

**Key Topics:**
- 8 detailed test scenarios
- Expected outcomes
- How to verify each scenario
- What to check in console logs

**When to Read:**
- Testing sync functionality
- Verifying timestamp behavior
- Regression testing after changes

---

## 📋 **Planning & Specs**

### `shot-flow-builder/docs/plan-consolidated.md`
**Location:** `/storyboard-app-claude/shot-flow-builder/docs/plan-consolidated.md`

**Purpose:** Shot order, redistribution, and cloud switching plan

**Key Topics:**
- First-change shot swap prevention
- Safe cloud project load sequence
- Redistribution and global shot order rules
- Numbering and formatting
- Batch/import UX

**When to Read:**
- Working on shot ordering logic
- Implementing redistribution features
- Debugging shot swap issues
- Understanding project switching internals

---

## 🔍 **Quick Navigation by Task**

### "I want to add a new UI state"
1. Read: `UI_STATE_HANDLING.md` (state decision tree)
2. Read: `.cursorrules` (state consistency rules)
3. Check: `ARCHITECTURE_PRINCIPLES.md` (graceful degradation)
4. Implement: Add to Index.tsx conditional rendering
5. Test: Follow checklist in `UI_STATE_HANDLING.md`

---

### "I'm working on authentication"
1. Read: `.cursorrules` (auth flow requirements)
2. Read: `ARCHITECTURE_PRINCIPLES.md` (critical paths: sign in/out)
3. Read: `UI_STATE_HANDLING.md` (auth state transitions)
4. Implement: Update authStore and services
5. Test: Sign in, sign out, forced logout scenarios

---

### "I'm styling a component"
1. Read: `shot-flow-builder/UNIFIED_COLOR_SYSTEM_IMPLEMENTATION.md` (color system)
2. Check: `ARCHITECTURE_PRINCIPLES.md` Principle 7 (semantic separation)
3. Review: `.cursorrules` Rule #13 (semantic color categories)
4. Implement: Use appropriate color category (button.*/background.*/input.*)
5. Test: Verify no cascading changes to other element types

---

### "I'm fixing a sync issue"
1. Read: `TIMESTAMP_SYNC_IMPLEMENTATION.md` (how timestamps work)
2. Read: `DATA_LOSS_FIX_SUMMARY.md` (validation layers)
3. Read: `.cursorrules` (offline/online sync rules)
4. Check: Console logs for timestamp comparisons
5. Test: Offline work + reconnect scenarios

---

### "Users are seeing 404 errors"
1. Read: `.cursorrules` (NO 404 rule)
2. Read: `UI_STATE_HANDLING.md` (emergency fixes)
3. Check: Are we using `navigate()` to non-existent routes?
4. Check: Is Index.tsx handling all state combinations?
5. Fix: NotFound.tsx auto-redirects (already implemented)

---

### "I'm adding a new feature"
1. Read: `ARCHITECTURE_PRINCIPLES.md` (design philosophy)
2. Read: `.cursorrules` (critical rules)
3. Read: `CLAUDE.md` (technical architecture)
4. Plan: Which states are affected?
5. Implement: Update stores, services, UI
6. Test: All affected states

---

### "I'm debugging data corruption"
1. Read: `CRITICAL-BUG-REPORT.md` (historical issues)
2. Read: `DATA_LOSS_FIX_SUMMARY.md` (validation layers)
3. Check: Console logs for validation warnings
4. Check: Are timestamps being compared?
5. Check: Is currentProjectId validated before saves?

---

### "I'm working on image editing or PDF export"
1. Read: `IMAGE_EDITOR_IMPLEMENTATION.md` (percentage-based system)
2. Read: `PDF_PERCENTAGE_FIX.md` (export fixes)
3. Check: Are offsets stored as percentages?
4. Check: Is PDF export using store values?
5. Test: Grid layout independence

---

## 📁 **File Organization**

```
storyboard-app-claude/
├── .cursorrules                          ← Cursor AI auto-loads this
├── ARCHITECTURE_PRINCIPLES.md            ← Design philosophy
├── UI_STATE_HANDLING.md                  ← State matrix
├── DOCUMENTATION_INDEX.md                ← You are here!
├── CRITICAL-BUG-REPORT.md                ← Historical data bug
├── DATA_LOSS_FIX_SUMMARY.md              ← Validation layers
├── TIMESTAMP_SYNC_IMPLEMENTATION.md      ← Conflict resolution
├── TESTING_GUIDE_TIMESTAMP_SYNC.md       ← Testing scenarios
├── IMAGE_EDITOR_IMPLEMENTATION.md        ← Image editing system
├── PDF_PERCENTAGE_FIX.md                 ← PDF export fixes
├── PERCENTAGE_OFFSET_IMPLEMENTATION.md   ← Offset system details
└── shot-flow-builder/
    ├── CLAUDE.md                         ← Technical architecture
    ├── README.md                         ← Project overview
    └── docs/
        └── plan-consolidated.md          ← Shot order plan
```

---

## 🎯 **Priority Reading for New Developers**

### Day 1:
1. `shot-flow-builder/README.md` - Project overview
2. `.cursorrules` - Critical rules (30 min read)
3. `ARCHITECTURE_PRINCIPLES.md` - Design philosophy (45 min read)

### Day 2:
1. `shot-flow-builder/CLAUDE.md` - Technical details (60 min read)
2. `UI_STATE_HANDLING.md` - State management (60 min read)

### Day 3:
1. `CRITICAL-BUG-REPORT.md` - What went wrong and why (30 min)
2. `TIMESTAMP_SYNC_IMPLEMENTATION.md` - How sync works (30 min)

### Ongoing:
- Reference `.cursorrules` before EVERY commit
- Reference `UI_STATE_HANDLING.md` when touching Index.tsx
- Reference `ARCHITECTURE_PRINCIPLES.md` when making design decisions

---

## 🚀 **Quick Tips**

### Before ANY commit:
✅ Did I read `.cursorrules`?  
✅ Did I test all affected states?  
✅ Will users ever see 404 from my changes?  
✅ Did I validate timestamps for offline sync?  
✅ Are all state combinations handled?  

### When stuck:
1. Check console logs for state values
2. Look up the state in `UI_STATE_HANDLING.md`
3. Verify the state decision tree
4. Check if validation layers caught an issue
5. Ask: "What should the user see in this state?"

### Common Issues:
- **Users see 404** → Check `.cursorrules`, fix navigation
- **Data corruption** → Check `DATA_LOSS_FIX_SUMMARY.md`, validate timestamps
- **Blank screen** → Check `UI_STATE_HANDLING.md`, add missing state
- **Offline sync fails** → Check `TIMESTAMP_SYNC_IMPLEMENTATION.md`
- **Sign out broken** → Check `.cursorrules` offline check

---

## 📝 **Updating Documentation**

### When to Update:
- New UI states added → Update `UI_STATE_HANDLING.md`
- New architecture patterns → Update `ARCHITECTURE_PRINCIPLES.md`
- New critical rules → Update `.cursorrules`
- New bug discovered → Create new report or update existing
- New features affecting state → Update multiple docs

### How to Update:
1. Keep docs in sync with code
2. Include examples and code snippets
3. Update "Last Updated" date
4. Update this index if adding new docs
5. Review related docs for consistency

---

## 🤝 **Contributing**

When making significant changes:
1. Update relevant documentation
2. Add examples if introducing new patterns
3. Update testing checklists if needed
4. Keep `.cursorrules` as the source of truth for AI assistants

---

## 📝 **Recent Updates**

### October 30, 2025
- ✅ Added semantic color separation to unified styling system
- ✅ Introduced `button.*` and `input.*` color categories
- ✅ Created three new glassmorphism variants for buttons
- ✅ Updated AuthModal, EmptyProjectState, ProjectPickerModal components
- ✅ Added Principle 7 to ARCHITECTURE_PRINCIPLES.md
- ✅ Added Rule #13 to .cursorrules (semantic color categories)
- ✅ Updated styling documentation across the project

### Key Changes
- **New Documentation Section**: "Styling & Design System" added to index
- **New Principle**: Principle 7 - Semantic Separation in Design Systems
- **Enhanced Color System**: Independent control for buttons, containers, and inputs
- **Migration Completed**: Phase 2 glassmorphism updates with semantic separation

---

*Last Updated: October 30, 2025*
*Keep this index updated as documentation evolves.*




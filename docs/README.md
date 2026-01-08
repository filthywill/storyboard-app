# 📚 Storyboard Flow Documentation

Welcome to the Storyboard Flow documentation! This directory contains all project documentation organized by category.

## 🚀 Quick Start

**New to the project?** Start here:
1. Read [`../.cursorrules`](../.cursorrules) - Critical rules (auto-loaded by Cursor AI)
2. Read [`architecture/ARCHITECTURE_PRINCIPLES.md`](architecture/ARCHITECTURE_PRINCIPLES.md) - Design philosophy
3. Read [`architecture/UI_STATE_HANDLING.md`](architecture/UI_STATE_HANDLING.md) - State management

**Looking for something specific?** See the [Complete Documentation Index](maintenance/DOCUMENTATION_INDEX.md)

---

## 📂 Documentation Structure

### 🏗️ [`architecture/`](architecture/)
Core design principles and state management
- **ARCHITECTURE_PRINCIPLES.md** - Design philosophy and patterns
- **UI_STATE_HANDLING.md** - Complete state matrix and transitions
- **STORYBOARD_THEME_SYSTEM_PLAN.md** - Theme system architecture
- **STORYBOARD_THEMEABLE_ARCHITECTURE.md** - Themeable component patterns
- **storyboard-refactoring-analysis.md** - Refactoring analysis

### 🐛 [`bugs-and-fixes/`](bugs-and-fixes/)
Historical issues, bug reports, and fix summaries
- **CRITICAL-BUG-REPORT.md** - Data corruption issues and fixes
- **DATA_LOSS_FIX_SUMMARY.md** - Validation layers implementation
- **SIGNOUT_FLOW_FIX_SUMMARY.md** - Sign-out flow fixes
- **TEST_PLAN_DATA_LOSS_FIX.md** - Testing plans

### ✨ [`features/`](features/)
Feature implementation documentation
- **IMAGE_EDITOR_IMPLEMENTATION.md** - Image editing system
- **IMAGE_EDITOR_TEST_V2.md** - Image editor testing
- **IMAGE_TRANSFORM_ANALYSIS.md** - Transform analysis
- **PDF_PERCENTAGE_FIX.md** - PDF export fixes
- **PERCENTAGE_OFFSET_IMPLEMENTATION.md** - Offset system details

### 🔄 [`sync-and-data/`](sync-and-data/)
Data synchronization and offline/online behavior
- **TIMESTAMP_SYNC_IMPLEMENTATION.md** - Conflict resolution
- **TESTING_GUIDE_TIMESTAMP_SYNC.md** - Sync testing scenarios
- **BACKGROUND_SYSTEM_DOCUMENTATION.md** - Background system docs

### 🎨 [`styling/`](styling/)
Styling system, color management, and UI patterns
- **UNIFIED_COLOR_SYSTEM_IMPLEMENTATION.md** - Complete color system
- **GLASSMORPHISM_AUDIT.md** - Glassmorphism component audit
- **COLOR_SYSTEM_COMPREHENSIVE_AUDIT.md** - Comprehensive color audit
- **COLOR_SYSTEM_FULL_AUDIT_2025.md** - 2025 color system audit
- **SCALING_ALIGNMENT_PATTERNS.md** - Scaling and alignment patterns
- **THEME_TOOLBAR_IMPLEMENTATION.md** - Theme toolbar implementation
- **THEME_BORDER_DEBUG_GUIDE.md** - Theme debugging guide

### 🔄 [`migrations/`](migrations/)
Migration history and phase completions
- **PHASES_4-6_MIGRATION_SUMMARY.md** - Phases 4-6 color migration
- **PHASE_1_AND_2_COMPLETE.md** - Phase 1 & 2 completion
- **GLASSMORPHISM_IMPLEMENTATION_SUMMARY.md** - Glassmorphism migration
- **GLASSMORPHISM_CSS_CONFLICT_RESOLUTION.md** - CSS conflict fixes

### 🧩 [`component-docs/`](component-docs/)
Component-specific documentation
- **StoryboardPage-faq.md** - FAQ for StoryboardPage
- **StoryboardPage-Layout-Hierarchy.md** - Layout documentation
- **BACKGROUND_SYSTEM_CENTRALIZED_GUIDE.md** - Background system guide

### ⚙️ [`setup/`](setup/)
Setup and configuration guides
- **SUPABASE_MIGRATION_INSTRUCTIONS.md** - Supabase setup
- **SOCIAL_LOGIN_SETUP.md** - Social authentication setup

### 📋 [`tasks/`](tasks/)
Task tracking and planning
- **shot-task.md** - Shot-related tasks
- **plan-consolidated.md** - Consolidated planning

### 🔧 [`maintenance/`](maintenance/)
Documentation maintenance and reference guides
- **DOCUMENTATION_INDEX.md** - Complete documentation index
- **DOCUMENTATION_MAINTENANCE.md** - How to maintain docs
- **QUICK_REFERENCE.md** - Quick reference card

### 💼 [`business/`](business/)
Business-related documentation
- **Stripe_billing_notes.md** - Billing integration notes
- **SECURITY.md** - Security policies

### 📝 [`drafts/`](drafts/)
Work-in-progress documentation

---

## 🎯 Common Tasks

### "I'm working on authentication"
1. Read: [`../.cursorrules`](../.cursorrules) (auth flow requirements)
2. Read: [`architecture/ARCHITECTURE_PRINCIPLES.md`](architecture/ARCHITECTURE_PRINCIPLES.md) (critical paths)
3. Read: [`architecture/UI_STATE_HANDLING.md`](architecture/UI_STATE_HANDLING.md) (auth state transitions)

### "I'm fixing a sync issue"
1. Read: [`sync-and-data/TIMESTAMP_SYNC_IMPLEMENTATION.md`](sync-and-data/TIMESTAMP_SYNC_IMPLEMENTATION.md)
2. Read: [`bugs-and-fixes/DATA_LOSS_FIX_SUMMARY.md`](bugs-and-fixes/DATA_LOSS_FIX_SUMMARY.md)
3. Read: [`../.cursorrules`](../.cursorrules) (offline/online sync rules)

### "I'm styling a component"
1. Read: [`styling/UNIFIED_COLOR_SYSTEM_IMPLEMENTATION.md`](styling/UNIFIED_COLOR_SYSTEM_IMPLEMENTATION.md)
2. Check: [`architecture/ARCHITECTURE_PRINCIPLES.md`](architecture/ARCHITECTURE_PRINCIPLES.md) (Principle 7)
3. Review: [`../.cursorrules`](../.cursorrules) (Rule #13)

### "Users are seeing 404 errors"
1. Read: [`../.cursorrules`](../.cursorrules) (NO 404 rule)
2. Read: [`architecture/UI_STATE_HANDLING.md`](architecture/UI_STATE_HANDLING.md) (emergency fixes)
3. Check: Index.tsx state handling logic

### "I'm adding a new feature"
1. Read: [`architecture/ARCHITECTURE_PRINCIPLES.md`](architecture/ARCHITECTURE_PRINCIPLES.md)
2. Read: [`../.cursorrules`](../.cursorrules)
3. Read: [`../shot-flow-builder/CLAUDE.md`](../shot-flow-builder/CLAUDE.md) (kept at shot-flow-builder root)

---

## 📖 Documentation Index

For a complete, detailed index of all documentation with descriptions and cross-references, see:

**[📋 Complete Documentation Index](maintenance/DOCUMENTATION_INDEX.md)**

---

## 🔄 Keeping Documentation Updated

Documentation should be updated **in the same session** as code changes.

### Adding New Documentation

**Where to put new files:**
- **Architecture/Design** → `architecture/`
- **Bug Reports/Fixes** → `bugs-and-fixes/`
- **Feature Docs** → `features/`
- **Sync/Data** → `sync-and-data/`
- **Component Docs** → `component-docs/`
- **Business/Security** → `business/`
- **Work in Progress** → `drafts/`

**After creating new documentation:**
1. Add to appropriate subdirectory
2. Update this README if major documentation
3. Update `maintenance/DOCUMENTATION_INDEX.md`
4. Follow naming: `FEATURE_NAME_TYPE.md`
5. Include "Last Updated" date

**Full guidelines:**

**[📝 Documentation Maintenance Guide](maintenance/DOCUMENTATION_MAINTENANCE.md)**

**[⚡ Quick Reference Card](maintenance/QUICK_REFERENCE.md)** - Print and keep handy!

---

## 🚨 Critical Files (Outside This Directory)

### `../.cursorrules`
**Location:** Project root (required for Cursor AI)

**Purpose:** Mandatory rules that AI assistants must follow

**Always read before:**
- Making changes to Index.tsx
- Working with authentication
- Modifying sync logic
- Changing UI states

---

## 📅 Recent Updates

### January 7, 2026 - Documentation Reorganization
- ✅ Created structured `/docs` directory
- ✅ Organized files into logical categories
- ✅ Updated all path references
- ✅ Maintained `.cursorrules` at root (required)
- ✅ Improved discoverability and maintainability

### January 15, 2025 - Color System Migration
- ✅ Completed Phases 4-6 color system migration
- ✅ Migrated 11 components to centralized color system
- ✅ Added new color categories (overlayButton, status glows, text variants)

### October 30, 2025 - Semantic Separation
- ✅ Added semantic color separation to unified styling system
- ✅ Introduced button.* and input.* color categories
- ✅ Added Principle 7 to ARCHITECTURE_PRINCIPLES.md

---

## 💡 Tips

- **Before ANY commit:** Read `.cursorrules` and test all affected states
- **When stuck:** Check console logs, look up state in `UI_STATE_HANDLING.md`
- **Documentation is code:** Treat it with the same care as your source code

---

*Last Updated: January 7, 2026*

**Need help?** Start with the [Complete Documentation Index](maintenance/DOCUMENTATION_INDEX.md)


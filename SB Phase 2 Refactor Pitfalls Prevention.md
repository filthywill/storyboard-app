# Phase 2 Refactor Pitfalls & Prevention Guide

## Introduction

This document summarizes the issues encountered during **Phase 2** of the storyboard app's state management refactor (extracting UI state and project metadata/template settings from `storyboardStore` to `uiStore` and `projectStore`). It provides actionable advice and best practices to help future implementers avoid similar pitfalls.

---

## Issues Encountered

### 1. Import Errors / Broken References
- **Description:** After moving state/actions out of `storyboardStore`, some files referenced utilities or modules that no longer existed or were misplaced (e.g., `objectURLManager`).
- **Impact:** Immediate runtime errors, app failed to load, or features like logo upload broke.

### 2. Undefined State / Runtime Errors
- **Description:** Components (e.g., `ShotGrid`, `ShotCard`, `StoryboardPage`) tried to access properties like `templateSettings` from `storyboardStore` instead of the new stores, resulting in `undefined` values.
- **Impact:** Runtime errors such as `Cannot read properties of undefined`, blank screens, or broken UI.

### 3. Infinite Render Loops / Maximum Update Depth Exceeded
- **Description:** Incorrect usage of Zustand selectors or unstable references caused React to enter infinite render loops, especially after the refactor.
- **Impact:** Blank screen, React error: "Maximum update depth exceeded."

### 4. Incomplete Refactor / Missed Usages
- **Description:** Not all components and utilities were updated to use the new stores, leading to inconsistent state and subtle bugs.
- **Impact:** Some features worked, others broke, making debugging difficult.

### 5. State Duplication / Out-of-Sync State
- **Description:** Temporary duplication of state between old and new stores led to confusion and risk of state divergence.
- **Impact:** Hard-to-track bugs, especially if both sources were updated in different places.

---

## Root Causes

- **Partial Refactor:** Not all usages of the moved state were updated, especially in deeply nested or less obvious components.
- **Unstable Selectors:** Zustand selectors returning new object/array references on every render, causing unnecessary re-renders or infinite loops (especially in v5).
- **StrictMode Double Rendering:** React 18 StrictMode double-mounts components in development, surfacing impure or side-effectful code.
- **Lack of Automated Tests:** No automated regression tests to catch breakages early.
- **Insufficient Search/Replace:** Relying on manual updates instead of systematic codebase-wide search for all usages.

---

## Prevention Checklist

### 1. **Plan the Refactor**
- List all state/actions to be moved and all components that use them.
- Identify all selectors and utility functions that depend on the moved state.

### 2. **Systematic Codebase Search**
- Use global search (e.g., VSCode, ripgrep) for all references to the moved state/actions.
- Update every usage to the new store, including deeply nested components and utilities.

### 3. **Update Selectors for Stability**
- Use `useShallow` or stable selectors to avoid infinite loops and unnecessary re-renders.
- Ensure selectors do not return new object/array references unless memoized.

### 4. **Remove Duplicated State**
- After migrating, remove the old state/actions from the original store to prevent confusion and divergence.

### 5. **Test Thoroughly**
- Manually test all features that use the moved state (UI, project metadata, template settings, etc.).
- Check for blank screens, runtime errors, and broken UI.
- Use React DevTools and browser console for error monitoring.

### 6. **Leverage StrictMode**
- Keep React StrictMode enabled in development to surface impure code and side effects.

### 7. **Add/Run Regression Tests**
- If possible, add automated tests for critical flows before and after the refactor.

### 8. **Document the Migration**
- Keep a migration log or checklist for future reference and onboarding.

---

## Example: Safe Zustand Selector Usage

```tsx
// BAD: Unstable selector (causes infinite loop in Zustand v5)
const [foo, setFoo] = useStore(state => [state.foo, state.setFoo]);

// GOOD: Stable selector with useShallow
import { useShallow } from 'zustand/shallow';
const [foo, setFoo] = useStore(useShallow(state => [state.foo, state.setFoo]));
```

---

## Conclusion

By following this checklist and learning from the issues encountered, future implementers can avoid common pitfalls in state refactoring projects. Systematic updates, stable selectors, and thorough testing are key to a smooth migration. 
# Storyboard App: State Management Refactor - Implementation Plan

**Goal:** Refactor the app's state management from a single monolithic store to a modular, slice-based architecture using Zustand. This will improve maintainability, performance, and prepare the codebase for future features like cloud synchronization with Supabase.

---

## Phase 1: Modularization (The Slices Pattern)

This phase focuses on breaking down the monolithic `storyboardStore` into domain-specific "slices" and combining them into a single, unified store.

### Task 1.1: Create the Project Slice

**Objective:** Isolate all project-level metadata and template settings into its own slice.

1.  **File:** `shot-flow-builder/src/store/projectStore.ts`
2.  **Action:** Implement the `createProjectSlice` function. This will manage state like `projectName`, `clientAgency`, `templateSettings`, etc., and their corresponding actions.
3.  **Implementation:**

    ```typescript
    import { StateCreator } from 'zustand';
    // ... other imports
    
    // (Keep existing type definitions: TemplateSettings, ProjectState, etc.)

    export const createProjectSlice: StateCreator<
      ProjectStore,
      [],
      [],
      ProjectStore
    > = (set, get) => ({
      // Default state for project metadata
      projectName: 'Project Name',
      projectInfo: 'Project Info',
      projectLogoUrl: null,
      projectLogoFile: null,
      clientAgency: 'Client/Agency',
      jobInfo: 'Job Info',
      templateSettings: {
        showLogo: true,
        showProjectName: true,
        showProjectInfo: true,
        showClientAgency: true,
        showJobInfo: true,
        showActionText: true,
        showScriptText: true,
        showPageNumber: true,
      },
    
      // Actions
      setProjectName: (name) => set({ projectName: name }),
      setProjectInfo: (info) => set({ projectInfo: info }),
      setClientAgency: (name) => set({ clientAgency: name }),
      setJobInfo: (info) => set({ jobInfo: info }),
      setProjectLogo: (file) => {
        set((state) => {
          if (state.projectLogoUrl) {
            URL.revokeObjectURL(state.projectLogoUrl);
          }
          return {
            projectLogoFile: file,
            projectLogoUrl: file ? URL.createObjectURL(file) : null,
          };
        });
      },
      setTemplateSetting: (setting, value) =>
        set((state) => ({
          templateSettings: { ...state.templateSettings, [setting]: value },
        })),
      setTemplateSettings: (settings) =>
        set((state) => ({
          templateSettings: { ...state.templateSettings, ...settings },
        })),
      resetTemplateSettings: () => {
        // Define the default state here if needed
      },
      getProjectMetadata: () => {
        const { projectName, projectInfo, clientAgency, jobInfo } = get();
        return { projectName, projectInfo, clientAgency, jobInfo };
      },
    });
    ```

### Task 1.2: Adapt the UI Slice

**Objective:** The `uiStore.ts` is already well-defined. We just need to convert it into a slice-pattern function.

1.  **File:** `shot-flow-builder/src/store/uiStore.ts`
2.  **Action:** Rename `useUIStore` to `createUISlice` and wrap the existing logic.

    ```typescript
    import { StateCreator } from 'zustand';
    // ... other imports

    // (Keep existing type definitions)
    
    export const createUISlice: StateCreator<UIStore, [], [], UIStore> = (set) => ({
      isDragging: false,
      isExporting: false,
      showDeleteConfirmation: true,
    
      setIsExporting: (isExporting) => set({ isExporting }),
      setIsDragging: (isDragging) => set({ isDragging }),
      setShowDeleteConfirmation: (show) => set({ showDeleteConfirmation: show }),
      resetUIState: () => set({
          isDragging: false,
          isExporting: false,
          showDeleteConfirmation: true
      }),
    });
    ```

### Task 1.3: Adapt the Shot Slice

**Objective:** Convert the existing `useShotStore` to `createShotSlice`. The core logic is sound but will need to interact with other slices via the `get()` function once combined.

1.  **File:** `shot-flow-builder/src/store/shotStore.ts`
2.  **Action:** Refactor into `createShotSlice`. We will adjust the renumbering logic later to be self-contained or to get page data from the combined store.

    ```typescript
    import { StateCreator } from 'zustand';
    // ... other imports

    // (Keep existing type definitions)

    export const createShotSlice: StateCreator<ShotStore, [], [], ShotStore> = (set, get) => {
      // ... (paste the entire logic from the existing useShotStore body here)
      // from `immer((set, get) => ({ ... }))`
      // The `renumberAllShots` function will need access to the full state later.
      return {
        // ... (initial state and actions)
      };
    };
    ```

### Task 1.4: Implement the Page Slice

**Objective:** Create the `pageStore` slice, which will manage the list of pages and the IDs of the shots they contain. This is a critical step in decoupling pages from shots.

1.  **File:** `shot-flow-builder/src/store/pageStore.ts`
2.  **Action:** Implement `createPageSlice`. Note the change: `shots` is now `string[]`.

    ```typescript
    import { StateCreator } from 'zustand';
    import { Shot, ShotStore } from './shotStore';
    // ... other imports

    // (Keep existing type definitions)

    const createDefaultPage = (name: string = 'Page 1', shotId: string): StoryboardPage => ({
        id: crypto.randomUUID(),
        name,
        shots: [shotId], // Start with one shot ID
        gridRows: 2,
        gridCols: 4,
        aspectRatio: '16/9',
        createdAt: new Date(),
        updatedAt: new Date()
    });

    export const createPageSlice: StateCreator<
      PageStore & ShotStore, // It needs access to ShotStore actions
      [],
      [],
      PageStore
    > = (set, get) => ({
      pages: [],
      activePageId: null,
      
      // Actions
      createPage: (name) => {
        const newShotId = get().createShot(); // Create a shot in the shotStore
        const newPage = createDefaultPage(name, newShotId);
        set(state => ({
            pages: [...state.pages, newPage],
            activePageId: newPage.id,
        }));
      },
      // ... implement other actions: deletePage, renamePage, etc.
      // These actions will now need to call `get().deleteShot(shotId)` when a page is deleted.
      
      addShotToPage: (pageId, shotId, position) => {
          set(state => {
              const pages = state.pages.map(p => {
                  if (p.id === pageId) {
                      const newShots = [...p.shots];
                      if (position !== undefined) {
                          newShots.splice(position, 0, shotId);
                      } else {
                          newShots.push(shotId);
                      }
                      return { ...p, shots: newShots };
                  }
                  return p;
              });
              return { pages };
          });
      },
      // etc...
    });
    ```
    *Initial state will be handled in the bound store.*

### Task 1.5: Create the Bound Store

**Objective:** Combine all slices into one `useBoundStore` which will be the app's single source of truth.

1.  **File:** Create `shot-flow-builder/src/store/boundStore.ts`
2.  **Action:** Import the slice creators and combine them.

    ```typescript
    import { create } from 'zustand';
    import { persist, createJSONStorage } from 'zustand/middleware';
    import { createPageSlice, PageStore } from './pageStore';
    import { createShotSlice, ShotStore } from './shotStore';
    import { createProjectSlice, ProjectStore } from './projectStore';
    import { createUISlice, UIStore } from './uiStore';
    
    export type BoundStore = PageStore & ShotStore & ProjectStore & UIStore;
    
    export const useBoundStore = create<BoundStore>()(
      persist(
        (set, get, api) => {
          // Setup initial state here
          const initialShot = {
            id: crypto.randomUUID(),
            number: '01',
            subShotGroupId: null,
            imageFile: null,
            actionText: '',
            scriptText: '',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          const initialPage = {
              id: crypto.randomUUID(),
              name: "Page 1",
              shots: [initialShot.id],
              gridRows: 2,
              gridCols: 4,
              aspectRatio: '16/9',
              createdAt: new Date(),
              updatedAt: new Date()
          };

          return {
            ...createProjectSlice(set, get, api),
            ...createUISlice(set, get, api),
            ...createShotSlice(set, get, api),
            ...createPageSlice(set, get, api),
            // Override initial states
            shots: { [initialShot.id]: initialShot },
            shotOrder: [initialShot.id],
            pages: [initialPage],
            activePageId: initialPage.id,
          };
        },
        {
          name: 'storyboard-bound-store',
          // We will configure serialization here in Phase 2
        }
      )
    );
    ```

### Task 1.6: Refactor Components

**Objective:** Replace all instances of `useStoryboardStore` with the new `useBoundStore`.

1.  **Action:** Go through each component listed below and update its state hooks.
2.  **Example (before):** `const { pages, activePageId } = useStoryboardStore();`
3.  **Example (after):** `const { pages, activePageId } = useBoundStore();`
4.  **Component List:**
    -   `AspectRatioSelector.tsx`
    -   `GridSizeSelector.tsx`
    -   `MasterHeader.tsx`
    -   `PageTabs.tsx`
    -   `PDFExportModal.tsx`
    -   `ShotCard.tsx`
    -   `ShotGrid.tsx`
    -   `StartNumberSelector.tsx`
    -   `StoryboardPage.tsx`
    -   `TemplateSettings.tsx`

### Task 1.7: Cleanup

**Objective:** Remove the old, monolithic store.

1.  **Action:** Delete the file `shot-flow-builder/src/store/storyboardStore.ts`.
2.  **Action:** Update `shot-flow-builder/src/store/index.ts` to export the new `useBoundStore` and remove the export for `useStoryboardStore`.

---

## Phase 2: State Serializability

**Objective:** Ensure that the entire application state can be safely serialized to JSON for persistence, without errors or data loss.

### Task 2.1: Handle `File` Objects

**Problem:** `File` objects in `shot.imageFile` and `project.projectLogoFile` are not serializable.
**Solution:** Use the `replacer` and `reviver` options in the `persist` middleware's storage configuration to handle them gracefully. For now, we will simply exclude them from persistence.

1.  **File:** `shot-flow-builder/src/store/boundStore.ts`
2.  **Action:** Update the `persist` configuration.

    ```typescript
    // ... in useBoundStore
    {
      name: 'storyboard-bound-store',
      storage: createJSONStorage(() => localStorage, {
        replacer: (key, value) => {
          if (value instanceof File) {
            return null; // Exclude File objects from serialization
          }
          return value;
        },
      }),
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(
            ([key]) => !['projectLogoFile'].includes(key)
          )
        ),
    }
    ```
    *A more robust solution for `shot.imageFile` will involve modifying the `createShotSlice` to handle this during serialization.*

### Task 2.2: Verify `Date` Object Handling

**Objective:** Confirm that `Date` objects are correctly serialized to ISO strings and revived back into `Date` objects.
**Action:** The default `persist` middleware handles this automatically. This task is for verification during testing.

---

## Phase 3: Performance Optimization

**Objective:** Ensure the UI remains responsive by preventing unnecessary re-renders.

### Task 3.1: Apply `useShallow`

**Problem:** Components selecting multiple values from the store might re-render if any value in the store changes, even those not selected.
**Solution:** Use the `useShallow` hook for multi-value selections.

1.  **Action:** In components like `ShotGrid.tsx` that select multiple state values or actions, wrap the selector with `useShallow`.

    ```typescript
    import { useShallow } from 'zustand/react/shallow'

    // ... inside a component
    const { pages, activePageId, updateShot, deleteShot } = useBoundStore(
      useShallow((state) => ({
        pages: state.pages,
        activePageId: state.activePageId,
        updateShot: state.updateShot,
        deleteShot: state.deleteShot,
      }))
    );
    ```

### Task 3.2: Create Memoized Selectors

**Objective:** Avoid expensive re-computations for derived data.
**Action:** Create selectors for common data derivations, such as getting all shot objects for the active page.

1.  **File:** `shot-flow-builder/src/store/selectors.ts` (new file)
2.  **Implementation:**

    ```typescript
    import { BoundStore } from './boundStore';

    export const selectActivePageShots = (state: BoundStore) => {
      const activePage = state.pages.find(p => p.id === state.activePageId);
      if (!activePage) return [];
      
      // This is a derived computation: mapping IDs to full objects.
      return activePage.shots.map(shotId => state.shots[shotId]).filter(Boolean);
    };
    ```
3.  **Usage in component:**
    `const activeShots = useBoundStore(selectActivePageShots);`

---

# State Store Architecture Refactoring (Task 2)

## Updated Implementation Strategy

- **Phase 1 (Low Risk):**
  - Add memoized selectors for expensive computations (e.g., selectActivePageShots, selectShotById)
  - Use useShallow in components that select multiple store values
  - Optimize shot renumbering with debouncing or batching
- **Phase 2 (Medium Risk):**
  - Extract only UI state (e.g., isDragging, isExporting, showDeleteConfirmation) to a separate store
  - Extract only project metadata and template settings to a separate store
- **Phase 3 (Optional, Higher Risk):**
  - Consider extracting export logic and validation logic to separate modules/utilities
  - Add state middleware for logging, debugging, or sync if needed

## Testing & Validation
- Add comprehensive unit and integration tests for shot numbering, sequencing, and store interactions
- Add performance monitoring and error boundaries
- Ensure all existing functionality is preserved and no regressions occur

## Notes
- Remove or defer any sub-tasks related to a full store split
- Emphasize risk mitigation, incremental rollout, and robust testing

*This plan will be executed methodically. Each task will be addressed in sequence to ensure a stable and progressive refactor.*

## Updated Plan (2024)

- UI state (isDragging, isExporting, showDeleteConfirmation) and project metadata/template settings (projectName, projectInfo, projectLogoUrl, projectLogoFile, clientAgency, jobInfo, templateSettings) are now managed in uiStore.ts and projectStore.ts.
- Migration was performed atomically: all usages in components, hooks, and utilities were updated in a single commit, with no partial migration.
- All selectors used in components are stable (useShallow or equivalent) to prevent infinite render loops.
- All usages in export, PDF, and batch operations were updated to use the new stores.
- The full checklist from SB Phase 2 Refactor Pitfalls Prevention.md was followed before, during, and after migration.
- State was only removed from storyboardStore.ts after all usages were updated and verified.
- A full regression test checkpoint was added after migration, before any further refactoring.
- All changes and references in docs and plans were updated.

**Lessons Learned:**
- Atomic migration is critical to avoid runtime errors and regressions.
- Stable selectors and systematic updates prevent infinite render loops and undefined state errors.
- Following a detailed pitfalls checklist ensures a smooth migration.
- Documentation and Taskmaster MCP must be kept in sync with implementation changes. 
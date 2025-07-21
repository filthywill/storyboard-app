import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { produce } from 'immer';

export interface Shot {
  id: string;
  number: string;
  subShotGroupId: string | null;
  imageFile: File | null;
  actionText: string;
  scriptText: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryboardPage {
  id: string;
  name: string;
  shots: Shot[];
  gridRows: number;
  gridCols: number;
  aspectRatio: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryboardState {
  pages: StoryboardPage[];
  activePageId: string | null;
  startNumber: string;
  projectName: string;
  projectInfo: string;
  projectLogoUrl: string | null;
  projectLogoFile: File | null;
  clientAgency: string;
  jobInfo: string;
  isDragging: boolean;
  isExporting: boolean;
  showDeleteConfirmation: boolean;
  templateSettings: {
    showLogo: boolean;
    showProjectName: boolean;
    showProjectInfo: boolean;
    showClientAgency: boolean;
    showJobInfo: boolean;
    showActionText: boolean;
    showScriptText: boolean;
    showPageNumber: boolean;
  };
}

export interface StoryboardActions {
  // Page management
  createPage: (name?: string) => void;
  deletePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
  setActivePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  
  // Shot management
  addShot: (pageId: string, position?: number) => void;
  addSubShot: (pageId: string, shotId: string) => void;
  deleteShot: (pageId: string, shotId: string) => void;
  updateShot: (pageId: string, shotId: string, updates: Partial<Shot>) => void;
  reorderShots: (pageId: string, shotIds: string[]) => void;
  
  // Grid management
  updateGridSize: (pageId: string, rows: number, cols: number) => void;
  updatePageAspectRatio: (pageId: string, aspectRatio: string) => void;
  
  // UI state
  setIsExporting: (isExporting: boolean) => void;
  setIsDragging: (isDragging: boolean) => void;
  
  // Utility
  getActivePage: () => StoryboardPage | undefined;
  getTotalShots: (pageId: string) => number;
  setStartNumber: (startNumber: string) => void;
  setShowDeleteConfirmation: (show: boolean) => void;
  
  // Project Info
  setProjectName: (name: string) => void;
  setProjectInfo: (info: string) => void;
  setProjectLogo: (file: File | null) => void;
  setClientAgency: (name: string) => void;
  setJobInfo: (info: string) => void;
  setTemplateSetting: (setting: keyof StoryboardState['templateSettings'], value: boolean) => void;
}

export type StoryboardStore = StoryboardState & StoryboardActions;

const renumberAllShots = (state: StoryboardState) => {
  const startStr = state.startNumber;
  const numericPartMatch = startStr.match(/\d+$/);

  const prefix = numericPartMatch ? startStr.substring(0, numericPartMatch.index) : '';
  const padding = numericPartMatch ? numericPartMatch[0].length : 1;
  let mainShotCounter = (numericPartMatch ? parseInt(numericPartMatch[0], 10) : 1) - 1;

  const allShots = state.pages.flatMap(p => p.shots);
  if (allShots.length === 0) return;

  let subLetterCode = 'a'.charCodeAt(0);

  for (let i = 0; i < allShots.length; i++) {
    const shot = allShots[i];
    const prevShot = i > 0 ? allShots[i - 1] : null;

    const isContinuationOfSubGroup = shot.subShotGroupId && shot.subShotGroupId === prevShot?.subShotGroupId;

    if (!isContinuationOfSubGroup) {
      mainShotCounter++;
      subLetterCode = 'a'.charCodeAt(0);
    }

    const baseNumberStr = String(mainShotCounter).padStart(padding, '0');

    if (shot.subShotGroupId) {
      shot.number = `${prefix}${baseNumberStr}${String.fromCharCode(subLetterCode)}`;
      subLetterCode++;
    } else {
      shot.number = `${prefix}${baseNumberStr}`;
    }
  }
};

const moveShotToNextAvailablePage = (state: StoryboardState, shot: Shot, currentPageIndex: number) => {
  let nextPage = state.pages[currentPageIndex + 1];
  
  if (!nextPage) {
    const currentPage = state.pages[currentPageIndex];
    const newPage = createDefaultPage(`Page ${state.pages.length + 1}`);
    // Copy grid settings from current page
    newPage.gridRows = currentPage.gridRows;
    newPage.gridCols = currentPage.gridCols;
    newPage.aspectRatio = currentPage.aspectRatio;
    
    state.pages.push(newPage);
    nextPage = newPage;
  }

  // Add the shot to the beginning of the next page
  nextPage.shots.unshift(shot);

  // Check if the next page is now full and handle overflow recursively
  const nextPageTotalSlots = nextPage.gridRows * nextPage.gridCols;
  if (nextPage.shots.length > nextPageTotalSlots) {
    const overflowShot = nextPage.shots.pop()!;
    const nextPageIndex = state.pages.findIndex(p => p.id === nextPage.id);
    moveShotToNextAvailablePage(state, overflowShot, nextPageIndex);
  }
};

const createDefaultPage = (name: string = 'Page 1'): StoryboardPage => ({
  id: crypto.randomUUID(),
  name,
  shots: [],
  gridRows: 2,
  gridCols: 4,
  aspectRatio: '16/9',
  createdAt: new Date(),
  updatedAt: new Date()
});

const createDefaultShot = (number: string = ''): Shot => ({
  id: crypto.randomUUID(),
  number,
  subShotGroupId: null,
  imageFile: null,
  actionText: '',
  scriptText: '',
  createdAt: new Date(),
  updatedAt: new Date()
});

const initialFirstPage = createDefaultPage();
initialFirstPage.shots.push(createDefaultShot('01'));

export const useStoryboardStore = create<StoryboardStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      pages: [initialFirstPage],
      activePageId: initialFirstPage.id,
      startNumber: '01',
      projectName: 'Project Name',
      projectInfo: 'Project Info',
      projectLogoUrl: null,
      projectLogoFile: null,
      clientAgency: 'Client/Agency',
      jobInfo: 'Job Info',
      isDragging: false,
      isExporting: false,
      showDeleteConfirmation: true,
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

      // Page management
      createPage: (name) => {
        set((state) => {
          const newPage = createDefaultPage(name || `Page ${state.pages.length + 1}`);
          state.pages.push(newPage);
          state.activePageId = newPage.id;
          renumberAllShots(state);
        });
      },

      deletePage: (pageId) => {
        set((state) => {
          if (state.pages.length <= 1) return; // Keep at least one page
          
          const pageIndex = state.pages.findIndex(p => p.id === pageId);
          if (pageIndex === -1) return;
          
          state.pages.splice(pageIndex, 1);
          
          // Update active page if deleted
          if (state.activePageId === pageId) {
            const newActiveIndex = Math.min(pageIndex, state.pages.length - 1);
            state.activePageId = state.pages[newActiveIndex]?.id || null;
          }
          
          renumberAllShots(state);
        });
      },

      renamePage: (pageId, name) => {
        set((state) => {
          const page = state.pages.find(p => p.id === pageId);
          if (page) {
            page.name = name;
            page.updatedAt = new Date();
          }
        });
      },

      setActivePage: (pageId) => {
        set((state) => {
          state.activePageId = pageId;
        });
      },

      duplicatePage: (pageId) => {
        set((state) => {
          const originalPage = state.pages.find(p => p.id === pageId);
          if (!originalPage) return;
          
          // Deep copy shots with new IDs, preserving sub-shot groups
          const shotIdMap = new Map<string, string>();
          const newShots = originalPage.shots.map(shot => {
            const newShotId = crypto.randomUUID();
            shotIdMap.set(shot.id, newShotId);
            return {
              ...shot,
              id: newShotId,
              createdAt: new Date(),
              updatedAt: new Date()
            };
          });

          // Create new sub-shot group IDs for duplicated groups
          const subGroupIdMap = new Map<string, string>();
          newShots.forEach(shot => {
            if (shot.subShotGroupId) {
              if (!subGroupIdMap.has(shot.subShotGroupId)) {
                subGroupIdMap.set(shot.subShotGroupId, crypto.randomUUID());
              }
              shot.subShotGroupId = subGroupIdMap.get(shot.subShotGroupId)!;
            }
          });
          
          const duplicatedPage: StoryboardPage = {
            ...originalPage,
            id: crypto.randomUUID(),
            name: `${originalPage.name} (Copy)`,
            shots: newShots,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const originalIndex = state.pages.findIndex(p => p.id === pageId);
          state.pages.splice(originalIndex + 1, 0, duplicatedPage);
          state.activePageId = duplicatedPage.id;

          renumberAllShots(state);
        });
      },

      // Shot management
      addShot: (pageId, position) => {
        set((state) => {
          const pageIndex = state.pages.findIndex(p => p.id === pageId);
          if (pageIndex === -1) return;
      
          const page = state.pages[pageIndex];
          const newShot = createDefaultShot();
      
          // Insert the new shot at the specified position, or at the end if not specified
          if (position !== undefined) {
            page.shots.splice(position, 0, newShot);
          } else {
            page.shots.push(newShot);
          }
      
          // After adding, check for and handle overflow
          const totalSlots = page.gridRows * page.gridCols;
          if (page.shots.length > totalSlots) {
            const overflowShot = page.shots.pop()!;
            moveShotToNextAvailablePage(state, overflowShot, pageIndex);
          }
      
          page.updatedAt = new Date();
          renumberAllShots(state);
        });
      },

      addSubShot: (pageId, shotId) => {
        set((state) => {
          const pageIndex = state.pages.findIndex(p => p.id === pageId);
          if (pageIndex === -1) return;

          const page = state.pages[pageIndex];
          const shotIndex = page.shots.findIndex(s => s.id === shotId);
          if (shotIndex === -1) return;

          const parentShot = page.shots[shotIndex];
          const newSubShot = createDefaultShot();

          // Assign to existing or new sub-shot group
          const subGroupId = parentShot.subShotGroupId ?? crypto.randomUUID();
          parentShot.subShotGroupId = subGroupId;
          newSubShot.subShotGroupId = subGroupId;

          // Insert new sub-shot directly after the parent
          page.shots.splice(shotIndex + 1, 0, newSubShot);
          
          // Handle overflow
          const totalSlots = page.gridRows * page.gridCols;
          if (page.shots.length > totalSlots) {
            const overflowShot = page.shots.pop()!;
            moveShotToNextAvailablePage(state, overflowShot, pageIndex);
          }

          renumberAllShots(state);
        });
      },

      deleteShot: (pageId, shotId) => {
        set((state) => {
          const pageIndex = state.pages.findIndex(p => p.id === pageId);
          if (pageIndex === -1) return;

          const page = state.pages[pageIndex];
          const shotIndex = page.shots.findIndex(s => s.id === shotId);
          if (shotIndex === -1) return;

          const deletedShot = page.shots[shotIndex];
          
          // Remove the shot from current page
          page.shots.splice(shotIndex, 1);
          
          // Handle sub-shot group cleanup
          if (deletedShot.subShotGroupId) {
            const remainingInGroup = state.pages.flatMap(p => p.shots).filter(s => s.subShotGroupId === deletedShot.subShotGroupId);
            if (remainingInGroup.length === 1) {
              remainingInGroup[0].subShotGroupId = null;
            }
          }
          
          // Now handle pulling shots from subsequent pages to fill the gap
          let currentPageIndex = pageIndex;
          
          // Pull shots from subsequent pages to fill available capacity
          while (currentPageIndex < state.pages.length) {
            const currentPage = state.pages[currentPageIndex];
            const currentCapacity = currentPage.gridRows * currentPage.gridCols;
            const spaceAvailable = currentCapacity - currentPage.shots.length;
            
            if (spaceAvailable > 0 && currentPageIndex + 1 < state.pages.length) {
              // There's space on current page and there are subsequent pages
              const nextPageIndex = currentPageIndex + 1;
              const nextPage = state.pages[nextPageIndex];
              
              // Pull shots from the next page to fill current page
              const shotsToPull = nextPage.shots.splice(0, spaceAvailable);
              
              if (shotsToPull.length > 0) {
                currentPage.shots.push(...shotsToPull);
                currentPage.updatedAt = new Date();
                
                // If next page is now empty, remove it (but keep at least one page)
                if (nextPage.shots.length === 0 && state.pages.length > 1) {
                  state.pages.splice(nextPageIndex, 1);
                  // Update active page if we deleted the active page
                  if (state.activePageId === nextPage.id) {
                    // Set active page to the page we just pulled shots into
                    state.activePageId = currentPage.id;
                  }
                  // Don't increment currentPageIndex since we removed a page
                  continue;
                }
              }
            }
            
            currentPageIndex++;
          }
          
          page.updatedAt = new Date();
          renumberAllShots(state);
        });
      },

      updateShot: (pageId, shotId, updates) => {
        set((state) => {
          const page = state.pages.find(p => p.id === pageId);
          if (!page) return;
          
          const shot = page.shots.find(s => s.id === shotId);
          if (!shot) return;
          
          Object.assign(shot, updates, { updatedAt: new Date() });
          page.updatedAt = new Date();
        });
      },

      reorderShots: (pageId, shotIds) => {
        set((state) => {
          const page = state.pages.find(p => p.id === pageId);
          if (!page) return;
          
          const reorderedShots = shotIds.map(id => 
            page.shots.find(shot => shot.id === id)!
          ).filter(Boolean);
          
          page.shots = reorderedShots;
          page.updatedAt = new Date();
          renumberAllShots(state);
        });
      },

      setStartNumber: (startNumber) => {
        set((state) => {
          state.startNumber = startNumber.trim() || '1';
          renumberAllShots(state);
        });
      },

      setShowDeleteConfirmation: (show) => {
        set((state) => {
          state.showDeleteConfirmation = show;
        });
      },

      // Grid management
      updateGridSize: (pageId, rows, cols) => {
        set((state) => {
          const pageIndex = state.pages.findIndex((p) => p.id === pageId);
          if (pageIndex === -1) return;
      
          const page = state.pages[pageIndex];
          const oldTotalSlots = page.gridRows * page.gridCols;
      
          // Update grid size first for accurate capacity calculations
          page.gridRows = rows;
          page.gridCols = cols;
          page.updatedAt = new Date();
      
          const newTotalSlots = page.gridRows * page.gridCols;
      
          if (newTotalSlots < oldTotalSlots) {
            // Grid size decreased, handle overflow by moving shots to the next page
            if (page.shots.length > newTotalSlots) {
              const shotsToMove = page.shots.splice(newTotalSlots);
              shotsToMove.forEach(shot => {
                moveShotToNextAvailablePage(state, shot, pageIndex);
              });
            }
          } else if (newTotalSlots > oldTotalSlots) {
            // Grid size increased, pull from subsequent pages to fill the new empty slots
            let currentPageIndex = pageIndex;
            
            while (currentPageIndex < state.pages.length) {
              const currentPage = state.pages[currentPageIndex];
              const currentCapacity = currentPage.gridRows * currentPage.gridCols;
              const spaceAvailable = currentCapacity - currentPage.shots.length;
      
              if (spaceAvailable > 0 && currentPageIndex + 1 < state.pages.length) {
                const nextPageIndex = currentPageIndex + 1;
                const nextPage = state.pages[nextPageIndex];
                
                const shotsToPull = nextPage.shots.splice(0, spaceAvailable);
                
                if (shotsToPull.length > 0) {
                  currentPage.shots.push(...shotsToPull);
                  currentPage.updatedAt = new Date();
                  
                  // If the next page is now empty, remove it
                  if (nextPage.shots.length === 0 && state.pages.length > 1) {
                    state.pages.splice(nextPageIndex, 1);
                    if (state.activePageId === nextPage.id) {
                      state.activePageId = currentPage.id;
                    }
                    // Re-evaluate the current index since the pages array has shifted
                    continue; 
                  }
                }
              }
              
              currentPageIndex++;
            }
          }
          
          // Renumber all shots after grid changes and potential reflowing
          renumberAllShots(state);
        });
      },

      updatePageAspectRatio: (pageId, aspectRatio) => {
        set((state) => {
          const page = state.pages.find(p => p.id === pageId);
          if (!page) return;
          
          page.aspectRatio = aspectRatio;
          page.updatedAt = new Date();
        });
      },

      // UI state
      setIsExporting: (isExporting) => {
        set((state) => {
          state.isExporting = isExporting;
        });
      },

      setIsDragging: (isDragging) => {
        set((state) => {
          state.isDragging = isDragging;
        });
      },

      // Utility methods
      getActivePage: () => {
        const state = get();
        return state.pages.find(p => p.id === state.activePageId);
      },

      getTotalShots: (pageId) => {
        const state = get();
        const page = state.pages.find(p => p.id === pageId);
        return page?.shots.length || 0;
      },

      // Project Info
      setProjectName: (name) => set({ projectName: name }),
      setProjectInfo: (info) => set({ projectInfo: info }),
      setProjectLogo: (file) => {
        set((state) => {
          state.projectLogoUrl = file ? URL.createObjectURL(file) : null;
          state.projectLogoFile = file;
        });
      },
      setClientAgency: (name) => set({ clientAgency: name }),
      setJobInfo: (info) => set({ jobInfo: info }),
      setTemplateSetting: (setting, value) => {
        set((state) => {
          state.templateSettings[setting] = value;
        });
      },
    })),
    {
      name: 'storyboard-storage',
      partialize: (state) => ({
        pages: state.pages,
        activePageId: state.activePageId,
        startNumber: state.startNumber,
        projectName: state.projectName,
        projectInfo: state.projectInfo,
        projectLogoUrl: state.projectLogoUrl,
        clientAgency: state.clientAgency,
        jobInfo: state.jobInfo,
        showDeleteConfirmation: state.showDeleteConfirmation,
        templateSettings: state.templateSettings,
      }),
    }
  )
);


import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface Shot {
  id: string;
  number: number;
  imageUrl: string | null;
  imageFile: File | null;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryboardPage {
  id: string;
  name: string;
  shots: Shot[];
  gridRows: number;
  gridCols: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryboardState {
  pages: StoryboardPage[];
  activePageId: string;
  isExporting: boolean;
  isDragging: boolean;
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
  deleteShot: (pageId: string, shotId: string) => void;
  updateShot: (pageId: string, shotId: string, updates: Partial<Shot>) => void;
  reorderShots: (pageId: string, shotIds: string[]) => void;
  
  // Grid management
  updateGridSize: (pageId: string, rows: number, cols: number) => void;
  
  // UI state
  setIsExporting: (isExporting: boolean) => void;
  setIsDragging: (isDragging: boolean) => void;
  
  // Utility
  getActivePage: () => StoryboardPage | undefined;
  getTotalShots: (pageId: string) => number;
  renumberShots: (pageId: string) => void;
}

export type StoryboardStore = StoryboardState & StoryboardActions;

const createDefaultPage = (name: string = 'Page 1'): StoryboardPage => ({
  id: crypto.randomUUID(),
  name,
  shots: [],
  gridRows: 3,
  gridCols: 4,
  createdAt: new Date(),
  updatedAt: new Date()
});

const createDefaultShot = (number: number): Shot => ({
  id: crypto.randomUUID(),
  number,
  imageUrl: null,
  imageFile: null,
  description: '',
  createdAt: new Date(),
  updatedAt: new Date()
});

export const useStoryboardStore = create<StoryboardStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      pages: [createDefaultPage()],
      activePageId: '',
      isExporting: false,
      isDragging: false,

      // Page management
      createPage: (name) => {
        set((state) => {
          const newPage = createDefaultPage(name || `Page ${state.pages.length + 1}`);
          state.pages.push(newPage);
          state.activePageId = newPage.id;
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
            state.activePageId = state.pages[newActiveIndex]?.id || '';
          }
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
          
          const duplicatedPage: StoryboardPage = {
            ...originalPage,
            id: crypto.randomUUID(),
            name: `${originalPage.name} (Copy)`,
            shots: originalPage.shots.map(shot => ({
              ...shot,
              id: crypto.randomUUID(),
              createdAt: new Date(),
              updatedAt: new Date()
            })),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const originalIndex = state.pages.findIndex(p => p.id === pageId);
          state.pages.splice(originalIndex + 1, 0, duplicatedPage);
          state.activePageId = duplicatedPage.id;
        });
      },

      // Shot management
      addShot: (pageId, position) => {
        set((state) => {
          const page = state.pages.find(p => p.id === pageId);
          if (!page) return;
          
          const newShot = createDefaultShot(page.shots.length + 1);
          
          if (position !== undefined && position >= 0 && position <= page.shots.length) {
            page.shots.splice(position, 0, newShot);
          } else {
            page.shots.push(newShot);
          }
          
          // Renumber all shots
          page.shots.forEach((shot, index) => {
            shot.number = index + 1;
          });
          
          page.updatedAt = new Date();
        });
      },

      deleteShot: (pageId, shotId) => {
        set((state) => {
          const page = state.pages.find(p => p.id === pageId);
          if (!page) return;
          
          const shotIndex = page.shots.findIndex(s => s.id === shotId);
          if (shotIndex === -1) return;
          
          page.shots.splice(shotIndex, 1);
          
          // Renumber remaining shots
          page.shots.forEach((shot, index) => {
            shot.number = index + 1;
          });
          
          page.updatedAt = new Date();
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
          
          // Renumber shots based on new order
          page.shots.forEach((shot, index) => {
            shot.number = index + 1;
            shot.updatedAt = new Date();
          });
          
          page.updatedAt = new Date();
        });
      },

      // Grid management
      updateGridSize: (pageId, rows, cols) => {
        set((state) => {
          const page = state.pages.find(p => p.id === pageId);
          if (!page) return;
          
          page.gridRows = rows;
          page.gridCols = cols;
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

      renumberShots: (pageId) => {
        set((state) => {
          const page = state.pages.find(p => p.id === pageId);
          if (!page) return;
          
          page.shots.forEach((shot, index) => {
            shot.number = index + 1;
            shot.updatedAt = new Date();
          });
          
          page.updatedAt = new Date();
        });
      }
    })),
    {
      name: 'storyboard-storage',
      partialize: (state) => ({
        pages: state.pages,
        activePageId: state.activePageId
      })
    }
  )
);

// Initialize active page on first load
useStoryboardStore.getState().setActivePage(
  useStoryboardStore.getState().pages[0]?.id || ''
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { triggerAutoSave } from '@/utils/autoSave';

export interface StoryboardPage {
  id: string;
  name: string;
  shots: string[]; // Array of shot IDs instead of full shot objects
  gridRows: number;
  gridCols: number;
  aspectRatio: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageState {
  pages: StoryboardPage[];
  activePageId: string | null;
}

export interface PageActions {
  // Page management
  createPage: (name?: string) => string; // Returns page ID
  deletePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
  setActivePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  
  // Grid management
  updateGridSize: (pageId: string, rows: number, cols: number) => void;
  updatePageAspectRatio: (pageId: string, aspectRatio: string) => void;
  
  // Utility
  getActivePage: () => StoryboardPage | undefined;
  getPageById: (pageId: string) => StoryboardPage | undefined;
  addShotToPage: (pageId: string, shotId: string, position?: number) => void;
  removeShotFromPage: (pageId: string, shotId: string) => void;
  reorderShotsInPage: (pageId: string, shotIds: string[]) => void;
}

export type PageStore = PageState & PageActions;

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

const initialFirstPage = createDefaultPage();

export const usePageStore = create<PageStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      pages: [initialFirstPage],
      activePageId: initialFirstPage.id,

      // Page management
      createPage: (name) => {
        // Find the next available page number
        const existingPages = get().pages;
        const usedNumbers = new Set(
          existingPages.map(page => {
            const match = page.name.match(/^Page (\d+)$/);
            return match ? parseInt(match[1]) : null;
          }).filter(num => num !== null)
        );
        
        let nextNumber = 1;
        while (usedNumbers.has(nextNumber)) {
          nextNumber++;
        }
        
        const newPage = createDefaultPage(`Page ${nextNumber}`);
        set((state) => {
          state.pages.push(newPage);
          state.activePageId = newPage.id;
        });
        
        // Trigger auto-save after creating page
        triggerAutoSave();
        
        return newPage.id;
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
          
          // Renumber all pages to maintain sequential order
          state.pages.forEach((page, index) => {
            page.name = `Page ${index + 1}`;
          });
        });
        
        // Trigger auto-save after deleting page
        triggerAutoSave();
      },

      renamePage: (pageId, name) => {
        set((state) => {
          const page = state.pages.find(p => p.id === pageId);
          if (page) {
            page.name = name;
            page.updatedAt = new Date();
          }
        });
        
        // Trigger auto-save after renaming page
        triggerAutoSave();
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
          
          // Find the next available page number
          const usedNumbers = new Set(
            state.pages.map(page => {
              const match = page.name.match(/^Page (\d+)$/);
              return match ? parseInt(match[1]) : null;
            }).filter(num => num !== null)
          );
          
          let nextNumber = 1;
          while (usedNumbers.has(nextNumber)) {
            nextNumber++;
          }
          
          const duplicatedPage: StoryboardPage = {
            ...originalPage,
            id: crypto.randomUUID(),
            name: `Page ${nextNumber}`,
            shots: [...originalPage.shots], // Copy shot IDs
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const originalIndex = state.pages.findIndex(p => p.id === pageId);
          state.pages.splice(originalIndex + 1, 0, duplicatedPage);
          state.activePageId = duplicatedPage.id;
        });
        
        // Trigger auto-save after duplicating page
        triggerAutoSave();
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

      updatePageAspectRatio: (pageId, aspectRatio) => {
        set((state) => {
          const page = state.pages.find(p => p.id === pageId);
          if (!page) return;
          
          page.aspectRatio = aspectRatio;
          page.updatedAt = new Date();
        });
      },

      // Utility methods
      getActivePage: () => {
        const state = get();
        return state.pages.find(p => p.id === state.activePageId);
      },

      getPageById: (pageId) => {
        const state = get();
        return state.pages.find(p => p.id === pageId);
      },

      addShotToPage: (pageId, shotId, position) => {
        set((state) => {
          const page = state.pages.find(p => p.id === pageId);
          if (!page) return;

          if (position !== undefined && position >= 0 && position <= page.shots.length) {
            page.shots.splice(position, 0, shotId);
          } else {
            page.shots.push(shotId);
          }
          page.updatedAt = new Date();
        });
      },

      removeShotFromPage: (pageId, shotId) => {
        set((state) => {
          const page = state.pages.find(p => p.id === pageId);
          if (!page) return;

          const shotIndex = page.shots.indexOf(shotId);
          if (shotIndex !== -1) {
            page.shots.splice(shotIndex, 1);
            page.updatedAt = new Date();
          }
        });
      },

      reorderShotsInPage: (pageId, shotIds) => {
        set((state) => {
          const page = state.pages.find(p => p.id === pageId);
          if (!page) return;
          
          page.shots = shotIds;
          page.updatedAt = new Date();
        });
      },
    })),
    {
      name: 'page-storage',
      partialize: (state) => ({
        pages: state.pages,
        activePageId: state.activePageId,
      })
    }
  )
); 
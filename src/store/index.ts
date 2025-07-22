// Store exports
export { usePageStore, type PageStore, type StoryboardPage } from './pageStore';
export { useShotStore, type ShotStore, type Shot } from './shotStore';
export { useProjectStore, type ProjectStore, type TemplateSettings } from './projectStore';
export { useUIStore, type UIStore } from './uiStore';

// Performance optimization exports
export { renumberingOptimizer } from '@/utils/renumberingOptimizer';
export { createBatch, batchUtils, type BatchShotOperations } from '@/utils/batchOperations';

// Unified app store that combines all modular stores
import { usePageStore } from './pageStore';
import { useShotStore } from './shotStore';
import { useProjectStore } from './projectStore';
import { useUIStore } from './uiStore';
import { useShallow } from 'zustand/react/shallow';

// Get the actual store instances for internal operations
const getPageStore = () => usePageStore.getState();
const getShotStore = () => useShotStore.getState();
const getProjectStore = () => useProjectStore.getState();
const getUIStore = () => useUIStore.getState();

// Unified store hook that provides access to all stores
export const useAppStore = () => {
  const pageStore = usePageStore();
  const shotStore = useShotStore();
  const projectStore = useProjectStore();
  const uiStore = useUIStore();
  
  // Enhanced redistribution function that handles both overflow and backflow
  const redistributeShotsAcrossPages = () => {
    const { shotOrder } = getShotStore();
    const { pages } = getPageStore();
    
    console.log('redistributeShotsAcrossPages called:', { shotCount: shotOrder.length, pageCount: pages.length });
    
    if (pages.length === 0 || shotOrder.length === 0) return;
    
    // Calculate page capacity (all pages now have the same grid)
    const firstPage = pages[0];
    const pageCapacity = firstPage.gridRows * firstPage.gridCols;
    
    console.log('Page capacity:', pageCapacity, 'Total capacity:', pages.length * pageCapacity);
    
    // Handle overflow: create additional pages if needed BEFORE redistribution
    const totalCapacity = pages.length * pageCapacity;
    if (shotOrder.length > totalCapacity) {
      console.log('Overflow detected, creating new pages');
      // Create additional pages as needed
      const shotsPerPage = pageCapacity;
      const pagesNeeded = Math.ceil(shotOrder.length / shotsPerPage);
      const currentPageCount = pages.length;
      
      console.log('Creating pages:', currentPageCount, 'to', pagesNeeded);
      for (let i = currentPageCount; i < pagesNeeded; i++) {
        // Use the unified store's createPage method to ensure global settings are applied
        const newPageId = pageStore.createPage(`Page ${i + 1}`);
        
        // Apply the same grid settings as existing pages (global setting)
        if (pages.length > 0) {
          const firstPage = pages[0];
          pageStore.updateGridSize(newPageId, firstPage.gridRows, firstPage.gridCols);
          pageStore.updatePageAspectRatio(newPageId, firstPage.aspectRatio);
        }
        
        console.log('Created page:', newPageId);
      }
      
      // Re-run redistribution with new pages immediately instead of setTimeout
      // Use setTimeout with 0 delay to ensure the page creation has been processed
      setTimeout(() => {
        console.log('Re-running redistribution after page creation');
        redistributeShotsAcrossPages();
      }, 0);
      return; // Exit early, will be called again with new pages
    }
    
    console.log('Starting redistribution of shots across pages');
    
    // Get fresh page data to ensure we have the latest state
    const currentPages = getPageStore().pages;
    
    // Clear all pages first
    currentPages.forEach(page => {
      pageStore.reorderShotsInPage(page.id, []);
    });
    
    // Redistribute shots across pages
    currentPages.forEach((page, pageIndex) => {
      const startIndex = pageIndex * pageCapacity;
      const endIndex = startIndex + pageCapacity;
      const pageShotIds = shotOrder.slice(startIndex, endIndex);
      
      console.log(`Page ${pageIndex + 1} (${page.id}): shots ${startIndex}-${endIndex-1}`, pageShotIds);
      
      // Update the page's shots array
      pageStore.reorderShotsInPage(page.id, pageShotIds);
    });
    
    // Handle backflow: remove empty pages at the end (but be careful not to remove pages we just created)
    const updatedPages = getPageStore().pages;
    const nonEmptyPages = updatedPages.filter(page => page.shots.length > 0);
    const emptyPagesAtEnd = updatedPages.slice(nonEmptyPages.length);
    
    console.log('Backflow check:', { totalPages: updatedPages.length, nonEmptyPages: nonEmptyPages.length, emptyPagesAtEnd: emptyPagesAtEnd.length });
    
    // Only remove empty pages if we have more than one page and the empty pages are truly at the end
    if (emptyPagesAtEnd.length > 0 && updatedPages.length > 1 && nonEmptyPages.length > 0) {
      console.log('Removing empty pages at end:', emptyPagesAtEnd.map(p => p.name));
      emptyPagesAtEnd.forEach(page => {
        pageStore.deletePage(page.id);
      });
    }
    
    console.log('Redistribution completed');
  };

  return {
    // Page management
    pages: pageStore.pages,
    activePageId: pageStore.activePageId,
    createPage: (name?: string) => {
      const { pages } = getPageStore();
      const pageId = pageStore.createPage(name);
      
      // Apply the same grid settings as existing pages (global setting)
      if (pages.length > 0) {
        const firstPage = pages[0];
        pageStore.updateGridSize(pageId, firstPage.gridRows, firstPage.gridCols);
        pageStore.updatePageAspectRatio(pageId, firstPage.aspectRatio);
      }
      
      return pageId;
    },
    deletePage: pageStore.deletePage,
    renamePage: pageStore.renamePage,
    setActivePage: pageStore.setActivePage,
    duplicatePage: pageStore.duplicatePage,
    updateGridSize: (pageId: string, rows: number, cols: number) => {
      // Apply grid size to ALL pages (global setting)
      const { pages } = getPageStore();
      pages.forEach(page => {
        pageStore.updateGridSize(page.id, rows, cols);
      });
      // Trigger redistribution after grid size change to handle backflow
      setTimeout(() => redistributeShotsAcrossPages(), 0);
    },
    updatePageAspectRatio: (pageId: string, aspectRatio: string) => {
      // Apply aspect ratio to ALL pages (global setting)
      const { pages } = getPageStore();
      pages.forEach(page => {
        pageStore.updatePageAspectRatio(page.id, aspectRatio);
      });
    },
    getActivePage: pageStore.getActivePage,
    getPageById: pageStore.getPageById,
    addShotToPage: pageStore.addShotToPage,
    removeShotFromPage: pageStore.removeShotFromPage,
    reorderShotsInPage: pageStore.reorderShotsInPage,

    // Shot management
    shots: shotStore.shots,
    shotOrder: shotStore.shotOrder,
    createShot: () => {
      const shotId = shotStore.createShot();
      // Renumber shots after creation
      const { templateSettings } = getProjectStore();
      shotStore.renumberAllShotsImmediate(templateSettings.shotNumberFormat);
      return shotId;
    },
    deleteShot: (shotId: string) => {
      // Remove from all pages first
      const { pages } = getPageStore();
      pages.forEach(page => {
        if (page.shots.includes(shotId)) {
          pageStore.removeShotFromPage(page.id, shotId);
        }
      });
      
      // Remove from shot store (this also updates global order)
      shotStore.deleteShot(shotId);
      
      // Renumber shots after deletion
      const { templateSettings } = getProjectStore();
      shotStore.renumberAllShotsImmediate(templateSettings.shotNumberFormat);
      
      // Redistribute remaining shots across pages
      redistributeShotsAcrossPages();
    },
    updateShot: shotStore.updateShot,
    duplicateShot: (shotId: string) => {
      const newShotId = shotStore.duplicateShot(shotId);
      // Renumber shots after duplication
      const { templateSettings } = getProjectStore();
      shotStore.renumberAllShotsImmediate(templateSettings.shotNumberFormat);
      return newShotId;
    },
    createSubShot: (originalShotId: string) => {
      const subShotId = shotStore.createSubShot(originalShotId);
      // Renumber shots after sub-shot creation
      const { templateSettings } = getProjectStore();
      shotStore.renumberAllShotsImmediate(templateSettings.shotNumberFormat);
      return subShotId;
    },
    removeFromSubGroup: (shotId: string) => {
      shotStore.removeFromSubGroup(shotId);
      // Renumber shots after removing from sub-group
      const { templateSettings } = getProjectStore();
      shotStore.renumberAllShotsImmediate(templateSettings.shotNumberFormat);
    },
    setShotOrder: (shotIds: string[]) => {
      shotStore.setShotOrder(shotIds);
      // Renumber shots after reordering
      const { templateSettings } = getProjectStore();
      shotStore.renumberAllShotsImmediate(templateSettings.shotNumberFormat);
    },
    renumberAllShots: () => {
      const { templateSettings } = getProjectStore();
      shotStore.renumberAllShots(templateSettings.shotNumberFormat);
    },
    renumberAllShotsImmediate: () => {
      const { templateSettings } = getProjectStore();
      shotStore.renumberAllShotsImmediate(templateSettings.shotNumberFormat);
    },
    getShotById: shotStore.getShotById,
    getShotsById: shotStore.getShotsById,
    getSubGroupShots: shotStore.getSubGroupShots,
    insertShotIntoSubGroup: (shotId: string, targetGroupId: string, insertPosition: number) => {
      shotStore.insertShotIntoSubGroup(shotId, targetGroupId, insertPosition);
      // Renumber shots after inserting into sub-group
      const { templateSettings } = getProjectStore();
      shotStore.renumberAllShotsImmediate(templateSettings.shotNumberFormat);
      // Redistribute shots across pages to update visual positions
      redistributeShotsAcrossPages();
    },

    // Project management
    projectName: projectStore.projectName,
    projectInfo: projectStore.projectInfo,
    projectLogoUrl: projectStore.projectLogoUrl,
    projectLogoFile: projectStore.projectLogoFile,
    clientAgency: projectStore.clientAgency,
    jobInfo: projectStore.jobInfo,
    templateSettings: projectStore.templateSettings,
    setProjectName: projectStore.setProjectName,
    setProjectInfo: projectStore.setProjectInfo,
    setProjectLogo: projectStore.setProjectLogo,
    setClientAgency: projectStore.setClientAgency,
    setJobInfo: projectStore.setJobInfo,
    setTemplateSetting: projectStore.setTemplateSetting,
    setTemplateSettings: projectStore.setTemplateSettings,
    resetTemplateSettings: projectStore.resetTemplateSettings,
    getProjectMetadata: projectStore.getProjectMetadata,

    // UI state
    isDragging: uiStore.isDragging,
    isExporting: uiStore.isExporting,
    showDeleteConfirmation: uiStore.showDeleteConfirmation,
    setIsDragging: uiStore.setIsDragging,
    setIsExporting: uiStore.setIsExporting,
    setShowDeleteConfirmation: uiStore.setShowDeleteConfirmation,
    resetUIState: uiStore.resetUIState,

    // Utility methods for cross-store operations
    addShot: (pageId: string, position?: number) => {
      // Create shot without adding to global order yet
      const shotId = shotStore.createShot();
      
      if (position !== undefined) {
        // Calculate global position for insertion
        const { pages } = getPageStore();
        const pageIndex = pages.findIndex(p => p.id === pageId);
        if (pageIndex !== -1) {
          const page = pages[pageIndex];
          const pageCapacity = page.gridRows * page.gridCols;
          const globalPosition = (pageIndex * pageCapacity) + position;
          
          // Insert at specific global position
          const { shotOrder } = getShotStore();
          const newShotOrder = [...shotOrder];
          // Remove the shot that was just added to the end
          newShotOrder.pop();
          // Insert at the correct position
          newShotOrder.splice(globalPosition, 0, shotId);
          shotStore.setShotOrder(newShotOrder);
          
          // Renumber shots after insertion
          const { templateSettings } = getProjectStore();
          shotStore.renumberAllShotsImmediate(templateSettings.shotNumberFormat);
          
          // Redistribute shots across pages
          redistributeShotsAcrossPages();
        }
      } else {
        // Just add to the end of the current page
        pageStore.addShotToPage(pageId, shotId, position);
        // Renumber shots after adding
        const { templateSettings } = getProjectStore();
        shotStore.renumberAllShotsImmediate(templateSettings.shotNumberFormat);
        redistributeShotsAcrossPages();
      }
      
      return shotId;
    },

    addSubShot: (pageId: string, shotId: string) => {
      const subShotId = shotStore.createSubShot(shotId);
      
      // Find the correct position in the page to insert the sub-shot
      const { pages } = getPageStore();
      const page = pages.find(p => p.id === pageId);
      if (page) {
        const originalShotIndex = page.shots.indexOf(shotId);
        if (originalShotIndex !== -1) {
          // Insert the sub-shot right after the original shot in the page
          pageStore.addShotToPage(pageId, subShotId, originalShotIndex + 1);
        } else {
          // Fallback: add to the end of the page
          pageStore.addShotToPage(pageId, subShotId);
        }
      } else {
        // Fallback: add to the end of the page
        pageStore.addShotToPage(pageId, subShotId);
      }
      
      // Renumber shots after adding sub-shot
      const { templateSettings } = getProjectStore();
      shotStore.renumberAllShotsImmediate(templateSettings.shotNumberFormat);
      return subShotId;
    },

    reorderShots: (pageId: string, shotIds: string[]) => {
      // Update the specific page's shot order
      pageStore.reorderShotsInPage(pageId, shotIds);
      
      // Build the complete global shot order by combining all pages
      const { pages } = getPageStore();
      const allShotIds: string[] = [];
      
      pages.forEach(page => {
        if (page.id === pageId) {
          // Use the new shotIds for this page
          allShotIds.push(...shotIds);
        } else {
          // Use existing shotIds for other pages
          allShotIds.push(...page.shots);
        }
      });
      
      // Update the global shot order
      shotStore.setShotOrder(allShotIds);
      
      // Renumber shots after reordering
      const { templateSettings } = getProjectStore();
      shotStore.renumberAllShotsImmediate(templateSettings.shotNumberFormat);
    },
    
    moveShot: (shotId: string, targetPosition: number) => {
      shotStore.moveShot(shotId, targetPosition);
      // Renumber shots after movement
      const { templateSettings } = getProjectStore();
      shotStore.renumberAllShotsImmediate(templateSettings.shotNumberFormat);
      // Automatically redistribute shots across pages after movement
      redistributeShotsAcrossPages();
    },
    
    moveShotGroup: (groupId: string, targetPosition: number) => {
      shotStore.moveShotGroup(groupId, targetPosition);
      // Renumber shots after movement
      const { templateSettings } = getProjectStore();
      shotStore.renumberAllShotsImmediate(templateSettings.shotNumberFormat);
      // Automatically redistribute shots across pages after movement
      redistributeShotsAcrossPages();
    },
    
    getGlobalShotIndex: shotStore.getGlobalShotIndex,
    
    redistributeShotsAcrossPages,

    getTotalShots: (pageId: string) => {
      const page = pageStore.getPageById(pageId);
      return page?.shots.length || 0;
    },

    // Get shots for a specific page
    getPageShots: (pageId: string) => {
      const page = pageStore.getPageById(pageId);
      if (!page) return [];
      return shotStore.getShotsById(page.shots);
    },
    
    // Initialize app with default content if needed
    initializeAppContent: () => {
      try {
        const { pages } = getPageStore();
        const { shots, shotOrder } = getShotStore();
        const { templateSettings } = getProjectStore();
        
        // Safety checks
        if (!pages || !Array.isArray(pages) || pages.length === 0) {
          console.warn('No pages available for initialization');
          return;
        }
        
        if (!shotOrder || !Array.isArray(shotOrder)) {
          console.warn('Shot order not properly initialized');
          return;
        }
        
        // If we have no shots at all, create some initial ones
        if (shotOrder.length === 0) {
          const firstPage = pages[0];
          if (!firstPage || !firstPage.gridRows || !firstPage.gridCols) {
            console.warn('First page not properly initialized');
            return;
          }
          
          const slotsToFill = Math.min(6, firstPage.gridRows * firstPage.gridCols); // Fill up to 6 slots initially
          
          const newShotIds: string[] = [];
          for (let i = 0; i < slotsToFill; i++) {
            try {
              const shotId = shotStore.createShot();
              if (shotId) {
                newShotIds.push(shotId);
                pageStore.addShotToPage(firstPage.id, shotId);
              }
            } catch (error) {
              console.error('Error creating shot:', error);
              break;
            }
          }
          
          if (newShotIds.length > 0) {
            // Update shot order
            shotStore.setShotOrder(newShotIds);
            
            // Renumber all shots with safety check
            if (templateSettings?.shotNumberFormat) {
              shotStore.renumberAllShotsImmediate(templateSettings.shotNumberFormat);
            } else {
              // Fallback to default format if not set
              shotStore.renumberAllShotsImmediate('01');
            }
          }
        }
      } catch (error) {
        console.error('Error initializing app content:', error);
      }
    },
  };
};

// Note: Legacy storyboardStore has been removed in favor of modular stores 
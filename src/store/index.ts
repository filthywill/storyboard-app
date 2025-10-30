// Store exports
export { usePageStore, type PageStore, type StoryboardPage } from './pageStore';
export { useShotStore, type ShotStore, type Shot } from './shotStore';
export { useProjectStore, type ProjectStore, type TemplateSettings } from './projectStore';
export { useUIStore, type UIStore } from './uiStore';
export { useProjectManagerStore, type ProjectManagerStore, type ProjectMetadata } from './projectManagerStore';

// Performance optimization exports
export { renumberingOptimizer } from '@/utils/renumberingOptimizer';
export { createBatch, batchUtils, type BatchShotOperations } from '@/utils/batchOperations';

// Unified app store that combines all modular stores
import { usePageStore } from './pageStore';
import { useShotStore } from './shotStore';
import { useProjectStore } from './projectStore';
import { useUIStore } from './uiStore';
import { useProjectManagerStore } from './projectManagerStore';
import { useShallow } from 'zustand/react/shallow';
import ProjectSwitcher from '@/utils/projectSwitcher';
import { registerAutoSave, enableBatchMode, disableBatchMode } from '@/utils/autoSave';

// Extend window interface for auto-save timeout
declare global {
  interface Window {
    autoSaveTimeout?: NodeJS.Timeout;
  }
}

// Get the actual store instances for internal operations
const getPageStore = () => usePageStore.getState();
const getShotStore = () => useShotStore.getState();
const getProjectStore = () => useProjectStore.getState();
const getUIStore = () => useUIStore.getState();
const getProjectManagerStore = () => useProjectManagerStore.getState();

// Unified store hook that provides access to all stores
export const useAppStore = () => {
  const pageStore = usePageStore();
  const shotStore = useShotStore();
  const projectStore = useProjectStore();
  const uiStore = useUIStore();
  const projectManagerStore = useProjectManagerStore();
  
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
      const shotsPerPage = pageCapacity;
      const pagesNeeded = Math.ceil(shotOrder.length / shotsPerPage);
      const currentPageCount = pages.length;
      
      console.log('Creating pages:', currentPageCount, 'to', pagesNeeded);
      for (let i = currentPageCount; i < pagesNeeded; i++) {
        const newPageId = pageStore.createPage(`Page ${i + 1}`);
        
        // Apply the same grid settings as existing pages (global setting)
        if (pages.length > 0) {
          const firstPage = pages[0];
          pageStore.updateGridSize(newPageId, firstPage.gridRows, firstPage.gridCols);
          pageStore.updatePageAspectRatio(newPageId, firstPage.aspectRatio);
        }
        
        console.log('Created page:', newPageId);
      }
      
      // Re-run redistribution with new pages
      setTimeout(() => {
        console.log('Re-running redistribution after page creation');
        redistributeShotsAcrossPages();
      }, 0);
      return; // Exit early, will be called again with new pages
    }
    
    console.log('Starting redistribution of shots across pages');
    
    // Get fresh page data to ensure we have the latest state
    const currentPages = getPageStore().pages;
    
    // NEW APPROACH: Use shotOrder as source of truth, distribute to pages
    // DO NOT clear pages first - just update them based on shotOrder
    currentPages.forEach((page, pageIndex) => {
      const startIndex = pageIndex * pageCapacity;
      const endIndex = startIndex + pageCapacity;
      const pageShotIds = shotOrder.slice(startIndex, endIndex);
      
      console.log(`Page ${pageIndex + 1} (${page.id}): shots ${startIndex}-${endIndex-1} (${pageShotIds.length})`, pageShotIds);
      
      // Update the page's shots array to match shotOrder
      pageStore.reorderShotsInPage(page.id, pageShotIds);
    });
    
    // Handle backflow: remove empty pages at the end
    const updatedPages = getPageStore().pages;
    const nonEmptyPages = updatedPages.filter(page => page.shots.length > 0);
    const emptyPagesAtEnd = updatedPages.slice(nonEmptyPages.length);
    
    console.log('Backflow check:', { totalPages: updatedPages.length, nonEmptyPages: nonEmptyPages.length, emptyPagesAtEnd: emptyPagesAtEnd.length });
    
    // Only remove empty pages if we have more than one page
    if (emptyPagesAtEnd.length > 0 && updatedPages.length > 1 && nonEmptyPages.length > 0) {
      console.log('Removing empty pages at end:', emptyPagesAtEnd.map(p => p.name));
      emptyPagesAtEnd.forEach(page => {
        pageStore.deletePage(page.id);
      });
    }
    
    console.log('Redistribution completed');
  };

  // Reconcile pages from canonical shotOrder before first render or after imports
  const reconcileFromShotOrder = () => {
    const { pages } = getPageStore();
    const { shotOrder } = getShotStore();

    // Compare ID sets to detect drift for telemetry (silent auto-heal via redistribution)
    try {
      const pageIds = new Set<string>();
      pages.forEach(p => p.shots.forEach(id => pageIds.add(id)));
      const orderIds = new Set<string>(shotOrder);
      let mismatch = false;
      if (pageIds.size !== orderIds.size) mismatch = true;
      else {
        for (const id of pageIds) if (!orderIds.has(id)) { mismatch = true; break; }
      }
      if (mismatch) {
        console.log('[reconcile] Detected layout/order mismatch. Normalizing from shotOrder.', {
          pageCount: pages.length,
          pageIdCount: pageIds.size,
          orderCount: orderIds.size,
        });
      } else {
        console.log('[reconcile] No mismatch detected. Ensuring layout matches shotOrder.');
      }
    } catch (_) {
      // best-effort telemetry only
    }

    // Project pages strictly from shotOrder and renumber once
    redistributeShotsAcrossPages();
    const { templateSettings } = getProjectStore();
    shotStore.renumberAllShotsImmediate(templateSettings.shotNumberFormat);
  };

  return {
    // Page management
    pages: pageStore.pages,
    activePageId: pageStore.activePageId,
    createPage: (name?: string, preserveActivePage = false) => {
      const { pages } = getPageStore();
      const pageId = pageStore.createPage(name); // Automatic numbering handled in pageStore
      
      // Apply the same grid settings as existing pages (global setting)
      if (pages.length > 0) {
        const firstPage = pages[0];
        pageStore.updateGridSize(pageId, firstPage.gridRows, firstPage.gridCols);
        pageStore.updatePageAspectRatio(pageId, firstPage.aspectRatio);
      }
      
      return pageId;
    },
    deletePage: (pageId: string) => {
      // Get the page to be deleted
      const page = pageStore.getPageById(pageId);
      if (!page) return;
      
      // Enable batch mode to prevent auto-save spam during page deletion
      enableBatchMode();
      
      try {
        // Delete all shots on this page from the shot store
        page.shots.forEach(shotId => {
          shotStore.deleteShot(shotId);
        });
        
        // Delete the page (this will also handle active page switching and renumbering)
        pageStore.deletePage(pageId);
        
        // Renumber remaining shots
        const { templateSettings } = getProjectStore();
        shotStore.renumberAllShotsImmediate(templateSettings.shotNumberFormat);
        
        // Redistribute remaining shots across pages
        redistributeShotsAcrossPages();
      } finally {
        // Disable batch mode and trigger a single auto-save for all changes
        disableBatchMode();
      }
    },
    setActivePage: pageStore.setActivePage,
    updateGridSize: (pageId: string, rows: number, cols: number) => {
      // Enable batch mode to prevent auto-save spam during grid size update
      enableBatchMode();
      
      try {
        // Apply grid size to ALL pages (global setting)
        const { pages } = getPageStore();
        pages.forEach(page => {
          pageStore.updateGridSize(page.id, rows, cols);
        });
        // Trigger redistribution after grid size change to handle backflow
        setTimeout(() => redistributeShotsAcrossPages(), 0);
      } finally {
        // Disable batch mode and trigger a single auto-save for all changes
        disableBatchMode();
      }
    },
    updatePageAspectRatio: (pageId: string, aspectRatio: string) => {
      // Enable batch mode to prevent auto-save spam during aspect ratio update
      enableBatchMode();
      
      try {
        // Apply aspect ratio to ALL pages (global setting)
        const { pages } = getPageStore();
        pages.forEach(page => {
          pageStore.updatePageAspectRatio(page.id, aspectRatio);
        });
      } finally {
        // Disable batch mode and trigger a single auto-save for all changes
        disableBatchMode();
      }
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
      
      // Redistribute shots across pages to handle overflow
      redistributeShotsAcrossPages();
      
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

    // Pre-render reconciliation entrypoint
    reconcileFromShotOrder,

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

    // Convert new store format to legacy format for export compatibility
    getLegacyStoryboardState: () => {
      const { pages } = getPageStore();
      const { shots, shotOrder } = getShotStore();
      const { projectName, projectInfo, projectLogoUrl, projectLogoFile, clientAgency, jobInfo, templateSettings } = getProjectStore();
      const { isDragging, isExporting, showDeleteConfirmation } = getUIStore();

      // Convert pages to legacy format with embedded shots
      const legacyPages = pages.map(page => ({
        ...page,
        shots: shotStore.getShotsById(page.shots) // Convert shot IDs to shot objects
      }));

      return {
        pages: legacyPages,
        activePageId: pageStore.activePageId,
        startNumber: '01',
        projectName,
        projectInfo,
        projectLogoUrl,
        projectLogoFile,
        clientAgency,
        jobInfo,
        isDragging,
        isExporting,
        showDeleteConfirmation,
        templateSettings
      };
    },
    
    // Initialize app with default content if needed
    initializeAppContent: () => {
      try {
        const { pages } = getPageStore();
        const { shots, shotOrder } = getShotStore();
        const { templateSettings } = getProjectStore();
        
        // Safety checks
        if (!pages || !Array.isArray(pages) || pages.length === 0) {
          console.warn('No pages available for initialization - creating default page');
          
          // Create a default page if none exist
          const pageStore = getPageStore();
          const defaultPageId = pageStore.createPage('Page 1');
          
          if (!defaultPageId) {
            console.error('Failed to create default page');
            return;
          }
          
          console.log('Default page created:', defaultPageId);
        }
        
        // Get pages again in case we just created a default page
        const currentPages = getPageStore().pages;
        
        if (!shotOrder || !Array.isArray(shotOrder)) {
          console.warn('Shot order not properly initialized');
          return;
        }
        
        // If we have no shots at all, create some initial ones
        if (shotOrder.length === 0) {
          const firstPage = currentPages[0];
          if (!firstPage || !firstPage.gridRows || !firstPage.gridCols) {
            console.warn('First page not properly initialized');
            return;
          }
          
          const slotsToFill = 1; // Create only 1 shot initially
          
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

    // Project Management
    // Project metadata
    projects: projectManagerStore.projects,
    currentProjectId: projectManagerStore.currentProjectId,
    currentProject: projectManagerStore.getCurrentProject(),
    // Compute allProjects inline to make it reactive to projectManagerStore.projects changes
    allProjects: Object.values(projectManagerStore.projects).sort((a, b) => {
      const aTime = a.lastModified instanceof Date ? a.lastModified.getTime() : new Date(a.lastModified).getTime();
      const bTime = b.lastModified instanceof Date ? b.lastModified.getTime() : new Date(b.lastModified).getTime();
      return bTime - aTime;
    }),
    // Call as function to compute dynamically based on current auth state
    canCreateProject: projectManagerStore.canCreateProject,
    
    // Project operations
    createProject: async (name: string, description?: string) => {
      return await ProjectSwitcher.createAndSwitchToProject(name, description);
    },
    
    switchToProject: async (projectId: string) => {
      return await ProjectSwitcher.switchToProject(projectId);
    },
    
    deleteProject: async (projectId: string) => {
      return await ProjectSwitcher.deleteProject(projectId);
    },
    
    renameProject: (projectId: string, name: string) => {
      projectManagerStore.renameProject(projectId, name);
    },
    
    updateProjectMetadata: (projectId: string, updates: any) => {
      projectManagerStore.updateProjectMetadata(projectId, updates);
    },
    
    // Cloud project management
    getProjectsSortedBy: (sortBy: 'name' | 'date') => {
      return projectManagerStore.getProjectsSortedBy(sortBy);
    },
    
    // Save current project
    saveCurrentProject: async () => {
      return await ProjectSwitcher.saveCurrentProject();
    },

    // Auto-save current project (call this after any data changes)
    autoSaveCurrentProject: () => {
      // Debounce auto-save to avoid excessive saves
      if (window.autoSaveTimeout) {
        clearTimeout(window.autoSaveTimeout);
      }
      window.autoSaveTimeout = setTimeout(() => {
        ProjectSwitcher.saveCurrentProject();
      }, 2000); // Save 2 seconds after last change
    },
    
    // Initialize project system
    initializeProjectSystem: async () => {
      return await ProjectSwitcher.initializeProjectSystem();
    },
  };
};

// Register auto-save callbacks during module initialization
registerAutoSave(
  // Debounced auto-save callback
  () => {
    // Call the auto-save method directly from the store
    if (window.autoSaveTimeout) {
      clearTimeout(window.autoSaveTimeout);
    }
    window.autoSaveTimeout = setTimeout(async () => {
      await ProjectSwitcher.saveCurrentProject();
    }, 2000);
  },
  // Immediate save callback
  async () => {
    await ProjectSwitcher.saveCurrentProject();
  }
);

// Note: Legacy storyboardStore has been removed in favor of modular stores 
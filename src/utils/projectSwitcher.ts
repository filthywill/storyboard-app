/**
 * Project Switcher Utility - Simple and Safe Approach
 * 
 * This utility handles project switching by manually saving/loading data
 * to/from localStorage without modifying existing stores.
 * This ensures zero breaking changes to existing functionality.
 */

import { usePageStore } from '@/store/pageStore';
import { useShotStore } from '@/store/shotStore';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import { useProjectManagerStore } from '@/store/projectManagerStore';
import { useAuthStore } from '@/store/authStore';
import { LocalStorageManager } from './localStorageManager';
import { withOperation } from '@/utils/operations';
import { Telemetry } from '@/utils/telemetry';

export class ProjectSwitcher {
  private static isSwitching = false;

  /**
   * Check if project switching is currently in progress
   */
  static isProjectSwitching(): boolean {
    return this.isSwitching;
  }

  /**
   * Save the current project data
   */
  static async saveCurrentProject(): Promise<boolean> {
    try {
      const projectManager = useProjectManagerStore.getState();
      const currentProjectId = projectManager.currentProjectId;
      
      if (!currentProjectId) {
        // Silently skip saves when no project is selected (guest init state)
        return false;
      }

      this.saveCurrentProjectState(currentProjectId);
      this.updateProjectMetadata(currentProjectId);

      // If cloud sync is enabled, also save to cloud
      if (import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true') {
        try {
          const { CloudSyncService } = await import('@/services/cloudSyncService');
          await CloudSyncService.saveProject(currentProjectId, true);
          console.log('Project saved to cloud successfully');
        } catch (error) {
          console.warn('Failed to save to cloud, but local save succeeded:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error saving current project:', error);
      return false;
    }
  }

  /**
   * Switch to a different project
   * This saves current data and loads new project data
   */
  static async switchToProject(projectId: string, skipSaveCurrent: boolean = false): Promise<boolean> {
    return withOperation<boolean>(async () => {
      Telemetry.event('project.switch.begin', { projectId, skipSaveCurrent });
      const endTimer = Telemetry.timer('project.switch.duration');

      // Validate project exists
      const projectManager = useProjectManagerStore.getState();
      if (!projectManager.projects[projectId]) {
        console.error(`Project ${projectId} not found in project manager. Available projects:`, Object.keys(projectManager.projects));
        Telemetry.event('project.switch.error', { projectId, reason: 'not-found' });
        endTimer.end({ projectId, success: false });
        return false;
      }

      // Get current project ID for comparison
      const currentProjectId = projectManager.currentProjectId;
      if (currentProjectId === projectId) {
        console.log('Already on this project, no switch needed');
        Telemetry.event('project.switch.noop', { projectId });
        endTimer.end({ projectId, success: true, noop: true });
        return true;
      }

      console.log(`🔄 Starting project switch: ${currentProjectId} → ${projectId}`);

      // Set switching flag to prevent logo operations during switch
      this.isSwitching = true;

      try {
        // Step 1: Save current project ONE LAST TIME before switching
      if (currentProjectId && !skipSaveCurrent) {
        try {
          console.log('💾 Final save before project switch...');
          this.saveCurrentProjectState(currentProjectId);
          
          // Wait a moment to ensure save completes
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn('Could not save current project before switch:', error);
          // Continue with the switch even if we can't save
        }
      }
      
      console.log('📥 Loading new project data...');
      
      // Step 3: Load new project data with timeout protection
      try {
        const loadSuccess = await Promise.race([
          new Promise<boolean>((resolve) => {
            const result = this.loadProjectData(projectId);
            resolve(result);
          }),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Load timeout')), 3000)
          )
        ]);
        
        if (!loadSuccess) {
          console.error(`Failed to load project ${projectId}`);
          Telemetry.event('project.switch.error', { projectId, reason: 'load-failed' });
          endTimer.end({ projectId, success: false });
          return false;
        }
      } catch (loadError) {
        console.error(`Timeout or error loading project ${projectId}:`, loadError);
        Telemetry.event('project.switch.error', { projectId, reason: 'timeout-or-exception' });
        endTimer.end({ projectId, success: false });
        return false;
      }

      // Step 4: Update project manager
      projectManager.setCurrentProject(projectId);
      
      // Step 5: Update project metadata (counts only, not timestamp - switching doesn't modify data)
      this.updateProjectMetadata(projectId, false);
      
      // Step 7: Reconcile layout from shotOrder to prevent first-action swaps
      try {
        const { reconcileFromShotOrderNonHook } = await import('@/utils/reconcile');
        console.log('🔄 Reconciling layout from shotOrder after project switch...');
        reconcileFromShotOrderNonHook();
        console.log('✅ Layout reconciliation complete');
      } catch (reconcileError) {
        console.warn('Layout reconciliation failed:', reconcileError);
        // Continue - this is a safety net, not critical
      }
      
      console.log(`✅ Project switch complete: ${projectId}`);
      Telemetry.event('project.switch.success', { projectId });
      endTimer.end({ projectId, success: true });
      return true;
      } finally {
        // Clear switching flag to re-enable logo operations
        this.isSwitching = false;
      }
    }, { name: 'project-switch', lockSwitching: true, batchSaves: true });
  }

  /**
   * Save the current state of all stores to project-specific localStorage
   */
  private static saveCurrentProjectState(projectId: string): void {
    try {
      const pageStore = usePageStore.getState();
      const shotStore = useShotStore.getState();
      const projectStore = useProjectStore.getState();
      const uiStore = useUIStore.getState();

      // Save each store's data to project-specific keys
      const pageData = {
        pages: pageStore.pages,
        activePageId: pageStore.activePageId,
      };

      const shotData = {
        shots: Object.fromEntries(
          Object.entries(shotStore.shots).map(([id, shot]) => [
            id,
            {
              ...shot,
              imageFile: null, // Don't persist File objects
              // Ensure all image-related fields are preserved
              imageData: shot.imageData,
              imageUrl: shot.imageUrl,
              imageSize: shot.imageSize,
              imageStorageType: shot.imageStorageType,
              imageScale: shot.imageScale,
              imageOffsetX: shot.imageOffsetX,
              imageOffsetY: shot.imageOffsetY,
              cloudSyncStatus: shot.cloudSyncStatus,
              cloudSyncRetries: shot.cloudSyncRetries,
              lastSyncAttempt: shot.lastSyncAttempt
            }
          ])
        ),
        shotOrder: shotStore.shotOrder,
      };

      const projectData = {
        projectName: projectStore.projectName,
        projectInfo: projectStore.projectInfo,
        projectLogoUrl: projectStore.projectLogoUrl,
        clientAgency: projectStore.clientAgency,
        jobInfo: projectStore.jobInfo,
        templateSettings: projectStore.templateSettings,
      };

      const uiData = {
        isDragging: uiStore.isDragging,
        isExporting: uiStore.isExporting,
        showDeleteConfirmation: uiStore.showDeleteConfirmation,
      };

      // Save to localStorage with project-specific keys using safe methods
      LocalStorageManager.setItem(`page-storage-project-${projectId}`, JSON.stringify(pageData));
      LocalStorageManager.setItem(`shot-storage-project-${projectId}`, JSON.stringify(shotData));
      LocalStorageManager.setItem(`project-storage-project-${projectId}`, JSON.stringify(projectData));
      LocalStorageManager.setItem(`ui-store-project-${projectId}`, JSON.stringify(uiData));
    } catch (error) {
      console.error('Error saving project state:', error);
    }
  }

  /**
   * Load project data from localStorage and apply to stores
   */
  private static loadProjectData(projectId: string): boolean {
    try {
      // Load data from project-specific keys using safe methods
      const pageDataStr = LocalStorageManager.getItem(`page-storage-project-${projectId}`);
      const shotDataStr = LocalStorageManager.getItem(`shot-storage-project-${projectId}`);
      const projectDataStr = LocalStorageManager.getItem(`project-storage-project-${projectId}`);
      const uiDataStr = LocalStorageManager.getItem(`ui-store-project-${projectId}`);

      // If no data exists, use defaults (stores will handle this)
      if (!pageDataStr && !shotDataStr && !projectDataStr && !uiDataStr) {
        return true;
      }

      // Parse and apply data to stores with quota error handling
      if (pageDataStr) {
        try {
          const pageData = JSON.parse(pageDataStr);
          // Handle both wrapped (new format) and unwrapped (old format) data
          const actualPageData = pageData.state || pageData;
          // Validate page data before applying
          if (actualPageData && Array.isArray(actualPageData.pages)) {
            usePageStore.setState({
              pages: actualPageData.pages.map((page: any) => ({
                ...page,
                createdAt: page.createdAt ? new Date(page.createdAt) : new Date(),
                updatedAt: page.updatedAt ? new Date(page.updatedAt) : new Date(),
              })),
              activePageId: actualPageData.activePageId || null,
            });
          }
        } catch (error) {
          console.warn('Could not load page data:', error);
          // Continue with other data
        }
      }

      if (shotDataStr) {
        try {
          const shotData = JSON.parse(shotDataStr);
          // Handle both wrapped (new format) and unwrapped (old format) data
          const actualShotData = shotData.state || shotData;
          // Validate shot data before applying
          if (actualShotData && actualShotData.shots && typeof actualShotData.shots === 'object') {
            useShotStore.setState({
              shots: Object.fromEntries(
                Object.entries(actualShotData.shots).map(([id, shot]: [string, any]) => [
                  id,
                  {
                    ...shot,
                    createdAt: shot.createdAt ? new Date(shot.createdAt) : new Date(),
                    updatedAt: shot.updatedAt ? new Date(shot.updatedAt) : new Date(),
                    imageFile: null, // File objects are not persisted
                  }
                ])
              ),
              shotOrder: Array.isArray(actualShotData.shotOrder) ? actualShotData.shotOrder : [],
            });
          }
        } catch (error) {
          console.warn('Could not load shot data:', error);
          // Continue with other data
        }
      }

      if (projectDataStr) {
        try {
          const projectData = JSON.parse(projectDataStr);
          // Handle both wrapped (new format) and unwrapped (old format) data
          const actualProjectData = projectData.state || projectData;
          // Validate project data before applying
          if (actualProjectData && typeof actualProjectData === 'object') {
            useProjectStore.setState({
              projectName: actualProjectData.projectName || '',
              projectInfo: actualProjectData.projectInfo || '',
              projectLogoUrl: actualProjectData.projectLogoUrl || null,
              projectLogoFile: null, // File objects are not persisted
              clientAgency: actualProjectData.clientAgency || '',
              jobInfo: actualProjectData.jobInfo || '',
              templateSettings: actualProjectData.templateSettings || {},
            });
          }
        } catch (error) {
          console.warn('Could not load project data:', error);
        }
      }

      if (uiDataStr) {
        try {
          const uiData = JSON.parse(uiDataStr);
          // Handle both wrapped (new format) and unwrapped (old format) data
          const actualUIData = uiData.state || uiData;
          // Validate UI data before applying
          if (actualUIData && typeof actualUIData === 'object') {
            useUIStore.setState({
              isDragging: Boolean(actualUIData.isDragging),
              isExporting: Boolean(actualUIData.isExporting),
              showDeleteConfirmation: Boolean(actualUIData.showDeleteConfirmation),
            });
          }
        } catch (error) {
          console.warn('Could not load UI data:', error);
        }
      }

      return true;

    } catch (error) {
      console.error('Error loading project data:', error);
      return false;
    }
  }

  /**
   * Update project metadata with current state
   * @param updateTimestamp - Whether to update lastModified (only on actual data changes)
   */
  private static updateProjectMetadata(projectId: string, updateTimestamp: boolean = true): void {
    try {
      const pageStore = usePageStore.getState();
      const shotStore = useShotStore.getState();
      const projectManager = useProjectManagerStore.getState();

      const shotCount = Object.keys(shotStore.shots).length;
      const pageCount = pageStore.pages.length;

      const updates: any = {
        shotCount,
        pageCount,
      };

      // Only update lastModified when data actually changes
      if (updateTimestamp) {
        updates.lastModified = new Date();
      }

      projectManager.updateProjectMetadata(projectId, updates);
    } catch (error) {
      console.error('Error updating project metadata:', error);
    }
  }

  /**
   * Create a new project and switch to it
   */
  static async createAndSwitchToProject(name: string, description?: string): Promise<string | null> {
    try {
      const projectManager = useProjectManagerStore.getState();
      
      if (!projectManager.canCreateProject()) {
        throw new Error(`Cannot create more than ${projectManager.maxProjects} projects`);
      }

      // Save current project first (if any)
      const currentProjectId = projectManager.currentProjectId;
      if (currentProjectId) {
        this.saveCurrentProjectState(currentProjectId);
      }

      let projectId: string;

      // Apply default state directly to stores FIRST (don't load from localStorage)
      this.applyDefaultStateToStores(name);
      
      // Check if cloud sync is enabled and user is authenticated
      const { isAuthenticated } = useAuthStore.getState();
      if (import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true' && isAuthenticated) {
        try {
          // Try to create cloud project first
          const { CloudSyncService } = await import('@/services/cloudSyncService');
          projectId = await CloudSyncService.createProject(name, description);
          console.log('Created cloud project:', projectId);
          
          // Create local project metadata with the same ID as cloud project
          projectManager.createProjectWithId(projectId, name, description);
        } catch (error) {
          console.warn('Failed to create cloud project, falling back to local:', error);
          // Fallback to local project
          projectId = projectManager.createProject(name, description);
          this.initializeNewProjectWithDefaults(projectId, name);
        }
      } else {
        // Create local project
        projectId = projectManager.createProject(name, description);
        this.initializeNewProjectWithDefaults(projectId, name);
      }
      
      // Update project manager to point to new project
      projectManager.setCurrentProject(projectId);
      
      // Update project metadata
      this.updateProjectMetadata(projectId);

      return projectId;
    } catch (error) {
      console.error('Error creating new project:', error);
      return null;
    }
  }

  /**
   * Delete a project and handle cleanup with graceful fallback
   */
  static async deleteProject(projectId: string): Promise<boolean> {
    try {
      console.log('Starting project deletion:', projectId);
      const projectManager = useProjectManagerStore.getState();
      const currentProjectId = projectManager.currentProjectId;
      const allProjects = projectManager.getAllProjects();
      const isCurrentProject = currentProjectId === projectId;
      const isLastProject = allProjects.length <= 1;
      
      console.log('Deletion context:', {
        projectId,
        currentProjectId,
        isCurrentProject,
        isLastProject,
        totalProjects: allProjects.length
      });

      // Save current project state before deletion (if it's the current project)
      if (isCurrentProject) {
        try {
          this.saveCurrentProjectState(projectId);
        } catch (error) {
          console.warn('Could not save current project before deletion:', error);
          // Continue with deletion even if save fails
        }
      }

      // Clear the project's storage first
      this.clearProjectStorage(projectId);

      // Delete from project manager first (immediate UI response)
      projectManager.deleteProject(projectId);

      // Clean up background sync queue for this project
      if (import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true') {
        try {
          const { BackgroundSyncService } = await import('@/services/backgroundSyncService');
          BackgroundSyncService.markProjectDeleted(projectId);
        } catch (error) {
          console.warn('Failed to clean up sync queue for deleted project:', error);
        }
      }

      // Delete from cloud asynchronously (non-blocking)
      if (import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true') {
        // Don't await - let it run in background
        this.deleteProjectFromCloud(projectId).catch(error => {
          console.warn('Background cloud deletion failed:', error);
        });
      }

      // Handle fallback for current project deletion
      if (isCurrentProject) {
        console.log('Handling fallback for current project deletion');
        const remainingProjects = projectManager.getAllProjects();
        console.log('Remaining projects:', remainingProjects.length);
        
        if (remainingProjects.length > 0) {
          // Switch to the first remaining project
          const fallbackProjectId = remainingProjects[0].id;
          try {
            const switchSuccess = this.loadProjectData(fallbackProjectId);
            if (switchSuccess) {
              projectManager.setCurrentProject(fallbackProjectId);
              this.updateProjectMetadata(fallbackProjectId, false); // Switching only, not modifying
            } else {
              console.warn('Failed to load fallback project, creating new one');
              const newProjectId = await this.createFallbackProject();
              if (!newProjectId) {
                console.error('Failed to create fallback project');
                this.emergencyReset();
              }
            }
          } catch (error) {
            console.error('Error switching to fallback project:', error);
            const newProjectId = await this.createFallbackProject();
            if (!newProjectId) {
              console.error('Failed to create fallback project');
              this.emergencyReset();
            }
          }
        } else {
          // This was the last project, clear current project ID
          console.log('Last project deleted, clearing current project');
          projectManager.setCurrentProject(null);
          
          // Don't create a fallback project - let empty state show
        }
      }

      return true;

    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  /**
   * Create a fallback project when deleting the last project
   */
  private static async createFallbackProject(): Promise<string | null> {
    try {
      const projectManager = useProjectManagerStore.getState();
      
      // Create the fallback project
      const projectId = projectManager.createProject('New Project', 'Default project created after deletion');
      
      // Initialize with default state in localStorage
      this.initializeNewProjectWithDefaults(projectId, 'New Project');
      
      // Apply default state directly to stores
      this.applyDefaultStateToStores('New Project');
      
      // Update project manager to point to new project
      projectManager.setCurrentProject(projectId);
      
      // Update project metadata
      this.updateProjectMetadata(projectId);
      
      return projectId;
    } catch (error) {
      console.error('Error creating fallback project:', error);
      return null;
    }
  }

  /**
   * Delete project from cloud asynchronously (non-blocking)
   */
  private static async deleteProjectFromCloud(projectId: string): Promise<void> {
    try {
      const { CloudSyncService } = await import('@/services/cloudSyncService');
      await CloudSyncService.deleteProject(projectId);
      console.log('Project deleted from cloud:', projectId);
    } catch (error) {
      console.warn('Failed to delete project from cloud:', error);
      throw error; // Re-throw to be caught by the caller
    }
  }

  /**
   * Emergency reset to safe state when all else fails
   */
  private static emergencyReset(): void {
    try {
      console.warn('Performing emergency reset to safe state');
      
      // Clear all project data
      const projectManager = useProjectManagerStore.getState();
      const allProjects = projectManager.getAllProjects();
      allProjects.forEach(project => {
        this.clearProjectStorage(project.id);
      });
      
      // Reset stores to default state
      this.applyDefaultStateToStores('Emergency Reset Project');
      
      // Create a new default project
      const newProjectId = projectManager.createProject('Emergency Reset Project', 'Project created after emergency reset');
      projectManager.setCurrentProject(newProjectId);
      
      console.log('Emergency reset completed');
    } catch (error) {
      console.error('Emergency reset failed:', error);
    }
  }

  /**
   * Clear all current project data from stores (for logout scenarios)
   */
  static clearCurrentProjectData(): void {
    try {
      console.log('Clearing all current project data from stores...');
      
      // Clear all stores to empty/default state
      usePageStore.setState({
        pages: [],
        activePageId: null,
      });

      useShotStore.setState({
        shots: {},
        shotOrder: [],
      });

      useProjectStore.setState({
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
          shotNumberFormat: '01',
        },
      });

      useUIStore.setState({
        isDragging: false,
        isExporting: false,
        showDeleteConfirmation: true,
      });

      // Clear current project AND all projects from project manager
      // This ensures that after sign-out, allProjects.length === 0
      // which triggers the correct UI state (EmptyProjectState welcome screen)
      useProjectManagerStore.setState({
        currentProjectId: null,
        projects: {},
        isInitialized: false,
      });

      console.log('Successfully cleared all project data from stores');
    } catch (error) {
      console.error('Error clearing current project data:', error);
    }
  }

  /**
   * Apply default state directly to stores (for new projects)
   */
  private static applyDefaultStateToStores(projectName?: string): void {
    try {
      // Create default page data
      const defaultPage = {
        id: crypto.randomUUID(),
        name: 'Page 1',
        shots: [],
        gridRows: 2,
        gridCols: 4,
        aspectRatio: '16/9',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Clear current stores and apply default state
      usePageStore.setState({
        pages: [defaultPage],
        activePageId: defaultPage.id,
      });

      useShotStore.setState({
        shots: {},
        shotOrder: [],
      });

      useProjectStore.setState({
        projectName: projectName || 'Project Name',
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
          shotNumberFormat: '01',
        },
      });

      useUIStore.setState({
        isDragging: false,
        isExporting: false,
        showDeleteConfirmation: true,
      });
    } catch (error) {
      console.error('Error applying default state to stores:', error);
    }
  }

  /**
   * Initialize a new project with default state
   */
  private static initializeNewProjectWithDefaults(projectId: string, projectName?: string): void {
    try {
      // Create default page data
      const defaultPage = {
        id: crypto.randomUUID(),
        name: 'Page 1',
        shots: [],
        gridRows: 2,
        gridCols: 4,
        aspectRatio: '16/9',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const pageData = {
        pages: [defaultPage],
        activePageId: defaultPage.id,
      };

      // Create default shot data (empty)
      const shotData = {
        shots: {},
        shotOrder: [],
      };

      // Create default project data
      const projectData = {
        projectName: projectName || 'Project Name',
        projectInfo: 'Project Info',
        projectLogoUrl: null,
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
          shotNumberFormat: '01',
        },
      };

      // Create default UI data
      const uiData = {
        isDragging: false,
        isExporting: false,
        showDeleteConfirmation: true,
      };

      // Save default data to project-specific localStorage using safe methods
      LocalStorageManager.setItem(`page-storage-project-${projectId}`, JSON.stringify(pageData));
      LocalStorageManager.setItem(`shot-storage-project-${projectId}`, JSON.stringify(shotData));
      LocalStorageManager.setItem(`project-storage-project-${projectId}`, JSON.stringify(projectData));
      LocalStorageManager.setItem(`ui-store-project-${projectId}`, JSON.stringify(uiData));
    } catch (error) {
      console.error('Error initializing new project with defaults:', error);
    }
  }

  /**
   * Clear all project-specific storage
   */
  private static clearProjectStorage(projectId: string): void {
    const keys = [
      `page-storage-project-${projectId}`,
      `shot-storage-project-${projectId}`,
      `project-storage-project-${projectId}`,
      `ui-store-project-${projectId}`
    ];

    keys.forEach(key => {
      LocalStorageManager.removeItem(key);
    });
  }

  /**
   * Initialize the project system (call this on app startup)
   */
  static async initializeProjectSystem(): Promise<void> {
    try {
      // Initialize localStorage manager first
      LocalStorageManager.initialize();
      
      // Add a small delay to ensure stores are fully initialized
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const projectManager = useProjectManagerStore.getState();
      
      // Mark as initialized without creating a default project
      if (!projectManager.isInitialized) {
        projectManager.setInitialized(true);
      }
      
      // For authenticated users, don't auto-select a project - let the project picker handle it
      // For unauthenticated users, auto-select the first project if available
      const { isAuthenticated } = useAuthStore.getState();
      
      if (!isAuthenticated) {
        // Only auto-select for unauthenticated users
        const currentProjectId = projectManager.currentProjectId;
        if (!currentProjectId) {
          const allProjects = projectManager.getAllProjects();
          if (allProjects.length > 0) {
            projectManager.setCurrentProject(allProjects[0].id);
          }
          // If no projects exist, don't create one - let empty state show
        }
      }
    } catch (error) {
      console.error('Error initializing project system:', error);
      // Don't throw the error - let the app continue
    }
  }

  /**
   * Migrate existing data to a project
   */
  private static migrateExistingData(projectId: string): void {
    try {
      const storeNames = [
        'page-storage',
        'shot-storage',
        'project-storage',
        'ui-store'
      ];

      let migratedCount = 0;
      storeNames.forEach(storeName => {
        const existingData = LocalStorageManager.getItem(storeName);
        if (existingData) {
          const projectKey = `${storeName}-project-${projectId}`;
          // Only migrate if project storage doesn't already exist
          if (!LocalStorageManager.getItem(projectKey)) {
            LocalStorageManager.setItem(projectKey, existingData);
            migratedCount++;
          }
        }
      });

    } catch (error) {
      console.error('Error migrating existing data:', error);
    }
  }
}

// Export as default for easier importing
export default ProjectSwitcher;

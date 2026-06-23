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
import { toast } from 'sonner';
import { getProjectOpenState } from '@/services/projectOpenGate';
import { getWorkspaceMode, setWorkspaceMode } from '@/services/workspaceModeService';
import { CloudAccessService } from '@/services/cloudAccessService';
import { useCloudSaveConflictStore } from '@/store/cloudSaveConflictStore';
import { setSavePaused } from '@/utils/autoSave';
import { CloudProjectSyncService } from '@/services/cloudProjectSyncService';
import { resolvePageSizeMode } from '@/utils/pageSize';
import { DataValidator } from '@/utils/dataValidator';
import { normalizeProjectSettings } from '@/utils/projectSettings';
import { serializeShotsForStorage } from '@/utils/shotSerialization';

type ProjectCacheEntry = {
  key: string;
  value: string;
};

type ParsedProjectCache = {
  pageData: {
    pages: any[];
    activePageId: string | null;
  };
  shotData: {
    shots: Record<string, any>;
    shotOrder: string[];
  };
  projectData: Record<string, any>;
  uiData: {
    isDragging: boolean;
    isExporting: boolean;
    showDeleteConfirmation: boolean;
  };
};

export class ProjectSwitcher {
  private static isSwitching = false;

  private static createDefaultShotData() {
    const now = new Date();

    return {
      id: crypto.randomUUID(),
      number: '01',
      subShotGroupId: null,
      imageFile: null,
      imageScale: 1.0,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: '',
      scriptText: '',
      createdAt: now,
      updatedAt: now,
    };
  }

  private static resolvePersistedProjectLogoUrl(
    projectLogoUrl: string | null | undefined,
    projectLogoDataUrl: string | null | undefined
  ): string | null {
    if (projectLogoUrl?.startsWith('blob:')) {
      return null;
    }

    if (projectLogoUrl?.startsWith('data:') && projectLogoDataUrl) {
      return null;
    }

    return projectLogoUrl || projectLogoDataUrl || null;
  }

  private static resolvePersistedProjectLogoDataUrl(
    projectLogoUrl: string | null | undefined,
    projectLogoDataUrl: string | null | undefined
  ): string | null {
    if (projectLogoUrl && !projectLogoUrl.startsWith('blob:') && !projectLogoUrl.startsWith('data:')) {
      return null;
    }

    if (projectLogoDataUrl) {
      return projectLogoDataUrl;
    }

    return projectLogoUrl?.startsWith('data:') ? projectLogoUrl : null;
  }

  /**
   * Check if project switching is currently in progress
   */
  static isProjectSwitching(): boolean {
    return this.isSwitching;
  }

  /**
   * Save the current project data
   */
  static async saveCurrentProject(isManual: boolean = true): Promise<boolean> {
    try {
      const projectManager = useProjectManagerStore.getState();
      const currentProjectId = projectManager.currentProjectId;
      
      if (!currentProjectId) {
        // Silently skip saves when no project is selected (guest init state)
        return false;
      }

      if (!this.saveCurrentProjectState(currentProjectId)) {
        return false;
      }
      this.updateProjectMetadata(currentProjectId);

      // If cloud sync is enabled, also save to cloud
      if (import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true') {
        try {
          const { CloudSyncService } = await import('@/services/cloudSyncService');
          const result = await CloudSyncService.saveProject(currentProjectId, isManual);
          if (result.ok) {
            console.log('Project saved to cloud successfully');
          } else {
            console.warn('Cloud save skipped or failed:', result.reason);
            Telemetry.event('project.save.cloud_failed', {
              projectId: currentProjectId,
              reason: result.reason,
              queued: result.queued
            });
          }
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
  static async switchToProject(
    projectId: string,
    skipSaveCurrent: boolean = false,
    forceReload: boolean = false
  ): Promise<boolean> {
    return withOperation<boolean>(async () => {
      Telemetry.event('project.switch.begin', { projectId, skipSaveCurrent });
      const endTimer = Telemetry.timer('project.switch.duration');
      useCloudSaveConflictStore.getState().clearPause();
      setSavePaused(false, 'project_switch');

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
        if (!forceReload) {
          console.log('Already on this project, no switch needed');
          Telemetry.event('project.switch.noop', { projectId });
          endTimer.end({ projectId, success: true, noop: true });
          return true;
        }

        console.log('🔄 Reloading current project from local storage...');
        this.isSwitching = true;
        try {
          const loadSuccess = this.loadProjectData(projectId);
          if (!loadSuccess) {
            Telemetry.event('project.switch.error', { projectId, reason: 'reload-failed' });
            endTimer.end({ projectId, success: false });
            return false;
          }
          this.updateProjectMetadata(projectId, false);
          try {
            const { reconcileFromShotOrderNonHook } = await import('@/utils/reconcile');
            reconcileFromShotOrderNonHook();
          } catch (reconcileError) {
            console.warn('Layout reconciliation failed:', reconcileError);
          }
          Telemetry.event('project.switch.reload', { projectId });
          endTimer.end({ projectId, success: true, reload: true });
          return true;
        } finally {
          this.isSwitching = false;
        }
      }

      const openState = await getProjectOpenState(projectId);
      if (!openState.allowed) {
        Telemetry.event('project.switch.blocked', {
          projectId,
          reason: openState.reason
        });
        endTimer.end({ projectId, success: false, blocked: openState.reason });
        return false;
      }

      console.log(`🔄 Starting project switch: ${currentProjectId} → ${projectId}`);

      // Set switching flag to prevent logo operations during switch
      this.isSwitching = true;

      try {
        // Step 1: Save current project ONE LAST TIME before switching
      if (currentProjectId && !skipSaveCurrent) {
        try {
          console.log('💾 Final save before project switch...');
          const saved = this.saveCurrentProjectState(currentProjectId);
          if (!saved) {
            console.warn('Aborting project switch because final local save failed');
            Telemetry.event('project.switch.error', { projectId, reason: 'final-save-failed' });
            endTimer.end({ projectId, success: false });
            return false;
          }
          
          // Wait a moment to ensure save completes
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn('Could not save current project before switch:', error);
          Telemetry.event('project.switch.error', { projectId, reason: 'final-save-exception' });
          endTimer.end({ projectId, success: false });
          return false;
        }
      }
      
      console.log('📥 Loading new project data...');
      
      // Step 3: Load new project data with timeout protection
      try {
        const targetProject = projectManager.projects[projectId];
        const shouldCheckRevision =
          (targetProject?.isCloudOnly || targetProject?.isCloudBacked) &&
          import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true';
        if (shouldCheckRevision) {
          try {
            await CloudProjectSyncService.refreshProjectIfStale(projectId);
          } catch (error) {
            console.warn('Failed to refresh project from cloud:', error);
          }
        }
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
  private static writeProjectCacheEntries(entries: ProjectCacheEntry[]): boolean {
    const previousValues = new Map<string, string | null>();
    const writtenKeys: string[] = [];

    entries.forEach(({ key }) => {
      previousValues.set(key, LocalStorageManager.getItem(key));
    });

    // Write the largest entries first so quota pressure fails before smaller
    // metadata slices overwrite otherwise usable cache data.
    const orderedEntries = [...entries].sort((a, b) => b.value.length - a.value.length);

    for (const entry of orderedEntries) {
      const didWrite = LocalStorageManager.setItem(entry.key, entry.value);
      if (didWrite) {
        writtenKeys.push(entry.key);
        continue;
      }

      console.error('Project cache write failed; rolling back written slices:', entry.key);
      writtenKeys.forEach((key) => {
        const previousValue = previousValues.get(key);
        if (previousValue === null || previousValue === undefined) {
          LocalStorageManager.removeItem(key);
        } else {
          LocalStorageManager.setItem(key, previousValue);
        }
      });
      return false;
    }

    return true;
  }

  private static saveCurrentProjectState(projectId: string): boolean {
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
        shots: serializeShotsForStorage(shotStore.shots),
        shotOrder: shotStore.shotOrder,
      };

      const projectData = {
        projectName: projectStore.projectName,
        projectInfo: projectStore.projectInfo,
        projectLogoUrl: this.resolvePersistedProjectLogoUrl(
          projectStore.projectLogoUrl,
          projectStore.projectLogoDataUrl
        ),
        projectLogoDataUrl: this.resolvePersistedProjectLogoDataUrl(
          projectStore.projectLogoUrl,
          projectStore.projectLogoDataUrl
        ),
        clientAgency: projectStore.clientAgency,
        jobInfo: projectStore.jobInfo,
        pageSizeMode: projectStore.pageSizeMode,
        templateSettings: projectStore.templateSettings,
        storyboardTheme: projectStore.storyboardTheme,
      };

      const uiData = {
        isDragging: uiStore.isDragging,
        isExporting: uiStore.isExporting,
        showDeleteConfirmation: uiStore.showDeleteConfirmation,
      };

      const validation = DataValidator.validateBeforeSave(
        {
          pages: pageData.pages,
          shots: shotData.shots as any,
          shotOrder: shotData.shotOrder,
          projectSettings: projectData,
          uiSettings: uiData,
        },
        projectId,
        projectData.projectName
      );

      if (!validation.valid) {
        console.error('Refusing to save invalid project state:', {
          projectId,
          errors: validation.errors,
          warnings: validation.warnings,
        });
        return false;
      }

      // Save to localStorage with project-specific keys using safe methods
      return this.writeProjectCacheEntries([
        { key: `page-storage-project-${projectId}`, value: JSON.stringify(pageData) },
        { key: `shot-storage-project-${projectId}`, value: JSON.stringify(shotData) },
        { key: `project-storage-project-${projectId}`, value: JSON.stringify(projectData) },
        { key: `ui-store-project-${projectId}`, value: JSON.stringify(uiData) },
      ]);
    } catch (error) {
      console.error('Error saving project state:', error);
      return false;
    }
  }

  /**
   * Load project data from localStorage and apply to stores
   */
  private static unwrapProjectCacheSlice(rawValue: string, key: string): any {
    const parsed = JSON.parse(rawValue);
    const actualData = parsed?.state || parsed;
    if (!actualData || typeof actualData !== 'object') {
      throw new Error(`Invalid project cache slice: ${key}`);
    }
    return actualData;
  }

  private static parseProjectCache(projectId: string): ParsedProjectCache | null {
    const pageKey = `page-storage-project-${projectId}`;
    const shotKey = `shot-storage-project-${projectId}`;
    const projectKey = `project-storage-project-${projectId}`;
    const uiKey = `ui-store-project-${projectId}`;

    const pageDataStr = LocalStorageManager.getItem(pageKey);
    const shotDataStr = LocalStorageManager.getItem(shotKey);
    const projectDataStr = LocalStorageManager.getItem(projectKey);
    const uiDataStr = LocalStorageManager.getItem(uiKey);

    if (!pageDataStr || !shotDataStr || !projectDataStr) {
      console.warn('Missing required project cache slices; refusing partial load:', {
        projectId,
        hasPageData: Boolean(pageDataStr),
        hasShotData: Boolean(shotDataStr),
        hasProjectData: Boolean(projectDataStr),
        hasUIData: Boolean(uiDataStr),
      });
      return null;
    }

    try {
      const actualPageData = this.unwrapProjectCacheSlice(pageDataStr, pageKey);
      const actualShotData = this.unwrapProjectCacheSlice(shotDataStr, shotKey);
      const actualProjectData = this.unwrapProjectCacheSlice(projectDataStr, projectKey);
      const actualUIData = uiDataStr
        ? this.unwrapProjectCacheSlice(uiDataStr, uiKey)
        : {
            isDragging: false,
            isExporting: false,
            showDeleteConfirmation: true,
          };

      if (!Array.isArray(actualPageData.pages) || actualPageData.pages.length === 0) {
        throw new Error(`Invalid or empty pages in ${pageKey}`);
      }

      if (!actualShotData.shots || typeof actualShotData.shots !== 'object') {
        throw new Error(`Invalid shots in ${shotKey}`);
      }

      const pages = actualPageData.pages.map((page: any) => ({
        ...page,
        createdAt: page.createdAt ? new Date(page.createdAt) : new Date(),
        updatedAt: page.updatedAt ? new Date(page.updatedAt) : new Date(),
      }));

      const shots = Object.fromEntries(
        Object.entries(actualShotData.shots).map(([id, shot]: [string, any]) => [
          id,
          {
            ...shot,
            createdAt: shot.createdAt ? new Date(shot.createdAt) : new Date(),
            updatedAt: shot.updatedAt ? new Date(shot.updatedAt) : new Date(),
            imageFile: null, // File objects are not persisted
          }
        ])
      );

      if (Object.keys(shots).length === 0) {
        throw new Error(`Invalid or empty shots in ${shotKey}`);
      }

      const shotOrder = Array.isArray(actualShotData.shotOrder)
        ? actualShotData.shotOrder
        : Object.keys(shots);
      const activePageId = typeof actualPageData.activePageId === 'string' &&
        pages.some((page) => page.id === actualPageData.activePageId)
          ? actualPageData.activePageId
          : pages[0]?.id || null;
      const uiData = {
        isDragging: Boolean(actualUIData.isDragging),
        isExporting: Boolean(actualUIData.isExporting),
        showDeleteConfirmation:
          actualUIData.showDeleteConfirmation !== undefined
            ? Boolean(actualUIData.showDeleteConfirmation)
            : true,
      };

      const projectData = normalizeProjectSettings(actualProjectData);

      const validation = DataValidator.validateProjectData({
        pages,
        shots: shots as any,
        shotOrder,
        projectSettings: projectData,
        uiSettings: uiData,
      });

      if (!validation.valid) {
        console.error('Project cache validation failed; refusing partial load:', {
          projectId,
          errors: validation.errors,
          warnings: validation.warnings,
        });
        return null;
      }

      return {
        pageData: {
          pages,
          activePageId,
        },
        shotData: {
          shots,
          shotOrder,
        },
        projectData,
        uiData,
      };
    } catch (error) {
      console.error('Failed to parse project cache; refusing partial load:', {
        projectId,
        error,
      });
      return null;
    }
  }

  private static loadProjectData(projectId: string): boolean {
    try {
      const parsedCache = this.parseProjectCache(projectId);
      if (!parsedCache) return false;

      // Apply only after the full target snapshot has been parsed and validated.
      usePageStore.setState({
        pages: parsedCache.pageData.pages,
        activePageId: parsedCache.pageData.activePageId,
      });

      useShotStore.setState({
        shots: parsedCache.shotData.shots,
        shotOrder: parsedCache.shotData.shotOrder,
      });

      useProjectStore.setState({
        projectName: parsedCache.projectData.projectName || '',
        projectInfo: parsedCache.projectData.projectInfo || '',
        projectLogoUrl: this.resolvePersistedProjectLogoUrl(
          parsedCache.projectData.projectLogoUrl,
          parsedCache.projectData.projectLogoDataUrl
        ),
        projectLogoFile: null, // File objects are not persisted
        projectLogoDataUrl: this.resolvePersistedProjectLogoDataUrl(
          parsedCache.projectData.projectLogoUrl,
          parsedCache.projectData.projectLogoDataUrl
        ),
        clientAgency: parsedCache.projectData.clientAgency || '',
        jobInfo: parsedCache.projectData.jobInfo || '',
        pageSizeMode: resolvePageSizeMode(parsedCache.projectData.pageSizeMode),
        templateSettings: parsedCache.projectData.templateSettings || {},
        storyboardTheme: parsedCache.projectData.storyboardTheme,
      });

      useUIStore.setState(parsedCache.uiData);
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
  
      // ✅ Declare ONCE, at the top
      const { isAuthenticated } = useAuthStore.getState();
  
      // Optional: only enforce local gate for unauthenticated users
      if (!isAuthenticated && !projectManager.canCreateProject()) {
        throw new Error(`Cannot create more than ${projectManager.maxProjects} projects`);
      }
  
      // Save current project first (if any)
      const currentProjectId = projectManager.currentProjectId;
      if (currentProjectId) {
        this.saveCurrentProjectState(currentProjectId);
      }
  
      let projectId: string;
  
      this.applyDefaultStateToStores(name);
  
      if (import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true' && isAuthenticated) {
        try {
          const { CloudSyncService } = await import('@/services/cloudSyncService');
          projectId = await CloudSyncService.createProject(name, description);
          projectManager.createProjectWithId(projectId, name, description, true);
        } catch (error: any) {
          const isUpgradeRequired =
            error?.code === "UPGRADE_REQUIRED" ||
            error?.name === "UpgradeRequiredError" ||
            String(error?.message || "").includes("Upgrade");
  
          if (isUpgradeRequired) {
            throw error;
          }
  
          projectId = projectManager.createProject(name, description);
          this.initializeNewProjectWithDefaults(projectId, name);
        }
      } else {
        projectId = projectManager.createProject(name, description);
        this.initializeNewProjectWithDefaults(projectId, name);
      }
  
      projectManager.setCurrentProject(projectId);
      this.updateProjectMetadata(projectId);
  
      return projectId;
    } catch (error: any) {
      const isUpgradeRequired =
        error?.code === "UPGRADE_REQUIRED" ||
        error?.name === "UpgradeRequiredError" ||
        String(error?.message || "").includes("Upgrade");
  
      if (isUpgradeRequired) {
        throw error;
      }
  
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
          const accessState = await CloudAccessService.getAccessState();
          const workspaceMode = getWorkspaceMode(accessState.userId);
          const prefersCloud = workspaceMode === 'cloud';
          const isCloudProject = (project: any) =>
            project.isCloudOnly || project.isCloudBacked;

          const preferred = remainingProjects.find((project) =>
            prefersCloud ? isCloudProject(project) : !isCloudProject(project)
          );
          const fallbackProject = preferred ?? remainingProjects[0];
          const fallbackProjectId = fallbackProject.id;

          if (
            accessState.isAuthenticated &&
            accessState.userId &&
            ((prefersCloud && !isCloudProject(fallbackProject)) ||
              (!prefersCloud && isCloudProject(fallbackProject)))
          ) {
            const nextMode = isCloudProject(fallbackProject) ? 'cloud' : 'local';
            setWorkspaceMode(nextMode, accessState.userId);
          }

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
          console.log('Last project deleted, creating a local fallback project');
          const newProjectId = await this.createFallbackProject();
          if (!newProjectId) {
            console.error('Failed to create fallback project');
            this.emergencyReset();
          }

          const accessState = await CloudAccessService.getAccessState();
          if (accessState.isAuthenticated && accessState.userId) {
            setWorkspaceMode('local', accessState.userId);
          }
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
        projectLogoDataUrl: null,
        clientAgency: 'Client/Agency',
        jobInfo: 'Job Info',
        pageSizeMode: 'dynamic',
        templateSettings: {
          showLogo: false,
          showProjectName: true,
          showProjectInfo: true,
          showClientAgency: true,
          showJobInfo: true,
          showActionText: true,
          showScriptText: true,
          showPageNumber: true,
          shotNumberFormat: '01',
        },
        storyboardTheme: normalizeProjectSettings(undefined).storyboardTheme,
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
      const defaultShot = this.createDefaultShotData();

      // Create default page data
      const defaultPage = {
        id: crypto.randomUUID(),
        name: 'Page 1',
        shots: [defaultShot.id],
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
        shots: {
          [defaultShot.id]: defaultShot,
        },
        shotOrder: [defaultShot.id],
      });

      useProjectStore.setState({
        projectName: projectName || 'Project Name',
        projectInfo: 'Project Info',
        projectLogoUrl: null,
        projectLogoFile: null,
        projectLogoDataUrl: null,
        clientAgency: 'Client/Agency',
        jobInfo: 'Job Info',
        pageSizeMode: 'dynamic',
        templateSettings: {
          showLogo: false,
          showProjectName: true,
          showProjectInfo: true,
          showClientAgency: true,
          showJobInfo: true,
          showActionText: true,
          showScriptText: true,
          showPageNumber: true,
          shotNumberFormat: '01',
        },
        storyboardTheme: normalizeProjectSettings(undefined).storyboardTheme,
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
      const defaultShot = this.createDefaultShotData();

      // Create default page data
      const defaultPage = {
        id: crypto.randomUUID(),
        name: 'Page 1',
        shots: [defaultShot.id],
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
        shots: {
          [defaultShot.id]: defaultShot,
        },
        shotOrder: [defaultShot.id],
      };

      // Create default project data
      const projectData = {
        projectName: projectName || 'Project Name',
        projectInfo: 'Project Info',
        projectLogoUrl: null,
        projectLogoDataUrl: null,
        clientAgency: 'Client/Agency',
        jobInfo: 'Job Info',
        pageSizeMode: 'dynamic',
        templateSettings: {
          showLogo: false,
          showProjectName: true,
          showProjectInfo: true,
          showClientAgency: true,
          showJobInfo: true,
          showActionText: true,
          showScriptText: true,
          showPageNumber: true,
          shotNumberFormat: '01',
        },
        storyboardTheme: normalizeProjectSettings(undefined).storyboardTheme,
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

      // The previous startup imageData hydration fallback is intentionally disabled
      // until project switching/cache loading remains atomic under quota pressure.
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

import { ProjectService, ProjectData } from './projectService'
import { StorageService } from './storageService'
import { usePageStore } from '@/store/pageStore'
import { useShotStore } from '@/store/shotStore'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useProjectManagerStore } from '@/store/projectManagerStore'

export class CloudSyncService {
  private static currentProjectId: string | null = null
  private static syncTimeout: NodeJS.Timeout | null = null
  private static isSyncing: boolean = false
  private static offlineQueue: Array<{ projectId: string; data: ProjectData; timestamp: number }> = []
  
  static setCurrentProject(projectId: string) {
    this.currentProjectId = projectId
  }
  
  static getCurrentProjectId(): string | null {
    return this.currentProjectId
  }
  
  static async createProject(name: string, description?: string): Promise<string> {
    const projectId = await ProjectService.createProject(name, description)
    
    // Set as current project
    this.currentProjectId = projectId
    
    // Initialize with default state
    await this.saveProject(projectId)
    
    // Don't load into stores here - let ProjectSwitcher handle that
    // await this.loadProject(projectId)
    
    return projectId
  }
  
  static async loadProject(projectId: string): Promise<void> {
    const data = await ProjectService.getProject(projectId)
    
    // Apply to stores
    usePageStore.setState({
      pages: data.pages.map(page => ({
        ...page,
        createdAt: new Date(page.createdAt),
        updatedAt: new Date(page.updatedAt)
      })),
      activePageId: data.pages[0]?.id || null
    })
    
    useShotStore.setState({
      shots: Object.fromEntries(
        Object.entries(data.shots).map(([id, shot]: [string, any]) => [
          id,
          {
            ...shot,
            createdAt: new Date(shot.createdAt),
            updatedAt: new Date(shot.updatedAt),
            imageFile: null // Files don't persist
          }
        ])
      ),
      shotOrder: data.shotOrder || this.deriveShotOrderFromPages(data.pages)
    })
    
    useProjectStore.setState(data.projectSettings)
    useUIStore.setState(data.uiSettings)
    
    this.currentProjectId = projectId
  }
  
  private static deriveShotOrderFromPages(pages: any[]): string[] {
    console.warn('⚠️ shotOrder missing from cloud data, deriving from pages');
    const shotOrder: string[] = [];
    
    // Concatenate shot IDs from all pages in order
    pages.forEach(page => {
      if (page.shots && Array.isArray(page.shots)) {
        shotOrder.push(...page.shots);
      }
    });
    
    return shotOrder;
  }
  
  static async saveProject(projectId?: string, isManual: boolean = false): Promise<void> {
    const id = projectId || this.currentProjectId
    if (!id) {
      console.warn('CloudSyncService.saveProject: No project ID provided');
      return;
    }
    
    if (this.isSyncing) {
      console.log('CloudSyncService.saveProject: Already syncing, skipping');
      return;
    }
    this.isSyncing = true
    
    try {
      const pageStore = usePageStore.getState()
      const shotStore = useShotStore.getState()
      const projectStore = useProjectStore.getState()
      const uiStore = useUIStore.getState()
      
      // Check for base64 images that need migration
      const base64Images = Object.entries(shotStore.shots).filter(([_, shot]) => 
        shot.imageData && !shot.imageUrl
      );
      
      if (base64Images.length > 0) {
        console.log(`Found ${base64Images.length} base64 images to migrate`);
        await this.migrateBase64Images(id, base64Images);
      }

      // Check for project logo that needs migration (only if we have a valid file)
      // Only process logo operations if this is the current active project and not switching
      const currentProjectId = useProjectManagerStore.getState().currentProjectId;
      
      // Check if project switching is in progress
      const { ProjectSwitcher } = await import('@/utils/projectSwitcher');
      const isProjectSwitching = ProjectSwitcher.isProjectSwitching();
      
      if (id === currentProjectId && !isProjectSwitching) {
        if (projectStore.projectLogoFile && 
            projectStore.projectLogoFile instanceof File && 
            !projectStore.projectLogoUrl?.includes('supabase')) {
          console.log('Found project logo file to migrate');
          try {
            await this.migrateProjectLogo(id, projectStore.projectLogoFile);
          } catch (error) {
            console.error('Project logo migration failed:', error);
            // Don't let logo migration break the entire save
          }
        } else if (projectStore.projectLogoFile === null && projectStore.projectLogoUrl === null) {
          // Check if this project previously had a logo that needs to be cleaned up
          // Only delete if we can confirm this project had a logo before
          try {
            const { StorageService } = await import('./storageService');
            const existingLogo = await StorageService.getProjectLogo(id);
            if (existingLogo) {
              console.log('Project logo was removed, deleting from cloud storage');
              await StorageService.deleteProjectLogo(id);
            }
          } catch (error) {
            console.error('Project logo deletion failed:', error);
            // Don't let logo deletion break the entire save
          }
        }
      } else {
        if (isProjectSwitching) {
          console.log(`⏭️ Skipping logo operations for project ${id} - project switching in progress`);
        } else {
          console.log(`Skipping logo operations for project ${id} - not the current active project (${currentProjectId})`);
        }
      }
      
      const data: ProjectData = {
        pages: pageStore.pages,
        shots: Object.fromEntries(
          Object.entries(shotStore.shots).map(([id, shot]) => [
            id,
            {
              ...shot,
              imageFile: null, // Don't serialize File objects
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
        projectSettings: {
          projectName: projectStore.projectName,
          projectInfo: projectStore.projectInfo,
          projectLogoUrl: projectStore.projectLogoUrl,
          clientAgency: projectStore.clientAgency,
          jobInfo: projectStore.jobInfo,
          templateSettings: projectStore.templateSettings
        },
        uiSettings: {
          isDragging: uiStore.isDragging,
          isExporting: uiStore.isExporting,
          showDeleteConfirmation: uiStore.showDeleteConfirmation
        }
      }

      // CRITICAL: Validate project data before saving
      if (!data.pages || data.pages.length === 0) {
        console.error('❌ CRITICAL ERROR: Attempting to save project with 0 pages! Aborting save to prevent data corruption.');
        console.error('Project data:', { projectId: id, pagesCount: data.pages?.length, shotsCount: Object.keys(data.shots).length });
        this.isSyncing = false;
        return;
      }

      if (!data.shots || Object.keys(data.shots).length === 0) {
        console.error('❌ CRITICAL ERROR: Attempting to save project with 0 shots! Aborting save to prevent data corruption.');
        console.error('Project data:', { projectId: id, pagesCount: data.pages?.length, shotsCount: Object.keys(data.shots).length });
        this.isSyncing = false;
        return;
      }

      if (!data.projectSettings.projectName || data.projectSettings.projectName.trim() === '') {
        console.error('❌ CRITICAL ERROR: Attempting to save project with empty name! Aborting save to prevent data corruption.');
        console.error('Project data:', { projectId: id, projectName: data.projectSettings.projectName });
        this.isSyncing = false;
        return;
      }
      
      console.log('CloudSyncService.saveProject: Data to save:', {
        projectId: id,
        pagesCount: data.pages.length,
        shotsCount: Object.keys(data.shots).length,
        projectName: data.projectSettings.projectName,
        isManual,
        shotOrderLength: data.shotOrder.length,
        shotsWithImages: Object.values(data.shots).filter((shot: any) => shot.imageData || shot.imageUrl).length,
        shotsWithBase64: Object.values(data.shots).filter((shot: any) => shot.imageData).length,
        shotsWithUrls: Object.values(data.shots).filter((shot: any) => shot.imageUrl).length
      });
      
      // VALIDATION: Check if project name matches metadata
      const projectManager = useProjectManagerStore.getState();
      const projectMetadata = projectManager.projects[id];
      
      if (projectMetadata && projectMetadata.name !== data.projectSettings.projectName) {
        console.warn('⚠️ Project name mismatch detected, updating metadata to match store:', {
          savingToProjectId: id,
          metadataName: projectMetadata.name,
          storeName: data.projectSettings.projectName,
          dataContainsShotCount: Object.keys(data.shots).length,
          metadataShotCount: projectMetadata.shotCount
        });
        
        // Update the project metadata to match the store data
        projectManager.renameProject(id, data.projectSettings.projectName);
        console.log('✅ Project metadata updated to match store data');
      } else {
        console.log('✅ Validation passed: Project name matches');
      }
      
      // Save locally first (always)
      await this.saveToLocalStorage(id, data)
      
      // Check if we're online and authenticated
      const isOnline = navigator.onLine;
      const isCloudEnabled = this.isCloudEnabled();
      const isAuthenticated = this.isAuthenticated();
      
      console.log('CloudSyncService.saveProject: Status check:', {
        isOnline,
        isCloudEnabled,
        isAuthenticated
      });
      
      if (isOnline && isCloudEnabled && isAuthenticated) {
        // Online: save to cloud immediately
        try {
          console.log('CloudSyncService.saveProject: Attempting cloud save...');
          await ProjectService.saveProject(id, data);
          console.log('CloudSyncService.saveProject: Cloud save successful');
        } catch (error) {
          console.error('CloudSyncService.saveProject: Cloud save failed:', error);
          this.queueChange(id, data);
        }
      } else if (isCloudEnabled && isAuthenticated) {
        // Offline: queue for later sync
        console.log('CloudSyncService.saveProject: Offline, queuing for later sync');
        this.queueChange(id, data);
      } else {
        console.log('CloudSyncService.saveProject: Cloud sync not available, skipping cloud save');
      }
    } finally {
      this.isSyncing = false
    }
  }
  
  static autoSave(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout)
    }
    
    this.syncTimeout = setTimeout(() => {
      this.saveProject().catch(error => {
        console.error('Auto-save failed:', error)
      })
    }, 2000) // Auto-save 2 seconds after last change
  }
  
  static async uploadShotImage(projectId: string, shotId: string, file: File): Promise<string> {
    const imageUrl = await StorageService.uploadImage(projectId, shotId, file)
    return imageUrl
  }
  
  static async deleteProject(projectId: string): Promise<void> {
    await ProjectService.deleteProject(projectId)
  }
  
  /**
   * Migrate base64 images to cloud storage with improved error handling
   */
  private static async migrateBase64Images(projectId: string, base64Images: [string, any][]): Promise<void> {
    const { StorageService } = await import('./storageService');
    const { useShotStore } = await import('@/store/shotStore');
    
    let migratedCount = 0;
    let failedCount = 0;
    const failedImages: string[] = [];

    for (const [shotId, shot] of base64Images) {
      try {
        console.log(`Migrating base64 image for shot ${shotId}...`);
        
        // Convert base64 to File
        const response = await fetch(shot.imageData);
        const blob = await response.blob();
        const file = new File([blob], `shot-${shotId}.png`, { type: 'image/png' });
        
        // Upload to Supabase Storage
        const imageUrl = await StorageService.uploadImage(projectId, shotId, file);
        
        // Update shot in store with new URL and remove base64
        const shotStore = useShotStore.getState();
        shotStore.updateShot(shotId, {
          imageUrl,
          imageData: undefined, // Remove base64 to save space
          imageStorageType: 'supabase',
          cloudSyncStatus: 'synced'
        });
        
        console.log(`Successfully migrated image for shot ${shotId}`);
        migratedCount++;
      } catch (error) {
        console.error(`Failed to migrate image for shot ${shotId}:`, error);
        failedCount++;
        failedImages.push(shotId);
        
        // Update shot with failed status for retry later
        const shotStore = useShotStore.getState();
        shotStore.updateShot(shotId, {
          cloudSyncStatus: 'failed',
          cloudSyncRetries: (shot.cloudSyncRetries || 0) + 1,
          lastSyncAttempt: new Date()
        });
      }
    }

    if (migratedCount > 0) {
      console.log(`Successfully migrated ${migratedCount} image(s) to cloud storage`);
    }
    
    if (failedCount > 0) {
      console.warn(`Failed to migrate ${failedCount} image(s):`, failedImages);
    }
  }

  /**
   * Migrate project logo to cloud storage
   */
  private static async migrateProjectLogo(projectId: string, logoFile: File): Promise<void> {
    const { StorageService } = await import('./storageService');
    const { useProjectStore } = await import('@/store/projectStore');
    
    try {
      console.log('Migrating project logo to cloud storage...');
      
      // Upload to Supabase Storage
      const imageUrl = await StorageService.uploadProjectLogo(projectId, logoFile);
      
      // Update project store with new URL and remove file
      const projectStore = useProjectStore.getState();
      projectStore.setProjectLogo(null); // Clear the file
      
      // Update the URL directly in the store
      useProjectStore.setState(state => ({
        ...state,
        projectLogoUrl: imageUrl,
        projectLogoFile: null
      }));
      
      console.log('Successfully migrated project logo to cloud storage');
    } catch (error) {
      console.error('Failed to migrate project logo:', error);
      throw error;
    }
  }

  /**
   * Manually trigger migration of base64 images to cloud storage
   */
  static async triggerImageMigration(projectId?: string): Promise<void> {
    const id = projectId || this.currentProjectId;
    if (!id) {
      console.warn('CloudSyncService.triggerImageMigration: No project ID provided');
      return;
    }

    const shotStore = useShotStore.getState();
    const base64Images = Object.entries(shotStore.shots).filter(([_, shot]) => 
      shot.imageData && !shot.imageUrl
    );

    if (base64Images.length === 0) {
      console.log('No base64 images to migrate');
      return;
    }

    console.log(`Manually triggering migration of ${base64Images.length} base64 images`);
    await this.migrateBase64Images(id, base64Images);
  }

  /**
   * Manually trigger migration of project logo to cloud storage
   */
  static async triggerProjectLogoMigration(projectId?: string): Promise<void> {
    const id = projectId || this.currentProjectId;
    if (!id) {
      console.warn('CloudSyncService.triggerProjectLogoMigration: No project ID provided');
      return;
    }

    const projectStore = useProjectStore.getState();
    
    if (!projectStore.projectLogoFile || projectStore.projectLogoUrl?.includes('supabase')) {
      console.log('No project logo file to migrate');
      return;
    }

    console.log('Manually triggering migration of project logo');
    await this.migrateProjectLogo(id, projectStore.projectLogoFile);
  }

  static async migrateProject(projectId: string): Promise<void> {
    // Get current project data
    const pageStore = usePageStore.getState()
    const shotStore = useShotStore.getState()
    const projectStore = useProjectStore.getState()
    const uiStore = useUIStore.getState()
    
    const data: ProjectData = {
      pages: pageStore.pages,
      shots: shotStore.shots,
      projectSettings: {
        projectName: projectStore.projectName,
        projectInfo: projectStore.projectInfo,
        projectLogoUrl: projectStore.projectLogoUrl,
        clientAgency: projectStore.clientAgency,
        jobInfo: projectStore.jobInfo,
        templateSettings: projectStore.templateSettings
      },
      uiSettings: {
        isDragging: uiStore.isDragging,
        isExporting: uiStore.isExporting,
        showDeleteConfirmation: uiStore.showDeleteConfirmation
      }
    }
    
    // Upload to cloud
    await ProjectService.saveProject(projectId, data)
    
    // Migrate Base64 images to Supabase Storage
    const base64Images = Object.entries(shotStore.shots).filter(([_, shot]) => 
      shot.imageData && !shot.imageUrl
    );
    
    if (base64Images.length > 0) {
      await this.migrateBase64Images(projectId, base64Images);
    }

    // Migrate project logo to Supabase Storage (only if we have a valid file)
    if (projectStore.projectLogoFile && 
        projectStore.projectLogoFile instanceof File && 
        !projectStore.projectLogoUrl?.includes('supabase')) {
      try {
        await this.migrateProjectLogo(projectId, projectStore.projectLogoFile);
      } catch (error) {
        console.error('Project logo migration failed:', error);
        // Don't let logo migration break the entire migration
      }
    }
    
    // Save updated data
    await this.saveProject(projectId)
  }
  
  static queueChange(projectId: string, data: ProjectData): void {
    this.offlineQueue.push({
      projectId,
      data,
      timestamp: Date.now()
    })
  }
  
  static async replayQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return
    
    const queue = [...this.offlineQueue]
    this.offlineQueue = []
    
    for (const item of queue) {
      try {
        await ProjectService.saveProject(item.projectId, item.data)
      } catch (error) {
        console.error('Failed to replay queued change:', error)
        // Re-queue failed items
        this.offlineQueue.push(item)
      }
    }
  }
  
  static hasQueuedChanges(): boolean {
    return this.offlineQueue.length > 0
  }
  
  static async saveToLocalStorage(projectId: string, data: ProjectData): Promise<void> {
    console.log('Saving to localStorage:', projectId)
    
    try {
      // Save project data to localStorage using the same keys as the app
      const { LocalStorageManager } = await import('@/utils/localStorageManager');
      
      // Save pages data in the format expected by the store (wrapped in state object)
      if (data.pages) {
        const pageStoreData = {
          state: {
            pages: data.pages,
            activePageId: data.pages.length > 0 ? data.pages[0].id : null
          }
        };
        LocalStorageManager.setItem(`page-storage-project-${projectId}`, JSON.stringify(pageStoreData));
      }
      
      // Save shots data in the format expected by the store (wrapped in state object)
      if (data.shots) {
        const shotStoreData = {
          state: {
            shots: data.shots,
            shotOrder: Array.isArray(data.shotOrder)
              ? data.shotOrder
              : this.deriveShotOrderFromPages(data.pages)
          }
        };
        LocalStorageManager.setItem(`shot-storage-project-${projectId}`, JSON.stringify(shotStoreData));
      }
      
      // Save project settings (wrapped in state object)
      if (data.projectSettings) {
        // Ensure project has a name - use project ID as fallback if empty
        const projectSettings = {
          ...data.projectSettings,
          projectName: data.projectSettings.projectName || `Project ${projectId.slice(0, 8)}`
        };
        
        const projectStoreData = {
          state: projectSettings
        };
        LocalStorageManager.setItem(`project-storage-project-${projectId}`, JSON.stringify(projectStoreData));
      }
      
      // Save UI settings (wrapped in state object)
      if (data.uiSettings) {
        const uiStoreData = {
          state: data.uiSettings
        };
        LocalStorageManager.setItem(`ui-store-project-${projectId}`, JSON.stringify(uiStoreData));
      }
      
      console.log('Project data saved to localStorage successfully');
    } catch (error) {
      console.error('Failed to save project data to localStorage:', error);
      throw error;
    }
  }
  
  /**
   * Create a cloud project with a specific ID (for guest project migration)
   */
  static async createCloudProject(
    projectId: string,
    name: string,
    description?: string
  ): Promise<void> {
    const { supabase } = await import('@/lib/supabase');
    const user = await supabase.auth.getUser();
    
    if (!user.data.user) {
      throw new Error('Not authenticated');
    }

    // Create project with specific ID
    const { error: projectError } = await supabase
      .from('projects')
      .insert({
        id: projectId,
        user_id: user.data.user.id,
        name,
        description: description || null
      });
    
    if (projectError) {
      throw projectError;
    }

    // Create empty project data entry
    const { error: dataError } = await supabase
      .from('project_data')
      .insert({
        project_id: projectId,
        pages: [],
        shots: {},
        project_settings: {},
        ui_settings: {}
      });
    
    if (dataError) {
      throw dataError;
    }

    console.log(`Cloud project created with ID: ${projectId}`);
  }

  private static isCloudEnabled(): boolean {
    return import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true'
  }
  
  private static isAuthenticated(): boolean {
    try {
      return useAuthStore.getState().isAuthenticated;
    } catch (error) {
      console.warn('Could not check auth status:', error);
      return false;
    }
  }
}

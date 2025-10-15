import { ProjectService, ProjectData } from './projectService'
import { StorageService } from './storageService'
import { usePageStore } from '@/store/pageStore'
import { useShotStore } from '@/store/shotStore'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'

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
      
      const data: ProjectData = {
        pages: pageStore.pages,
        shots: Object.fromEntries(
          Object.entries(shotStore.shots).map(([id, shot]) => [
            id,
            {
              ...shot,
              imageFile: null // Don't serialize File objects
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
      
      console.log('CloudSyncService.saveProject: Data to save:', {
        projectId: id,
        pagesCount: data.pages.length,
        shotsCount: Object.keys(data.shots).length,
        projectName: data.projectSettings.projectName,
        isManual
      });
      
      // VALIDATION: Check if project name matches metadata
      const { useProjectManagerStore } = await import('@/store/projectManagerStore');
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
    const failedImages: string[] = []
    for (const [shotId, shot] of Object.entries(shotStore.shots)) {
      if (shot.imageData && !shot.imageUrl) {
        try {
          // Convert Base64 to File
          const response = await fetch(shot.imageData)
          const blob = await response.blob()
          const file = new File([blob], `shot-${shotId}.png`, { type: 'image/png' })
          
          // Upload to Supabase Storage
          const imageUrl = await this.uploadShotImage(projectId, shotId, file)
          
          // Update shot with new URL
          useShotStore.setState(state => ({
            shots: {
              ...state.shots,
              [shotId]: {
                ...shot,
                imageUrl,
                imageData: undefined // Remove Base64
              }
            }
          }))
        } catch (error) {
          console.error(`Failed to migrate image for shot ${shotId}:`, error)
          failedImages.push(shotId)
        }
      }
    }
    
    // Save updated data
    await this.saveProject(projectId)
    
    if (failedImages.length > 0) {
      console.warn(`Failed to migrate ${failedImages.length} images:`, failedImages)
    }
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
        const projectStoreData = {
          state: data.projectSettings
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

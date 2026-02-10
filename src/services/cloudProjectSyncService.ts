import { ProjectService, type ProjectData } from './projectService';
import { CloudSyncService } from './cloudSyncService';
import { CloudAccessService } from './cloudAccessService';
import { useProjectManagerStore } from '@/store/projectManagerStore';
import { createDefaultPage } from '@/store/pageStore';
import { toast } from 'sonner';

export class CloudProjectSyncService {
  private static isSyncing = false;
  private static isLoadingProject = false;
  private static readonly DEFAULT_SHOT_NUMBER_FORMAT = '01';
  private static readonly DEFAULT_TEMPLATE_SETTINGS = {
    showLogo: true,
    showProjectName: true,
    showProjectInfo: true,
    showClientAgency: true,
    showJobInfo: true,
    showActionText: true,
    showScriptText: true,
    showPageNumber: true,
    shotNumberFormat: CloudProjectSyncService.DEFAULT_SHOT_NUMBER_FORMAT,
  };

  /**
   * Sync project list from cloud after login
   * Fetches metadata only (name, ID, shot count, last modified)
   */
  static async syncProjectList(): Promise<void> {
    if (this.isSyncing) {
      console.log('Project list sync already in progress');
      return;
    }

    const access = await CloudAccessService.getAccessState();
    if (!access.canReadCloud) {
      console.log('Cloud access unavailable, skipping project list sync');
      return;
    }

    this.isSyncing = true;

    try {
      console.log('Syncing project list from cloud...');
      
      // Fetch cloud projects metadata
      const cloudProjects = await ProjectService.getProjects();
      
      console.log(`Found ${cloudProjects.length} cloud projects`);
      
      // Add cloud projects to local project manager
      const projectManager = useProjectManagerStore.getState();
      
      for (const cloudProject of cloudProjects) {
        projectManager.addCloudProject({
          id: cloudProject.id,
          name: cloudProject.name,
          shotCount: cloudProject.shot_count || 0,
          lastModified: cloudProject.data_updated_at || cloudProject.last_accessed_at || cloudProject.created_at
        });
        let dataUpdatedAt = cloudProject.data_updated_at || null;
        if (!dataUpdatedAt) {
          try {
            dataUpdatedAt = await ProjectService.getProjectUpdatedAt(cloudProject.id);
          } catch (error) {
            console.warn('Failed to fetch project_data.updated_at for project:', error);
          }
        }
        if (import.meta.env.DEV) {
          console.log('@@@ LIST ITEM', {
            projectId: cloudProject.id,
            baseCloudUpdatedAt: dataUpdatedAt,
            source: dataUpdatedAt ? 'project_data.updated_at' : 'missing'
          });
        }
        if (import.meta.env.DEV) {
          console.log('@@@ BASE SET', {
            projectId: cloudProject.id,
            value: dataUpdatedAt,
            source: 'cloudProjectSync.syncProjectList'
          });
        }
        projectManager.setProjectCloudUpdatedAt(cloudProject.id, dataUpdatedAt || null);
        CloudSyncService.markProjectAsCloudBacked(cloudProject.id);
      }
      
      console.log('Project list sync completed');
    } catch (error) {
      console.error('Failed to sync project list:', error);
      // Don't throw - failing to sync shouldn't break the app
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Load full project data from cloud when user selects it
   */
  static async loadFullProject(
    projectId: string,
    options?: { force?: boolean }
  ): Promise<void> {
    if (this.isLoadingProject) {
      console.log('Project load already in progress');
      return;
    }
    const forceRefresh = options?.force ?? false;
    const access = await CloudAccessService.getAccessState();
    if (!access.canReadCloud) {
      throw new Error('Not authenticated');
    }

    // Check if offline queue is being processed (prevent conflicts)
    try {
      const { BackgroundSyncService } = await import('@/services/backgroundSyncService');
      if (BackgroundSyncService.isProcessingOfflineQueue()) {
        console.log('⏳ Offline queue is being processed, delaying cloud project load...');
        // Wait for offline queue processing to complete
        await new Promise(resolve => setTimeout(resolve, 6000)); // 6 seconds to be safe
        console.log('✅ Offline queue processing complete, proceeding with cloud project load');
      }
    } catch (error) {
      console.warn('Could not check offline queue status:', error);
    }

    // Check if project is already local (prevents redundant cloud downloads)
    const projectManager = useProjectManagerStore.getState();
    const project = projectManager.projects[projectId];
    
    if (project?.isLocal && !project?.isCloudOnly && !forceRefresh) {
      console.log(`Project ${projectId} is already local, skipping cloud load`);
      return;
    }

    // Check if online
    if (!navigator.onLine) {
      toast.error('Cannot load cloud project while offline');
      throw new Error('Offline');
    }

    this.isLoadingProject = true;

    try {
      console.log(`Loading full project data for ${projectId}...`);
      
      // Download full project data from cloud
      const projectData = await ProjectService.getProject(projectId);
      
      console.log('Project data downloaded, validating...', {
        projectId,
        pagesCount: projectData.pages?.length || 0,
        shotsCount: Object.keys(projectData.shots || {}).length,
        projectName: projectData.projectSettings?.projectName || `Project ${projectId.slice(0, 8)}`
      });
      
      // Validate that we got the right project data
      if (!projectData || (!projectData.pages && !projectData.shots)) {
        throw new Error(`Invalid project data received for ${projectId}`);
      }
      
      const normalizedProjectData = this.ensureMinimumProjectShape(projectId, projectData);
      
      console.log('Project data validated, pre-loading images...');
      
      // Pre-load all images from all pages
      await this.preloadAllImages(projectId, normalizedProjectData.shots);
      
      // Pre-load project logo if it exists
      await this.preloadProjectLogo(projectId, normalizedProjectData.projectSettings);
      
      console.log('Project data validated, saving locally...');
      
      // Save to local storage ONLY (don't touch stores yet!)
      // The stores will be updated by switchToProject() after currentProjectId is set
      await CloudSyncService.saveToLocalStorage(projectId, normalizedProjectData);
      
      // Mark project as local (so it's no longer "cloud only")
      const projectManager = useProjectManagerStore.getState();
      
      // Ensure project exists in project manager before marking as local
      if (!projectManager.projects[projectId]) {
        console.log(`Project ${projectId} not found in project manager, adding it...`);
        projectManager.addCloudProject({
          id: projectId,
          name: normalizedProjectData.projectSettings?.projectName || `Project ${projectId.slice(0, 8)}`,
          shotCount: Object.keys(normalizedProjectData.shots || {}).length,
          lastModified: new Date().toISOString()
        });
      }
      
      projectManager.markProjectAsLocal(projectId);
      let resolvedUpdatedAt = normalizedProjectData.updatedAt || null;
      if (!resolvedUpdatedAt) {
        try {
          resolvedUpdatedAt = await ProjectService.getProjectUpdatedAt(projectId);
        } catch (error) {
          console.warn('Failed to fetch project_data.updated_at after load:', error);
        }
      }
      normalizedProjectData.updatedAt = resolvedUpdatedAt;
      if (import.meta.env.DEV) {
        console.log('@@@ BASE SET', {
          projectId,
          value: resolvedUpdatedAt,
          source: 'cloudProjectSync.loadFullProject'
        });
      }
      projectManager.setProjectCloudUpdatedAt(projectId, resolvedUpdatedAt || null);
      
      console.log('Full project saved to localStorage (ready for switchToProject to load)');
    } catch (error) {
      console.error('Failed to load full project:', error);
      throw error;
    } finally {
      this.isLoadingProject = false;
    }
  }

  static async refreshProjectIfStale(projectId: string): Promise<void> {
    const access = await CloudAccessService.getAccessState();
    if (!access.canReadCloud) return;
    if (!navigator.onLine) return;

    const projectManager = useProjectManagerStore.getState();
    const project = projectManager.projects[projectId];
    const localRevision = project?.baseCloudUpdatedAt ?? null;

    let serverUpdatedAt: string | null = null;
    try {
      serverUpdatedAt = await ProjectService.getProjectUpdatedAt(projectId);
    } catch (error) {
      console.warn('Failed to fetch server revision for project:', error);
      return;
    }

    const toMs = (value: string | null) => (value ? new Date(value).getTime() : null);
    const isSameMs = (a: string | null, b: string | null) => {
      const aMs = toMs(a);
      const bMs = toMs(b);
      return aMs !== null && bMs !== null && aMs === bMs;
    };

    const decision =
      serverUpdatedAt && localRevision && isSameMs(serverUpdatedAt, localRevision)
        ? 'use_local'
        : 'refresh_from_cloud';

    console.log('@@@ OPEN REV CHECK', {
      projectId,
      localRevision,
      serverUpdatedAt,
      decision
    });

    if (serverUpdatedAt) {
      if (import.meta.env.DEV) {
        console.log('@@@ BASE SET', {
          projectId,
          value: serverUpdatedAt,
          source: 'cloudProjectSync.refreshProjectIfStale'
        });
      }
      projectManager.setProjectCloudUpdatedAt(projectId, serverUpdatedAt);
    }

    if (decision === 'refresh_from_cloud') {
      await this.loadFullProject(projectId, { force: true });
    }
  }

  private static ensureMinimumProjectShape(projectId: string, projectData: ProjectData): ProjectData {
    let didNormalize = false;

    const pages = Array.isArray(projectData.pages) ? projectData.pages : [];
    const hasPages = pages.length > 0;
    const normalizedPages = hasPages ? pages : [createDefaultPage('Page 1')];
    if (!hasPages) {
      didNormalize = true;
    }

    const shotOrder = Array.isArray(projectData.shotOrder) ? projectData.shotOrder : [];
    if (!Array.isArray(projectData.shotOrder)) {
      didNormalize = true;
    }

    const existingSettings = projectData.projectSettings ?? ({} as ProjectData['projectSettings']);
    const existingTemplateSettings = existingSettings.templateSettings ?? {};
    const normalizedShotFormat =
      typeof existingTemplateSettings.shotNumberFormat === 'string' &&
      existingTemplateSettings.shotNumberFormat.trim() !== ''
        ? existingTemplateSettings.shotNumberFormat
        : CloudProjectSyncService.DEFAULT_SHOT_NUMBER_FORMAT;

    if (normalizedShotFormat !== existingTemplateSettings.shotNumberFormat) {
      didNormalize = true;
    }

    const normalizedProjectName =
      typeof existingSettings.projectName === 'string' &&
      existingSettings.projectName.trim() !== ''
        ? existingSettings.projectName
        : `Project ${projectId.slice(0, 8)}`;

    if (normalizedProjectName !== existingSettings.projectName) {
      didNormalize = true;
    }

    if (didNormalize && import.meta.env.DEV) {
      console.warn('[CloudProjectSyncService] Normalized project shape', { projectId });
    }

    if (!didNormalize) {
      return projectData;
    }

    return {
      ...projectData,
      pages: normalizedPages,
      shotOrder,
      projectSettings: {
        projectName: normalizedProjectName,
        projectInfo: existingSettings.projectInfo ?? '',
        projectLogoUrl: existingSettings.projectLogoUrl ?? null,
        clientAgency: existingSettings.clientAgency ?? '',
        jobInfo: existingSettings.jobInfo ?? '',
        templateSettings: {
          ...CloudProjectSyncService.DEFAULT_TEMPLATE_SETTINGS,
          ...existingTemplateSettings,
          shotNumberFormat: normalizedShotFormat,
        },
        storyboardTheme: existingSettings.storyboardTheme,
      },
    };
  }

  /**
   * Check if currently syncing
   */
  static isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Check if currently loading a project
   */
  static isProjectLoadInProgress(): boolean {
    return this.isLoadingProject;
  }

  /**
   * Pre-load all images from all shots in the project
   */
  private static async preloadAllImages(projectId: string, shots: Record<string, any>): Promise<void> {
    if (!shots || Object.keys(shots).length === 0) {
      console.log('No shots to pre-load images for');
      return;
    }

    console.log(`Pre-loading images for ${Object.keys(shots).length} shots...`);
    
    const { StorageService } = await import('./storageService');
    let loadedCount = 0;
    let failedCount = 0;

    // Process all shots in parallel for better performance
    const imagePromises = Object.entries(shots).map(async ([shotId, shot]) => {
      try {
        // Only pre-load if shot has an imageUrl (cloud image)
        if (shot.imageUrl) {
          console.log(`Pre-loading image for shot ${shotId}...`);
          
          // Download image from cloud storage
          const imageBlob = await StorageService.downloadImage(shot.imageUrl);
          
          // Convert blob to base64 for local storage
          const base64Data = await this.blobToBase64(imageBlob);
          
          // Update shot with pre-loaded image data
          shot.imageData = base64Data;
          shot.imageUrl = shot.imageUrl; // Keep original URL for reference
          
          console.log(`Successfully pre-loaded image for shot ${shotId}`);
          loadedCount++;
        }
      } catch (error) {
        console.error(`Failed to pre-load image for shot ${shotId}:`, error);
        failedCount++;
      }
    });

    // Wait for all images to load
    await Promise.all(imagePromises);

    if (loadedCount > 0) {
      console.log(`Successfully pre-loaded ${loadedCount} images`);
    }
    
    if (failedCount > 0) {
      console.warn(`Failed to pre-load ${failedCount} images`);
    }
  }

  /**
   * Pre-load project logo if it exists
   */
  private static async preloadProjectLogo(projectId: string, projectSettings: any): Promise<void> {
    if (!projectSettings?.projectLogoUrl || !projectSettings.projectLogoUrl.includes('supabase')) {
      console.log('No project logo to pre-load');
      return;
    }

    try {
      console.log('Pre-loading project logo...');
      const { StorageService } = await import('./storageService');
      const imageBlob = await StorageService.downloadImage(projectSettings.projectLogoUrl);
      const base64Data = await this.blobToBase64(imageBlob);
      
      // Update the project settings with the base64 data
      projectSettings.projectLogoUrl = base64Data;
      console.log('Successfully pre-loaded project logo');
    } catch (error) {
      console.error('Failed to pre-load project logo:', error);
      // Don't fail the entire project load if logo fails
    }
  }

  /**
   * Convert blob to base64 string
   */
  private static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}




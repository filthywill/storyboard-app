import { ProjectService } from './projectService';
import { CloudSyncService } from './cloudSyncService';
import { useProjectManagerStore } from '@/store/projectManagerStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export class CloudProjectSyncService {
  private static isSyncing = false;
  private static isLoadingProject = false;

  /**
   * Sync project list from cloud after login
   * Fetches metadata only (name, ID, shot count, last modified)
   */
  static async syncProjectList(): Promise<void> {
    if (this.isSyncing) {
      console.log('Project list sync already in progress');
      return;
    }

    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping project list sync');
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
      
      cloudProjects.forEach(cloudProject => {
        projectManager.addCloudProject({
          id: cloudProject.id,
          name: cloudProject.name,
          shotCount: cloudProject.shot_count || 0,
          lastModified: cloudProject.last_accessed_at || cloudProject.created_at
        });
      });
      
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
  static async loadFullProject(projectId: string): Promise<void> {
    if (this.isLoadingProject) {
      console.log('Project load already in progress');
      return;
    }

    // Check if project is already local (prevents redundant cloud downloads)
    const projectManager = useProjectManagerStore.getState();
    const project = projectManager.projects[projectId];
    
    if (project?.isLocal && !project?.isCloudOnly) {
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
        projectName: projectData.projectSettings?.projectName || 'Unknown'
      });
      
      // Validate that we got the right project data
      if (!projectData || (!projectData.pages && !projectData.shots)) {
        throw new Error(`Invalid project data received for ${projectId}`);
      }
      
      console.log('Project data validated, pre-loading images...');
      
      // Pre-load all images from all pages
      await this.preloadAllImages(projectId, projectData.shots);
      
      // Pre-load project logo if it exists
      await this.preloadProjectLogo(projectId, projectData.projectSettings);
      
      console.log('Project data validated, saving locally...');
      
      // Save to local storage ONLY (don't touch stores yet!)
      // The stores will be updated by switchToProject() after currentProjectId is set
      await CloudSyncService.saveToLocalStorage(projectId, projectData);
      
      // Mark project as local (so it's no longer "cloud only")
      const projectManager = useProjectManagerStore.getState();
      projectManager.markProjectAsLocal(projectId);
      
      console.log('Full project saved to localStorage (ready for switchToProject to load)');
    } catch (error) {
      console.error('Failed to load full project:', error);
      throw error;
    } finally {
      this.isLoadingProject = false;
    }
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




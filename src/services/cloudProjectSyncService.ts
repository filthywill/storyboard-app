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
}




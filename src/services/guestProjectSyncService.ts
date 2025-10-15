import { useProjectManagerStore } from '@/store/projectManagerStore';
import { useAuthStore } from '@/store/authStore';
import { ProjectService } from './projectService';
import { CloudSyncService } from './cloudSyncService';
import { toast } from 'sonner';
import { LocalStorageManager } from '@/utils/localStorageManager';

export class GuestProjectSyncService {
  private static isSyncing = false;

  /**
   * Sync local guest projects to cloud after sign-in
   * Includes timestamp-based safety check to prevent data loss
   */
  static async syncGuestProjectsToCloud(): Promise<void> {
    if (this.isSyncing) {
      console.log('Guest project sync already in progress');
      return;
    }

    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping guest project sync');
      return;
    }

    this.isSyncing = true;

    try {
      const projectManager = useProjectManagerStore.getState();
      const localProjects = projectManager.getAllProjects().filter(p => p.isLocal);

      if (localProjects.length === 0) {
        console.log('No local projects to sync');
        return;
      }

      console.log(`Syncing ${localProjects.length} local project(s) to cloud...`);
      console.log('Local projects to sync:', localProjects.map(p => ({ id: p.id, name: p.name, shotCount: p.shotCount })));
      toast.info(`Syncing your project${localProjects.length > 1 ? 's' : ''} to cloud...`);

      // Get existing cloud projects to check for conflicts
      const cloudProjects = await ProjectService.getProjects();
      const cloudProjectMap = new Map(cloudProjects.map(p => [p.id, p]));

      let syncedCount = 0;
      let skippedCount = 0;

      for (const localProject of localProjects) {
        try {
          const cloudProject = cloudProjectMap.get(localProject.id);

          // Safety check: Compare timestamps if project exists in cloud
          if (cloudProject) {
            const cloudLastModified = new Date(cloudProject.last_accessed_at || cloudProject.created_at);
            const localLastModified = localProject.lastModified;

            if (cloudLastModified > localLastModified) {
              console.warn(`Skipping sync for ${localProject.name}: Cloud version is newer`);
              skippedCount++;
              continue;
            }
          }

          // Safe to sync - either new project or local is newer
          const projectData = LocalStorageManager.getProjectData(localProject.id);
          
          if (!projectData) {
            console.warn(`No data found for local project ${localProject.id}`);
            continue;
          }

          console.log(`Syncing project ${localProject.id} (${localProject.name}):`, {
            pages: projectData.pages?.length || 0,
            shots: Object.keys(projectData.shots || {}).length,
            existsInCloud: !!cloudProject
          });

          // Create or update cloud project
          if (cloudProject) {
            await ProjectService.saveProject(localProject.id, projectData);
            console.log(`Updated cloud project: ${localProject.name}`);
            
            // Migrate images if they exist
            await this.migrateImagesToCloud(localProject.id, projectData.shots);
          } else {
            // Create new cloud project with existing ID
            await CloudSyncService.createCloudProject(
              localProject.id,
              localProject.name,
              localProject.description
            );
            await ProjectService.saveProject(localProject.id, projectData);
            console.log(`Created cloud project: ${localProject.name}`);
            
            // Migrate images to cloud storage
            await this.migrateImagesToCloud(localProject.id, projectData.shots);
            
            // Save again after image migration to update with imageUrls
            if (Object.values(projectData.shots).some((s: any) => s.imageData)) {
              const { useShotStore } = await import('@/store/shotStore');
              const { usePageStore } = await import('@/store/pageStore');
              const { useProjectStore } = await import('@/store/projectStore');
              const { useUIStore } = await import('@/store/uiStore');
              
              const updatedProjectData = {
                pages: usePageStore.getState().pages,
                shots: useShotStore.getState().shots,
                projectSettings: {
                  projectName: useProjectStore.getState().projectName,
                  projectInfo: useProjectStore.getState().projectInfo,
                  projectLogoUrl: useProjectStore.getState().projectLogoUrl,
                  clientAgency: useProjectStore.getState().clientAgency,
                  jobInfo: useProjectStore.getState().jobInfo,
                  templateSettings: useProjectStore.getState().templateSettings
                },
                uiSettings: {
                  isDragging: useUIStore.getState().isDragging,
                  isExporting: useUIStore.getState().isExporting,
                  showDeleteConfirmation: useUIStore.getState().showDeleteConfirmation
                }
              };
              
              await ProjectService.saveProject(localProject.id, updatedProjectData);
              console.log('Project updated with migrated image URLs');
            }
          }

          syncedCount++;
        } catch (error) {
          console.error(`Failed to sync project ${localProject.name}:`, error);
        }
      }

      if (syncedCount > 0) {
        toast.success(`Synced ${syncedCount} project${syncedCount > 1 ? 's' : ''} to cloud`);
      }
      
      if (skippedCount > 0) {
        toast.info(`${skippedCount} project${skippedCount > 1 ? 's were' : ' was'} skipped (cloud version newer)`);
      }

      console.log(`Guest project sync completed: ${syncedCount} synced, ${skippedCount} skipped`);
    } catch (error) {
      console.error('Failed to sync guest projects:', error);
      toast.error('Some projects could not be synced to cloud');
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Migrate base64 images to Supabase Storage
   */
  private static async migrateImagesToCloud(projectId: string, shots: Record<string, any>): Promise<void> {
    if (!shots || Object.keys(shots).length === 0) {
      return;
    }

    const { StorageService } = await import('./storageService');
    const { useShotStore } = await import('@/store/shotStore');
    
    let migratedCount = 0;
    let failedCount = 0;

    for (const [shotId, shot] of Object.entries(shots)) {
      try {
        // Only migrate if shot has base64 imageData but no imageUrl
        if (shot.imageData && !shot.imageUrl) {
          console.log(`Migrating image for shot ${shotId}...`);
          
          // Convert base64 to File
          const response = await fetch(shot.imageData);
          const blob = await response.blob();
          const file = new File([blob], `shot-${shotId}.png`, { type: 'image/png' });
          
          // Upload to Supabase Storage
          const imageUrl = await StorageService.uploadImage(projectId, shotId, file);
          
          // Update shot in local store
          const shotStore = useShotStore.getState();
          shotStore.updateShot(shotId, {
            imageUrl,
            imageData: undefined // Remove base64 to save space
          });
          
          console.log(`Successfully migrated image for shot ${shotId}`);
          migratedCount++;
        }
      } catch (error) {
        console.error(`Failed to migrate image for shot ${shotId}:`, error);
        failedCount++;
      }
    }

    if (migratedCount > 0) {
      console.log(`Migrated ${migratedCount} image(s) to cloud storage`);
      toast.success(`Uploaded ${migratedCount} image${migratedCount > 1 ? 's' : ''} to cloud`);
    }
    
    if (failedCount > 0) {
      console.warn(`Failed to migrate ${failedCount} image(s)`);
      toast.warning(`${failedCount} image${failedCount > 1 ? 's' : ''} could not be uploaded`);
    }
  }
}


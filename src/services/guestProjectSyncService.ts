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
      // CRITICAL FIX: Only sync projects that are BOTH isLocal AND have actual data
      const localProjects = projectManager.getAllProjects().filter(p => {
        // Must be marked as local
        if (!p.isLocal) return false;
        
        // Must NOT be cloud-only
        if (p.isCloudOnly) return false;
        
        // Must have actual shot data (not empty projects)
        if (p.shotCount === 0) {
          console.log(`Skipping empty local project: ${p.name} (${p.id})`);
          return false;
        }
        
        return true;
      });

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

      const CLOCK_SKEW_TOLERANCE_MS = 5000; // 5 seconds

      for (let i = 0; i < localProjects.length; i++) {
        const localProject = localProjects[i];
        try {
          const cloudProject = cloudProjectMap.get(localProject.id);

          // Step 1: Timestamp comparison (PRIMARY DECISION)
          if (cloudProject) {
            const cloudTimestamp = new Date(cloudProject.data_updated_at || cloudProject.updated_at);
            const localTimestamp = new Date(localProject.lastModified);
            
            const timeDiff = localTimestamp.getTime() - cloudTimestamp.getTime();
            
            console.log(`Timestamp comparison for ${localProject.name}:`, {
              local: localTimestamp.toISOString(),
              cloud: cloudTimestamp.toISOString(),
              diff: `${timeDiff}ms`,
              localIsNewer: timeDiff > CLOCK_SKEW_TOLERANCE_MS
            });

            // Cloud is definitively newer - skip sync
            if (timeDiff < -CLOCK_SKEW_TOLERANCE_MS) {
              console.log(`✅ Cloud is newer for ${localProject.name}, skipping sync`);
              skippedCount++;
              continue;
            }
          }

          // Step 2: Fetch local data for validation
          const projectData = LocalStorageManager.getProjectData(localProject.id);
          
          if (!projectData) {
            console.error(`❌ CRITICAL: No localStorage data found for project ${localProject.id} (${localProject.name})`);
            skippedCount++;
            continue;
          }

          const actualShotCount = Object.keys(projectData.shots || {}).length;
          const actualPageCount = projectData.pages?.length || 0;
          const expectedShotCount = localProject.shotCount;
          
          console.log(`Data validation for ${localProject.name}:`, {
            expectedShots: expectedShotCount,
            actualShots: actualShotCount,
            pages: actualPageCount
          });

          // Step 3: Corruption detection (SAFETY NET)
          
          // Check 1: Completely empty when expecting data
          if (expectedShotCount > 0 && actualShotCount === 0) {
            console.error(`❌ LOCAL DATA CORRUPTED: ${localProject.name} expects ${expectedShotCount} shots but has 0`);
            
            if (cloudProject && cloudProject.shot_count > 0) {
              console.warn(`Cloud has ${cloudProject.shot_count} shots. Preserving cloud data.`);
              // Use a unique toast ID to prevent conflicts
              toast.warning(`Local data for "${localProject.name}" is corrupted. Cloud data preserved (${cloudProject.shot_count} shots).`, {
                duration: 10000,
                id: `corruption-${localProject.id}` // Unique ID for each project
              });
            }
            skippedCount++;
            continue;
          }

          // Check 2: Significant data loss (>50% reduction)
          if (cloudProject && expectedShotCount > 0 && actualShotCount < expectedShotCount * 0.5) {
            const cloudShotCount = cloudProject.shot_count || 0;
            
            // If cloud also has more shots, this looks like corruption
            if (cloudShotCount > actualShotCount) {
              console.warn(`⚠️ AMBIGUOUS CONFLICT: ${localProject.name} local=${actualShotCount} shots vs cloud=${cloudShotCount} shots`);
              
              // TODO: Show user choice modal (Phase 2)
              // For now, preserve cloud data
              toast.warning(`Conflict detected for "${localProject.name}": Local has ${actualShotCount} shots, cloud has ${cloudShotCount}. Preserving cloud data for safety.`, {
                duration: 15000,
                id: `conflict-${localProject.id}` // Unique ID for each project
              });
              skippedCount++;
              continue;
            }
          }

          // Check 3: Cloud has more shots than local
          if (cloudProject) {
            const cloudShotCount = cloudProject.shot_count || 0;
            
            if (cloudShotCount > actualShotCount && cloudShotCount > 0) {
              console.warn(`⚠️ CLOUD HAS MORE DATA: ${localProject.name} local=${actualShotCount} shots vs cloud=${cloudShotCount} shots`);
              
              // Check timestamp again - if local is clearly newer, user likely deleted shots intentionally
              const localTimestamp = new Date(localProject.lastModified);
              const cloudTimestamp = new Date(cloudProject.data_updated_at || cloudProject.updated_at);
              const timeDiff = localTimestamp.getTime() - cloudTimestamp.getTime();
              
              if (timeDiff > CLOCK_SKEW_TOLERANCE_MS) {
                console.log(`Local is newer by ${timeDiff}ms - treating as intentional deletion`);
                // Fall through to sync
              } else {
          // Ambiguous - preserve cloud
          toast.warning(`Cloud has more data for "${localProject.name}" (${cloudShotCount} vs ${actualShotCount} shots). Preserving cloud data.`, {
            duration: 15000,
            id: `cloud-more-${localProject.id}` // Unique ID for each project
          });
                skippedCount++;
                continue;
              }
            }
          }

          // Step 4: All checks passed - proceed with sync
          console.log(`✅ All validation passed for ${localProject.name}. Syncing to cloud.`);

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
        
        // Small delay between projects to prevent toast conflicts
        if (i < localProjects.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (syncedCount > 0) {
        toast.success(`✅ Synced ${syncedCount} project${syncedCount > 1 ? 's' : ''} to cloud`);
      }
      
      if (skippedCount > 0) {
        console.log(`${skippedCount} project${skippedCount > 1 ? 's were' : ' was'} skipped during sync`);
        // Note: Individual skip reasons are already toasted above with specific messages
        toast.warning(`${skippedCount} project${skippedCount > 1 ? 's' : ''} skipped due to data corruption or conflicts. Check console for details.`, {
          duration: 8000,
          id: 'sync-summary'
        });
      }

      console.log(`✅ Guest project sync completed:`, {
        synced: syncedCount,
        skipped: skippedCount,
        reasons: skippedCount > 0 ? 'Check logs above for specific skip reasons' : 'none'
      });
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


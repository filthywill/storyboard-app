import { CloudSyncService } from './cloudSyncService';
import { toast } from 'sonner';

export interface SyncQueueItem {
  id: string;
  type: 'image' | 'batch';
  projectId: string;
  shotId?: string;
  file?: File;
  files?: File[];
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: string;
  lastAttempt?: number;
}

export interface SyncStatus {
  totalPending: number;
  totalSyncing: number;
  totalSynced: number;
  totalFailed: number;
  isOnline: boolean;
  isProcessing: boolean;
}

class BackgroundSyncServiceClass {
  private queue: SyncQueueItem[] = [];
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'background-sync-queue';
  private readonly DELETED_SHOTS_KEY = 'background-sync-deleted-shots';
  private readonly MAX_RETRIES = 3;
  private readonly BATCH_SIZE = 5;
  private readonly RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s
  private deletedShots: Set<string> = new Set();
  private isOfflineQueueProcessing = false;

  constructor() {
    this.loadQueueFromStorage();
    this.loadDeletedShotsFromStorage();
    this.startProcessing();
    this.setupEventListeners();
  }

  private loadQueueFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        // Convert timestamps back to numbers
        this.queue.forEach(item => {
          item.timestamp = Number(item.timestamp);
          if (item.lastAttempt) {
            item.lastAttempt = Number(item.lastAttempt);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load sync queue from storage:', error);
      this.queue = [];
    }
  }

  private saveQueueToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save sync queue to storage:', error);
    }
  }

  private loadDeletedShotsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.DELETED_SHOTS_KEY);
      if (stored) {
        this.deletedShots = new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load deleted shots:', error);
      this.deletedShots = new Set();
    }
  }

  private saveDeletedShotsToStorage(): void {
    try {
      localStorage.setItem(
        this.DELETED_SHOTS_KEY, 
        JSON.stringify(Array.from(this.deletedShots))
      );
    } catch (error) {
      console.error('Failed to save deleted shots:', error);
    }
  }

  private setupEventListeners(): void {
    // Resume processing when coming online
    window.addEventListener('online', async () => {
      console.log('Network online, resuming sync queue');
      this.startProcessing();
      
      // Also process any queued project data changes
      try {
        const { CloudSyncService } = await import('@/services/cloudSyncService');
        if (CloudSyncService.hasQueuedChanges()) {
          console.log('Processing queued project data changes...');
          this.isOfflineQueueProcessing = true;
          
          await CloudSyncService.replayQueue();
          console.log('✅ Queued project data changes synced to cloud');
          
          // Add a delay to prevent immediate auto-save and cloud loading from overwriting the queued changes
          console.log('⏳ Waiting 5 seconds to prevent auto-save and cloud loading conflicts...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log('✅ Auto-save and cloud loading conflict prevention complete');
          
          this.isOfflineQueueProcessing = false;
        }
      } catch (error) {
        console.error('Failed to process queued project data changes:', error);
        this.isOfflineQueueProcessing = false;
      }
    });

    // Pause processing when going offline
    window.addEventListener('offline', () => {
      console.log('Network offline, pausing sync queue');
      this.stopProcessing();
    });
  }

  private startProcessing(): void {
    if (this.processingInterval) return;
    
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 2000); // Check every 2 seconds
  }

  private stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) return;
    
    // Run cleanup every time we process the queue
    await this.cleanupOrphanedUploads();
    
    const pendingItems = this.queue.filter(item => 
      item.status === 'pending' || 
      (item.status === 'failed' && item.retries < this.MAX_RETRIES)
    );

    if (pendingItems.length === 0) return;

    this.isProcessing = true;

    try {
      // Process in batches
      const batches = this.chunkArray(pendingItems, this.BATCH_SIZE);
      
      for (const batch of batches) {
        await Promise.allSettled(
          batch.map(item => this.processItem(item))
        );
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async cleanupOrphanedUploads(): Promise<void> {
    try {
      const { useShotStore } = await import('@/store/shotStore');
      const { useProjectManagerStore } = await import('@/store/projectManagerStore');
      
      const currentProjectId = useProjectManagerStore.getState().currentProjectId;
      const allShots = useShotStore.getState().shots;
      
      const beforeCount = this.queue.length;
      
      this.queue = this.queue.filter(item => {
        // Keep non-image items
        if (item.type !== 'image' || !item.shotId) return true;
        
        // For current project, check if shot exists
        if (item.projectId === currentProjectId) {
          return allShots[item.shotId] !== undefined;
        }
        
        // Keep items from other projects (can't validate cross-project)
        return true;
      });
      
      const removedCount = beforeCount - this.queue.length;
      if (removedCount > 0) {
        console.log(`Cleanup: Removed ${removedCount} orphaned upload(s)`);
        this.saveQueueToStorage();
      }
    } catch (error) {
      console.error('Failed to cleanup orphaned uploads:', error);
    }
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
    if (item.status === 'synced') return;

    // Check if shot was deleted
    if (item.type === 'image' && item.shotId && this.deletedShots.has(item.shotId)) {
      console.log(`Skipping upload for deleted shot ${item.shotId}`);
      item.status = 'synced'; // Mark as completed to remove from queue
      this.saveQueueToStorage();
      return;
    }

    try {
      // Update status to syncing
      item.status = 'syncing';
      item.lastAttempt = Date.now();
      this.saveQueueToStorage();

      if (item.type === 'image' && item.shotId && item.file) {
        // Gate uploads until cloud is available and project record exists
        if (!CloudSyncService.isCloudAvailable()) {
          item.status = 'pending';
          this.saveQueueToStorage();
          return;
        }
        try {
          await CloudSyncService.ensureCloudProjectRecord(item.projectId);
        } catch {
          // Leave as pending to retry later
          item.status = 'pending';
          this.saveQueueToStorage();
          return;
        }
        // Validate shot still exists before upload
        const { useShotStore } = await import('@/store/shotStore');
        const shot = useShotStore.getState().getShotById(item.shotId);
        
        if (!shot) {
          console.log(`Shot ${item.shotId} no longer exists in store, skipping upload`);
          item.status = 'synced'; // Mark completed to remove from queue
          this.saveQueueToStorage();
          return;
        }
        
        await CloudSyncService.uploadShotImage(item.projectId, item.shotId, item.file);
        item.status = 'synced';
        console.log(`Successfully synced image for shot ${item.shotId}`);
        
        // Update shot status in store
        const shotStore = useShotStore.getState();
        shotStore.updateShot(item.shotId, {
          cloudSyncStatus: 'synced',
          imageStorageType: 'supabase'
        });
      } else if (item.type === 'batch' && item.files) {
        if (!CloudSyncService.isCloudAvailable()) {
          item.status = 'pending';
          this.saveQueueToStorage();
          return;
        }
        try {
          await CloudSyncService.ensureCloudProjectRecord(item.projectId);
        } catch {
          item.status = 'pending';
          this.saveQueueToStorage();
          return;
        }
        // Process batch uploads
        for (const file of item.files) {
          // For batch uploads, we need the shot ID from the file name or metadata
          // This is a simplified approach - in practice, you might need to store more metadata
          const shotId = this.extractShotIdFromFile(file);
          if (shotId) {
            await CloudSyncService.uploadShotImage(item.projectId, shotId, file);
          }
        }
        item.status = 'synced';
        console.log(`Successfully synced batch of ${item.files.length} images`);
      } else if (item.id.startsWith('cleanup-') && item.shotId) {
        // Handle image cleanup
        await this.processImageCleanup(item);
        item.status = 'synced';
        console.log(`Successfully processed cleanup for item ${item.id}`);
      }

      this.saveQueueToStorage();
    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error);
      
      item.retries++;
      item.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Update shot status in store for failed uploads
      if (item.type === 'image' && item.shotId) {
        const { useShotStore } = await import('@/store/shotStore');
        const shotStore = useShotStore.getState();
        shotStore.updateShot(item.shotId, {
          cloudSyncStatus: 'failed',
          cloudSyncRetries: item.retries,
          lastSyncAttempt: new Date()
        });
      }
      
      if (item.retries >= this.MAX_RETRIES) {
        item.status = 'failed';
        this.notifyUserOfFailure(item);
      } else {
        item.status = 'pending';
        // Schedule retry with exponential backoff
        setTimeout(() => {
          this.processQueue();
        }, this.RETRY_DELAYS[item.retries - 1]);
      }
      
      this.saveQueueToStorage();
    }
  }

  private extractShotIdFromFile(file: File): string | null {
    // This is a simplified approach - in practice, you might need to store
    // shot IDs in the file metadata or use a different approach
    const name = file.name;
    const match = name.match(/([a-f0-9-]{36})/);
    return match ? match[1] : null;
  }

  private notifyUserOfFailure(item: SyncQueueItem): void {
    const message = item.type === 'image' 
      ? `Failed to sync image after ${this.MAX_RETRIES} attempts`
      : `Failed to sync batch of ${item.files?.length || 0} images after ${this.MAX_RETRIES} attempts`;
    
    toast.error(message, {
      action: {
        label: 'Retry',
        onClick: () => this.retryFailed()
      }
    });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Public API methods
  public queueImageUpload(projectId: string, shotId: string, file: File): void {
    const item: SyncQueueItem = {
      id: `${projectId}-${shotId}-${Date.now()}`,
      type: 'image',
      projectId,
      shotId,
      file,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    };

    this.queue.push(item);
    this.saveQueueToStorage();
    console.log(`Queued image upload for shot ${shotId}`);
  }

  public queueBatchUpload(projectId: string, files: File[]): void {
    const item: SyncQueueItem = {
      id: `${projectId}-batch-${Date.now()}`,
      type: 'batch',
      projectId,
      files,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    };

    this.queue.push(item);
    this.saveQueueToStorage();
    console.log(`Queued batch upload of ${files.length} images`);
  }

  public getQueueStatus(): SyncStatus {
    const totalPending = this.queue.filter(item => item.status === 'pending').length;
    const totalSyncing = this.queue.filter(item => item.status === 'syncing').length;
    const totalSynced = this.queue.filter(item => item.status === 'synced').length;
    const totalFailed = this.queue.filter(item => item.status === 'failed').length;

    return {
      totalPending,
      totalSyncing,
      totalSynced,
      totalFailed,
      isOnline: navigator.onLine,
      isProcessing: this.isProcessing
    };
  }

  public hasQueuedChanges(): boolean {
    return this.queue.some(item => 
      item.status === 'pending' || item.status === 'syncing' || item.status === 'failed'
    );
  }

  /**
   * Check if offline queue is being processed
   */
  public isProcessingOfflineQueue(): boolean {
    return this.isOfflineQueueProcessing;
  }

  public retryFailed(): void {
    const failedItems = this.queue.filter(item => item.status === 'failed');
    failedItems.forEach(item => {
      item.status = 'pending';
      item.retries = 0;
      item.error = undefined;
    });
    this.saveQueueToStorage();
    this.processQueue();
    toast.success(`Retrying ${failedItems.length} failed uploads`);
  }

  public clearCompleted(): void {
    this.queue = this.queue.filter(item => item.status !== 'synced');
    this.saveQueueToStorage();
  }

  public getFailedItems(): SyncQueueItem[] {
    return this.queue.filter(item => item.status === 'failed');
  }

  public markShotDeleted(shotId: string): void {
    console.log(`Marking shot ${shotId} as deleted`);
    this.deletedShots.add(shotId);
    
    // Remove any pending uploads for this shot
    const beforeCount = this.queue.length;
    this.queue = this.queue.filter(item => 
      !(item.type === 'image' && item.shotId === shotId)
    );
    const removedCount = beforeCount - this.queue.length;
    
    if (removedCount > 0) {
      console.log(`Removed ${removedCount} queued upload(s) for deleted shot ${shotId}`);
    }
    
    this.saveQueueToStorage();
    this.saveDeletedShotsToStorage();
  }

  public markProjectDeleted(projectId: string): void {
    console.log(`Marking project ${projectId} as deleted`);
    
    // Remove all queued uploads for this project
    const beforeCount = this.queue.length;
    this.queue = this.queue.filter(item => item.projectId !== projectId);
    const removedCount = beforeCount - this.queue.length;
    
    if (removedCount > 0) {
      console.log(`Removed ${removedCount} queued upload(s) for deleted project ${projectId}`);
    }
    
    this.saveQueueToStorage();
  }

  public clearDeletedShots(): void {
    this.deletedShots.clear();
    this.saveDeletedShotsToStorage();
  }

  public async markImageForCleanup(imageId: string, shotId: string): Promise<void> {
    console.log(`Marking image ${imageId} for cleanup (replaced in shot ${shotId})`);
    
    try {
      // Add to cleanup queue for background processing
      const cleanupItem: SyncQueueItem = {
        id: `cleanup-${imageId}-${Date.now()}`,
        type: 'image',
        projectId: '', // Will be filled by the cleanup processor
        shotId: shotId,
        timestamp: Date.now(),
        retries: 0,
        status: 'pending'
      };
      
      // Add to queue for background processing
      this.queue.push(cleanupItem);
      this.saveQueueToStorage();
      
      console.log(`✅ Image ${imageId} added to cleanup queue`);
    } catch (error) {
      console.error(`❌ Failed to mark image ${imageId} for cleanup:`, error);
      throw error;
    }
  }

  private async processImageCleanup(item: SyncQueueItem): Promise<void> {
    try {
      // Extract image ID from cleanup item ID
      const imageId = item.id.replace('cleanup-', '').split('-')[0];
      
      // Get current project ID
      const { useProjectManagerStore } = await import('@/store/projectManagerStore');
      const projectId = useProjectManagerStore.getState().currentProjectId;
      
      if (!projectId) {
        console.warn('No current project ID available for cleanup');
        return;
      }
      
      // Update the item with the project ID
      item.projectId = projectId;
      
      // Check if the image is still referenced by any shot
      const { useShotStore } = await import('@/store/shotStore');
      const allShots = useShotStore.getState().shots;
      const isImageStillReferenced = Object.values(allShots).some(shot => shot.imageId === imageId);
      
      if (isImageStillReferenced) {
        console.log(`Image ${imageId} is still referenced by a shot, skipping cleanup`);
        return;
      }
      
      // Delete the image from cloud storage
      const { StorageService } = await import('@/services/storageService');
      await StorageService.deleteImage(imageId);
      
      console.log(`✅ Successfully cleaned up image ${imageId}`);
    } catch (error) {
      console.error(`❌ Failed to process image cleanup for item ${item.id}:`, error);
      throw error;
    }
  }

  public destroy(): void {
    this.stopProcessing();
    window.removeEventListener('online', this.startProcessing);
    window.removeEventListener('offline', this.stopProcessing);
  }
}

// Export singleton instance
export const BackgroundSyncService = new BackgroundSyncServiceClass();




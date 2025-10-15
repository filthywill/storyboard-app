/**
 * LocalStorage Manager
 * 
 * This utility handles localStorage operations safely and provides
 * data migration and cleanup functionality.
 */

export class LocalStorageManager {
  /**
   * Safely get an item from localStorage with error handling
   */
  static getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Error reading localStorage key ${key}:`, error);
      return null;
    }
  }

  /**
   * Safely set an item in localStorage with error handling
   */
  static setItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Error writing localStorage key ${key}:`, error);
      return false;
    }
  }

  /**
   * Safely remove an item from localStorage with error handling
   */
  static removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing localStorage key ${key}:`, error);
      return false;
    }
  }

  /**
   * Safely parse JSON from localStorage
   */
  static parseJSON<T>(key: string, defaultValue: T): T {
    try {
      const item = this.getItem(key);
      if (!item) return defaultValue;
      
      const parsed = JSON.parse(item);
      return parsed;
    } catch (error) {
      console.error(`Error parsing JSON for key ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Check if localStorage is available and working
   */
  static isAvailable(): boolean {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.error('localStorage is not available:', error);
      return false;
    }
  }

  /**
   * Get storage usage information
   */
  static getStorageInfo(): { used: number; available: boolean } {
    if (!this.isAvailable()) {
      return { used: 0, available: false };
    }

    let used = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            used += new Blob([value]).size;
          }
        }
      }
    } catch (error) {
      console.error('Error calculating storage usage:', error);
    }

    return { used, available: true };
  }

  /**
   * Clean up corrupted or invalid localStorage entries
   */
  static cleanupCorruptedData(): void {
    const keysToCheck = [
      'page-storage',
      'shot-storage',
      'project-storage',
      'ui-store',
      'storyboard-storage', // Legacy store
      'project-manager-storage'
    ];

    keysToCheck.forEach(key => {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          // Try to parse the JSON to see if it's valid
          JSON.parse(item);
        }
      } catch (error) {
        console.warn(`Removing corrupted localStorage entry: ${key}`, error);
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Clear all project-related localStorage data
   */
  static clearAllProjectData(): void {
    const keysToRemove: string[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('-project-') || 
          key === 'project-manager-storage' ||
          key === 'storyboard-storage' // Legacy store
        )) {
          keysToRemove.push(key);
        }
      }
    } catch (error) {
      console.error('Error scanning localStorage:', error);
    }

    keysToRemove.forEach(key => {
      this.removeItem(key);
    });

    console.log(`Cleared ${keysToRemove.length} localStorage entries`);
  }

  /**
   * Migrate legacy data to new format
   */
  static migrateLegacyData(): boolean {
    try {
      const legacyData = this.getItem('storyboard-storage');
      if (!legacyData) {
        return false; // No legacy data to migrate
      }

      console.log('Found legacy data, migrating...');
      
      // Parse legacy data
      const parsed = JSON.parse(legacyData);
      
      // Create a default project ID for migration
      const migrationProjectId = 'migrated-project-' + Date.now();
      
      // Save legacy data to project-specific keys
      this.setItem(`page-storage-project-${migrationProjectId}`, JSON.stringify({
        pages: parsed.pages || [],
        activePageId: parsed.activePageId || null
      }));
      
      this.setItem(`shot-storage-project-${migrationProjectId}`, JSON.stringify({
        shots: parsed.shots || {},
        shotOrder: parsed.shotOrder || []
      }));
      
      this.setItem(`project-storage-project-${migrationProjectId}`, JSON.stringify({
        projectName: parsed.projectName || 'Migrated Project',
        projectInfo: parsed.projectInfo || 'Migrated from legacy data',
        projectLogoUrl: parsed.projectLogoUrl || null,
        clientAgency: parsed.clientAgency || 'Client/Agency',
        jobInfo: parsed.jobInfo || 'Job Info',
        templateSettings: parsed.templateSettings || {
          showLogo: true,
          showProjectName: true,
          showProjectInfo: true,
          showClientAgency: true,
          showJobInfo: true,
          showActionText: true,
          showScriptText: true,
          showPageNumber: true,
          shotNumberFormat: '01',
        }
      }));
      
      this.setItem(`ui-store-project-${migrationProjectId}`, JSON.stringify({
        isDragging: parsed.isDragging || false,
        isExporting: parsed.isExporting || false,
        showDeleteConfirmation: parsed.showDeleteConfirmation !== undefined ? parsed.showDeleteConfirmation : true
      }));

      // Create project manager entry
      this.setItem('project-manager-storage', JSON.stringify({
        state: {
          projects: {
            [migrationProjectId]: {
              id: migrationProjectId,
              name: 'Migrated Project',
              description: 'Migrated from legacy data',
              lastModified: new Date(),
              shotCount: Object.keys(parsed.shots || {}).length,
              pageCount: (parsed.pages || []).length,
              createdAt: new Date()
            }
          },
          currentProjectId: migrationProjectId,
          maxProjects: 15,
          isInitialized: true
        },
        version: 0
      }));

      console.log('Legacy data migration completed');
      return true;
    } catch (error) {
      console.error('Error migrating legacy data:', error);
      return false;
    }
  }

  /**
   * Get project data for syncing to cloud
   */
  static getProjectData(projectId: string): any {
    try {
      // Use the correct localStorage key patterns that match CloudSyncService.saveToLocalStorage
      const pageData = this.getItem(`page-storage-project-${projectId}`);
      const shotData = this.getItem(`shot-storage-project-${projectId}`);
      const projectSettingsData = this.getItem(`project-storage-project-${projectId}`);
      const uiSettingsData = this.getItem(`ui-store-project-${projectId}`);

      if (!pageData || !shotData) {
        console.warn(`Missing project data for ${projectId}. pageData: ${!!pageData}, shotData: ${!!shotData}`);
        return null;
      }

      // Parse the data (it's wrapped in { state: {...} } format)
      const parsedPageData = JSON.parse(pageData);
      const parsedShotData = JSON.parse(shotData);
      const parsedProjectSettings = projectSettingsData ? JSON.parse(projectSettingsData) : { state: {} };
      const parsedUiSettings = uiSettingsData ? JSON.parse(uiSettingsData) : { state: {} };

      return {
        pages: parsedPageData.state?.pages || [],
        shots: parsedShotData.state?.shots || {},
        shotOrder: parsedShotData.state?.shotOrder || [],
        projectSettings: parsedProjectSettings.state || {},
        uiSettings: parsedUiSettings.state || {}
      };
    } catch (error) {
      console.error(`Error getting project data for ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Initialize localStorage with proper error handling
   */
  static initialize(): void {
    console.log('Initializing localStorage manager...');
    
    // Check if localStorage is available
    if (!this.isAvailable()) {
      console.error('localStorage is not available');
      return;
    }

    // Clean up any corrupted data
    this.cleanupCorruptedData();

    // Try to migrate legacy data
    this.migrateLegacyData();

    // Log storage info
    const storageInfo = this.getStorageInfo();
    console.log('localStorage info:', storageInfo);
  }
}
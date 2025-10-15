/**
 * Storage Management Utility
 * 
 * Handles localStorage quota issues and provides storage management
 */

export class StorageManager {
  /**
   * Check if we're approaching storage quota
   */
  static checkStorageQuota(): {
    used: number;
    available: boolean;
    warning: boolean;
  } {
    try {
      // Estimate current usage
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            used += key.length + value.length;
          }
        }
      }

      // Convert to MB
      const usedMB = used / (1024 * 1024);
      
      // Most browsers have 5-10MB limit
      const warningThreshold = 4; // MB
      const criticalThreshold = 8; // MB

      return {
        used: usedMB,
        available: usedMB < criticalThreshold,
        warning: usedMB > warningThreshold
      };
    } catch (error) {
      return {
        used: 0,
        available: false,
        warning: true
      };
    }
  }

  /**
   * Get the largest project by storage size
   */
  static getLargestProject(): {
    projectId: string;
    size: number;
    name: string;
  } | null {
    try {
      let largestProject = null;
      let largestSize = 0;

      // Check all project-specific keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('-project-')) {
          const value = localStorage.getItem(key);
          if (value) {
            const size = key.length + value.length;
            if (size > largestSize) {
              largestSize = size;
              // Extract project ID from key
              const projectIdMatch = key.match(/-project-([^-]+)$/);
              if (projectIdMatch) {
                const projectId = projectIdMatch[1];
                // Try to get project name from project manager
                const projectManagerData = localStorage.getItem('project-manager-storage');
                if (projectManagerData) {
                  try {
                    const projectManager = JSON.parse(projectManagerData);
                    const project = projectManager.projects[projectId];
                    if (project) {
                      largestProject = {
                        projectId,
                        size: size / (1024 * 1024), // Convert to MB
                        name: project.name
                      };
                    }
                  } catch (error) {
                    // Ignore parsing errors
                  }
                }
              }
            }
          }
        }
      }

      return largestProject;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear a specific project's data to free up space
   */
  static clearProjectData(projectId: string): boolean {
    try {
      const keys = [
        `page-storage-project-${projectId}`,
        `shot-storage-project-${projectId}`,
        `project-storage-project-${projectId}`,
        `ui-store-project-${projectId}`
      ];

      let cleared = 0;
      keys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          cleared++;
        }
      });

      return cleared > 0;
    } catch (error) {
      console.error('Error clearing project data:', error);
      return false;
    }
  }

  /**
   * Get storage usage summary
   */
  static getStorageSummary(): {
    totalUsed: number;
    projectCount: number;
    largestProject: any;
    recommendation: string;
  } {
    const quota = this.checkStorageQuota();
    const largestProject = this.getLargestProject();
    
    // Count projects
    let projectCount = 0;
    const projectIds = new Set();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('-project-')) {
        const projectIdMatch = key.match(/-project-([^-]+)$/);
        if (projectIdMatch) {
          projectIds.add(projectIdMatch[1]);
        }
      }
    }
    projectCount = projectIds.size;

    let recommendation = 'Storage is healthy';
    if (!quota.available) {
      recommendation = 'Storage quota exceeded. Consider deleting some projects or clearing browser data.';
    } else if (quota.warning) {
      recommendation = 'Storage is getting full. Consider deleting unused projects.';
    }

    return {
      totalUsed: quota.used,
      projectCount,
      largestProject,
      recommendation
    };
  }
}
import { LocalStorageManager } from '@/utils/localStorageManager';
import { ProjectMetadata } from '@/store/projectManagerStore';

export type ProjectConflictMode = 'keep_local' | 'keep_cloud';

export interface ProjectConflictResolution {
  mode: ProjectConflictMode;
  blockedCloudProjectIds?: string[];
  blockedLocalProjectIds?: string[];
  resolvedAt?: string;
}

const getResolutionKey = (userId: string) => `project_conflict_resolution:${userId}`;

export const getConflictResolution = (
  userId: string | null | undefined
): ProjectConflictResolution | null => {
  if (!userId) return null;
  const raw = LocalStorageManager.getItem(getResolutionKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ProjectConflictResolution;
    if (parsed?.mode !== 'keep_local' && parsed?.mode !== 'keep_cloud') {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to parse project conflict resolution', error);
    return null;
  }
};

export const setConflictResolution = (
  userId: string,
  resolution: ProjectConflictResolution
): void => {
  LocalStorageManager.setItem(
    getResolutionKey(userId),
    JSON.stringify(resolution)
  );
};

export const clearConflictResolution = (userId: string): void => {
  LocalStorageManager.removeItem(getResolutionKey(userId));
};

export const getProjectConflictState = (projects: ProjectMetadata[]) => {
  const localProjects = projects.filter(
    (project) => project.isLocal && !project.isCloudOnly && !project.isCloudBacked
  );
  const cloudProjects = projects.filter(
    (project) => project.isCloudOnly || project.isCloudBacked
  );
  const hasConflict =
    localProjects.length > 0 &&
    cloudProjects.length > 0 &&
    localProjects.length + cloudProjects.length > 1;

  return { localProjects, cloudProjects, hasConflict };
};

export const filterProjectsForConflict = (
  projects: ProjectMetadata[],
  resolution: ProjectConflictResolution | null
) => {
  if (!resolution) return projects;

  if (resolution.mode === 'keep_local') {
    const blockedIds = new Set(resolution.blockedCloudProjectIds || []);
    if (blockedIds.size === 0) {
      return projects;
    }
    return projects.filter((project) => !blockedIds.has(project.id));
  }

  if (resolution.mode === 'keep_cloud') {
    const blockedIds = new Set(resolution.blockedLocalProjectIds || []);
    if (blockedIds.size === 0) {
      return projects;
    }
    return projects.filter((project) => !blockedIds.has(project.id));
  }

  return projects;
};

export const isProjectBlockedByResolution = (
  projectId: string,
  resolution: ProjectConflictResolution | null
): boolean => {
  if (!resolution) return false;

  if (resolution.mode === 'keep_local') {
    const blockedIds = new Set(resolution.blockedCloudProjectIds || []);
    return blockedIds.has(projectId);
  }

  if (resolution.mode === 'keep_cloud') {
    const blockedIds = new Set(resolution.blockedLocalProjectIds || []);
    return blockedIds.has(projectId);
  }

  return false;
};

export const clearLocalProjectStorage = (projectId: string): void => {
  const keys = [
    `page-storage-project-${projectId}`,
    `shot-storage-project-${projectId}`,
    `project-storage-project-${projectId}`,
    `ui-store-project-${projectId}`,
  ];

  keys.forEach((key) => {
    LocalStorageManager.removeItem(key);
  });
};

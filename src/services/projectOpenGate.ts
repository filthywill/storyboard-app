import { CloudAccessService } from '@/services/cloudAccessService';
import {
  getWorkspaceMode,
  type WorkspaceMode,
} from '@/services/workspaceModeService';
import { useProjectManagerStore } from '@/store/projectManagerStore';

export type ProjectKind = 'local' | 'cloud';
export type ProjectOpenFailureReason =
  | 'locked_workspace'
  | 'plan_limit'
  | 'unauthenticated'
  | 'missing_project'
  | 'unknown';

export interface ProjectOpenState {
  allowed: boolean;
  reason?: ProjectOpenFailureReason;
  requiredMode?: WorkspaceMode;
  projectKind?: ProjectKind;
}

const getProjectKind = (project: {
  isCloudOnly?: boolean;
  isCloudBacked?: boolean;
  isLocal?: boolean;
}): ProjectKind => {
  if (project.isCloudOnly || project.isCloudBacked) return 'cloud';
  return 'local';
};

const getWorkspaceConflictState = () => {
  const projectManager = useProjectManagerStore.getState();
  const projects = projectManager.getAllProjects();
  const hasLocalProjects = projects.some(
    (project) => project.isLocal && !project.isCloudOnly && !project.isCloudBacked
  );
  const hasCloudProjects = projects.some(
    (project) => project.isCloudOnly || project.isCloudBacked
  );
  return { hasLocalProjects, hasCloudProjects };
};

export const getProjectOpenState = async (
  projectId: string
): Promise<ProjectOpenState> => {
  const projectManager = useProjectManagerStore.getState();
  const project = projectManager.projects[projectId];

  if (!project) {
    return { allowed: false, reason: 'missing_project' };
  }

  const projectKind = getProjectKind(project);
  const accessState = await CloudAccessService.getAccessState();

  if (!accessState.isAuthenticated || !accessState.canReadCloud) {
    if (projectKind === 'cloud') {
      return {
        allowed: false,
        reason: 'unauthenticated',
        requiredMode: 'local',
        projectKind
      };
    }
    return { allowed: true, projectKind };
  }

  if (accessState.plan === 'pro') {
    return { allowed: true, projectKind };
  }

  const { hasLocalProjects, hasCloudProjects } = getWorkspaceConflictState();
  const hasConflict =
    accessState.plan === 'free' &&
    !accessState.canCreateCloudProject &&
    hasLocalProjects &&
    hasCloudProjects;

  if (!hasConflict) {
    return { allowed: true, projectKind };
  }

  const workspaceMode = getWorkspaceMode(accessState.userId);
  if (workspaceMode === 'local' && projectKind === 'cloud') {
    return {
      allowed: false,
      reason: 'locked_workspace',
      requiredMode: 'cloud',
      projectKind
    };
  }

  if (workspaceMode === 'cloud' && projectKind === 'local') {
    return {
      allowed: false,
      reason: 'locked_workspace',
      requiredMode: 'local',
      projectKind
    };
  }

  return { allowed: true, projectKind };
};

import type { CloudAccessState } from '@/services/cloudAccessService';

export type WorkspaceMode = 'local' | 'cloud';

const WORKSPACE_MODE_EVENT = 'sbflow:workspace-mode-change';

const getWorkspaceKey = (userId: string) => `sbflow:workspaceMode:${userId}`;

export const getStoredWorkspaceMode = (userId?: string | null): WorkspaceMode | null => {
  if (!userId) return null;
  const raw = localStorage.getItem(getWorkspaceKey(userId));
  return raw === 'local' || raw === 'cloud' ? raw : null;
};

export const getWorkspaceMode = (userId?: string | null): WorkspaceMode => {
  if (!userId) return 'local';
  const stored = getStoredWorkspaceMode(userId);
  return stored ?? 'local';
};

export const setWorkspaceMode = (mode: WorkspaceMode, userId: string): void => {
  localStorage.setItem(getWorkspaceKey(userId), mode);
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_MODE_EVENT, { detail: { userId, mode } })
  );
};

export const onWorkspaceModeChange = (
  handler: (detail: { userId: string; mode: WorkspaceMode }) => void
): (() => void) => {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (!detail?.userId || !detail?.mode) return;
    handler(detail);
  };
  window.addEventListener(WORKSPACE_MODE_EVENT, listener);
  return () => window.removeEventListener(WORKSPACE_MODE_EVENT, listener);
};

export const computeDefaultWorkspaceMode = (
  accessState: CloudAccessState,
  hasLocalProjects: boolean,
  hasCloudProjects: boolean
): WorkspaceMode => {
  if (!accessState.isAuthenticated) return 'local';
  if (hasCloudProjects) return 'cloud';
  if (hasLocalProjects) return 'local';
  return accessState.canReadCloud ? 'cloud' : 'local';
};

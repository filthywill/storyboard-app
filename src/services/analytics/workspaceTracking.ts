import { AnalyticsService } from '@/services/analytics/AnalyticsService';
import { AnalyticsEvent } from '@/services/analytics/events';
import { getWorkspaceMode } from '@/services/workspaceModeService';
import { useAuthStore } from '@/store/authStore';
import { usePageStore } from '@/store/pageStore';
import { useProjectManagerStore } from '@/store/projectManagerStore';
import { useShotStore } from '@/store/shotStore';
import { isAnalyticsSuppressed } from '@/utils/autoSave';

export type AuthMethod = 'email' | 'google' | 'unknown';

let lastAuthMethod: AuthMethod = 'unknown';

function getWorkspaceModeForAnalytics(): string {
  const { user } = useAuthStore.getState();
  return user?.id ? getWorkspaceMode(user.id) : 'local';
}

function getProjectProperties(): Record<string, string | number | boolean> {
  const { isAuthenticated, user } = useAuthStore.getState();
  const projectCount = useProjectManagerStore.getState().getAllProjects().length;

  return {
    workspace_mode: getWorkspaceModeForAnalytics(),
    is_guest: !isAuthenticated,
    project_count: projectCount,
  };
}

function getPageProperties(): Record<string, string | number | boolean> {
  const { isAuthenticated } = useAuthStore.getState();

  return {
    workspace_mode: getWorkspaceModeForAnalytics(),
    is_guest: !isAuthenticated,
    page_count_after: usePageStore.getState().pages.length,
    shot_count_after: useShotStore.getState().shotOrder.length,
  };
}

function getAuthProperties(authMethod: AuthMethod): Record<string, string | number | boolean> {
  return {
    auth_method: authMethod,
    workspace_mode: getWorkspaceModeForAnalytics(),
  };
}

export function captureProjectNavigation(options: {
  previousProjectId: string | null;
  projectId: string;
  userInitiated: boolean;
}): void {
  if (!options.userInitiated || isAnalyticsSuppressed()) {
    return;
  }

  const properties = getProjectProperties();

  if (options.previousProjectId && options.previousProjectId !== options.projectId) {
    AnalyticsService.capture(AnalyticsEvent.ProjectSwitched, properties);
    return;
  }

  if (!options.previousProjectId) {
    AnalyticsService.capture(AnalyticsEvent.ProjectOpened, properties);
  }
}

export function trackWorkspaceIntentCompleted(reason: string): void {
  if (isAnalyticsSuppressed()) {
    return;
  }

  if (reason === 'create_page') {
    AnalyticsService.capture(AnalyticsEvent.PageCreated, getPageProperties());
    return;
  }

  if (reason === 'delete_page') {
    AnalyticsService.capture(AnalyticsEvent.PageDeleted, getPageProperties());
  }
}

export function captureLoginCompleted(authMethod: Exclude<AuthMethod, 'unknown'>): void {
  lastAuthMethod = authMethod;
  AnalyticsService.capture(AnalyticsEvent.LoginCompleted, getAuthProperties(authMethod));
}

export function captureLogoutCompleted(): void {
  const authMethod = lastAuthMethod;
  AnalyticsService.capture(AnalyticsEvent.LogoutCompleted, {
    auth_method: authMethod,
    workspace_mode: 'local',
  });
  lastAuthMethod = 'unknown';
}

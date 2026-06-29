import { AnalyticsService } from '@/services/analytics/AnalyticsService';
import { AnalyticsEvent } from '@/services/analytics/events';
import { useAuthStore, type AuthStatus } from '@/store/authStore';
import { useProjectManagerStore } from '@/store/projectManagerStore';
import { useShotStore } from '@/store/shotStore';
import { usePageStore } from '@/store/pageStore';
import { getWorkspaceMode } from '@/services/workspaceModeService';

const FIRST_SHOT_TRACKED_PROJECTS = new Set<string>();
const FIRST_SHOT_ADD_INTENTS = new Set(['add_shot', 'create_shot']);

export type SignupMethod = 'email' | 'google' | 'unknown';

let appStartedCaptured = false;

export function captureAppStarted(route: string): void {
  if (appStartedCaptured) {
    return;
  }

  appStartedCaptured = true;

  const { authStatus, isLoading } = useAuthStore.getState();
  const appVersion = import.meta.env.VITE_APP_VERSION?.trim();

  AnalyticsService.capture(AnalyticsEvent.AppStarted, {
    route,
    environment: import.meta.env.MODE,
    ...(appVersion ? { app_version: appVersion } : {}),
    auth_status: isLoading ? 'loading' : authStatus,
  });
}

export function captureProjectCreated(options: {
  isGuest: boolean;
  isCloud: boolean;
  projectCount: number;
  source?: string;
}): void {
  AnalyticsService.capture(AnalyticsEvent.ProjectCreated, {
    is_guest: options.isGuest,
    is_cloud: options.isCloud,
    project_count: options.projectCount,
    ...(options.source ? { source: options.source } : {}),
  });
}

export function trackFirstShotAddedAfterIntent(reason: string, beforeShotCount: number): void {
  if (!FIRST_SHOT_ADD_INTENTS.has(reason)) {
    return;
  }

  const projectId = useProjectManagerStore.getState().currentProjectId;
  if (!projectId || FIRST_SHOT_TRACKED_PROJECTS.has(projectId)) {
    return;
  }

  const shotCount = useShotStore.getState().shotOrder.length;
  if (beforeShotCount > 0 || shotCount === 0) {
    return;
  }

  FIRST_SHOT_TRACKED_PROJECTS.add(projectId);

  const { isAuthenticated, user } = useAuthStore.getState();
  const pageCount = usePageStore.getState().pages.length;
  const workspaceMode = user?.id ? getWorkspaceMode(user.id) : 'local';

  AnalyticsService.capture(AnalyticsEvent.FirstShotAdded, {
    shot_count: shotCount,
    page_count: pageCount,
    is_guest: !isAuthenticated,
    workspace_mode: workspaceMode,
  });
}

export function captureExportCompleted(options: {
  format: 'pdf' | 'png';
  pageCount: number;
  shotCount: number;
  durationMs?: number;
}): void {
  AnalyticsService.capture(AnalyticsEvent.ExportCompleted, {
    format: options.format,
    page_count: options.pageCount,
    shot_count: options.shotCount,
    ...(options.durationMs !== undefined ? { duration_ms: options.durationMs } : {}),
  });
}

export function captureSignupCompleted(method: SignupMethod, authStatus: AuthStatus): void {
  AnalyticsService.capture(AnalyticsEvent.SignupCompleted, {
    method,
    auth_status: authStatus,
  });
}

export function countStoryboardShots(pages: Array<{ shots: unknown[] }>): number {
  return pages.reduce((total, page) => total + page.shots.length, 0);
}

export function isLikelyNewAuthUser(createdAt: string | undefined, windowMs = 120_000): boolean {
  if (!createdAt) {
    return false;
  }

  const createdAtMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdAtMs)) {
    return false;
  }

  return Date.now() - createdAtMs <= windowMs;
}

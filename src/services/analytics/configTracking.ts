import { AnalyticsService } from '@/services/analytics/AnalyticsService';
import { AnalyticsEvent } from '@/services/analytics/events';
import { getWorkspaceMode } from '@/services/workspaceModeService';
import type { TemplateSettings } from '@/store/projectStore';
import type { StoryboardTheme } from '@/styles/storyboardTheme';
import { useAuthStore } from '@/store/authStore';
import { isAnalyticsSuppressed } from '@/utils/autoSave';

const VISIBILITY_TEMPLATE_KEYS = [
  'showLogo',
  'showProjectName',
  'showProjectInfo',
  'showClientAgency',
  'showJobInfo',
  'showActionText',
  'showScriptText',
  'showPageNumber',
] as const satisfies ReadonlyArray<keyof TemplateSettings>;

function getBaseProperties(): Record<string, string | boolean> {
  const { isAuthenticated, user } = useAuthStore.getState();

  return {
    workspace_mode: user?.id ? getWorkspaceMode(user.id) : 'local',
    is_guest: !isAuthenticated,
  };
}

function captureConfigEvent(
  event: (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent],
  properties: Record<string, string | boolean>,
): void {
  if (isAnalyticsSuppressed()) {
    return;
  }

  AnalyticsService.capture(event, {
    ...getBaseProperties(),
    ...properties,
  });
}

export function getTemplateSignature(settings: TemplateSettings): string {
  const enabled = VISIBILITY_TEMPLATE_KEYS.filter((key) => settings[key]);
  return enabled.length > 0 ? enabled.join('+') : 'none';
}

export function formatGridLayout(cols: number, rows: number): string {
  return `${cols}x${rows}`;
}

export function trackTemplateChanged(oldSignature: string, newSignature: string): void {
  if (oldSignature === newSignature) {
    return;
  }

  captureConfigEvent(AnalyticsEvent.TemplateChanged, {
    old_template: oldSignature,
    new_template: newSignature,
  });
}

export function trackLayoutChanged(oldLayout: string | null, newLayout: string): void {
  if (!oldLayout || oldLayout === newLayout) {
    return;
  }

  captureConfigEvent(AnalyticsEvent.LayoutChanged, {
    old_layout: oldLayout,
    new_layout: newLayout,
  });
}

export function trackPageSizeChanged(oldMode: string, newMode: string): void {
  if (oldMode === newMode) {
    return;
  }

  captureConfigEvent(AnalyticsEvent.PageSizeChanged, {
    old_page_size: oldMode,
    new_page_size: newMode,
  });
}

export function trackAspectRatioChanged(oldRatio: string, newRatio: string): void {
  if (oldRatio === newRatio) {
    return;
  }

  captureConfigEvent(AnalyticsEvent.AspectRatioChanged, {
    old_aspect_ratio: oldRatio,
    new_aspect_ratio: newRatio,
  });
}

export function trackThemeApplied(previousThemeId: string | undefined, theme: StoryboardTheme): void {
  const nextThemeId = theme?.id?.trim();
  if (!nextThemeId || previousThemeId === nextThemeId) {
    return;
  }

  captureConfigEvent(AnalyticsEvent.ThemeApplied, {
    theme_id: nextThemeId,
  });
}

export function trackThemeSaved(themeId: string | undefined): void {
  const normalizedThemeId = themeId?.trim();

  captureConfigEvent(AnalyticsEvent.ThemeSaved, {
    ...(normalizedThemeId ? { theme_id: normalizedThemeId } : {}),
  });
}

export function trackShotNumberFormatChanged(oldFormat: string, newFormat: string): void {
  if (oldFormat === newFormat) {
    return;
  }

  captureConfigEvent(AnalyticsEvent.ShotNumberFormatChanged, {
    old_format: oldFormat,
    new_format: newFormat,
  });
}

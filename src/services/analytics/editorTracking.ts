import { AnalyticsService } from '@/services/analytics/AnalyticsService';
import { AnalyticsEvent } from '@/services/analytics/events';
import { getWorkspaceMode } from '@/services/workspaceModeService';
import { useAuthStore } from '@/store/authStore';
import { usePageStore } from '@/store/pageStore';
import { useShotStore, type Shot } from '@/store/shotStore';
import { isAnalyticsSuppressed } from '@/utils/autoSave';

const SHOT_ADD_INTENTS = new Set(['add_shot', 'create_shot']);
const SHOT_DELETE_INTENTS = new Set(['delete_shot']);
const SHOT_DUPLICATE_INTENTS = new Set(['duplicate_shot']);
const SHOT_REORDER_INTENTS = new Set(['reorder_shots', 'move_shot', 'move_shot_group', 'insert_sub_group']);
const SUBSHOT_ADD_INTENTS = new Set(['add_sub_shot', 'create_sub_shot']);

const ACTION_TEXT_TRACKED_SHOTS = new Set<string>();
const DIALOGUE_TRACKED_SHOTS = new Set<string>();
let suppressShotAddedEvents = false;

export function resetEditorTrackingState(): void {
  ACTION_TEXT_TRACKED_SHOTS.clear();
  DIALOGUE_TRACKED_SHOTS.clear();
  suppressShotAddedEvents = false;
}

export function setSuppressShotAddedEvents(suppressed: boolean): void {
  suppressShotAddedEvents = suppressed;
}

export function isShotAddAnalyticsSuppressed(): boolean {
  return suppressShotAddedEvents;
}

function shotHasImage(shot: Shot | undefined): boolean {
  if (!shot) {
    return false;
  }

  return Boolean(shot.imageData || shot.imageUrl || shot.imageFile);
}

function countImages(): number {
  const { shots, shotOrder } = useShotStore.getState();
  return shotOrder.filter((id) => shotHasImage(shots[id])).length;
}

function getEditorProperties(extra?: Record<string, string | number | boolean>): Record<string, string | number | boolean> {
  const { isAuthenticated, user } = useAuthStore.getState();
  const pageCount = usePageStore.getState().pages.length;
  const shotCountAfter = useShotStore.getState().shotOrder.length;
  const workspaceMode = user?.id ? getWorkspaceMode(user.id) : 'local';

  return {
    workspace_mode: workspaceMode,
    is_guest: !isAuthenticated,
    shot_count_after: shotCountAfter,
    page_count: pageCount,
    ...extra,
  };
}

function captureIfAllowed(event: (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent], properties?: Record<string, string | number | boolean>): void {
  if (isAnalyticsSuppressed()) {
    return;
  }

  AnalyticsService.capture(event, getEditorProperties(properties));
}

export function trackEditorIntentCompleted(reason: string): void {
  if (SHOT_ADD_INTENTS.has(reason)) {
    if (suppressShotAddedEvents) {
      return;
    }
    captureIfAllowed(AnalyticsEvent.ShotAdded);
    return;
  }

  if (SHOT_DELETE_INTENTS.has(reason)) {
    captureIfAllowed(AnalyticsEvent.ShotDeleted);
    return;
  }

  if (SHOT_DUPLICATE_INTENTS.has(reason)) {
    captureIfAllowed(AnalyticsEvent.ShotDuplicated);
    return;
  }

  if (SHOT_REORDER_INTENTS.has(reason)) {
    captureIfAllowed(AnalyticsEvent.ShotsReordered);
    return;
  }

  if (SUBSHOT_ADD_INTENTS.has(reason)) {
    captureIfAllowed(AnalyticsEvent.SubshotAdded);
  }
}

export function trackShotUpdate(
  shotId: string,
  updates: Partial<Shot>,
  reason: string,
  beforeShot: Shot | undefined,
): void {
  if (isAnalyticsSuppressed()) {
    return;
  }

  const afterShot = useShotStore.getState().shots[shotId];

  if (reason === 'edit_image') {
    const hasImageEdit =
      updates.imageScale !== undefined ||
      updates.imageOffsetX !== undefined ||
      updates.imageOffsetY !== undefined;

    if (hasImageEdit) {
      captureIfAllowed(AnalyticsEvent.ImageEdited, { image_count: countImages() });
    }
    return;
  }

  const hadImage = shotHasImage(beforeShot);
  const hasImageNow = shotHasImage(afterShot);
  const addsImageData = Boolean(updates.imageData || updates.imageFile || updates.imageUrl);
  const clearsImage =
    updates.imageData === undefined &&
    updates.imageUrl === undefined &&
    (updates.imageFile === null || updates.imageFile === undefined) &&
    hadImage &&
    !hasImageNow;

  if (!hadImage && hasImageNow && addsImageData) {
    if (!suppressShotAddedEvents) {
      captureIfAllowed(AnalyticsEvent.ImageAdded, { image_count: countImages() });
    }
  } else if (hadImage && hasImageNow && addsImageData) {
    captureIfAllowed(AnalyticsEvent.ImageReplaced, { image_count: countImages() });
  } else if (clearsImage) {
    captureIfAllowed(AnalyticsEvent.ImageRemoved, { image_count: countImages() });
  }

  if ('actionText' in updates) {
    trackActionTextAdded(shotId, beforeShot?.actionText, afterShot?.actionText);
  }

  if ('scriptText' in updates) {
    trackDialogueAdded(shotId, beforeShot?.scriptText, afterShot?.scriptText);
  }
}

function trackActionTextAdded(shotId: string, previousText: string | undefined, nextText: string | undefined): void {
  if (ACTION_TEXT_TRACKED_SHOTS.has(shotId)) {
    return;
  }

  const wasEmpty = !previousText?.trim();
  const isNonEmpty = Boolean(nextText?.trim());

  if (!wasEmpty || !isNonEmpty) {
    return;
  }

  ACTION_TEXT_TRACKED_SHOTS.add(shotId);
  captureIfAllowed(AnalyticsEvent.ActionTextAdded);
}

function trackDialogueAdded(shotId: string, previousText: string | undefined, nextText: string | undefined): void {
  if (DIALOGUE_TRACKED_SHOTS.has(shotId)) {
    return;
  }

  const wasEmpty = !previousText?.trim();
  const isNonEmpty = Boolean(nextText?.trim());

  if (!wasEmpty || !isNonEmpty) {
    return;
  }

  DIALOGUE_TRACKED_SHOTS.add(shotId);
  captureIfAllowed(AnalyticsEvent.DialogueAdded);
}

export function captureImagesBatchImported(options: {
  imageCount: number;
  failedCount?: number;
}): void {
  captureIfAllowed(AnalyticsEvent.ImagesBatchImported, {
    image_count: options.imageCount,
    import_method: 'file',
    ...(options.failedCount !== undefined ? { failed_count: options.failedCount } : {}),
  });
}

export function captureShotListLoaded(options: {
  shotCount: number;
  importMethod: 'paste' | 'file';
  failedCount?: number;
}): void {
  captureIfAllowed(AnalyticsEvent.ShotListLoaded, {
    shot_count: options.shotCount,
    import_method: options.importMethod,
    ...(options.failedCount !== undefined ? { failed_count: options.failedCount } : {}),
  });
}

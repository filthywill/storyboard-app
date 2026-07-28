import { supabase } from '@/lib/supabase';
import { usePageStore } from '@/store/pageStore';
import { useProjectStore } from '@/store/projectStore';
import { useShotStore } from '@/store/shotStore';
import { getWorkspaceMode, type WorkspaceMode } from '@/services/workspaceModeService';
import { CloudAccessService, type CloudPlan } from '@/services/cloudAccessService';

export type FeedbackCategory = 'bug' | 'improvement' | 'general';

export const FEEDBACK_MESSAGE_MAX_LENGTH = 5000;

export type FeedbackFailureCode =
  | 'offline'
  | 'invalid_request'
  | 'provider_rejected'
  | 'timeout'
  | 'unavailable';

export interface FeedbackRequest {
  category: FeedbackCategory;
  message: string;
  contactPermission: boolean;
  guestEmail?: string;
}

interface FeedbackContext {
  routePath: string;
  appVersion?: string;
  viewport?: { width: number; height: number };
  isOnline?: boolean;
  workspaceMode?: WorkspaceMode;
  planCategory?: CloudPlan;
  pageCount?: number;
  shotCount?: number;
  aspectRatio?: string;
  pageSize?: string;
  userAgent?: string;
}

interface SubmitFeedbackPayload {
  category: FeedbackCategory;
  message: string;
  contactPermission: boolean;
  guestEmail?: string;
  context: FeedbackContext;
}

export type FeedbackSubmitResult =
  | { ok: true; isGuest: boolean; workspaceMode?: WorkspaceMode }
  | { ok: false; code: FeedbackFailureCode; isGuest: boolean; workspaceMode?: WorkspaceMode };

function isFeedbackCategory(value: string): value is FeedbackCategory {
  return value === 'bug' || value === 'improvement' || value === 'general';
}

function normalizeFailure(status?: number): FeedbackFailureCode {
  if (status === 400 || status === 413 || status === 415) return 'invalid_request';
  if (status === 422) return 'provider_rejected';
  if (status === 408 || status === 504) return 'timeout';
  return 'unavailable';
}

function getSafeContext(userId: string | undefined): FeedbackContext {
  const baseContext: FeedbackContext = {
    routePath: typeof window === 'undefined' ? '/app' : window.location.pathname,
    appVersion: import.meta.env.VITE_APP_VERSION?.trim() || undefined,
    viewport: typeof window === 'undefined'
      ? undefined
      : { width: window.innerWidth, height: window.innerHeight },
    isOnline: typeof navigator === 'undefined' ? undefined : navigator.onLine,
    userAgent: typeof navigator === 'undefined' ? undefined : navigator.userAgent,
  };

  try {
    const pageState = usePageStore.getState();
    const shotState = useShotStore.getState();
    const projectState = useProjectStore.getState();
    const activePage = pageState.pages.find((page) => page.id === pageState.activePageId);
    const cachedAccess = CloudAccessService.getCachedAccessState();
    const planCategory = cachedAccess &&
      cachedAccess.userId === userId &&
      (cachedAccess.plan === 'free' || cachedAccess.plan === 'pro')
      ? cachedAccess.plan
      : undefined;

    return {
      ...baseContext,
      workspaceMode: userId ? getWorkspaceMode(userId) : undefined,
      planCategory,
      pageCount: pageState.pages.length,
      shotCount: shotState.shotOrder.length,
      aspectRatio: activePage?.aspectRatio,
      pageSize: projectState.pageSizeMode,
    };
  } catch {
    return baseContext;
  }
}

export class FeedbackService {
  static async submitFeedback(request: FeedbackRequest): Promise<FeedbackSubmitResult> {
    const message = request.message.trim();
    if (
      !isFeedbackCategory(request.category) ||
      !message ||
      message.length > FEEDBACK_MESSAGE_MAX_LENGTH ||
      (request.contactPermission && request.guestEmail !== undefined && !request.guestEmail.trim())
    ) {
      return { ok: false, code: 'invalid_request', isGuest: true };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { ok: false, code: 'offline', isGuest: true };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const isGuest = !accessToken;
    const workspaceMode = sessionData.session?.user.id
      ? getWorkspaceMode(sessionData.session.user.id)
      : undefined;
    const payload: SubmitFeedbackPayload = {
      category: request.category,
      message,
      contactPermission: request.contactPermission,
      context: getSafeContext(sessionData.session?.user.id),
    };

    if (isGuest && request.contactPermission && request.guestEmail) {
      payload.guestEmail = request.guestEmail.trim();
    }

    try {
      const { data, error } = await supabase.functions.invoke('submit-feedback', {
        body: payload,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      if (error || data?.success !== true) {
        const status = error?.context instanceof Response ? error.context.status : undefined;
        return { ok: false, code: normalizeFailure(status), isGuest, workspaceMode };
      }

      return { ok: true, isGuest, workspaceMode };
    } catch {
      return { ok: false, code: 'unavailable', isGuest, workspaceMode };
    }
  }
}

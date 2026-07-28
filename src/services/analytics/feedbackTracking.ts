import { AnalyticsService } from './AnalyticsService';
import { AnalyticsEvent } from './events';
import type { FeedbackCategory, FeedbackFailureCode } from '@/services/feedbackService';
import type { WorkspaceMode } from '@/services/workspaceModeService';

interface FeedbackAnalyticsProperties {
  category?: FeedbackCategory;
  is_guest: boolean;
  has_contact_permission: boolean;
  workspace_mode?: WorkspaceMode;
  failure_code?: FeedbackFailureCode;
}

export function trackFeedbackOpened(properties: FeedbackAnalyticsProperties): void {
  AnalyticsService.capture(AnalyticsEvent.FeedbackOpened, properties);
}

export function trackFeedbackSubmitted(properties: FeedbackAnalyticsProperties): void {
  AnalyticsService.capture(AnalyticsEvent.FeedbackSubmitted, properties);
}

export function trackFeedbackSubmissionFailed(properties: FeedbackAnalyticsProperties): void {
  AnalyticsService.capture(AnalyticsEvent.FeedbackSubmissionFailed, properties);
}

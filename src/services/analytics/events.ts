/**
 * Strongly typed analytics event registry.
 * Use these constants instead of raw event strings.
 */
export const AnalyticsEvent = {
  AppStarted: 'app_started',
  AppInitialized: 'app_initialized',
  AppEntry: 'app_entry',
  PageView: '$pageview',

  LandingPageViewed: 'landing_page_viewed',
  CtaClicked: 'cta_clicked',

  WelcomeViewed: 'welcome_viewed',
  GuestSessionStarted: 'guest_session_started',
  GuestProjectInitialized: 'guest_project_initialized',
  AuthModalOpened: 'auth_modal_opened',
  AuthCompleted: 'auth_completed',
  AuthFailed: 'auth_failed',
  SignupCompleted: 'signup_completed',
  LoginCompleted: 'login_completed',
  LogoutCompleted: 'logout_completed',
  EmailVerificationPromptShown: 'email_verification_prompt_shown',

  ProjectPickerShown: 'project_picker_shown',
  ProjectCreated: 'project_created',
  ProjectOpened: 'project_opened',
  ProjectDeleted: 'project_deleted',
  ProjectCreateBlocked: 'project_create_blocked',
  ProjectSaved: 'project_saved',
  ProjectSaveFailed: 'project_save_failed',
  ProjectSwitched: 'project_switched',

  FirstShotAdded: 'first_shot_added',
  ShotAdded: 'shot_added',
  ShotDeleted: 'shot_deleted',
  ShotDuplicated: 'shot_duplicated',
  ShotsReordered: 'shots_reordered',
  SubshotAdded: 'subshot_added',
  GuestProjectsMigrated: 'guest_projects_migrated',

  ImageAdded: 'image_added',
  ImagesBatchImported: 'images_batch_imported',
  ImageRemoved: 'image_removed',
  ImageReplaced: 'image_replaced',
  ImageEdited: 'image_edited',

  ActionTextAdded: 'action_text_added',
  DialogueAdded: 'dialogue_added',

  ShotListLoaded: 'shot_list_loaded',

  PageCreated: 'page_created',
  PageDeleted: 'page_deleted',
  TemplateChanged: 'template_changed',
  LayoutChanged: 'layout_changed',
  PageSizeChanged: 'page_size_changed',
  AspectRatioChanged: 'aspect_ratio_changed',
  ShotNumberFormatChanged: 'shot_number_format_changed',

  ThemeApplied: 'theme_applied',
  ThemeSaved: 'theme_saved',
  ThemeDeleted: 'theme_deleted',
  ThemeLimitReached: 'theme_limit_reached',

  ExportStarted: 'export_started',
  ExportCompleted: 'export_completed',
  ExportFailed: 'export_failed',

  UpgradePromptShown: 'upgrade_prompt_shown',
  UpgradeClicked: 'upgrade_clicked',
  UpgradeDismissed: 'upgrade_dismissed',
  BillingPageViewed: 'billing_page_viewed',
  CheckoutStarted: 'checkout_started',
  CheckoutCompleted: 'checkout_completed',
  CheckoutCanceled: 'checkout_canceled',
  BillingPortalOpened: 'billing_portal_opened',
  PlanLimitReached: 'plan_limit_reached',

  SyncCompleted: 'sync_completed',
  SyncConflictShown: 'sync_conflict_shown',
  SyncConflictResolved: 'sync_conflict_resolved',
  OfflineModeEntered: 'offline_mode_entered',
  OnlineRestored: 'online_restored',

  SessionForcedLogoutViewed: 'session_forced_logout_viewed',
  AppErrorBoundary: 'app_error_boundary',
  StorageCriticalDetected: 'storage_critical_detected',
  UpgradeRequiredError: 'upgrade_required_error',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

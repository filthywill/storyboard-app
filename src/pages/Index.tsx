import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageTabs } from '@/components/PageTabs';
import { StoryboardPage } from '@/components/StoryboardPage';
import ProjectSelector from '@/components/ProjectSelector';
import { AppHeader } from '@/components/layout/AppHeader';
import { useAppStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatShotNumber } from '@/utils/formatShotNumber';
import { useAuthStore } from '@/store/authStore';
import { useProjectManagerStore } from '@/store/projectManagerStore';
import { DataValidator } from '@/utils/dataValidator';
import { toast } from 'sonner';
import { EmptyProjectState } from '@/components/EmptyProjectState';
import { ConfirmEmailScreen } from '@/components/ConfirmEmailScreen';
import { CloudSaveConflictDialog } from '@/components/CloudSaveConflictDialog';
import { ProjectPickerModal } from '@/components/ProjectPickerModal';
import { LoggedOutElsewhereScreen } from '@/components/LoggedOutElsewhereScreen';
import { TemplateBackground } from '@/components/TemplateBackground';
import { WorkspaceChoiceModal } from '@/components/WorkspaceChoiceModal';
import { LockedProjectModal } from '@/components/LockedProjectModal';
import { ProjectLimitDialog } from '@/components/ProjectLimitDialog';
import { UpgradeToProDialog } from '@/components/UpgradeToProDialog';
import { getGlassmorphismStyles } from '@/styles/glassmorphism-styles';
import { setSavePaused } from '@/utils/autoSave';
import { canCreateProjectServerSide } from '@/utils/projectCreationGate';
import { getProjectConflictState } from '@/utils/projectConflict';
import { useProjectConflictStore } from '@/store/projectConflictStore';
import { useCloudSaveConflictStore } from '@/store/cloudSaveConflictStore';
import { useWriterLeaseStore } from '@/store/writerLeaseStore';
import { supabase } from '@/lib/supabase';
import { CloudAccessService } from '@/services/cloudAccessService';
import { getProjectOpenState } from '@/services/projectOpenGate';
import { WriterLeaseService } from '@/services/writerLeaseService';
import { useAuthModalStore } from '@/store/authModalStore';
import {
  computeDefaultWorkspaceMode,
  getStoredWorkspaceMode,
  getWorkspaceMode,
  onWorkspaceModeChange,
  setWorkspaceMode,
  type WorkspaceMode,
} from '@/services/workspaceModeService';

const AUTH_BROADCAST_CHANNEL = 'sbflow_auth';
const AUTH_CONFIRMED_STALE_MS = 60_000;

const Index = () => {
  const { 
    activePageId, 
    pages, 
    setActivePage,
    initializeAppContent,
    renumberAllShotsImmediate,
    templateSettings,
    initializeProjectSystem,
    allProjects,
    currentProject,
    switchToProject,
    reconcileFromShotOrder,
    canCreateProject
  } = useAppStore();
  
  const navigate = useNavigate();
  const {
    isAuthenticated,
    authStatus,
    isLoading: authLoading,
    initialize: initializeAuth,
    user
  } = useAuthStore();
  const authStore = useAuthStore();
  const { openAuthModal } = useAuthModalStore();
  const cloudSaveConflict = useCloudSaveConflictStore();
  const writerLease = useWriterLeaseStore();
  const previousProjectIdRef = useRef<string | null>(null);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [isLoadingCloudProjects, setIsLoadingCloudProjects] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [workspaceMode, setWorkspaceModeState] = useState<WorkspaceMode>('local');
  const [showWorkspaceChoiceModal, setShowWorkspaceChoiceModal] = useState(false);
  const [isTakeoverPending, setIsTakeoverPending] = useState(false);
  const [takeoverError, setTakeoverError] = useState<string | null>(null);
  const [lockedProject, setLockedProject] = useState<{
    id: string;
    name: string;
    requiredMode: WorkspaceMode;
    projectKind: 'local' | 'cloud';
  } | null>(null);

  const conflictState = useMemo(() => getProjectConflictState(allProjects), [allProjects]);
  const isReadOnlyLease =
    writerLease.mode === 'read_only' && writerLease.projectId === currentProject?.id;
  const showReadOnlyOverlay = Boolean(
    currentProject?.id && (isReadOnlyLease || isTakeoverPending)
  );
  const isUnconfirmedEmail = authStatus === 'authenticated_unconfirmed';
  const confirmOverlayRef = useRef<HTMLDivElement | null>(null);
  const handleCheckConfirmedRef = useRef<() => Promise<void>>(async () => {});
  const [isConfirmingEmail, setIsConfirmingEmail] = useState(false);
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setWorkspaceModeState(getWorkspaceMode(user?.id));
    const unsubscribe = onWorkspaceModeChange((detail) => {
      if (detail.userId === user?.id) {
        setWorkspaceModeState(detail.mode);
      }
    });
    return () => unsubscribe();
  }, [user?.id]);
  
  // Handler to gate modal opening based on project limits
  const handleRequestCreateProject = async () => {
    if (!isAuthenticated) {
      if (!canCreateProject()) {
        setShowLimitDialog(true);
        return;
      }
      setShowCreateProjectDialog(true);
      return;
    }

    try {
      const canCreate = await canCreateProjectServerSide(user?.id);
      if (!canCreate) {
        setShowUpgradeDialog(true);
        return;
      }

      setShowCreateProjectDialog(true);
    } catch (error) {
      console.error("Project gate check failed:", error);
      toast.error("Couldn't verify your plan. Please try again.");
    }
  };

  const handlePickerCreateNew = async () => {
    if (!isAuthenticated) {
      setShowProjectPicker(false);
      void handleRequestCreateProject();
      return;
    }

    try {
      const canCreate = await canCreateProjectServerSide(user?.id);
      if (!canCreate) {
        setShowUpgradeDialog(true);
        return;
      }

      setShowProjectPicker(false);
      setShowCreateProjectDialog(true);
    } catch (error) {
      console.error("Project gate check failed:", error);
      toast.error("Couldn't verify your plan. Please try again.");
    }
  };

  const handleResendConfirmation = async () => {
    if (!user?.email) return;
    try {
      const { AuthService } = await import('@/services/authService');
      await AuthService.resendConfirmationEmail(user.email);
      toast.success('Confirmation email sent');
    } catch (error) {
      console.error('Failed to resend confirmation email:', error);
      toast.error('Failed to resend confirmation email');
    }
  };

  const handleChangeEmail = async () => {
    try {
      const { AuthService } = await import('@/services/authService');
      await AuthService.signOut();
      openAuthModal();
    } catch (error) {
      console.error('Failed to sign out for email change:', error);
      toast.error('Failed to change email');
    }
  };

  const handleCheckConfirmed = async () => {
    try {
      const { AuthService } = await import('@/services/authService');
      const refreshedUser = await AuthService.getCurrentUser();

      if (refreshedUser && (refreshedUser.email_confirmed_at || refreshedUser.confirmed_at)) {
        const normalizedUser = {
          id: refreshedUser.id,
          email: refreshedUser.email ?? null,
          name: refreshedUser.user_metadata?.display_name,
          avatar_url: refreshedUser.user_metadata?.avatar_url,
          email_confirmed_at: refreshedUser.email_confirmed_at,
          confirmed_at: refreshedUser.confirmed_at,
        };
        useAuthStore.getState().setUser(normalizedUser);
        await AuthService.ensureUserProfile(refreshedUser);
        const { CloudAccessService } = await import('@/services/cloudAccessService');
        CloudAccessService.clearCache();
        toast.success('Email confirmed — project saved to your account.');
        return;
      }

      toast.error('Email not confirmed yet. Please check your inbox.');
    } catch (error) {
      console.error('Confirmation check failed:', error);
      toast.error('Could not verify confirmation status');
    }
  };

  // Keep ref updated to avoid stale closures in broadcast listener
  handleCheckConfirmedRef.current = handleCheckConfirmed;

  // Listen for auth confirmation events from the confirmation tab.
  // Safety: ignore unless we are currently in authenticated_unconfirmed state.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('BroadcastChannel' in window)) return;

    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
    const onMessage = async (event: MessageEvent) => {
      const payload = (event as any)?.data;
      if (!payload || payload.type !== 'AUTH_CONFIRMED') return;

      const at = typeof payload.at === 'number' ? payload.at : null;
      if (at !== null && Date.now() - at > AUTH_CONFIRMED_STALE_MS) {
        return;
      }

      // Do NOT rely on effect closure values (authStatus can change).
      const currentStatus = useAuthStore.getState().authStatus;
      if (currentStatus !== 'authenticated_unconfirmed') return;

      if (isMountedRef.current) setIsConfirmingEmail(true);
      try {
        await handleCheckConfirmedRef.current();
      } finally {
        if (isMountedRef.current) setIsConfirmingEmail(false);
      }
    };

    channel.addEventListener('message', onMessage);
    return () => {
      channel.removeEventListener('message', onMessage);
      channel.close();
    };
  }, []);

  // When showing the unconfirmed overlay, focus it to keep keyboard interactions contained.
  useEffect(() => {
    if (!isUnconfirmedEmail) return;
    confirmOverlayRef.current?.focus();
  }, [isUnconfirmedEmail]);

  // Lock background scrolling while the unconfirmed overlay is shown.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isUnconfirmedEmail) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prevOverflow;
    };
  }, [isUnconfirmedEmail]);

  const reloadProjectFromCloud = async (projectId: string) => {
    const { CloudProjectSyncService } = await import('@/services/cloudProjectSyncService');
    await CloudProjectSyncService.loadFullProject(projectId, { force: true });
    const { ProjectSwitcher } = await import('@/utils/projectSwitcher');
    await ProjectSwitcher.switchToProject(projectId, true, true);
  };

  const handleReloadFromCloud = async () => {
    const projectId = cloudSaveConflict.projectId;
    if (!projectId) {
      cloudSaveConflict.close();
      cloudSaveConflict.clearPause();
      setSavePaused(false, 'reload_no_project');
      return;
    }
    try {
      await reloadProjectFromCloud(projectId);
    } catch (error) {
      console.error('Failed to reload project from cloud:', error);
      toast.error('Failed to reload project from cloud');
    } finally {
      cloudSaveConflict.close();
      cloudSaveConflict.clearPause();
      setSavePaused(false, 'reload_complete');
    }
  };

  const handleTakeOverEditing = async () => {
    if (!currentProject?.id) return;
    if (isTakeoverPending) return;
    setIsTakeoverPending(true);
    setTakeoverError(null);
    const projectId = currentProject.id;
    try {
      const { data, error } = await supabase.rpc('claim_writer_lease', {
        p_project_id: projectId,
        p_writer_id: WriterLeaseService.getWriterId(),
        p_force: true
      });
      if (error) {
        if (import.meta.env.DEV) {
          console.debug('[lease] takeover failed', {
            projectId,
            error
          });
        }
        setTakeoverError('Could not claim editing rights.');
        return;
      }
      const payload = Array.isArray(data) ? data[0] : data;
      const ok = Boolean(payload?.ok);
      if (!ok) {
        if (import.meta.env.DEV) {
          console.debug('[lease] takeover denied', {
            projectId,
            reason: payload?.reason ?? null,
            holder: payload?.holder ?? null
          });
        }
        setTakeoverError('Editing is still active elsewhere.');
        return;
      }

      if (import.meta.env.DEV) {
        console.debug('[takeover] claimed lease', { projectId });
      }

      if (import.meta.env.DEV) {
        console.debug('[takeover] starting reload', { projectId });
      }
      await reloadProjectFromCloud(projectId);
      if (import.meta.env.DEV) {
        const baseCloudUpdatedAt =
          useProjectManagerStore.getState().projects[projectId]?.baseCloudUpdatedAt ?? null;
        console.debug('[takeover] reload complete', {
          projectId,
          baseCloudUpdatedAt
        });
      }

      const activate = await WriterLeaseService.claimLease(projectId, {
        force: true,
        source: 'takeover_activate'
      });
      if (!activate.ok) {
        if (import.meta.env.DEV) {
          console.debug('[lease] takeover activation failed', {
            projectId,
            reason: activate.reason,
            holder: activate.holder
          });
        }
        setTakeoverError('Unable to enable editing after reload.');
        return;
      }

      WriterLeaseService.broadcastTakeover(projectId);

      if (import.meta.env.DEV) {
        console.debug('[takeover] unlocked', { projectId });
      }
      setTakeoverError(null);
    } catch (error) {
      console.error('Failed to reload project from cloud:', error);
      toast.error('Failed to reload project from cloud');
      setTakeoverError('Reload failed. Please try again.');
    } finally {
      setIsTakeoverPending(false);
    }
  };

  // Initialize app with robust error handling
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Starting app initialization...');
        
        // Initialize localStorage manager first
        const { LocalStorageManager } = await import('@/utils/localStorageManager');
        LocalStorageManager.initialize();
        
        // Small delay to ensure everything is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Initialize project system separately (non-blocking)
        setTimeout(async () => {
          try {
            await initializeProjectSystem();
          } catch (error) {
            console.error('Error initializing project system:', error);
            // Don't block the app if project system fails
          }
        }, 200);
        
        // Initialize auth if cloud sync is enabled
        if (import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true') {
          try {
            await initializeAuth();
            DataValidator.validateOnLoad();
          } catch (error) {
            console.error('Error initializing auth:', error);
            // Don't block the app if auth fails
          }
        }
        
        // Initialize BackgroundSyncService for local-first cloud sync
        try {
          const { BackgroundSyncService } = await import('@/services/backgroundSyncService');
          console.log('BackgroundSyncService initialized');
        } catch (error) {
          console.error('Error initializing BackgroundSyncService:', error);
          // Don't block the app if background sync fails
        }
        
        // Initialize session management
        if (import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true') {
          try {
            const { AuthService } = await import('@/services/authService');
            await AuthService.initializeSessionManagement();
            console.log('Session management initialized');
          } catch (error) {
            console.error('Error initializing session management:', error);
            // Don't block the app if session management fails
          }
        }
        
        // CRITICAL: Only initialize default app content for GUEST users (unauthenticated)
        // After auth initialization completes, check if user is authenticated
        // If not authenticated, create default project structure
        setTimeout(() => {
          const authState = useAuthStore.getState();
          if (!authState.isAuthenticated && !authState.isLoading) {
            console.log('Guest user detected - initializing default app content...');
            initializeAppContent();
            
            // Pre-render reconcile from canonical shotOrder to avoid first-action swaps
            setTimeout(() => {
              reconcileFromShotOrder();
            }, 50);
          } else {
            console.log('Authenticated user detected - skipping default app content initialization');
          }
        }, 300);
        
        // Load user themes for authenticated users
        if (import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true') {
          setTimeout(async () => {
            const authState = useAuthStore.getState();
            if (authState.isAuthenticated && !authState.isLoading) {
              console.log('Authenticated user - loading user themes...');
              try {
                const { ThemeService } = await import('@/services/themeService');
                await ThemeService.loadUserThemesIntoMemory();
              } catch (error) {
                console.error('Failed to load user themes:', error);
                // Don't block the app if theme loading fails
              }
            }
          }, 350); // After auth check completes
        }
        
        console.log('App initialization completed');
      } catch (error) {
        console.error('Error during app initialization:', error);
        // Try to continue anyway
      }
    };

    initializeApp();
  }, []); // Empty dependency array - run only once on mount
  
  // Sync project list and guest projects when user becomes authenticated
  useEffect(() => {
    if (
      !isAuthenticated ||
      authStatus !== 'authenticated_confirmed' ||
      import.meta.env.VITE_CLOUD_SYNC_ENABLED !== 'true'
    ) {
      return;
    }

    let cancelled = false;

    const syncCloudProjects = async () => {
      setIsLoadingCloudProjects(true);
      try {
        const { CloudAccessService } = await import('@/services/cloudAccessService');
        const access = await CloudAccessService.getAccessState();
        if (!access.canReadCloud) {
          return;
        }

        const { CloudProjectSyncService } = await import('@/services/cloudProjectSyncService');
        await CloudProjectSyncService.syncProjectList();

        if (cancelled) return;

        const projectManager = useProjectManagerStore.getState();
        const conflictState = getProjectConflictState(projectManager.getAllProjects());
        const hasWorkspaceConflict =
          access.plan === 'free' &&
          !access.canCreateCloudProject &&
          conflictState.localProjects.length > 0 &&
          conflictState.cloudProjects.length > 0;

        if (!hasWorkspaceConflict && access.canCreateCloudProject) {
          const { GuestProjectSyncService } = await import('@/services/guestProjectSyncService');
          await GuestProjectSyncService.syncGuestProjectsToCloud();
        }
      } catch (error) {
        console.error('Failed to sync cloud projects:', error);
      } finally {
        if (cancelled) return;
        setIsLoadingCloudProjects(false);
        // After loading completes, check if we need to show project picker
        const projectManager = useProjectManagerStore.getState();
        const latestProjects = projectManager.getAllProjects();
        const latestCurrentProject = projectManager.getCurrentProject();
        if (!latestCurrentProject && latestProjects.length > 0) {
          setShowProjectPicker(true);
        }
      }
    };

    void syncCloudProjects();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authStatus, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || isLoadingCloudProjects) {
      setWorkspaceModeState('local');
      setShowWorkspaceChoiceModal(false);
      setLockedProject(null);
      return;
    }

    let active = true;
    const initializeWorkspaceMode = async () => {
      const access = await CloudAccessService.getAccessState();
      const { localProjects, cloudProjects } = conflictState;
      const hasLocalProjects = localProjects.length > 0;
      const hasCloudProjects = cloudProjects.length > 0;
      const hasWorkspaceConflict =
        access.plan === 'free' &&
        !access.canCreateCloudProject &&
        hasLocalProjects &&
        hasCloudProjects;

      const storedMode = getStoredWorkspaceMode(user.id);

      if (hasWorkspaceConflict && !storedMode) {
        if (active) {
          setShowWorkspaceChoiceModal(true);
        }
        return;
      }

      const storedModeValid =
        storedMode === 'cloud' ? hasCloudProjects : storedMode === 'local' ? hasLocalProjects : false;
      const nextMode =
        storedMode && storedModeValid
          ? storedMode
          : computeDefaultWorkspaceMode(access, hasLocalProjects, hasCloudProjects);

      if (active) {
        setWorkspaceModeState(nextMode);
      }

      if (!storedMode || !storedModeValid) {
        setWorkspaceMode(nextMode, user.id);
      }
    };

    void initializeWorkspaceMode();
    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.id, isLoadingCloudProjects, conflictState]);

  const openProjectWithGate = async (projectId: string) => {
    const project = allProjects.find((item) => item.id === projectId);
    if (!project) return;

    const openState = await getProjectOpenState(projectId);
    if (!openState.allowed) {
      if (openState.reason === 'locked_workspace' && openState.requiredMode) {
        setLockedProject({
          id: projectId,
          name: project.name,
          requiredMode: openState.requiredMode,
          projectKind: openState.projectKind ?? 'local',
        });
        return;
      }
      if (openState.reason === 'unauthenticated') {
        openAuthModal();
        return;
      }
      toast.error('This project is currently unavailable.');
      return;
    }

    try {
      if (project.isCloudOnly) {
        const { CloudProjectSyncService } = await import('@/services/cloudProjectSyncService');
        await CloudProjectSyncService.loadFullProject(projectId);
      }

      const success = await switchToProject(projectId);
      if (!success && !shouldSuppressSwitchError()) {
        toast.error('Failed to load project');
      }
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project from cloud');
    }
  };

  const handleWorkspaceChoice = async (mode: WorkspaceMode) => {
    if (!user?.id) return;
    setWorkspaceMode(mode, user.id);
    setWorkspaceModeState(mode);
    setShowWorkspaceChoiceModal(false);

    const target =
      mode === 'cloud'
        ? allProjects.find((project) => project.isCloudOnly || project.isCloudBacked)
        : allProjects.find(
            (project) => project.isLocal && !project.isCloudOnly && !project.isCloudBacked
          );

    if (target) {
      await openProjectWithGate(target.id);
    }
  };

  const handleLockedSwitch = async () => {
    if (!lockedProject || !user?.id) {
      setLockedProject(null);
      return;
    }
    setWorkspaceMode(lockedProject.requiredMode, user.id);
    setWorkspaceModeState(lockedProject.requiredMode);
    const target = lockedProject.id;
    setLockedProject(null);
    await openProjectWithGate(target);
  };

  const shouldSuppressSwitchError = () => {
    const { lastBlockedReason, clearBlockedReason } = useProjectConflictStore.getState();
    if (lastBlockedReason) {
      clearBlockedReason();
      return true;
    }
    return false;
  };

  // Show project picker for authenticated users with no current project (after loading)
  useEffect(() => {
    if (isAuthenticated && !isLoadingCloudProjects && !currentProject && allProjects.length > 0) {
      setShowProjectPicker(true);
    } else if (currentProject) {
      setShowProjectPicker(false);
    }
  }, [isAuthenticated, isLoadingCloudProjects, currentProject, allProjects.length]);

  useEffect(() => {
    const nextProjectId = currentProject?.id ?? null;
    const previousProjectId = previousProjectIdRef.current;

    if (previousProjectId && previousProjectId !== nextProjectId) {
      void WriterLeaseService.releaseLease(previousProjectId, { source: 'switch' });
    }

    previousProjectIdRef.current = nextProjectId;

    if (!nextProjectId) {
      WriterLeaseService.clearLeaseState();
      return;
    }

    const isCloudProject = Boolean(currentProject?.isCloudOnly || currentProject?.isCloudBacked);
    if (
      !isAuthenticated ||
      import.meta.env.VITE_CLOUD_SYNC_ENABLED !== 'true' ||
      !isCloudProject
    ) {
      WriterLeaseService.clearLeaseState();
      return;
    }

    void WriterLeaseService.ensureWriter(nextProjectId, { source: 'open' });
  }, [
    currentProject?.id,
    currentProject?.isCloudOnly,
    currentProject?.isCloudBacked,
    isAuthenticated
  ]);
  
  // Session validation and real-time session monitoring
  useEffect(() => {
    if (
      isAuthenticated &&
      authStatus === 'authenticated_confirmed' &&
      import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true'
    ) {
      const { user } = useAuthStore.getState();
      // Periodic session validation (every 5 minutes)
      const validateSession = async () => {
        try {
          const { AuthService } = await import('@/services/authService');
          const isValid = await AuthService.validateCurrentSession();
          
          if (!isValid) {
            console.warn('Session is no longer valid, setting expired reason');
            const { setLogoutReason } = useAuthStore.getState();
            setLogoutReason('expired');
            // Don't force logout - let them continue working locally
            // The banner will show the session expiry message
            return;
          }
          
          // Update last activity
          await AuthService.updateLastActivity();
        } catch (error) {
          console.error('Session validation error:', error);
        }
      };
      
      // Don't validate immediately - we just successfully authenticated
      // Start periodic validation after 5 minutes
      const sessionValidationInterval = setInterval(validateSession, 5 * 60 * 1000);
      
      // Set up real-time session monitoring
      const setupRealtimeSessionMonitoring = async () => {
        const { supabase } = await import('@/lib/supabase');
        const { useAuthStore } = await import('@/store/authStore');
        const { AuthService } = await import('@/services/authService');
        
        const channel = supabase
          .channel('session-updates')
          .on('postgres_changes', 
            { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'user_sessions',
              filter: `user_id=eq.${user?.id || ''}`
            },
            async (payload) => {
              console.log('Session update received:', payload);
              
              // Get current session ID
              const currentSessionId = AuthService.getCurrentSessionId();
              
              // Only process if this is OUR session being invalidated
              if (payload.new.id === currentSessionId && payload.new.is_active === false) {
                console.log('Current session was invalidated by another device');
                
                // Use local-only signout - session is already invalid on server
                // Calling AuthService.signOut() would fail with 403 because session is already invalid
                try {
                  // Clear Supabase session locally without server API call
                  await supabase.auth.signOut({ scope: 'local' });
                } catch (error) {
                  console.error('Error during local signout:', error);
                }
                
                // Update auth store state
                useAuthStore.setState({ user: null, isAuthenticated: false, logoutReason: 'other_session' });
                
                // Clear all current project data from stores
                try {
                  const { ProjectSwitcher } = await import('@/utils/projectSwitcher');
                  ProjectSwitcher.clearCurrentProjectData();
                } catch (e) {
                  console.warn('Failed to clear current project data on forced logout', e);
                }
                
                toast.error('You have been logged out from another device');
              } else if (payload.new.id !== currentSessionId) {
                console.log('Another session was invalidated, ignoring');
              }
            }
          )
          .on('broadcast', 
            { event: 'sessions-invalidated' },
            async (payload) => {
              console.log('Session invalidation broadcast received:', payload);
              
              // Check if current session is in the invalidated list
              const currentSessionId = AuthService.getCurrentSessionId();
              if (currentSessionId && payload.payload.invalidatedSessions.includes(currentSessionId)) {
                console.log('Current session was invalidated by another device');
                
                // Use local-only signout - session is already invalid on server
                // Calling AuthService.signOut() would fail with 403 because session is already invalid
                try {
                  // Clear Supabase session locally without server API call
                  await supabase.auth.signOut({ scope: 'local' });
                } catch (error) {
                  console.error('Error during local signout:', error);
                }
                
                // Update auth store state
                useAuthStore.setState({ user: null, isAuthenticated: false, logoutReason: 'other_session' });
                
                // Clear all current project data from stores
                try {
                  const { ProjectSwitcher } = await import('@/utils/projectSwitcher');
                  ProjectSwitcher.clearCurrentProjectData();
                } catch (e) {
                  console.warn('Failed to clear current project data on forced logout', e);
                }
                
                toast.error('You have been logged out from another device');
              }
            }
          )
          .subscribe();
        
        return channel;
      };
      
      let sessionChannel: any = null;
      setupRealtimeSessionMonitoring().then(channel => {
        sessionChannel = channel;
      });
      
      // Cleanup
      return () => {
        clearInterval(sessionValidationInterval);
        if (sessionChannel) {
          import('@/lib/supabase').then(({ supabase }) => {
            supabase.removeChannel(sessionChannel);
          });
        }
      };
    }
  }, [isAuthenticated, authStatus]);
  
  // Handle active page validation separately
  useEffect(() => {
    if (!pages.find(p => p.id === activePageId) && pages.length > 0) {
      setActivePage(pages[0].id);
    }
  }, [activePageId, pages, setActivePage]);


  const activePage = pages.find(p => p.id === activePageId);

  // Determine what to display in the main content area
  const shouldShowTemplate = !activePage && (!currentProject || (isAuthenticated && allProjects.length === 0));

  const activePageIndex = pages.findIndex(p => p.id === activePageId);

  // STEP 1: Handle forced logout (session expired or logged out from another device)
  if (authStore.logoutReason === 'expired' || authStore.logoutReason === 'other_session') {
    return <LoggedOutElsewhereScreen onSignIn={openAuthModal} />;
  }

  // STEP 2: Handle auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // STEP 3: Handle cloud project loading for authenticated users
  if (isAuthenticated && isLoadingCloudProjects) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your projects...</p>
        </div>
      </div>
    );
  }

  // For all other states, render the main UI layout
  // The EmptyProjectState will show as an overlay when appropriate
  return (
    <div className="min-h-screen flex flex-col relative" style={{ position: 'relative', zIndex: 2 }}>
      <div
        aria-hidden={isUnconfirmedEmail ? true : undefined}
        style={
          isUnconfirmedEmail
            ? { pointerEvents: 'none', userSelect: 'none' }
            : undefined
        }
      >
        {/* Header Section (unified AppHeader) */}
        <AppHeader />
        
        {/* Project management dialogs (handled by ProjectSelector without rendering auth UI) */}
        <ProjectSelector 
          renderAuthUI={false}
          onRequestCreate={() => void handleRequestCreateProject()}
          showCreateDialog={showCreateProjectDialog}
          onCloseCreateDialog={() => setShowCreateProjectDialog(false)}
        />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8 flex-grow w-full relative">
          {activePage ? (
            <>
              <StoryboardPage pageId={activePage.id} />
              
              {/* Status Footer - positioned below StoryboardPage */}
              <div className="mt-2" style={{
                backgroundColor: 'rgba(1, 1, 1, 0.2)',
                backdropFilter: 'blur(0.5px)',
                WebkitBackdropFilter: 'blur(0.5px)',
                border: '1px solid rgba(1, 1, 1, 0.05)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                fontFamily: '"Open Sans", sans-serif',
                color: 'black',
                borderRadius: '8px',
              }}>
                <div className="px-6 py-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-white/80">
                      {activePage && `Last updated: ${new Date(activePage.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                    {cloudSaveConflict.status === 'paused_conflict' &&
                    cloudSaveConflict.projectId === currentProject?.id ? (
                      <div className="text-white/90 flex items-center gap-2">
                        <span>Saving paused — reload to sync with cloud.</span>
                        <Button
                          className="h-7 px-2 text-xs"
                          style={getGlassmorphismStyles('buttonAccent')}
                          onClick={() => void handleReloadFromCloud()}
                        >
                          Reload from cloud
                        </Button>
                      </div>
                    ) : (
                      <div className="text-white/80">
                        {isAuthenticated
                          ? 'Auto-saved locally (syncs to cloud when available)'
                          : 'Auto-saved to local storage'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : shouldShowTemplate ? (
            <div className={!currentProject ? "opacity-30 pointer-events-none" : ""}>
              <TemplateBackground />
            </div>
          ) : null}

          {showReadOnlyOverlay && (
            <div
              className="fixed inset-0 z-40 flex items-center justify-center bg-black/50"
              style={{ pointerEvents: 'auto' }}
            >
              <div
                className="w-full max-w-md mx-4 rounded-xl p-6 text-center shadow-2xl"
                style={getGlassmorphismStyles('dark')}
              >
                <h2 className="text-lg font-semibold text-white mb-2">
                  {isTakeoverPending
                    ? 'Taking over editing...'
                    : 'This project is being edited elsewhere.'}
                </h2>
                <p className="text-sm text-white/70 mb-5">
                  {isTakeoverPending
                    ? 'Reloading the latest cloud version.'
                    : 'To prevent overwriting work, editing is disabled here.'}
                </p>
                {takeoverError && (
                  <p className="text-xs text-white/80 mb-4">{takeoverError}</p>
                )}
                <Button
                  className="h-9 px-4 text-sm"
                  style={getGlassmorphismStyles('buttonAccent')}
                  onClick={() => void handleTakeOverEditing()}
                  disabled={isTakeoverPending}
                >
                  {isTakeoverPending ? 'Taking over…' : 'Take over editing'}
                </Button>
              </div>
            </div>
          )}
          
          {/* Empty State Overlay for authenticated users with no projects */}
          {isAuthenticated && allProjects.length === 0 && !isLoadingCloudProjects && (
            <EmptyProjectState 
              isAuthenticated={true}
              onCreateProject={() => void handleRequestCreateProject()}
              onSignIn={openAuthModal}
            />
          )}
        </main>
        
        {/* Full-screen EmptyProjectState overlay for unauthenticated users with no current project */}
        {!isAuthenticated && !currentProject && (
          <EmptyProjectState 
            isAuthenticated={false}
            onCreateProject={() => void handleRequestCreateProject()}
            onSignIn={openAuthModal}
          />
        )}

        <WorkspaceChoiceModal
          isOpen={showWorkspaceChoiceModal}
          onClose={() => setShowWorkspaceChoiceModal(false)}
          onKeepLocal={() => void handleWorkspaceChoice('local')}
          onSwitchToCloud={() => void handleWorkspaceChoice('cloud')}
          onUpgrade={() => navigate('/billing')}
        />

        <LockedProjectModal
          isOpen={Boolean(lockedProject)}
          onClose={() => setLockedProject(null)}
          onSwitchWorkspace={() => void handleLockedSwitch()}
          onUpgrade={() => navigate('/billing')}
          projectName={lockedProject?.name}
          requiredMode={lockedProject?.requiredMode ?? 'local'}
          projectKind={lockedProject?.projectKind ?? 'local'}
          currentMode={workspaceMode}
        />

        <CloudSaveConflictDialog
          isOpen={cloudSaveConflict.isOpen}
          hasLocalChanges={cloudSaveConflict.hasLocalChanges}
          onReload={() => void handleReloadFromCloud()}
          onClose={() => cloudSaveConflict.close()}
        />
        
        {/* Project Picker Modal - for authenticated users with projects but no active project */}
        {showProjectPicker && isAuthenticated && (
          <ProjectPickerModal
            projects={allProjects.map(p => ({
              id: p.id,
              name: p.name,
              shotCount: p.shotCount,
              isCloudOnly: p.isCloudOnly
            }))}
            onSelectProject={async (projectId) => {
              setShowProjectPicker(false);
              await openProjectWithGate(projectId);
            }}
            onCreateNew={() => {
              void handlePickerCreateNew();
            }}
          />
        )}
        
        {/* Project Limit Dialog - for unauthenticated users hitting project limit */}
        <ProjectLimitDialog
          isOpen={showLimitDialog}
          onClose={() => setShowLimitDialog(false)}
          onSignIn={() => {
            setShowLimitDialog(false);
            openAuthModal();
          }}
        />

        <UpgradeToProDialog
          isOpen={showUpgradeDialog}
          onClose={() => setShowUpgradeDialog(false)}
          onUpgrade={() => navigate("/billing")}
        />
      </div>

      {isUnconfirmedEmail && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          ref={confirmOverlayRef}
          onKeyDownCapture={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="relative">
            {isConfirmingEmail && (
              <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-center pt-6">
                <div
                  className="flex items-center gap-3 rounded-lg px-4 py-2 shadow-2xl"
                  style={getGlassmorphismStyles('dark')}
                >
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/80"></div>
                  <div className="text-sm text-white/80">Checking confirmation…</div>
                </div>
              </div>
            )}

            <div style={isConfirmingEmail ? { pointerEvents: 'none' } : undefined}>
              <ConfirmEmailScreen
                email={user?.email ?? ''}
                onResend={handleResendConfirmation}
                onChangeEmail={handleChangeEmail}
                onCheckConfirmed={handleCheckConfirmed}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;

import React, { useEffect, useState } from 'react';
import { PageTabs } from '@/components/PageTabs';
import { StoryboardPage } from '@/components/StoryboardPage';
import ProjectSelector from '@/components/ProjectSelector';
import { useAppStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { formatShotNumber } from '@/utils/formatShotNumber';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useAuthStore } from '@/store/authStore';
import { DataValidator } from '@/utils/dataValidator';
import { toast } from 'sonner';
import { EmptyProjectState } from '@/components/EmptyProjectState';
import { AuthModal } from '@/components/AuthModal';
import { ProjectPickerModal } from '@/components/ProjectPickerModal';
import { LoggedOutElsewhereScreen } from '@/components/LoggedOutElsewhereScreen';
import { TemplateBackground } from '@/components/TemplateBackground';
import { ProjectLimitDialog } from '@/components/ProjectLimitDialog';
import { getGlassmorphismStyles } from '@/styles/glassmorphism-styles';

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
  
  const { isAuthenticated, isLoading: authLoading, initialize: initializeAuth } = useAuthStore();
  const authStore = useAuthStore();
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoadingCloudProjects, setIsLoadingCloudProjects] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  
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
    if (isAuthenticated && import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true') {
      setIsLoadingCloudProjects(true);
      
      // First, sync any local guest projects to cloud
      import('@/services/guestProjectSyncService').then(({ GuestProjectSyncService }) => {
        GuestProjectSyncService.syncGuestProjectsToCloud().catch(error => {
          console.error('Failed to sync guest projects:', error);
        });
      });

      // Then, sync cloud project list
      import('@/services/cloudProjectSyncService').then(({ CloudProjectSyncService }) => {
        CloudProjectSyncService.syncProjectList()
          .catch(error => {
            console.error('Failed to sync project list:', error);
          })
          .finally(() => {
            setIsLoadingCloudProjects(false);
            // After loading completes, check if we need to show project picker
            if (!currentProject && allProjects.length > 0) {
              setShowProjectPicker(true);
            }
          });
      });
    }
  }, [isAuthenticated]);

  // Show project picker for authenticated users with no current project (after loading)
  useEffect(() => {
    if (isAuthenticated && !isLoadingCloudProjects && !currentProject && allProjects.length > 0) {
      setShowProjectPicker(true);
    } else if (currentProject) {
      setShowProjectPicker(false);
    }
  }, [isAuthenticated, isLoadingCloudProjects, currentProject, allProjects.length]);
  
  // Session validation and real-time session monitoring
  useEffect(() => {
    if (isAuthenticated && import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true') {
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
  }, [isAuthenticated]);
  
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
    return <LoggedOutElsewhereScreen onSignIn={() => setShowAuthModal(true)} />;
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
      {/* Header Section (includes banner + main header) */}
      <div className="pt-6" style={getGlassmorphismStyles('header')}>
        {/* Offline Banner */}
        <OfflineBanner onSignIn={() => setShowAuthModal(true)} />
        
        {/* Main Header */}
        <div className="max-w-7xl mx-auto px-6 pt-4 pb-2">
          <div className="flex items-end justify-between">
            <div>
              <img 
                src="/storyflow-whc_01.png" 
                alt="Storyboard Flow" 
                className="h-4 object-contain"
                style={{
                  imageRendering: 'auto',
                  maxWidth: 'none',
                  width: 'auto',
                  height: '42px',
                  filter: 'none'
                }}
              />
            </div>
            <div className="flex items-end gap-4">
              <ProjectSelector 
                onRequestCreate={() => setShowCreateProjectDialog(true)}
                showCreateDialog={showCreateProjectDialog}
                onCloseCreateDialog={() => setShowCreateProjectDialog(false)}
              />
            </div>
          </div>
        </div>
      </div>

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
                  <div className="text-white/80">
                    {isAuthenticated ? 'Auto-saved to cloud' : 'Auto-saved to local storage'}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : shouldShowTemplate ? (
          <div className={!currentProject ? "opacity-30 pointer-events-none" : ""}>
            <TemplateBackground />
          </div>
        ) : null}
        
        {/* Empty State Overlay for authenticated users with no projects */}
        {isAuthenticated && allProjects.length === 0 && !isLoadingCloudProjects && (
          <EmptyProjectState 
            isAuthenticated={true}
            onCreateProject={() => {
              // Check if user can create a project
              if (!canCreateProject()) {
                toast.error('Maximum number of projects reached');
                return;
              }
              setShowCreateProjectDialog(true);
            }}
            onSignIn={() => setShowAuthModal(true)}
          />
        )}
      </main>
      
      {/* Full-screen EmptyProjectState overlay for unauthenticated users with no current project */}
      {!isAuthenticated && !currentProject && (
        <EmptyProjectState 
          isAuthenticated={false}
          onCreateProject={() => {
            // Check if user can create a project
            if (!canCreateProject()) {
              setShowLimitDialog(true);
              return;
            }
            setShowCreateProjectDialog(true);
          }}
          onSignIn={() => setShowAuthModal(true)}
        />
      )}
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
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
            
            // Find the project to check if it's cloud-only
            const project = allProjects.find(p => p.id === projectId);
            
            try {
              if (project?.isCloudOnly) {
                // Load full project from cloud first
                const { CloudProjectSyncService } = await import('@/services/cloudProjectSyncService');
                await CloudProjectSyncService.loadFullProject(projectId);
                console.log('Cloud project data loaded, switching to project...');
              }
              
              // Switch to the selected project
              const success = await switchToProject(projectId);
              if (success) {
                console.log(`Successfully switched to project: ${project?.name || projectId}`);
              } else {
                console.error('Failed to switch to project');
                toast.error('Failed to load project');
              }
            } catch (error) {
              console.error('Error loading project:', error);
              toast.error('Failed to load project from cloud');
            }
          }}
          onCreateNew={() => {
            // Check if user can create a project
            if (!canCreateProject()) {
              // If not authenticated and at limit, show encouraging dialog
              if (!isAuthenticated) {
                setShowProjectPicker(false);
                setShowLimitDialog(true);
                return;
              }
              // For authenticated users, show error
              toast.error('Maximum number of projects reached');
              return;
            }
            setShowProjectPicker(false);
            setShowCreateProjectDialog(true);
          }}
        />
      )}
      
      {/* Project Limit Dialog - for unauthenticated users hitting project limit */}
      <ProjectLimitDialog
        isOpen={showLimitDialog}
        onClose={() => setShowLimitDialog(false)}
        onSignIn={() => {
          setShowLimitDialog(false);
          setShowAuthModal(true);
        }}
      />
      
    </div>
  );
};

export default Index;

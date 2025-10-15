import React, { useEffect, useState } from 'react';
import { PageTabs } from '@/components/PageTabs';
import { StoryboardPage } from '@/components/StoryboardPage';
import ProjectSelector from '@/components/ProjectSelector';
import { useAppStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { formatShotNumber } from '@/utils/formatShotNumber';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { useAuthStore } from '@/store/authStore';
import { DataValidator } from '@/utils/dataValidator';
import { toast } from 'sonner';
import { EmptyProjectState } from '@/components/EmptyProjectState';
import { AuthModal } from '@/components/AuthModal';
import { ProjectPickerModal } from '@/components/ProjectPickerModal';

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
    reconcileFromShotOrder
  } = useAppStore();
  
  const { isAuthenticated, isLoading: authLoading, initialize: initializeAuth } = useAuthStore();
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoadingCloudProjects, setIsLoadingCloudProjects] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  
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
        
        // Initialize app content (this is the original working code)
        initializeAppContent();
        
        // Pre-render reconcile from canonical shotOrder to avoid first-action swaps
        setTimeout(() => {
          reconcileFromShotOrder();
        }, 50);
        
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
            console.warn('Session is no longer valid, forcing logout');
            const { signOut } = useAuthStore.getState();
            await signOut();
            toast.error('Your session has expired. Please log in again.');
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
                useAuthStore.setState({ user: null, isAuthenticated: false });
                
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
                useAuthStore.setState({ user: null, isAuthenticated: false });
                
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

  // Create a fallback template page for empty state display
  const emptyStatePage = {
    id: 'empty-state-template',
    name: 'Template',
    gridRows: 2,
    gridCols: 4,
    shotIds: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const displayPage = activePage || (allProjects.length === 0 ? emptyStatePage : null);

  if (!activePage && allProjects.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Storyboard Creator
            </h1>
            <p className="text-lg text-gray-600">
              Create, organize, and export professional storyboards
            </p>
          </div>
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Pages Found
              </h3>
              <p className="text-gray-600">
                Start by creating your first storyboard page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const activePageIndex = pages.findIndex(p => p.id === activePageId);

  return (
    <div className="min-h-screen bg-white flex flex-col pt-6 relative">
      {/* Offline Banner */}
      <OfflineBanner />
      
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                STORYBOARD FLOW
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Build storyboard layouts with drag-and-drop ease
              </p>
            </div>
            <div className="flex items-center gap-4">
              <SyncStatusIndicator />
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
        {displayPage && (
          <div className={allProjects.length === 0 && isAuthenticated && !isLoadingCloudProjects ? "opacity-30 pointer-events-none" : ""}>
            <StoryboardPage pageId={displayPage.id} />
          </div>
        )}
        
        {/* Loading state for cloud projects */}
        {isLoadingCloudProjects && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your projects...</p>
            </div>
          </div>
        )}
        
        {/* Empty State Overlay - only shows in main area for authenticated users after loading */}
        {allProjects.length === 0 && isAuthenticated && !isLoadingCloudProjects && (
          <EmptyProjectState 
            isAuthenticated={isAuthenticated}
            onCreateProject={() => setShowCreateProjectDialog(true)}
            onSignIn={() => setShowAuthModal(true)}
          />
        )}
      </main>

      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              {activePage && `Last updated: ${new Date(activePage.updatedAt).toLocaleString()}`}
            </div>
            <div>
              {isAuthenticated ? 'Auto-saved to cloud' : 'Auto-saved to local storage'}
            </div>
          </div>
        </div>
      </footer>
      
      {/* Full-screen Empty State for unauthenticated users - renders outside main content */}
      {allProjects.length === 0 && !isAuthenticated && (
        <EmptyProjectState 
          isAuthenticated={isAuthenticated}
          onCreateProject={() => setShowCreateProjectDialog(true)}
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
            setShowProjectPicker(false);
            setShowCreateProjectDialog(true);
          }}
        />
      )}
    </div>
  );
};

export default Index;

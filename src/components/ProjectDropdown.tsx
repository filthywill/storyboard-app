import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getToolbarContainerStyles, getLayoutToolbarContainerStyles, TOOLBAR_STYLES } from '@/styles/toolbar-styles';
import { getGlassmorphismStyles } from '@/styles/glassmorphism-styles';
import { ProjectLimitDialog } from '@/components/ProjectLimitDialog';
import { UpgradeToProDialog } from '@/components/UpgradeToProDialog';
import { 
  FolderOpen, 
  Plus, 
  MoreHorizontal, 
  Trash2, 
  Edit3,
  Check,
  RotateCcw,
  Cloud,
  WifiOff,
  ArrowUpDown,
  Lock,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { StorageManager } from '@/utils/storageManager';
import { LoadingModal } from '@/components/LoadingModal';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuthStore } from '@/store/authStore';
import { canCreateProjectServerSide } from '@/utils/projectCreationGate';
import { useProjectConflictStore } from '@/store/projectConflictStore';
import { CloudAccessService, type CloudAccessState } from '@/services/cloudAccessService';
import { getProjectOpenState, type ProjectKind } from '@/services/projectOpenGate';
import {
  getWorkspaceMode,
  onWorkspaceModeChange,
  setWorkspaceMode,
  type WorkspaceMode,
} from '@/services/workspaceModeService';
import { WorkspaceChoiceModal } from '@/components/WorkspaceChoiceModal';
import { LockedProjectModal } from '@/components/LockedProjectModal';
import { useAuthModalStore } from '@/store/authModalStore';

export interface ProjectDropdownProps {
  /** Whether to use compact styling (for toolbars) */
  compact?: boolean;
  /** Callback when user requests to create a new project */
  onRequestCreate?: () => void;
}

export const ProjectDropdown = ({ 
  compact = false,
  onRequestCreate
}: ProjectDropdownProps) => {
  const {
    currentProject,
    allProjects,
    switchToProject,
    deleteProject,
    canCreateProject,
  } = useAppStore();

  const { isAuthenticated, user } = useAuthStore();
  const { isOnline } = useNetworkStatus();
  const navigate = useNavigate();
  const { openAuthModal } = useAuthModalStore();

  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [loadingProjectName, setLoadingProjectName] = useState('');
  const [deleteLoadingMessage, setDeleteLoadingMessage] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showWorkspaceChoice, setShowWorkspaceChoice] = useState(false);
  const [workspaceMode, setWorkspaceModeState] = useState<WorkspaceMode>(() =>
    getWorkspaceMode(user?.id)
  );
  const [accessState, setAccessState] = useState<CloudAccessState | null>(null);
  const [lockedProject, setLockedProject] = useState<{
    id: string;
    name: string;
    requiredMode: WorkspaceMode;
    projectKind: ProjectKind;
  } | null>(null);
  useEffect(() => {
    setWorkspaceModeState(getWorkspaceMode(user?.id));
    const unsubscribe = onWorkspaceModeChange((detail) => {
      if (detail.userId === user?.id) {
        setWorkspaceModeState(detail.mode);
      }
    });
    return () => unsubscribe();
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setAccessState(null);
      setLockedProject(null);
      setShowWorkspaceChoice(false);
      return;
    }
    CloudAccessService.getAccessState()
      .then((state) => {
        if (active) setAccessState(state);
      })
      .catch(() => {
        if (active) setAccessState(null);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.id, allProjects.length]);

  // Get sorted projects
  const { getProjectsSortedBy } = useAppStore();
  const sortedProjects = getProjectsSortedBy(sortBy);
  const visibleProjects = sortedProjects ?? [];
  const hasLocalProjects = allProjects.some(
    (project) => project.isLocal && !project.isCloudOnly && !project.isCloudBacked
  );
  const hasCloudProjects = allProjects.some(
    (project) => project.isCloudOnly || project.isCloudBacked
  );
  const isWorkspaceConflict =
    Boolean(isAuthenticated) &&
    accessState?.plan === 'free' &&
    !accessState?.canCreateCloudProject &&
    hasLocalProjects &&
    hasCloudProjects;

  const shouldSuppressSwitchError = () => {
    const { lastBlockedReason, clearBlockedReason } = useProjectConflictStore.getState();
    if (lastBlockedReason) {
      clearBlockedReason();
      return true;
    }
    return false;
  };

  const handleRequestCreateProject = async () => {
    if (!isAuthenticated) {
      if (!canCreateProject()) {
        setShowLimitDialog(true);
        return;
      }
      onRequestCreate?.();
      return;
    }

    try {
      const canCreate = await canCreateProjectServerSide(user?.id);
      if (!canCreate) {
        setShowUpgradeDialog(true);
        return;
      }

      onRequestCreate?.();
    } catch (error) {
      console.error("Project gate check failed:", error);
      toast.error("Couldn't verify your plan. Please try again.");
    }
  };

  const newProjectButton = (
    <Button
      size={compact ? "compact" : "default"}
      className={compact ? "px-2 flex items-center gap-1" : "flex items-center gap-2"}
      style={getGlassmorphismStyles('buttonAccent')}
      onClick={() => void handleRequestCreateProject()}
    >
      <Plus size={16} strokeWidth={2.5} />
      <span>NEW</span>
    </Button>
  );

  // Fallback if project system isn't ready yet
  if (!sortedProjects) {
    return (
      <div className="flex items-center gap-1">
        {newProjectButton}
        <Button variant="outline" size={compact ? "compact" : "default"} disabled className={compact ? "px-2" : ""}>
          <FolderOpen size={16} className={compact ? "mr-1" : "mr-2"} />
          Loading...
        </Button>
      </div>
    );
  }

  // Check storage usage
  const storageSummary = StorageManager.getStorageSummary();
  const storageQuota = StorageManager.checkStorageQuota();

  // Enhanced project selection handler for cloud projects
  const handleProjectSelect = async (project: any) => {
    setLoadingProjectName(project.name);
    setIsLoadingProject(true);

    try {
      const openState = await getProjectOpenState(project.id);
      if (!openState.allowed) {
        if (openState.reason === 'locked_workspace' && openState.requiredMode) {
          setLockedProject({
            id: project.id,
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

      // Check if it's a cloud-only project
      if (project.isCloudOnly) {
        // Check if online
        if (!isOnline) {
          toast.error('Cannot load cloud project while offline');
          return;
        }

        try {
          // Load full project from cloud (saves to localStorage only, doesn't touch stores)
          const { CloudProjectSyncService } = await import('@/services/cloudProjectSyncService');
          await CloudProjectSyncService.loadFullProject(project.id);

          // Now switch to the project (loads from localStorage into stores)
          // Allow normal save of current project before switching
          const success = await switchToProject(project.id, { userInitiated: true });

          if (success) {
            toast.success(`Loaded ${project.name}`);
          } else if (!shouldSuppressSwitchError()) {
            toast.error('Failed to switch to project');
          }
        } catch (error) {
          console.error('Failed to load cloud project:', error);
          toast.error('Failed to load project from cloud');
        }
      } else {
        // Regular local project switch
        const success = await switchToProject(project.id, { userInitiated: true });
        if (!success && !shouldSuppressSwitchError()) {
          toast.error('Failed to switch to project');
        }
      }
    } catch (error) {
      console.error('Error selecting project:', error);
      toast.error('Failed to select project');
    } finally {
      setIsLoadingProject(false);
      setLoadingProjectName('');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (deletingProjectId === projectId) {
      return;
    }

    const projectToDelete = allProjects.find(p => p.id === projectId);
    const isCurrentProject = currentProject?.id === projectId;

    // Show appropriate confirmation message
    let confirmMessage = `Delete "${projectToDelete?.name}"?\n\nThis project will be permanently deleted and cannot be undone.`;
    if (isCurrentProject) {
      confirmMessage += "\n\nAfter deletion, you'll return to the Project Selector to choose what to work on next.";
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingProjectId(projectId);
      setDeleteLoadingMessage(`Deleting ${projectToDelete?.name ?? 'project'}...`);

      // Add loading state to prevent multiple clicks
      const deleteButton = document.querySelector(`[data-project-id="${projectId}"] .delete-button`);
      if (deleteButton) {
        (deleteButton as HTMLElement).style.pointerEvents = 'none';
        (deleteButton as HTMLElement).style.opacity = '0.5';
      }

      const success = await Promise.race([
        deleteProject(projectId),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Delete timeout')), 10000)
        )
      ]);

      if (success) {
        toast.success('Project deleted');
      } else {
        toast.error('Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      if (error instanceof Error && error.message === 'Delete timeout') {
        toast.error('Delete operation timed out. Please try again.');
      } else {
        toast.error('Failed to delete project');
      }
    } finally {
      // Restore button state
      const deleteButton = document.querySelector(`[data-project-id="${projectId}"] .delete-button`);
      if (deleteButton) {
        (deleteButton as HTMLElement).style.pointerEvents = 'auto';
        (deleteButton as HTMLElement).style.opacity = '1';
      }
      setDeletingProjectId((currentId) => currentId === projectId ? null : currentId);
      setDeleteLoadingMessage(null);
    }
  };

  const handleWorkspaceChoice = async (mode: WorkspaceMode) => {
    if (!user?.id) return;
    setWorkspaceMode(mode, user.id);
    setWorkspaceModeState(mode);
    setShowWorkspaceChoice(false);

    const target =
      mode === 'cloud'
        ? allProjects.find((project) => project.isCloudOnly || project.isCloudBacked)
        : allProjects.find(
            (project) => project.isLocal && !project.isCloudOnly && !project.isCloudBacked
          );

    if (target) {
      await handleProjectSelect(target);
    }
  };

  const handleLockedSwitch = async () => {
    if (!lockedProject || !user?.id) {
      setLockedProject(null);
      return;
    }
    setWorkspaceMode(lockedProject.requiredMode, user.id);
    setWorkspaceModeState(lockedProject.requiredMode);
    const target = allProjects.find((project) => project.id === lockedProject.id);
    setLockedProject(null);
    if (target) {
      await handleProjectSelect(target);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {newProjectButton}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size={compact ? "compact" : "default"}
              className={compact ? "px-2" : "flex items-center gap-2"}
              style={compact ? getLayoutToolbarContainerStyles() : getToolbarContainerStyles()}
            >
              <FolderOpen size={16} className={`${TOOLBAR_STYLES.iconClasses} ${compact ? "mr-1" : "mr-2"}`} />
              <span className={compact ? "max-w-32 truncate" : "max-w-40 truncate"}>
                {currentProject?.name || 'No Project'}
              </span>
              <ChevronDown size={14} className={`${TOOLBAR_STYLES.iconClasses} ${compact ? "ml-1" : "ml-2"}`} />
            </Button>
          </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <div className="px-2 py-1 text-sm font-semibold text-white flex items-center justify-between">
            <span>Projects ({visibleProjects.length}/{isAuthenticated ? '15' : '1'})</span>
            {/* Sort controls - moved to top right */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 px-1 py-0.5">
                  <ArrowUpDown className="h-3 w-3 mr-1 text-white" />
                  {sortBy === 'name' ? 'Name' : 'Date'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right">
                <DropdownMenuItem onClick={() => setSortBy('name')}>
                  Sort by Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('date')}>
                  Sort by Date
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isWorkspaceConflict && isAuthenticated && (
            <div className="px-2 py-1 text-xs text-white/80 flex items-center justify-between">
              <span>
                Workspace: {workspaceMode === 'cloud' ? 'Account' : 'Local'}
              </span>
              <button
                type="button"
                className="text-xs text-white/80 hover:text-white underline"
                onClick={() => setShowWorkspaceChoice(true)}
              >
                Switch workspace
              </button>
            </div>
          )}
          {storageQuota.warning && (
            <div className="px-2 py-1 text-xs text-orange-400">
              Storage: {storageSummary.totalUsed.toFixed(1)}MB used
              {storageSummary.largestProject && (
                <div>Largest: {storageSummary.largestProject.name} ({storageSummary.largestProject.size.toFixed(1)}MB)</div>
              )}
            </div>
          )}
          
          {/* Project list */}
          {visibleProjects.map((project) => {
            const projectKind: ProjectKind =
              project.isCloudOnly || project.isCloudBacked ? 'cloud' : 'local';
            const isLocked = isWorkspaceConflict && workspaceMode !== projectKind;
            const isDeletingProject = deletingProjectId === project.id;
            return (
            <DropdownMenuItem
              key={project.id}
              data-project-id={project.id}
              onClick={() => {
                if (isDeletingProject) return;
                handleProjectSelect(project);
              }}
              disabled={(project.isCloudOnly && !isOnline) || isDeletingProject}
              className={`flex items-center justify-between p-1.5 ${
                currentProject?.id === project.id ? 'bg-white/10' : ''
              } ${project.isCloudOnly && !isOnline ? 'opacity-50 cursor-not-allowed' : ''} ${
                isLocked ? 'opacity-70' : ''
              } ${
                isDeletingProject ? 'opacity-60 cursor-wait' : ''
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="truncate font-medium text-white">{project.name}</span>
                {project.isCloudOnly && (
                  <span title="Cloud project">
                    <Cloud className="h-3 w-3 text-blue-400 flex-shrink-0" />
                  </span>
                )}
                {!project.isCloudOnly && project.isCloudBacked && (
                  <span title="Account project">
                    <Cloud className="h-3 w-3 text-blue-400 flex-shrink-0" />
                  </span>
                )}
                {project.isCloudOnly && !isOnline && (
                  <span title="Offline">
                    <WifiOff className="h-3 w-3 text-red-400 flex-shrink-0" />
                  </span>
                )}
                {isLocked && (
                  <span title="Locked workspace">
                    <Lock className="h-3 w-3 text-yellow-400 flex-shrink-0" />
                  </span>
                )}
                {project.id === currentProject?.id && (
                  <Check className="h-3 w-3 text-green-400 flex-shrink-0" />
                )}
              </div>
              <span className="text-xs text-white/70 ml-2 flex-shrink-0">
                {project.shotCount} shots
              </span>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDeletingProject}
                    className="h-6 w-6 p-0 text-white hover:bg-white/10 disabled:opacity-100"
                  >
                    {isDeletingProject ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-white" />
                    ) : (
                      <MoreHorizontal className="h-3 w-3 text-white" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void handleDeleteProject(project.id);
                    }}
                    disabled={isDeletingProject}
                    className="text-red-400 delete-button"
                  >
                    <Trash2 className="h-3 w-3 mr-2 text-red-400" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </DropdownMenuItem>
          );
          })}
          
          {visibleProjects.length === 0 && (
            <div className="px-2 py-4 text-sm text-white/70 text-center">
              No projects yet
            </div>
          )}
        </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Loading Modal */}
      <LoadingModal 
        isVisible={isLoadingProject || Boolean(deleteLoadingMessage)} 
        message={deleteLoadingMessage ?? `Loading ${loadingProjectName}...`}
      />

      <WorkspaceChoiceModal
        isOpen={showWorkspaceChoice}
        onClose={() => setShowWorkspaceChoice(false)}
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
      
      {/* Project Limit Dialog */}
      <ProjectLimitDialog
        isOpen={showLimitDialog}
        onClose={() => setShowLimitDialog(false)}
        onSignIn={openAuthModal}
      />

      <UpgradeToProDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        onUpgrade={() => navigate("/billing")}
      />
      
    </>
  );
};

export default ProjectDropdown;


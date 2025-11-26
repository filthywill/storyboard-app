import React, { useState } from 'react';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getToolbarContainerStyles, TOOLBAR_STYLES } from '@/styles/toolbar-styles';
import { getColor, getGlassmorphismStyles } from '@/styles/glassmorphism-styles';
import { AuthModal } from '@/components/AuthModal';
import { ProjectLimitDialog } from '@/components/ProjectLimitDialog';
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
  ArrowUpDown
} from 'lucide-react';
import { toast } from 'sonner';
import { StorageManager } from '@/utils/storageManager';
import { LoadingModal } from '@/components/LoadingModal';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuthStore } from '@/store/authStore';

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
  
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [loadingProjectName, setLoadingProjectName] = useState('');
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isOnline } = useNetworkStatus();
  const { isAuthenticated } = useAuthStore();

  // Get sorted projects
  const { getProjectsSortedBy } = useAppStore();
  const sortedProjects = getProjectsSortedBy(sortBy);

  // Fallback if project system isn't ready yet
  if (!sortedProjects) {
    return (
      <Button variant="outline" size={compact ? "compact" : "default"} disabled className={compact ? "px-2" : ""}>
        <FolderOpen size={16} className={compact ? "mr-1" : "mr-2"} />
        Loading...
      </Button>
    );
  }

  // Check storage usage
  const storageSummary = StorageManager.getStorageSummary();

  // Enhanced project selection handler for cloud projects
  const handleProjectSelect = async (project: any) => {
    try {
      // Check if it's a cloud-only project
      if (project.isCloudOnly) {
        // Check if online
        if (!isOnline) {
          toast.error('Cannot load cloud project while offline');
          return;
        }

        // Show loading modal
        setLoadingProjectName(project.name);
        setIsLoadingProject(true);

        try {
          // Load full project from cloud (saves to localStorage only, doesn't touch stores)
          const { CloudProjectSyncService } = await import('@/services/cloudProjectSyncService');
          await CloudProjectSyncService.loadFullProject(project.id);

          // Now switch to the project (loads from localStorage into stores)
          // Allow normal save of current project before switching
          const success = await switchToProject(project.id, false);
          
          if (success) {
            toast.success(`Loaded ${project.name}`);
          } else {
            toast.error('Failed to switch to project');
          }
        } catch (error) {
          console.error('Failed to load cloud project:', error);
          toast.error('Failed to load project from cloud');
        } finally {
          setIsLoadingProject(false);
          setLoadingProjectName('');
        }
      } else {
        // Regular local project switch
        const success = await switchToProject(project.id);
        if (!success) {
          toast.error('Failed to switch to project');
        }
      }
    } catch (error) {
      console.error('Error selecting project:', error);
      toast.error('Failed to select project');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const projectToDelete = allProjects.find(p => p.id === projectId);
    const isCurrentProject = currentProject?.id === projectId;
    const isLastProject = allProjects.length <= 1;

    // Show appropriate confirmation message
    let confirmMessage = `Are you sure you want to delete "${projectToDelete?.name}"?`;
    if (isCurrentProject && isLastProject) {
      confirmMessage += '\n\nThis is your last project. You will need to create a new one.';
    } else if (isCurrentProject) {
      confirmMessage += '\n\nYou are currently viewing this project. You will be switched to another project.';
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
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
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size={compact ? "compact" : "default"}
            className={compact ? "px-2" : "flex items-center gap-2"}
            style={getToolbarContainerStyles()}
          >
            <FolderOpen size={16} className={`${TOOLBAR_STYLES.iconClasses} ${compact ? "mr-1" : "mr-2"}`} />
            <span className={compact ? "max-w-24 truncate" : "max-w-32 truncate"}>
              {currentProject?.name || 'No Project'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <div className="px-2 py-1 text-sm font-semibold text-white flex items-center justify-between">
            <span>Projects ({sortedProjects.length}/{isAuthenticated ? '15' : '1'})</span>
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
          {storageSummary.warning && (
            <div className="px-2 py-1 text-xs text-orange-400">
              Storage: {storageSummary.totalUsed.toFixed(1)}MB used
              {storageSummary.largestProject && (
                <div>Largest: {storageSummary.largestProject.name} ({storageSummary.largestProject.size.toFixed(1)}MB)</div>
              )}
            </div>
          )}
          
          {/* Project list */}
          {sortedProjects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              data-project-id={project.id}
              onClick={() => handleProjectSelect(project)}
              disabled={project.isCloudOnly && !isOnline}
              className={`flex items-center justify-between p-1.5 ${
                currentProject?.id === project.id ? 'bg-white/10' : ''
              } ${project.isCloudOnly && !isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="truncate font-medium text-white">{project.name}</span>
                {project.isCloudOnly && (
                  <Cloud className="h-3 w-3 text-blue-400 flex-shrink-0" title="Cloud project" />
                )}
                {project.isCloudOnly && !isOnline && (
                  <WifiOff className="h-3 w-3 text-red-400 flex-shrink-0" title="Offline" />
                )}
                {project.id === currentProject?.id && (
                  <Check className="h-3 w-3 text-green-400 flex-shrink-0" />
                )}
              </div>
              <span className="text-xs text-white/70 ml-2 flex-shrink-0">
                {project.shotCount} shots
              </span>
              
              {/* Only show menu for local projects */}
              {!project.isCloudOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white hover:bg-white/10">
                      <MoreHorizontal className="h-3 w-3 text-white" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => handleDeleteProject(project.id)}
                      className="text-red-400 delete-button"
                    >
                      <Trash2 className="h-3 w-3 mr-2 text-red-400" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </DropdownMenuItem>
          ))}
          
          {sortedProjects.length === 0 && (
            <div className="px-2 py-4 text-sm text-white/70 text-center">
              No projects yet
            </div>
          )}
          
          <div className="mt-2">
            <DropdownMenuItem 
              onClick={() => {
                // Check if user can create a project
                if (!canCreateProject()) {
                  // If not authenticated and at limit, show encouraging dialog
                  if (!isAuthenticated) {
                    setShowLimitDialog(true);
                    return;
                  }
                  // For authenticated users, show error
                  toast.error('Maximum number of projects reached');
                  return;
                }
                onRequestCreate?.();
              }}
              className="py-1.5"
              style={{
                ...getGlassmorphismStyles('buttonAccent'),
                outline: 'none',
                boxShadow: 'none'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.outline = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Plus 
                className="h-4 w-4 mr-2" 
                strokeWidth={2.5}
                style={{ color: getColor('text', 'primary') as string }}
              />
              New Project
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Loading Modal */}
      <LoadingModal 
        isVisible={isLoadingProject} 
        message={`Loading ${loadingProjectName}...`}
      />
      
      {/* Project Limit Dialog */}
      <ProjectLimitDialog
        isOpen={showLimitDialog}
        onClose={() => setShowLimitDialog(false)}
        onSignIn={() => setShowAuthModal(true)}
      />
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};

export default ProjectDropdown;


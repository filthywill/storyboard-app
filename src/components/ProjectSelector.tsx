import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FolderOpen, 
  Plus, 
  MoreHorizontal, 
  Trash2, 
  Edit3,
  Check,
  X,
  Save,
  RotateCcw,
  LogIn,
  LogOut,
  Cloud,
  WifiOff,
  ArrowUpDown
} from 'lucide-react';
import { toast } from 'sonner';
import { LocalStorageManager } from '@/utils/localStorageManager';
import { StorageManager } from '@/utils/storageManager';
import { useAuthStore } from '@/store/authStore';
import { AuthModal } from '@/components/AuthModal';
import { StorageQuotaManager } from '@/utils/storageQuota';
import { LoadingModal } from '@/components/LoadingModal';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export interface ProjectSelectorProps {
  onRequestCreate?: () => void;
  showCreateDialog?: boolean;
  onCloseCreateDialog?: () => void;
}

export const ProjectSelector = ({ 
  onRequestCreate,
  showCreateDialog: externalShowCreateDialog,
  onCloseCreateDialog
}: ProjectSelectorProps = {}) => {
  const {
    currentProject,
    allProjects,
    canCreateProject,
    createProject,
    switchToProject,
    deleteProject,
    renameProject,
    saveCurrentProject,
  } = useAppStore();
  
  const { isAuthenticated, user, signOut } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [storageQuota, setStorageQuota] = useState<{ used: number; limit: number; percentUsed: number } | null>(null);
  
  // New state for cloud project handling
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [loadingProjectName, setLoadingProjectName] = useState('');
  const { isOnline } = useNetworkStatus();

  // Load storage quota when authenticated
  useEffect(() => {
    if (isAuthenticated && import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true') {
      StorageQuotaManager.checkUserQuota().then(quota => {
        setStorageQuota(quota);
      });
    }
  }, [isAuthenticated]);

  // Use external control if provided, otherwise use local state
  const [internalShowCreateDialog, setInternalShowCreateDialog] = useState(false);
  const showCreateDialog = externalShowCreateDialog ?? internalShowCreateDialog;
  const setShowCreateDialog = onCloseCreateDialog ? 
    (value: boolean) => { 
      if (value) {
        // When opening dialog, we need to notify the parent
        onRequestCreate?.();
      } else {
        // When closing dialog, notify the parent
        onCloseCreateDialog();
      }
    } : 
    setInternalShowCreateDialog;

  // Get sorted projects
  const { getProjectsSortedBy } = useAppStore();
  const sortedProjects = getProjectsSortedBy(sortBy);

  // Fallback if project system isn't ready yet
  if (!sortedProjects) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" disabled>
          <FolderOpen className="h-4 w-4" />
          Loading...
        </Button>
      </div>
    );
  }

  // Check storage usage
  const storageSummary = StorageManager.getStorageSummary();
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [renameValue, setRenameValue] = useState('');

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Project name is required');
      return;
    }

    try {
      const projectId = await createProject(newProjectName.trim(), newProjectDescription.trim() || undefined);
      if (projectId) {
        toast.success(`Created project: ${newProjectName}`);
        setNewProjectName('');
        setNewProjectDescription('');
        setShowCreateDialog(false);
      } else {
        toast.error('Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };

  const handleSwitchProject = async (projectId: string) => {
    try {
      // Check if project still exists before attempting to switch
      const project = sortedProjects.find(p => p.id === projectId);
      if (!project) {
        console.warn(`Project ${projectId} no longer exists, skipping switch`);
        return;
      }

      const success = await switchToProject(projectId);
      if (success) {
        toast.success(`Switched to: ${project.name}`);
      } else {
        // Check if it's a storage quota issue
        const storageSummary = StorageManager.getStorageSummary();
        if (!storageSummary.largestProject) {
          toast.error('Failed to switch project');
        } else {
          toast.error(`Storage quota exceeded. Consider deleting "${storageSummary.largestProject.name}" to free up ${storageSummary.largestProject.size.toFixed(1)}MB.`);
        }
      }
    } catch (error) {
      console.error('Error switching project:', error);
      toast.error('Failed to switch project');
    }
  };

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

  const handleRenameProject = (projectId: string) => {
    const project = allProjects.find(p => p.id === projectId);
    if (project) {
      setRenameValue(project.name);
      setEditingProjectId(projectId);
      setShowRenameDialog(true);
    }
  };

  const handleRenameConfirm = () => {
    if (!editingProjectId || !renameValue.trim()) {
      toast.error('Project name is required');
      return;
    }

    try {
      renameProject(editingProjectId, renameValue.trim());
      toast.success('Project renamed');
      setShowRenameDialog(false);
      setEditingProjectId(null);
      setRenameValue('');
    } catch (error) {
      console.error('Error renaming project:', error);
      toast.error('Failed to rename project');
    }
  };

  const handleSaveProject = async () => {
    try {
      // Clear any pending debounced save
      if (window.autoSaveTimeout) {
        clearTimeout(window.autoSaveTimeout);
      }
      
      // Save immediately
      const success = await saveCurrentProject();
      if (success) {
        toast.success('Project saved successfully');
      } else {
        toast.error('Failed to save project');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project');
    }
  };

  const handleResetAppData = () => {
    if (window.confirm('This will clear all app data and reset to defaults. Are you sure?')) {
      try {
        LocalStorageManager.clearAllProjectData();
        toast.success('App data cleared. Please refresh the page.');
        // Refresh the page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error('Error clearing app data:', error);
        toast.error('Failed to clear app data');
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Auth Button */}
      {import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true' && (
        <>
          {!isAuthenticated ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {user?.email}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          )}
        </>
      )}

      {/* Storage Quota Indicator */}
      {isAuthenticated && storageQuota && (
        <div className="text-xs text-gray-500">
          {StorageQuotaManager.formatQuotaDisplay(storageQuota)}
        </div>
      )}

      {/* Save Project Button */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleSaveProject}
        className="flex items-center gap-2"
      >
        <Save className="h-4 w-4" />
        Save
      </Button>

      {/* Current Project Display */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="max-w-32 truncate">
              {currentProject?.name || 'No Project'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <div className="px-2 py-1 text-sm font-semibold text-gray-900">
            Projects ({sortedProjects.length}/15)
          </div>
          {storageSummary.warning && (
            <div className="px-2 py-1 text-xs text-orange-600">
              Storage: {storageSummary.totalUsed.toFixed(1)}MB used
              {storageSummary.largestProject && (
                <div>Largest: {storageSummary.largestProject.name} ({storageSummary.largestProject.size.toFixed(1)}MB)</div>
              )}
            </div>
          )}
          
          {/* Sort controls */}
          <div className="px-2 py-2 border-b">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <ArrowUpDown className="h-3 w-3 mr-2" />
                  Sort by: {sortBy === 'name' ? 'Name' : 'Date'}
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
          
          <DropdownMenuSeparator />
          
          {/* Project list */}
          {sortedProjects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              data-project-id={project.id}
              onClick={() => handleProjectSelect(project)}
              disabled={project.isCloudOnly && !isOnline}
              className={`flex items-center justify-between p-1.5 ${
                currentProject?.id === project.id ? 'bg-blue-50' : ''
              } ${project.isCloudOnly && !isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="truncate font-medium">{project.name}</span>
                {project.isCloudOnly && (
                  <Cloud className="h-3 w-3 text-blue-500 flex-shrink-0" title="Cloud project" />
                )}
                {project.isCloudOnly && !isOnline && (
                  <WifiOff className="h-3 w-3 text-red-500 flex-shrink-0" title="Offline" />
                )}
                {project.id === currentProject?.id && (
                  <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                )}
              </div>
              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                {project.shotCount} shots
              </span>
              
              {/* Only show menu for local projects */}
              {!project.isCloudOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleRenameProject(project.id)}>
                      <Edit3 className="h-3 w-3 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteProject(project.id)}
                      className="text-red-600 delete-button"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </DropdownMenuItem>
          ))}
          
          {sortedProjects.length === 0 && (
            <div className="px-2 py-4 text-sm text-gray-500 text-center">
              No projects yet
            </div>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setShowCreateDialog(true)}
            disabled={!canCreateProject}
            className="text-blue-600 py-1.5"
          >
            <Plus className="h-3 w-3 mr-2" />
            New Project
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleResetAppData}
            className="text-red-600 py-1.5"
          >
            <RotateCcw className="h-3 w-3 mr-2" />
            Reset App Data
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new storyboard project with a custom name and description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
                maxLength={50}
              />
            </div>
            <div>
              <Label htmlFor="project-description">Description (Optional)</Label>
              <Textarea
                id="project-description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Enter project description"
                maxLength={200}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Project Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Update the name of your storyboard project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rename-project">Project Name</Label>
              <Input
                id="rename-project"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Enter new project name"
                maxLength={50}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameConfirm}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
      
      {/* Loading Modal */}
      <LoadingModal 
        isVisible={isLoadingProject} 
        message={`Loading ${loadingProjectName}...`}
      />
    </div>
  );
};

// Export as default for easier importing
export default ProjectSelector;

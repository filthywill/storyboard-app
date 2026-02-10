import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  LogIn
} from 'lucide-react';
import { UserAccountDropdown } from '@/components/UserAccountDropdown';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { AuthModal } from '@/components/AuthModal';
import { ProjectLimitDialog } from '@/components/ProjectLimitDialog';
import { UpgradeToProDialog } from '@/components/UpgradeToProDialog';
import { getGlassmorphismStyles, getColor } from '@/styles/glassmorphism-styles';
import { canCreateProjectServerSide } from '@/utils/projectCreationGate';

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
    canCreateProject,
    createProject,
  } = useAppStore();
  
  const navigate = useNavigate();
  const { isAuthenticated, user, signOut } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Use external control if provided, otherwise use local state
  const [internalShowCreateDialog, setInternalShowCreateDialog] = useState(false);
  const showCreateDialog = externalShowCreateDialog ?? internalShowCreateDialog;
  
  const requestCreateProject = async (): Promise<boolean> => {
    if (!isAuthenticated) {
      if (!canCreateProject()) {
        setShowLimitDialog(true);
        return false;
      }
      return true;
    }

    try {
      const canCreate = await canCreateProjectServerSide(user?.id);
      if (!canCreate) {
        setShowUpgradeDialog(true);
        return false;
      }
    } catch (error) {
      console.error("Project gate check failed:", error);
      toast.error("Couldn't verify your plan. Please try again.");
      return false;
    }

    return true;
  };

  const setShowCreateDialog = onCloseCreateDialog ? 
    (value: boolean) => { 
      if (value) {
        void onRequestCreate?.();
      } else {
        // When closing dialog, notify the parent
        onCloseCreateDialog();
      }
    } : 
    (value: boolean) => {
      if (value) {
        void requestCreateProject().then((allowed) => {
          if (allowed) {
            setInternalShowCreateDialog(true);
          }
        });
        return;
      }
      setInternalShowCreateDialog(false);
    };

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

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
    } catch (error: any) {
      console.error('Error creating project:', error);
      
      // Check for upgrade required error
      if (error.code === 'UPGRADE_REQUIRED') {
        toast.error(error.message);
        setShowCreateDialog(false);
        setNewProjectName('');
        setNewProjectDescription('');
        navigate('/billing');
        return;
      }
      
      toast.error('Failed to create project');
    }
  };


  return (
    <div className="flex items-center gap-2">
      {/* Auth Button */}
      {import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true' && (
        <>
          {!isAuthenticated ? (
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-base px-2 py-1 rounded transition-colors flex items-center gap-2"
              style={{ 
                fontFamily: '"Gabarito", sans-serif',
                fontWeight: 600,
                ...getGlassmorphismStyles('button')
              }}
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
          ) : (
            <UserAccountDropdown />
          )}
        </>
      )}

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent style={getGlassmorphismStyles('dark')}>
          <DialogHeader>
            <DialogTitle style={{ color: getColor('text', 'primary') as string }}>
              Create New Project
            </DialogTitle>
            <DialogDescription style={{ color: getColor('text', 'secondary') as string }}>
              Create a new storyboard project with a custom name and description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name" style={{ color: getColor('text', 'primary') as string }}>
                Project Name
              </Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
                maxLength={50}
                style={{
                  backgroundColor: getColor('input', 'background') as string,
                  border: `1px solid ${getColor('input', 'border') as string}`,
                  color: getColor('text', 'primary') as string
                }}
              />
            </div>
            <div>
              <Label htmlFor="project-description" style={{ color: getColor('text', 'primary') as string }}>
                Description (Optional)
              </Label>
              <Textarea
                id="project-description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Enter project description"
                maxLength={200}
                rows={3}
                style={{
                  backgroundColor: getColor('input', 'background') as string,
                  border: `1px solid ${getColor('input', 'border') as string}`,
                  color: getColor('text', 'primary') as string
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setShowCreateDialog(false)}
              style={getGlassmorphismStyles('button')}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProject}
              style={getGlassmorphismStyles('buttonAccent')}
            >
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
      
      {/* Project Limit Dialog */}
      <ProjectLimitDialog
        isOpen={showLimitDialog}
        onClose={() => setShowLimitDialog(false)}
        onSignIn={() => setShowAuthModal(true)}
      />

      <UpgradeToProDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        onUpgrade={() => navigate('/billing')}
      />
    </div>
  );
};

// Export as default for easier importing
export default ProjectSelector;

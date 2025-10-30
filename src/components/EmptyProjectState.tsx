import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FolderPlus, LogIn } from 'lucide-react';
import { getGlassmorphismStyles, getColor, MODAL_OVERLAY_STYLES } from '@/styles/glassmorphism-styles';

interface EmptyProjectStateProps {
  isAuthenticated: boolean;
  onCreateProject: () => void;
  onSignIn: () => void;
}

export const EmptyProjectState: React.FC<EmptyProjectStateProps> = ({ 
  isAuthenticated,
  onCreateProject,
  onSignIn
}) => {
  if (isAuthenticated) {
    // Authenticated users: Simple create button (no full-screen overlay)
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto text-center">
          <Button 
            onClick={onCreateProject}
            size="lg"
            className="shadow-lg"
          >
            <FolderPlus className="h-5 w-5 mr-2" />
            Create New Project
          </Button>
          <p
            className="text-sm mt-4"
            style={{ color: getColor('text', 'muted') as string }}
          >
            Or select an existing project from the menu above
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated users: Full-screen modal overlay
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={MODAL_OVERLAY_STYLES}>
      <Card className="w-96 shadow-2xl" style={getGlassmorphismStyles('dark')}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: getColor('background', 'accent') as string }}
            >
              <FolderPlus className="h-8 w-8" style={{ color: getColor('text', 'primary') as string }} />
            </div>
          </div>
          <CardTitle className="text-2xl" style={{ color: getColor('text', 'primary') as string }}>Welcome to Storyboard Flow</CardTitle>
          <CardDescription className="text-base mt-2" style={{ color: getColor('text', 'secondary') as string }}>
            Create professional storyboards with ease
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          <Button 
            onClick={onSignIn}
            size="lg"
            className="w-full text-white"
            variant="default"
            style={getGlassmorphismStyles('buttonSecondary')}
          >
            <LogIn className="h-5 w-5 mr-2" />
            Sign In / Sign Up
          </Button>
          <Button 
            onClick={onCreateProject}
            size="lg"
            className="w-full text-white"
            variant="outline"
            style={getGlassmorphismStyles('button')}
          >
            <FolderPlus className="h-5 w-5 mr-2" />
            Create a Test Project
          </Button>
          <p
            className="text-xs text-center pt-2"
            style={{ color: getColor('text', 'muted') as string }}
          >
            Test projects are saved locally. Sign in to sync to the cloud.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};


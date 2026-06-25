import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Chrome, FolderPlus, Mail } from 'lucide-react';
import { getGlassmorphismStyles, getColor, MODAL_OVERLAY_STYLES } from '@/styles/glassmorphism-styles';

interface EmptyProjectStateProps {
  isAuthenticated: boolean;
  onCreateProject: () => void;
  onSignIn: () => void;
  onGoogleSignIn: () => void;
}

export const EmptyProjectState: React.FC<EmptyProjectStateProps> = ({ 
  isAuthenticated,
  onCreateProject,
  onSignIn,
  onGoogleSignIn,
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
            <img
              src="/sf_icon_01.svg"
              alt="Storyboard Flow logo"
              className="h-16 w-16"
            />
          </div>
          <CardTitle className="text-2xl" style={{ color: getColor('text', 'primary') as string }}>Welcome to Storyboard Flow</CardTitle>
          <CardDescription className="text-base mt-2" style={{ color: getColor('text', 'secondary') as string }}>
            Layout storyboards fast and easy
          </CardDescription>
         
        </CardHeader>
        <CardContent className="space-y-3 pb-6 pt-2">
          <Button
            onClick={onGoogleSignIn}
            size="lg"
            className="w-full text-white"
            style={getGlassmorphismStyles('buttonAccent')}
          >
            <Chrome className="h-5 w-5 mr-2" aria-hidden="true" />
            Continue with Google
          </Button>
          <Button
            onClick={onSignIn}
            size="lg"
            className="w-full text-white"
            style={getGlassmorphismStyles('buttonSecondary')}
          >
            <Mail className="h-5 w-5 mr-2" aria-hidden="true" />
            Continue with Email
          </Button>

          <div className="py-2" role="presentation">
            <Separator
              style={{ backgroundColor: getColor('input', 'border') as string }}
            />
          </div>

          <Button
            onClick={onCreateProject}
            size="lg"
            className="w-full text-white"
            style={getGlassmorphismStyles('button')}
            aria-describedby="guest-workflow-helper"
          >
            Try Without an Account
          </Button>
          <p
            id="guest-workflow-helper"
            className="text-xs text-center pt-1"
            style={{ color: getColor('text', 'muted') as string }}
          >
            Create a free account to save your project.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};


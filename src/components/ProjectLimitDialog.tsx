import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, LogIn } from 'lucide-react';
import { getGlassmorphismStyles } from '@/styles/glassmorphism-styles';

interface ProjectLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
}

export const ProjectLimitDialog: React.FC<ProjectLimitDialogProps> = ({
  isOpen,
  onClose,
  onSignIn,
}) => {
  const handleSignIn = () => {
    onClose();
    onSignIn();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-md"
        style={getGlassmorphismStyles('dark')}
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl text-white">
            Ready for More?
          </DialogTitle>
          <DialogDescription className="text-center text-base text-white/80 mt-2">
            You've reached the test project limit. Create an account to unlock unlimited projects, cloud sync, and more!
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-3 text-sm text-white/70">
            <div className="flex items-start gap-2">
              <div className="mt-0.5">✨</div>
              <div>Create unlimited projects</div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5">☁️</div>
              <div>Automatic cloud backup & sync</div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5">📱</div>
              <div>Access your work from any device</div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5">🎨</div>
              <div>Advanced features and tools</div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={handleSignIn}
            className="w-full text-white"
            size="lg"
            style={getGlassmorphismStyles('accent')}
          >
            <LogIn className="h-5 w-5 mr-2 text-white" />
            Sign In / Create Account
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-white/70 hover:text-white hover:bg-white/10"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


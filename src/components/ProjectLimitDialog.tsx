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

interface FeatureBullet {
  emoji: string;
  text: string;
}

const DEFAULT_FEATURE_BULLETS: FeatureBullet[] = [
  { emoji: '✨', text: 'Create unlimited projects' },
  { emoji: '☁️', text: 'Automatic cloud backup & sync' },
  { emoji: '📱', text: 'Access your work from any device' },
  { emoji: '🎨', text: 'Advanced features and tools' },
];

interface ProjectLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
  title?: string;
  description?: string;
  featureBullets?: FeatureBullet[];
}

export const ProjectLimitDialog: React.FC<ProjectLimitDialogProps> = ({
  isOpen,
  onClose,
  onSignIn,
  title = 'Ready for More?',
  description = "You've reached the test project limit. Create an account to unlock unlimited projects, cloud sync, and more!",
  featureBullets = DEFAULT_FEATURE_BULLETS,
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
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-base text-white/80 mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-3 text-sm text-white/70">
            {featureBullets.map((bullet) => (
              <div key={bullet.text} className="flex items-start gap-2">
                <div className="mt-0.5">{bullet.emoji}</div>
                <div>{bullet.text}</div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={handleSignIn}
            className="w-full"
            size="lg"
            style={getGlassmorphismStyles('buttonAccent')}
          >
            <LogIn className="h-5 w-5 mr-2" />
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


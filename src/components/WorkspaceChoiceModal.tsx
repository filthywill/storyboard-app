import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getColor, getGlassmorphismStyles } from '@/styles/glassmorphism-styles';

interface WorkspaceChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeepLocal: () => void;
  onSwitchToCloud: () => void;
  onUpgrade: () => void;
}

export const WorkspaceChoiceModal: React.FC<WorkspaceChoiceModalProps> = ({
  isOpen,
  onClose,
  onKeepLocal,
  onSwitchToCloud,
  onUpgrade,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl" style={getGlassmorphismStyles('dark')}>
        <DialogHeader>
          <DialogTitle style={{ color: getColor('text', 'primary') as string }}>
            Your account already has a saved project
          </DialogTitle>
          <DialogDescription
            className="space-y-2"
            style={{ color: getColor('text', 'secondary') as string }}
          >
            <p>You created a Local Draft on this device.</p>
            <p>Your account already has 1 saved project.</p>
            <p>Free includes 1 saved project in the cloud.</p>
            <p>
              Choose what you want to work on right now. You can still keep the other
              project locally on this device.
            </p>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            style={getGlassmorphismStyles('buttonAccent')}
            onClick={onKeepLocal}
          >
            Keep working locally
          </Button>
          <Button
            style={getGlassmorphismStyles('buttonSecondary')}
            onClick={onSwitchToCloud}
          >
            Switch to account project
          </Button>
          <Button
            style={getGlassmorphismStyles('button')}
            onClick={onUpgrade}
          >
            Upgrade to Pro
          </Button>
          <div className="text-xs text-white/70 text-center">
            You can switch workspaces anytime from the Project List.
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

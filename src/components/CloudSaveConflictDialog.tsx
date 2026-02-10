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
import { getGlassmorphismStyles, getColor } from '@/styles/glassmorphism-styles';

interface CloudSaveConflictDialogProps {
  isOpen: boolean;
  hasLocalChanges: boolean;
  onReload: () => void;
  onClose: () => void;
}

export const CloudSaveConflictDialog: React.FC<CloudSaveConflictDialogProps> = ({
  isOpen,
  hasLocalChanges,
  onReload,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" style={getGlassmorphismStyles('dark')}>
        <DialogHeader>
          <DialogTitle style={{ color: getColor('text', 'primary') as string }}>
            This project was updated elsewhere
          </DialogTitle>
          <DialogDescription style={{ color: getColor('text', 'secondary') as string }}>
            Your copy is out of date. Reload to get the latest version.
            {hasLocalChanges && (
              <span className="block mt-2">
                Reloading will discard your local changes.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button style={getGlassmorphismStyles('buttonAccent')} onClick={onReload}>
            Reload from cloud
          </Button>
          <Button style={getGlassmorphismStyles('button')} onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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
import type { WorkspaceMode } from '@/services/workspaceModeService';
import type { ProjectKind } from '@/services/projectOpenGate';

interface LockedProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchWorkspace: () => void;
  onUpgrade: () => void;
  projectName?: string;
  requiredMode: WorkspaceMode;
  projectKind: ProjectKind;
  currentMode: WorkspaceMode;
}

export const LockedProjectModal: React.FC<LockedProjectModalProps> = ({
  isOpen,
  onClose,
  onSwitchWorkspace,
  onUpgrade,
  projectName,
  requiredMode,
  projectKind,
  currentMode,
}) => {
  const title =
    projectKind === 'cloud' ? 'Account project is locked' : 'Local project is locked';

  const description =
    projectKind === 'cloud'
      ? [
          'This project is saved to your account.',
          `You're currently working in ${currentMode === 'local' ? 'Local' : 'Account'} workspace.`,
          'On Free, you can work on either your Local Draft or your Account Project, but not both at the same time.',
        ]
      : [
          'This project is stored only on this device.',
          `You're currently working in ${currentMode === 'local' ? 'Local' : 'Account'} workspace.`,
          'On Free, you can work on either your Local Draft or your Account Project, but not both at the same time.',
        ];

  const switchLabel =
    requiredMode === 'cloud'
      ? 'Switch to Account workspace'
      : 'Switch to Local workspace';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" style={getGlassmorphismStyles('dark')}>
        <DialogHeader>
          <DialogTitle style={{ color: getColor('text', 'primary') as string }}>
            {title}
          </DialogTitle>
          <DialogDescription
            className="space-y-2"
            style={{ color: getColor('text', 'secondary') as string }}
          >
            {projectName && (
              <p>
                <strong>{projectName}</strong>
              </p>
            )}
            {description.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            style={getGlassmorphismStyles('buttonAccent')}
            onClick={onSwitchWorkspace}
          >
            {switchLabel}
          </Button>
          <Button
            style={getGlassmorphismStyles('buttonSecondary')}
            onClick={onUpgrade}
          >
            Upgrade to Pro
          </Button>
          <Button style={getGlassmorphismStyles('button')} onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

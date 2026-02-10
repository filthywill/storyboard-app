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
import { ProjectMetadata } from '@/store/projectManagerStore';
import { getColor, getGlassmorphismStyles } from '@/styles/glassmorphism-styles';

interface ProjectConflictDialogProps {
  isOpen: boolean;
  localProject: ProjectMetadata | null;
  cloudProject: ProjectMetadata | null;
  onUpgrade: () => void;
  onKeepAccountProject: () => void;
  onKeepLocalDraft: () => void;
  onSignOut: () => void;
  onClose: () => void;
}

const formatTimestamp = (value?: Date | string) => {
  if (!value) return 'Unknown';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

export const ProjectConflictDialog: React.FC<ProjectConflictDialogProps> = ({
  isOpen,
  localProject,
  cloudProject,
  onUpgrade,
  onKeepAccountProject,
  onKeepLocalDraft,
  onSignOut,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl" style={getGlassmorphismStyles('dark')}>
        <DialogHeader>
          <DialogTitle style={{ color: getColor('text', 'primary') as string }}>
            Choose which project to keep
          </DialogTitle>
          <DialogDescription className="space-y-2" style={{ color: getColor('text', 'secondary') as string }}>
            <p>
              You&apos;re signed in on the Free plan, which includes 1 project.
            </p>
            <p>
              Right now you have 1 local draft on this device and 1 project in your account.
            </p>
            <p>
              Pick what to keep. You can upgrade to Pro to keep both.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: getColor('background', 'subtle') as string,
              border: `1px solid ${getColor('border', 'primary') as string}`,
            }}
          >
            <div className="text-sm font-semibold" style={{ color: getColor('text', 'primary') as string }}>
              Local draft
            </div>
            <div className="mt-2 text-base" style={{ color: getColor('text', 'primary') as string }}>
              {localProject?.name || 'Untitled local draft'}
            </div>
            <div className="mt-2 text-xs" style={{ color: getColor('text', 'muted') as string }}>
              Last edited: {formatTimestamp(localProject?.lastModified)}
            </div>
            {typeof localProject?.shotCount === 'number' && (
              <div className="mt-1 text-xs" style={{ color: getColor('text', 'muted') as string }}>
                Shots: {localProject.shotCount}
              </div>
            )}
          </div>

          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: getColor('background', 'subtle') as string,
              border: `1px solid ${getColor('border', 'primary') as string}`,
            }}
          >
            <div className="text-sm font-semibold" style={{ color: getColor('text', 'primary') as string }}>
              Account project
            </div>
            <div className="mt-2 text-base" style={{ color: getColor('text', 'primary') as string }}>
              {cloudProject?.name || 'Untitled account project'}
            </div>
            <div className="mt-2 text-xs" style={{ color: getColor('text', 'muted') as string }}>
              Last edited: {formatTimestamp(cloudProject?.lastModified)}
            </div>
            {typeof cloudProject?.shotCount === 'number' && (
              <div className="mt-1 text-xs" style={{ color: getColor('text', 'muted') as string }}>
                Shots: {cloudProject.shotCount}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:items-stretch">
          <Button
            onClick={onUpgrade}
            className="w-full"
            style={getGlassmorphismStyles('buttonAccent')}
          >
            Upgrade to Pro (keep both)
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={onKeepAccountProject}
              className="w-full"
              style={getGlassmorphismStyles('buttonSecondary')}
            >
              Keep account project
            </Button>
            <Button
              onClick={onKeepLocalDraft}
              className="w-full"
              style={getGlassmorphismStyles('buttonSecondary')}
            >
              Keep local draft
            </Button>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="text-sm underline"
            style={{ color: getColor('status', 'statusBadgeRedText') as string }}
          >
            Sign out
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { getGlassmorphismStyles } from "@/styles/glassmorphism-styles";

interface UpgradeToProDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export const UpgradeToProDialog: React.FC<UpgradeToProDialogProps> = ({
  isOpen,
  onClose,
  onUpgrade,
}) => {
  const handleUpgrade = () => {
    onClose();
    onUpgrade();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md"
        style={getGlassmorphismStyles("dark")}
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl text-white">
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription className="text-center text-base text-white/80 mt-2">
            You've reached the free project limit. Upgrade to Pro to create
            unlimited projects.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-3 text-sm text-white/70">
            <div className="flex items-start gap-2">
              <div className="mt-0.5">-</div>
              <div>Create unlimited projects</div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5">-</div>
              <div>Automatic cloud backup & sync</div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5">-</div>
              <div>Access your work from any device</div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5">-</div>
              <div>Advanced features and tools</div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={handleUpgrade}
            className="w-full"
            size="lg"
            style={getGlassmorphismStyles("buttonAccent")}
          >
            Upgrade to Pro
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

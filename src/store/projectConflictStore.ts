import { create } from 'zustand';

export type ProjectSwitchBlockedReason = 'conflict' | 'plan_check_failed' | null;

interface ProjectConflictState {
  isOpen: boolean;
  lastBlockedReason: ProjectSwitchBlockedReason;
  resolutionVersion: number;
  openDialog: () => void;
  closeDialog: () => void;
  setBlockedReason: (reason: ProjectSwitchBlockedReason) => void;
  clearBlockedReason: () => void;
  bumpResolutionVersion: () => void;
}

export const useProjectConflictStore = create<ProjectConflictState>((set) => ({
  isOpen: false,
  lastBlockedReason: null,
  resolutionVersion: 0,
  openDialog: () => set({ isOpen: true, lastBlockedReason: 'conflict' }),
  closeDialog: () => set({ isOpen: false, lastBlockedReason: null }),
  setBlockedReason: (reason) => set({ lastBlockedReason: reason }),
  clearBlockedReason: () => set({ lastBlockedReason: null }),
  bumpResolutionVersion: () =>
    set((state) => ({ resolutionVersion: state.resolutionVersion + 1 })),
}));

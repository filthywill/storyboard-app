import { create } from 'zustand';

interface CloudSaveConflictState {
  isOpen: boolean;
  projectId: string | null;
  hasLocalChanges: boolean;
  status: 'idle' | 'paused_conflict';
  conflictUpdatedAt: string | null;
  open: (projectId: string, hasLocalChanges: boolean) => void;
  close: () => void;
  pause: (projectId: string, conflictUpdatedAt?: string | null) => void;
  clearPause: () => void;
}

export const useCloudSaveConflictStore = create<CloudSaveConflictState>((set, get) => ({
  isOpen: false,
  projectId: null,
  hasLocalChanges: false,
  status: 'idle',
  conflictUpdatedAt: null,
  open: (projectId, hasLocalChanges) => {
    const state = get();
    if (state.isOpen && state.projectId === projectId) return;
    set({ isOpen: true, projectId, hasLocalChanges });
  },
  close: () => set({ isOpen: false, projectId: null, hasLocalChanges: false }),
  pause: (projectId, conflictUpdatedAt) =>
    set({
      status: 'paused_conflict',
      projectId,
      conflictUpdatedAt: conflictUpdatedAt ?? null,
      isOpen: false,
      hasLocalChanges: false
    }),
  clearPause: () =>
    set({
      status: 'idle',
      conflictUpdatedAt: null,
      projectId: null
    })
}));

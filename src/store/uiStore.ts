import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface UIState {
  isDragging: boolean;
  isExporting: boolean;
  showDeleteConfirmation: boolean;
}

export interface UIActions {
  // Export state
  setIsExporting: (isExporting: boolean) => void;
  
  // Drag state
  setIsDragging: (isDragging: boolean) => void;
  
  // Confirmation dialogs
  setShowDeleteConfirmation: (show: boolean) => void;
  
  // Utility
  resetUIState: () => void;
}

export type UIStore = UIState & UIActions;

const defaultUIState: UIState = {
  isDragging: false,
  isExporting: false,
  showDeleteConfirmation: true,
};

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set, get) => ({
      // Initial state
      ...defaultUIState,

      // Export state
      setIsExporting: (isExporting: boolean) => set({ isExporting }),

      // Drag state
      setIsDragging: (isDragging: boolean) => set({ isDragging }),

      // Confirmation dialogs
      setShowDeleteConfirmation: (show: boolean) => set({ showDeleteConfirmation: show }),

      // Utility
      resetUIState: () => set({
        isDragging: false,
        isExporting: false,
        showDeleteConfirmation: false
      }),
    }),
    {
      name: 'ui-store',
      partialize: (state) => {
        return state;
      },
      migrate: (persistedState, version) => {
        return persistedState;
      },
      version: 2,
    }
  )
); 
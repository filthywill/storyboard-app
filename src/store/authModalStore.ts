import { create } from 'zustand';

interface AuthModalState {
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

/**
 * Global AuthModal UI state (NOT persisted).
 * Used to ensure singleton AuthModal is mounted once (in App.tsx).
 */
export const useAuthModalStore = create<AuthModalState>((set) => ({
  isAuthModalOpen: false,
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
}));

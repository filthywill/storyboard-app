import { create } from 'zustand';

export type AuthModalMode = 'sign-in' | 'sign-up';

interface AuthModalState {
  isAuthModalOpen: boolean;
  authModalMode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
}

/**
 * Global AuthModal UI state (NOT persisted).
 * Used to ensure singleton AuthModal is mounted once (in App.tsx).
 */
export const useAuthModalStore = create<AuthModalState>((set) => ({
  isAuthModalOpen: false,
  authModalMode: 'sign-in',
  openAuthModal: (mode = 'sign-in') => set({ isAuthModalOpen: true, authModalMode: mode }),
  closeAuthModal: () => set({ isAuthModalOpen: false, authModalMode: 'sign-in' }),
}));

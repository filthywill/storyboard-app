import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthService } from '@/services/authService';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  logoutReason: 'none' | 'expired' | 'other_session';
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLogoutReason: (reason: 'none' | 'expired' | 'other_session') => void;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
      logoutReason: 'none',
      
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user,
        error: null 
      }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),

      setLogoutReason: (reason) => set({ logoutReason: reason }),
      
      clearError: () => set({ error: null }),
      
      signUp: async (email, password, displayName) => {
        set({ isLoading: true, error: null });
        try {
          const data = await AuthService.signUp(email, password, displayName);
          set({ user: data.user, isAuthenticated: !!data.user, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },
      
      signIn: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await AuthService.signIn(email, password);
          set({ user: data.user, isAuthenticated: !!data.user, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },
      
      signOut: async () => {
        set({ isLoading: true });
        try {
          await AuthService.signOut();
          set({ user: null, isAuthenticated: false, isLoading: false, logoutReason: 'none' });
          
          // Clear all current project data on manual sign-out
          try {
            const { ProjectSwitcher } = await import('@/utils/projectSwitcher');
            ProjectSwitcher.clearCurrentProjectData();
          } catch (e) {
            console.warn('Failed to clear current project data on manual sign-out', e);
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      signInWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
          await AuthService.signInWithGoogle();
          // Note: User will be redirected, so we don't set user state here
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      signInWithGitHub: async () => {
        set({ isLoading: true, error: null });
        try {
          await AuthService.signInWithGitHub();
          // Note: User will be redirected, so we don't set user state here
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      signInWithApple: async () => {
        set({ isLoading: true, error: null });
        try {
          await AuthService.signInWithApple();
          // Note: User will be redirected, so we don't set user state here
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },
      
      initialize: async () => {
        set({ isLoading: true });
        
        try {
          const user = await AuthService.getCurrentUser();
          set({ user, isAuthenticated: !!user, isLoading: false });
          
          // Listen for auth changes
          AuthService.onAuthStateChange((user) => {
            set({ user, isAuthenticated: !!user });
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);

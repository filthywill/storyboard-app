import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthService } from '@/services/authService';
import { AnalyticsService } from '@/services/analytics/AnalyticsService';
import { captureSignupCompleted } from '@/services/analytics/activationTracking';
import {
  captureLoginCompleted,
  captureLogoutCompleted,
} from '@/services/analytics/workspaceTracking';

interface User {
  id: string;
  email?: string | null;
  name?: string;
  avatar_url?: string;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
}

export type AuthStatus = 'guest' | 'authenticated_confirmed' | 'authenticated_unconfirmed';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  authStatus: AuthStatus;
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
  initialize: () => Promise<void>;
  clearError: () => void;
}

const deriveAuthStatus = (user: User | null): AuthStatus => {
  if (!user) return 'guest';
  const isConfirmed = Boolean(user.email_confirmed_at || user.confirmed_at);
  return isConfirmed ? 'authenticated_confirmed' : 'authenticated_unconfirmed';
};

const syncAuthAnalyticsIdentity = (user: User | null): void => {
  if (user?.id) {
    AnalyticsService.identify(user.id, {
      auth_status: deriveAuthStatus(user),
    });
    return;
  }

  AnalyticsService.reset();
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      authStatus: 'guest',
      isLoading: false,
      error: null,
      logoutReason: 'none',
      
      setUser: (user) => {
        syncAuthAnalyticsIdentity(user);
        set({
          user,
          isAuthenticated: !!user,
          authStatus: deriveAuthStatus(user),
          error: null,
        });
      },
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),

      setLogoutReason: (reason) => set({ logoutReason: reason }),
      
      clearError: () => set({ error: null }),
      
      signUp: async (email, password, displayName) => {
        set({ isLoading: true, error: null });
        try {
          const data = await AuthService.signUp(email, password, displayName);
          const user = data.user as User | null;
          set({
            user,
            isAuthenticated: !!user,
            authStatus: deriveAuthStatus(user),
            isLoading: false
          });
          syncAuthAnalyticsIdentity(user);
          captureSignupCompleted('email', deriveAuthStatus(user));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },
      
      signIn: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await AuthService.signIn(email, password);
          const user = data.user as User | null;
          set({
            user,
            isAuthenticated: !!user,
            authStatus: deriveAuthStatus(user),
            isLoading: false
          });
          syncAuthAnalyticsIdentity(user);
          captureLoginCompleted('email');
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },
      
      signOut: async () => {
        set({ isLoading: true });
        try {
          await AuthService.signOut();
          captureLogoutCompleted();
          set({
            user: null,
            isAuthenticated: false,
            authStatus: 'guest',
            isLoading: false,
            logoutReason: 'none'
          });
          syncAuthAnalyticsIdentity(null);
          
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

      initialize: async () => {
        set({ isLoading: true });
        
        try {
          const user = await AuthService.getCurrentUser();
          set({
            user,
            isAuthenticated: !!user,
            authStatus: deriveAuthStatus(user as User | null),
            isLoading: false
          });
          syncAuthAnalyticsIdentity(user as User | null);
          
          // Listen for auth changes
          AuthService.onAuthStateChange((user) => {
            syncAuthAnalyticsIdentity(user as User | null);
            set({
              user,
              isAuthenticated: !!user,
              authStatus: deriveAuthStatus(user as User | null)
            });
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
        authStatus: state.authStatus,
      }),
    }
  )
);

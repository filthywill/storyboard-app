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

type AuthOperation = 'sign_up' | 'sign_in' | 'sign_out' | 'google_sign_in' | 'initialize';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  authStatus: AuthStatus;
  isLoading: boolean;
  error: string | null;
  errorCode: string | null;
  errorStatus: number | null;
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
  }
};

const getSanitizedAuthErrorMetadata = (error: unknown) => {
  if (typeof error !== 'object' || error === null) {
    return { errorCode: null, errorStatus: null };
  }

  const { code, status } = error as { code?: unknown; status?: unknown };
  return {
    errorCode: typeof code === 'string' ? code : null,
    errorStatus: typeof status === 'number' ? status : null,
  };
};

const getAuthErrorMessage = (error: unknown): string | null => {
  if (typeof error !== 'object' || error === null || !('message' in error)) {
    return null;
  }

  const { message } = error as { message?: unknown };
  return typeof message === 'string' ? message : null;
};

const logSanitizedAuthError = (operation: AuthOperation, error: unknown): void => {
  if (!import.meta.env.DEV) return;

  const { errorCode, errorStatus } = getSanitizedAuthErrorMetadata(error);
  console.warn('Auth operation failed', { operation, errorCode, errorStatus });
};

let authStateSubscription: ReturnType<typeof AuthService.onAuthStateChange> | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      authStatus: 'guest',
      isLoading: false,
      error: null,
      errorCode: null,
      errorStatus: null,
      logoutReason: 'none',
      
      setUser: (user) => {
        syncAuthAnalyticsIdentity(user);
        set({
          user,
          isAuthenticated: !!user,
          authStatus: deriveAuthStatus(user),
          error: null,
          errorCode: null,
          errorStatus: null,
        });
      },
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error, errorCode: null, errorStatus: null }),

      setLogoutReason: (reason) => set({ logoutReason: reason }),
      
      clearError: () => set({ error: null, errorCode: null, errorStatus: null }),
      
      signUp: async (email, password, displayName) => {
        set({ isLoading: true, error: null, errorCode: null, errorStatus: null });
        try {
          const data = await AuthService.signUp(email, password, displayName);
          const user = data.user as User | null;
          set({
            user,
            isAuthenticated: !!user,
            authStatus: deriveAuthStatus(user),
            isLoading: false,
            errorCode: null,
            errorStatus: null,
          });
          syncAuthAnalyticsIdentity(user);
          captureSignupCompleted('email', deriveAuthStatus(user));
        } catch (error: unknown) {
          const { errorCode, errorStatus } = getSanitizedAuthErrorMetadata(error);
          set({ error: getAuthErrorMessage(error), errorCode, errorStatus, isLoading: false });
          logSanitizedAuthError('sign_up', error);
          throw error;
        }
      },
      
      signIn: async (email, password) => {
        set({ isLoading: true, error: null, errorCode: null, errorStatus: null });
        try {
          const data = await AuthService.signIn(email, password);
          const user = data.user as User | null;
          set({
            user,
            isAuthenticated: !!user,
            authStatus: deriveAuthStatus(user),
            isLoading: false,
            errorCode: null,
            errorStatus: null,
          });
          syncAuthAnalyticsIdentity(user);
          captureLoginCompleted('email');
        } catch (error: unknown) {
          const { errorCode, errorStatus } = getSanitizedAuthErrorMetadata(error);
          set({ error: getAuthErrorMessage(error), errorCode, errorStatus, isLoading: false });
          logSanitizedAuthError('sign_in', error);
          throw error;
        }
      },
      
      signOut: async () => {
        set({ isLoading: true, error: null, errorCode: null, errorStatus: null });
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
          AnalyticsService.reset();
          
          // Clear all current project data on manual sign-out
          try {
            const { ProjectSwitcher } = await import('@/utils/projectSwitcher');
            ProjectSwitcher.clearCurrentProjectData();
          } catch (e) {
            console.warn('Failed to clear current project data on manual sign-out', e);
          }
        } catch (error: unknown) {
          const { errorCode, errorStatus } = getSanitizedAuthErrorMetadata(error);
          set({ error: getAuthErrorMessage(error), errorCode, errorStatus, isLoading: false });
          logSanitizedAuthError('sign_out', error);
          throw error;
        }
      },

      signInWithGoogle: async () => {
        set({ isLoading: true, error: null, errorCode: null, errorStatus: null });
        try {
          await AuthService.signInWithGoogle();
          // Note: User will be redirected, so we don't set user state here
        } catch (error: unknown) {
          const { errorCode, errorStatus } = getSanitizedAuthErrorMetadata(error);
          set({ error: getAuthErrorMessage(error), errorCode, errorStatus, isLoading: false });
          logSanitizedAuthError('google_sign_in', error);
          throw error;
        }
      },

      initialize: async () => {
        set({ isLoading: true, error: null, errorCode: null, errorStatus: null });
        
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
          if (authStateSubscription === null) {
            authStateSubscription = AuthService.onAuthStateChange((user) => {
              syncAuthAnalyticsIdentity(user as User | null);
              set({
                user,
                isAuthenticated: !!user,
                authStatus: deriveAuthStatus(user as User | null)
              });
            });
            if (import.meta.env.DEV) {
              console.info('Auth state listener installed');
            }
          } else if (import.meta.env.DEV) {
            console.info('Auth state listener registration skipped');
          }
        } catch (error: unknown) {
          const { errorCode, errorStatus } = getSanitizedAuthErrorMetadata(error);
          set({ error: getAuthErrorMessage(error), errorCode, errorStatus, isLoading: false });
          logSanitizedAuthError('initialize', error);
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

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export type CloudPlan = 'free' | 'pro' | 'unknown';
export type CloudAccessReason = 'cloud_disabled' | 'unauthenticated' | 'plan_limit' | 'unknown';

export interface CloudAccessState {
  isAuthenticated: boolean;
  userId: string | null;
  plan: CloudPlan;
  cloudProjectLimit: number;
  cloudProjectsCount: number | null;
  canReadCloud: boolean;
  // Writes to existing cloud-backed projects are allowed for authenticated users.
  canWriteCloud: boolean;
  // Creation of new cloud projects is gated by plan limits.
  canCreateCloudProject: boolean;
  hasCloudAccess: boolean;
  reason?: CloudAccessReason;
  error?: unknown;
}

const DEFAULT_FREE_LIMIT = 1;

export class CloudAccessService {
  private static cached:
    | { userId: string; fetchedAt: number; state: CloudAccessState }
    | null = null;
  private static readonly CACHE_TTL_MS = 30000;

  static getCachedAccessState(): CloudAccessState | null {
    if (!this.cached) return null;
    if (Date.now() - this.cached.fetchedAt > this.CACHE_TTL_MS) return null;
    return this.cached.state;
  }

  static clearCache(): void {
    this.cached = null;
  }

  static async getAccessState(): Promise<CloudAccessState> {
    const isCloudEnabled = import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true';
    const { isAuthenticated, user, authStatus } = useAuthStore.getState();
    const userId = user?.id ?? null;

    if (!isCloudEnabled) {
      return {
        isAuthenticated,
        userId,
        plan: 'unknown',
        cloudProjectLimit: 0,
        cloudProjectsCount: null,
        canReadCloud: false,
        canWriteCloud: false,
        canCreateCloudProject: false,
        hasCloudAccess: false,
        reason: 'cloud_disabled'
      };
    }

    if (!isAuthenticated || !userId || authStatus !== 'authenticated_confirmed') {
      return {
        isAuthenticated,
        userId,
        plan: 'unknown',
        cloudProjectLimit: 0,
        cloudProjectsCount: null,
        canReadCloud: false,
        canWriteCloud: false,
        canCreateCloudProject: false,
        hasCloudAccess: false,
        reason: 'unauthenticated'
      };
    }

    const cached = this.getCachedAccessState();
    if (cached && cached.userId === userId) {
      return cached;
    }

    try {
      const { data: billing, error: billingError } = await supabase
        .from('billing_subscriptions')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();

      if (billingError) {
        throw billingError;
      }

      const isPro = billing?.status === 'active' || billing?.status === 'trialing';
      const plan: CloudPlan = isPro ? 'pro' : 'free';
      const cloudProjectLimit = isPro ? Number.POSITIVE_INFINITY : DEFAULT_FREE_LIMIT;

      let cloudProjectsCount: number | null = null;
      if (!isPro) {
        const { count, error: countError } = await supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_deleted', false);

        if (countError) {
          throw countError;
        }

        cloudProjectsCount = count ?? 0;
      }

      const canCreateCloudProject =
        isPro || (cloudProjectsCount ?? 0) < cloudProjectLimit;

      const state: CloudAccessState = {
        isAuthenticated: true,
        userId,
        plan,
        cloudProjectLimit,
        cloudProjectsCount,
        canReadCloud: true,
        canWriteCloud: true,
        canCreateCloudProject,
        hasCloudAccess: true,
        reason: canCreateCloudProject ? undefined : 'plan_limit'
      };

      this.cached = { userId, fetchedAt: Date.now(), state };
      return state;
    } catch (error) {
      console.error('Cloud access check failed:', error);
      const state: CloudAccessState = {
        isAuthenticated: true,
        userId,
        plan: 'unknown',
        cloudProjectLimit: DEFAULT_FREE_LIMIT,
        cloudProjectsCount: null,
        canReadCloud: true,
        canWriteCloud: true,
        canCreateCloudProject: false,
        hasCloudAccess: true,
        reason: 'unknown',
        error
      };
      this.cached = { userId, fetchedAt: Date.now(), state };
      return state;
    }
  }
}

import { supabase } from '@/lib/supabase';
import { useWriterLeaseStore } from '@/store/writerLeaseStore';
import { useProjectManagerStore } from '@/store/projectManagerStore';
import { getWriterTabId } from '@/utils/writerTabId';

const HEARTBEAT_INTERVAL_MS = 30000;
const LEASE_BROADCAST_CHANNEL = 'storyboardflow-writer-lease';

interface LeaseResult {
  ok: boolean;
  reason?: string | null;
  holder?: string | null;
  expiresAt?: string | null;
}

interface EnsureWriterResult extends LeaseResult {
  writerId?: string;
}

export class WriterLeaseService {
  private static heartbeatTimer: number | null = null;
  private static heartbeatProjectId: string | null = null;
  private static heartbeatInFlight = false;
  private static initialized = false;
  private static accessToken: string | null = null;
  private static broadcastChannel: BroadcastChannel | null = null;

  static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof window === 'undefined') return;

    if ('BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(LEASE_BROADCAST_CHANNEL);
      this.broadcastChannel.onmessage = (event) => {
        const payload = event?.data;
        if (!payload || payload.type !== 'TAKEOVER') return;
        this.handleBroadcastTakeover(payload);
      };
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        this.accessToken = data?.session?.access_token ?? null;
      })
      .catch(() => {
        this.accessToken = null;
      });

    supabase.auth.onAuthStateChange((_event, session) => {
      this.accessToken = session?.access_token ?? null;
    });

    window.addEventListener('beforeunload', () => {
      void this.releaseLeaseOnUnload();
    });
  }

  static getWriterId(): string {
    return getWriterTabId();
  }

  static broadcastTakeover(projectId: string): void {
    if (!this.broadcastChannel) return;
    this.broadcastChannel.postMessage({
      type: 'TAKEOVER',
      projectId,
      newWriterId: this.getWriterId(),
      timestamp: Date.now()
    });
  }

  static clearLeaseState(): void {
    this.stopHeartbeat();
    useWriterLeaseStore.getState().clearLease();
  }

  static async ensureWriter(
    projectId: string,
    options?: { force?: boolean; source?: string }
  ): Promise<EnsureWriterResult> {
    const state = useWriterLeaseStore.getState();
    if (state.projectId === projectId) {
      if (state.mode === 'writer') {
        return { ok: true, writerId: this.getWriterId(), expiresAt: state.expiresAt ?? null };
      }
      if (state.mode === 'read_only' && !options?.force) {
        return {
          ok: false,
          reason: 'lease_held',
          holder: state.holder ?? null,
          expiresAt: state.expiresAt ?? null
        };
      }
    }

    const claim = await this.claimLease(projectId, {
      force: options?.force ?? false,
      source: options?.source ?? 'ensure'
    });

    if (claim.ok) {
      return {
        ok: true,
        writerId: this.getWriterId(),
        expiresAt: claim.expiresAt ?? null
      };
    }

    return {
      ok: false,
      reason: claim.reason ?? 'lease_held',
      holder: claim.holder ?? null,
      expiresAt: claim.expiresAt ?? null
    };
  }

  static async claimLease(
    projectId: string,
    options?: { force?: boolean; source?: string }
  ): Promise<LeaseResult> {
    const writerId = this.getWriterId();
    const { data, error } = await supabase.rpc('claim_writer_lease', {
      p_project_id: projectId,
      p_writer_id: writerId,
      p_force: options?.force ?? false
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.warn('[lease] claim failed', {
          projectId,
          error,
          source: options?.source ?? 'claim'
        });
      }
      return { ok: false, reason: 'rpc_error' };
    }

    const payload = Array.isArray(data) ? data[0] : data;
    const normalized: LeaseResult = {
      ok: Boolean(payload?.ok),
      reason: payload?.reason ?? null,
      holder: payload?.holder ?? null,
      expiresAt: payload?.expires_at ?? null
    };

    if (import.meta.env.DEV) {
      console.debug('[lease] claim result', {
        projectId,
        ...normalized,
        force: options?.force ?? false,
        source: options?.source ?? 'claim'
      });
    }

    if (normalized.ok) {
      this.setWriter(projectId, normalized.expiresAt ?? null, options?.source ?? 'claim');
    } else if (normalized.reason === 'lease_held') {
      this.setReadOnly(
        projectId,
        normalized.holder ?? null,
        normalized.expiresAt ?? null,
        options?.source ?? 'claim'
      );
    }

    return normalized;
  }

  static async releaseLease(projectId: string, options?: { source?: string }): Promise<void> {
    try {
      await supabase.rpc('release_writer_lease', {
        p_project_id: projectId,
        p_writer_id: this.getWriterId()
      });
      if (import.meta.env.DEV) {
        console.debug('[lease] released', {
          projectId,
          source: options?.source ?? 'release'
        });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[lease] release failed', {
          projectId,
          error,
          source: options?.source ?? 'release'
        });
      }
    } finally {
      this.stopHeartbeat(projectId);
      const state = useWriterLeaseStore.getState();
      if (state.projectId === projectId) {
        useWriterLeaseStore.getState().clearLease();
      }
    }
  }

  static handleLeaseRejected(
    projectId: string,
    holder?: string | null,
    expiresAt?: string | null,
    source?: string
  ): void {
    this.setReadOnly(projectId, holder ?? null, expiresAt ?? null, source ?? 'lease_rejected');
  }

  private static startHeartbeat(projectId: string): void {
    if (typeof window === 'undefined') return;
    if (this.heartbeatTimer && this.heartbeatProjectId === projectId) return;

    this.stopHeartbeat();
    this.heartbeatProjectId = projectId;
    this.heartbeatTimer = window.setInterval(async () => {
      if (this.heartbeatInFlight) return;
      this.heartbeatInFlight = true;
      try {
        await this.claimLease(projectId, { force: false, source: 'heartbeat' });
      } finally {
        this.heartbeatInFlight = false;
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private static stopHeartbeat(projectId?: string): void {
    if (typeof window === 'undefined') return;
    if (this.heartbeatTimer) {
      if (!projectId || this.heartbeatProjectId === projectId) {
        window.clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
        this.heartbeatProjectId = null;
      }
    }
  }

  private static setWriter(projectId: string, expiresAt: string | null, source: string): void {
    const state = useWriterLeaseStore.getState();
    const prevMode = state.mode;
    const prevProject = state.projectId;
    useWriterLeaseStore.getState().setLeaseState({
      projectId,
      mode: 'writer',
      holder: null,
      expiresAt
    });
    this.startHeartbeat(projectId);
    if (import.meta.env.DEV && (prevMode !== 'writer' || prevProject !== projectId)) {
      console.debug('[lease] mode transition', {
        projectId,
        from: prevMode,
        to: 'writer',
        source
      });
    }
  }

  private static setReadOnly(
    projectId: string,
    holder: string | null,
    expiresAt: string | null,
    source: string
  ): void {
    const state = useWriterLeaseStore.getState();
    const prevMode = state.mode;
    const prevProject = state.projectId;
    useWriterLeaseStore.getState().setLeaseState({
      projectId,
      mode: 'read_only',
      holder,
      expiresAt
    });
    this.stopHeartbeat(projectId);
    if (import.meta.env.DEV && (prevMode !== 'read_only' || prevProject !== projectId)) {
      console.debug('[lease] mode transition', {
        projectId,
        from: prevMode,
        to: 'read_only',
        holder,
        source
      });
    }
  }

  private static handleBroadcastTakeover(payload: {
    type: 'TAKEOVER';
    projectId: string;
    newWriterId: string;
    timestamp?: number;
  }): void {
    const currentProjectId = useProjectManagerStore.getState().currentProjectId;
    if (!currentProjectId || currentProjectId !== payload.projectId) return;
    if (payload.newWriterId === this.getWriterId()) return;

    if (import.meta.env.DEV) {
      console.debug('[lease] takeover broadcast received', {
        projectId: payload.projectId,
        newWriterId: payload.newWriterId,
        timestamp: payload.timestamp ?? null
      });
    }

    this.setReadOnly(payload.projectId, payload.newWriterId, null, 'broadcast_takeover');
  }

  private static async releaseLeaseOnUnload(): Promise<void> {
    const state = useWriterLeaseStore.getState();
    if (!state.projectId || state.mode !== 'writer') return;

    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const accessToken = this.accessToken;
    if (!url || !anonKey || !accessToken) {
      void this.releaseLease(state.projectId, { source: 'unload' });
      return;
    }

    try {
      await fetch(`${url}/rest/v1/rpc/release_writer_lease`, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_project_id: state.projectId,
          p_writer_id: this.getWriterId()
        })
      });
      if (import.meta.env.DEV) {
        console.debug('[lease] release keepalive sent', {
          projectId: state.projectId
        });
      }
    } catch {
      // best-effort only
    }
  }
}

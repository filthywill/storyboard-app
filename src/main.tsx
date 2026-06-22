import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { getAppBackgroundCSSVars, getColor } from './styles/glassmorphism-styles'
import { supabase } from '@/lib/supabase'

if (import.meta.env.DEV) {
  void import('@/utils/storyboardDiagnostics');
}

const AUTH_BROADCAST_CHANNEL = 'sbflow_auth';
const CONFIRM_HANDLED_KEY = 'sbflow_confirm_handled';
const CONFIRM_COMPLETE_FLAG = 'confirmComplete';

type AuthSubscriptionResult = {
  data?: {
    subscription?: {
      unsubscribe: () => void;
    };
  };
};

function isSupabaseAuthArtifactPresent(): boolean {
  if (typeof window === 'undefined') return false;

  // Never hijack OAuth callback route
  if (window.location.pathname.startsWith('/auth/callback')) return false;
  // Password recovery links need to reach the reset form with Supabase artifacts intact.
  if (window.location.pathname.startsWith('/reset-password')) return false;

  const hash = window.location.hash || '';
  const search = window.location.search || '';

  const hashLooksLikeSupabase =
    hash.includes('access_token=') ||
    hash.includes('refresh_token=') ||
    hash.includes('type=signup') ||
    hash.includes('type=recovery');

  const searchLooksLikeOAuthOrMagic = search.includes('code=');

  return hashLooksLikeSupabase || searchLooksLikeOAuthOrMagic;
}

function isConfirmCompleteMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(CONFIRM_COMPLETE_FLAG) === '1';
  } catch {
    return false;
  }
}

function broadcastAuthConfirmed(): void {
  if (typeof window === 'undefined') return;
  if (!('BroadcastChannel' in window)) return;
  try {
    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
    channel.postMessage({ type: 'AUTH_CONFIRMED', at: Date.now() });
    channel.close();
  } catch {
    // Best-effort only
  }
}

function clearAuthArtifactsFromUrl(): void {
  if (typeof window === 'undefined') return;
  // Only clear artifacts after session is confirmed.
  // Keep it simple and stable: remove hash + search by replacing to a safe landing URL.
  try {
    window.history.replaceState(null, '', `/?${CONFIRM_COMPLETE_FLAG}=1`);
  } catch {
    // best-effort only
  }
}

function ConfirmationCompleteScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center rounded-xl bg-black/40 border border-white/10 p-6 shadow-2xl">
        <h1 className="text-lg font-semibold text-white">Email confirmed</h1>
        <p className="mt-2 text-sm text-white/70">
          Your account has been successfully verified.
        </p>
        <p className="mt-3 text-xs text-white/60">
          You can close this tab and return to StoryboardFlow.
        </p>
      </div>
    </div>
  );
}

function ConfirmationPreflightScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white/80 mx-auto mb-4"></div>
        <p className="text-white/70">Completing confirmation…</p>
      </div>
    </div>
  );
}

function setupBodyObserver(): void {
  if (typeof window === 'undefined') return;

  // Prevent Radix UI from adding padding-right to body when dropdowns open
  // Radix adds padding to compensate for scrollbar, but we use scrollbar-gutter: stable
  // This creates a double gutter, so we prevent it by watching for style changes
  const body = document.body;
  if (!body) {
    setTimeout(setupBodyObserver, 10);
    return;
  }

  // Use a more aggressive approach: check and remove padding-right on every frame
  // This ensures we catch Radix's changes immediately, even before MutationObserver fires
  let rafId: number;
  const checkAndRemovePadding = () => {
    // Check body
    if (body.style.paddingRight) {
      body.style.paddingRight = '';
    }
    if (body.style.marginRight) {
      body.style.marginRight = '';
    }
    // Also check html element (Radix sometimes modifies both)
    const html = document.documentElement;
    if (html.style.paddingRight) {
      html.style.paddingRight = '';
    }
    if (html.style.marginRight) {
      html.style.marginRight = '';
    }
    // Also check for overflow changes that might affect scrollbar
    if (body.style.overflow === 'hidden') {
      // Don't remove overflow: hidden as Radix needs it, but ensure padding isn't added
      body.style.paddingRight = '';
      body.style.marginRight = '';
    }
    rafId = requestAnimationFrame(checkAndRemovePadding);
  };
  checkAndRemovePadding();

  // Also use MutationObserver as backup for both body and html
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const target = mutation.target as HTMLElement;
        if (target === body || target === document.documentElement) {
          if (target.style.paddingRight) {
            target.style.paddingRight = '';
          }
          if (target.style.marginRight) {
            target.style.marginRight = '';
          }
        }
      }
    });
  });

  // Observe both body and html elements
  observer.observe(body, {
    attributes: true,
    attributeFilter: ['style'],
    attributeOldValue: false
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style'],
    attributeOldValue: false
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (rafId) cancelAnimationFrame(rafId);
    observer.disconnect();
  });
}

function injectCssVars(): void {
  if (typeof window === 'undefined') return;

  // Inject app background CSS variables from centralized color system
  // This ensures changes in glassmorphism-styles.ts are immediately reflected
  const root = document.documentElement;

  // Inject background CSS variables
  const bgCssVars = getAppBackgroundCSSVars();
  Object.entries(bgCssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Inject checkbox CSS variables
  root.style.setProperty('--checkbox-bg', getColor('checkbox', 'background') as string);
  root.style.setProperty('--checkbox-bg-checked', getColor('checkbox', 'backgroundChecked') as string);
  root.style.setProperty('--checkbox-border', getColor('checkbox', 'border') as string);
  root.style.setProperty('--checkbox-border-checked', getColor('checkbox', 'borderChecked') as string);
  root.style.setProperty('--checkbox-icon', getColor('checkbox', 'icon') as string);

  // Inject radio button CSS variables
  root.style.setProperty('--radio-bg', getColor('radio', 'background') as string);
  root.style.setProperty('--radio-border', getColor('radio', 'border') as string);
  root.style.setProperty('--radio-border-checked', getColor('radio', 'borderChecked') as string);
  root.style.setProperty('--radio-indicator', getColor('radio', 'indicator') as string);
}

// Inject app background CSS variables from centralized color system
// This ensures changes in glassmorphism-styles.ts are immediately reflected
if (typeof window !== 'undefined') {
  // Inject immediately if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCssVars);
  } else {
    injectCssVars();
  }
}

const root = createRoot(document.getElementById("root")!);

function renderApp(): void {
  // Writer lease + tab writer id must NOT run in confirmation-only mode.
  // Lazy import keeps this branch side-effect-free until we choose to boot the app.
  import('@/utils/writerTabId')
    .then(({ getWriterTabId }) => {
      getWriterTabId();
    })
    .catch(() => {
      // best-effort only
    });
  import('@/services/writerLeaseService')
    .then(({ WriterLeaseService }) => {
      WriterLeaseService.initialize();
    })
    .catch(() => {
      // best-effort only
    });

  // Prevent Radix UI scrollbar gutter issues (safe in both modes, but only needed when app mounts)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupBodyObserver);
  } else {
    setupBodyObserver();
  }

  root.render(<App />);
}

async function waitForSessionUser(timeoutMs: number): Promise<boolean> {
  const start = Date.now();

  // First attempt: immediate session read
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return true;
  } catch {
    // ignore; we'll fall back to subscriptions/polling
  }

  return await new Promise<boolean>((resolve) => {
    let resolved = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
    let subscription: { unsubscribe: () => void } | null = null;

    const cleanup = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch {
          // ignore
        }
        subscription = null;
      }
    };

    const finish = (ok: boolean) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(ok);
    };

    // Subscribe for session establishment
    try {
      const result = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || session?.user) {
          finish(true);
        }
      });
      // supabase-js v2 returns { data: { subscription } }
      subscription = (result as AuthSubscriptionResult).data?.subscription ?? null;
    } catch {
      subscription = null;
    }

    // Minimal polling as a fallback
    pollTimer = setInterval(async () => {
      if (resolved) return;
      if (Date.now() - start > timeoutMs) {
        finish(false);
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          finish(true);
        }
      } catch {
        // ignore
      }
    }, 250);

    timeoutTimer = setTimeout(() => finish(false), timeoutMs);
  });
}

async function bootstrap(): Promise<void> {
  // Safe landing mode: never boot the full app here.
  if (isConfirmCompleteMode()) {
    root.render(<ConfirmationCompleteScreen />);
    return;
  }

  const hasArtifacts = isSupabaseAuthArtifactPresent();
  if (!hasArtifacts) {
    renderApp();
    return;
  }

  // Confirmation-only loop guard (scoped to artifact detection only)
  try {
    if (sessionStorage.getItem(CONFIRM_HANDLED_KEY) === '1') {
      renderApp();
      return;
    }
  } catch {
    // If sessionStorage is unavailable, proceed without the guard
  }

  root.render(<ConfirmationPreflightScreen />);

  const hasUser = await waitForSessionUser(2000);
  if (hasUser) {
    try {
      sessionStorage.setItem(CONFIRM_HANDLED_KEY, '1');
    } catch {
      // best-effort
    }

    // Clear auth artifacts so refresh won't re-trigger the confirmation preflight.
    clearAuthArtifactsFromUrl();

    broadcastAuthConfirmed();

    root.render(<ConfirmationCompleteScreen />);
    return;
  }

  renderApp();
}

void bootstrap();

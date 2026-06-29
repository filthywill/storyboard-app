import { useEffect } from 'react';
import { captureAppStarted } from '@/services/analytics/activationTracking';
import { useAuthStore } from '@/store/authStore';

export function AnalyticsAppStartedListener() {
  useEffect(() => {
    let cancelled = false;
    let unsubscribeAuth: (() => void) | undefined;

    const tryCapture = () => {
      if (cancelled) {
        return;
      }

      const route = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      captureAppStarted(route);
    };

    const { isLoading } = useAuthStore.getState();
    if (isLoading) {
      unsubscribeAuth = useAuthStore.subscribe((state, previousState) => {
        if (previousState.isLoading && !state.isLoading) {
          tryCapture();
          unsubscribeAuth?.();
        }
      });
    } else {
      tryCapture();
    }

    return () => {
      cancelled = true;
      unsubscribeAuth?.();
    };
  }, []);

  return null;
}

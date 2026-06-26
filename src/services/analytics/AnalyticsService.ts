import type { AnalyticsAdapter, AnalyticsProperties } from './AnalyticsAdapter';
import { NoopAdapter } from './NoopAdapter';
import { PostHogAdapter, resolvePostHogHost } from './PostHogAdapter';
import type { AnalyticsEventName } from './events';
import { sanitizeAnalyticsProperties } from './privacy';

function parseAnalyticsEnabledFlag(rawValue: string | undefined): boolean {
  if (rawValue === undefined) {
    return true;
  }

  const normalized = rawValue.trim().toLowerCase();
  return normalized !== 'false' && normalized !== '0' && normalized !== 'off';
}

function createAdapter(): AnalyticsAdapter {
  const analyticsFlagEnabled = parseAnalyticsEnabledFlag(import.meta.env.VITE_ENABLE_ANALYTICS);
  const apiKey = import.meta.env.VITE_POSTHOG_KEY?.trim();

  if (!analyticsFlagEnabled || !apiKey) {
    return new NoopAdapter();
  }

  return new PostHogAdapter(apiKey, resolvePostHogHost());
}

class AnalyticsServiceClass {
  private adapter: AnalyticsAdapter = new NoopAdapter();
  private initialized = false;

  init(): void {
    if (this.initialized) {
      return;
    }

    this.adapter = createAdapter();
    this.adapter.init();
    this.initialized = true;
  }

  identify(userId: string, properties?: AnalyticsProperties): void {
    if (!userId.trim()) {
      return;
    }

    try {
      this.adapter.identify(userId, sanitizeAnalyticsProperties(properties));
    } catch {
      // Never throw from analytics
    }
  }

  reset(): void {
    try {
      this.adapter.reset();
    } catch {
      // Never throw from analytics
    }
  }

  capture(event: AnalyticsEventName, properties?: AnalyticsProperties): void {
    try {
      this.adapter.capture(event, sanitizeAnalyticsProperties(properties));
    } catch {
      // Never throw from analytics
    }
  }

  capturePageView(path: string, properties?: AnalyticsProperties): void {
    if (!path.trim()) {
      return;
    }

    try {
      this.adapter.capturePageView(path, sanitizeAnalyticsProperties(properties));
    } catch {
      // Never throw from analytics
    }
  }

  setSuperProperties(properties: AnalyticsProperties): void {
    try {
      this.adapter.setSuperProperties(sanitizeAnalyticsProperties(properties) ?? {});
    } catch {
      // Never throw from analytics
    }
  }

  isEnabled(): boolean {
    return this.adapter.isEnabled();
  }
}

export const AnalyticsService = new AnalyticsServiceClass();

// Restrictive-CSP bundle: no runtime script loads from PostHog CDNs (connect-src only).
import posthog from 'posthog-js/dist/module.no-external';
import type { AnalyticsAdapter, AnalyticsProperties } from './AnalyticsAdapter';
import { AnalyticsEvent } from './events';

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

export class PostHogAdapter implements AnalyticsAdapter {
  private enabled = false;
  private initialized = false;

  constructor(
    private readonly apiKey: string,
    private readonly apiHost: string,
  ) {}

  init(): void {
    if (this.initialized) {
      return;
    }

    posthog.init(this.apiKey, {
      api_host: this.apiHost,
      capture_pageview: false,
      autocapture: false,
      persistence: 'localStorage+cookie',
      person_profiles: 'identified_only',
    });

    this.initialized = true;
    this.enabled = true;
  }

  identify(userId: string, properties?: AnalyticsProperties): void {
    if (!this.enabled) {
      return;
    }

    posthog.identify(userId, properties);
  }

  reset(): void {
    if (!this.initialized) {
      return;
    }

    posthog.reset();
  }

  capture(event: string, properties?: AnalyticsProperties): void {
    if (!this.enabled) {
      return;
    }

    posthog.capture(event, properties);
  }

  capturePageView(path: string, properties?: AnalyticsProperties): void {
    if (!this.enabled) {
      return;
    }

    posthog.capture(AnalyticsEvent.PageView, {
      path,
      ...properties,
    });
  }

  setSuperProperties(properties: AnalyticsProperties): void {
    if (!this.enabled) {
      return;
    }

    posthog.register(properties);
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export function resolvePostHogHost(): string {
  const configuredHost = import.meta.env.VITE_POSTHOG_HOST?.trim();
  return configuredHost || DEFAULT_POSTHOG_HOST;
}

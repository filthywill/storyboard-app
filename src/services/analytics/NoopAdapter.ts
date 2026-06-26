import type { AnalyticsAdapter, AnalyticsProperties } from './AnalyticsAdapter';

export class NoopAdapter implements AnalyticsAdapter {
  init(): void {
    // intentionally empty
  }

  identify(_userId: string, _properties?: AnalyticsProperties): void {
    // intentionally empty
  }

  reset(): void {
    // intentionally empty
  }

  capture(_event: string, _properties?: AnalyticsProperties): void {
    // intentionally empty
  }

  capturePageView(_path: string, _properties?: AnalyticsProperties): void {
    // intentionally empty
  }

  setSuperProperties(_properties: AnalyticsProperties): void {
    // intentionally empty
  }

  isEnabled(): boolean {
    return false;
  }
}

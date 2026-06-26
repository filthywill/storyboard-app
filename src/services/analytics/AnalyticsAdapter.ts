export type AnalyticsPropertyValue = string | number | boolean | null | undefined;

export type AnalyticsProperties = Record<string, AnalyticsPropertyValue>;

export interface AnalyticsAdapter {
  init(): void;
  identify(userId: string, properties?: AnalyticsProperties): void;
  reset(): void;
  capture(event: string, properties?: AnalyticsProperties): void;
  capturePageView(path: string, properties?: AnalyticsProperties): void;
  setSuperProperties(properties: AnalyticsProperties): void;
  isEnabled(): boolean;
}

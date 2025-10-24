/**
 * Lightweight Telemetry Utility
 *
 * Minimal, dependency-free event and timing collection with console fallback.
 * Can be swapped later for a real analytics sink.
 */

type TelemetryData = Record<string, any>;

class TelemetryClass {
  event(eventName: string, data: TelemetryData = {}): void {
    try {
      // For now, log to console in dev builds
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug(`[telemetry] ${eventName}`, data);
      }
      // Future: send to analytics endpoint
    } catch (_) {
      // Never throw from telemetry
    }
  }

  timer(metricName: string) {
    const start = performance.now();
    return {
      end: (data: TelemetryData = {}) => {
        const durationMs = Math.round(performance.now() - start);
        this.event(metricName, { durationMs, ...data });
      }
    };
  }
}

export const Telemetry = new TelemetryClass();





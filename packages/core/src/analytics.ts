// Shared analytics + error-telemetry contract. ONE event taxonomy for web + mobile (so dashboards
// and feature flags line up). The default sink is a no-op; each app injects a real sink
// (PostHog/Sentry) via setAnalytics when its keys are configured — see docs/CREDENTIALS.md §5.

export type AnalyticsEvent =
  | { name: 'plan_generated'; props: { goal: string; provider: string; readiness?: number } }
  | { name: 'food_logged'; props: { source: 'search' | 'barcode' | 'manual' } }
  | { name: 'week_captured'; props: { snapshots: number } }
  | { name: 'signed_in'; props: { method: string } }
  | { name: 'provider_changed'; props: { provider: string } }
  | { name: 'paywall_viewed'; props: { feature: string } }
  | { name: 'subscribed'; props: { plan: string } };

export interface Analytics {
  track: (event: AnalyticsEvent) => void;
  identify: (userId: string | null) => void;
  captureError: (error: unknown, context?: Record<string, unknown>) => void;
}

const noop: Analytics = {
  track: () => {},
  identify: () => {},
  captureError: (error) => {
    // Always surface errors to the console even with no telemetry backend configured.
    // eslint-disable-next-line no-console
    if (error) console.error('[musclr]', error);
  },
};

let current: Analytics = noop;

/** Install the platform analytics sink (PostHog/Sentry). Call once at app startup if configured. */
export function setAnalytics(impl: Analytics): void {
  current = impl;
}

export function track(event: AnalyticsEvent): void {
  try {
    current.track(event);
  } catch {
    /* analytics must never break the app */
  }
}

export function identify(userId: string | null): void {
  try {
    current.identify(userId);
  } catch {
    /* ignore */
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  try {
    current.captureError(error, context);
  } catch {
    /* ignore */
  }
}

'use client';

import posthog from 'posthog-js';
import { setAnalytics, type Analytics } from '@musclr/core';

let inited = false;

/** Wire PostHog as the analytics sink when configured; otherwise the core no-op stays. */
export function initAnalytics(): void {
  if (inited) return;
  inited = true;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: true,
    person_profiles: 'identified_only',
  });

  const impl: Analytics = {
    track: (e) => posthog.capture(e.name, e.props),
    identify: (id) => (id ? posthog.identify(id) : posthog.reset()),
    captureError: (err, ctx) =>
      posthog.capture('error', { message: err instanceof Error ? err.message : String(err), ...ctx }),
  };
  setAnalytics(impl);
}

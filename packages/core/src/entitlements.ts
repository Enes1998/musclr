// Monetization model. A single `pro` entitlement gates premium features across web + mobile, read
// from RevenueCat (mobile IAP) / RevenueCat Web Billing or Stripe (web). The free tier is fully
// usable — `pro` unlocks the hosted (we-pay-for-it) AI coach + higher limits. Enforcement for the
// hosted relay is server-side; the client uses this to show the right UI / paywall.

export type Feature = 'hosted_ai' | 'unlimited_ai' | 'advanced_export';

/** Features that require the `pro` entitlement. Everything else is free (incl. BYO-key + built-in AI). */
export const PRO_FEATURES: readonly Feature[] = ['hosted_ai', 'unlimited_ai', 'advanced_export'];

export function isPaidFeature(feature: Feature): boolean {
  return PRO_FEATURES.includes(feature);
}

/** Whether a feature is available given the user's pro status. */
export function isFeatureUnlocked(feature: Feature, isPro: boolean): boolean {
  return isPro || !isPaidFeature(feature);
}

export const PRO_ENTITLEMENT_ID = 'pro';

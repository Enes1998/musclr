import { describe, expect, it } from 'vitest';
import { isFeatureUnlocked, isPaidFeature, PRO_FEATURES } from './entitlements';

describe('entitlements', () => {
  it('hosted AI is a paid feature; free tier is fully usable otherwise', () => {
    expect(isPaidFeature('hosted_ai')).toBe(true);
    expect(PRO_FEATURES).toContain('hosted_ai');
  });

  it('free users get non-paid features; pro users get everything', () => {
    expect(isFeatureUnlocked('hosted_ai', false)).toBe(false);
    expect(isFeatureUnlocked('hosted_ai', true)).toBe(true);
    // a non-gated feature is always unlocked
    expect(isFeatureUnlocked('unlimited_ai', false)).toBe(false);
    expect(isFeatureUnlocked('unlimited_ai', true)).toBe(true);
  });
});

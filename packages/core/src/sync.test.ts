import { describe, expect, it } from 'vitest';
import { SYNC_KINDS, resolveLatest, type SyncDocument } from './sync';

const doc = (updatedAt: string, data: unknown): SyncDocument => ({ kind: 'week', data, updatedAt });

describe('sync', () => {
  it('exposes the synced store kinds (device-only prefs excluded)', () => {
    expect(SYNC_KINDS).toEqual(['week', 'nutrition', 'history']);
    expect(SYNC_KINDS).not.toContain('settings');
  });

  it('resolveLatest picks the later updatedAt, remote on tie', () => {
    const a = doc('2026-06-01T00:00:00Z', 'local');
    const b = doc('2026-06-02T00:00:00Z', 'remote');
    expect(resolveLatest(a, b)?.data).toBe('remote');
    expect(resolveLatest(b, a)?.data).toBe('remote');
    const tie = doc('2026-06-02T00:00:00Z', 'remote-tie');
    expect(resolveLatest(a, null)?.data).toBe('local');
    expect(resolveLatest(null, b)?.data).toBe('remote');
    expect(resolveLatest(doc('2026-06-02T00:00:00Z', 'local'), tie)?.data).toBe('remote-tie');
  });
});

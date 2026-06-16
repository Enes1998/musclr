import { describe, it, expect } from 'vitest';
import {
  makeWorkoutDedupeKey,
  dedupeWorkouts,
  canonicalDailyValue,
  canonicalDailyHrv,
  computeReadiness,
  recoveryWindowMultiplier,
  type WorkoutSession,
  type HrvSample,
  type Steps,
} from './health';

function workout(partial: Partial<WorkoutSession> & Pick<WorkoutSession, 'source'>): WorkoutSession {
  const start = partial.start ?? '2026-06-16T08:00:00.000Z';
  const end = partial.end ?? '2026-06-16T08:45:00.000Z';
  const activityType = partial.activityType ?? 'running';
  return {
    id: partial.id ?? `${partial.source}-1`,
    kind: 'workout',
    start,
    end,
    activityType,
    dedupeKey: partial.dedupeKey ?? makeWorkoutDedupeKey(activityType, start, end),
    ingestedAt: '2026-06-16T09:00:00.000Z',
    ...partial,
  };
}

describe('workout dedup', () => {
  it('same activity + start-minute + duration bucket → same key across sources', () => {
    const a = makeWorkoutDedupeKey('running', '2026-06-16T08:00:10.000Z', '2026-06-16T08:45:00.000Z');
    const b = makeWorkoutDedupeKey('running', '2026-06-16T08:00:50.000Z', '2026-06-16T08:44:00.000Z');
    expect(a).toBe(b);
  });

  it('keeps the higher-priority source (Garmin beats Apple Health echo)', () => {
    const apple = workout({ source: 'apple_health', avgHrBpm: 150 });
    const garmin = workout({ source: 'garmin', avgHrBpm: 150, distanceMeters: 8000, totalEnergyKcal: 600 });
    const out = dedupeWorkouts([apple, garmin]);
    expect(out).toHaveLength(1);
    expect(out[0]!.source).toBe('garmin');
  });

  it('breaks ties by richer record within the same source priority', () => {
    const lean = workout({ source: 'health_connect', id: 'lean' });
    const rich = workout({ source: 'apple_health', id: 'rich', avgHrBpm: 150, totalEnergyKcal: 600, distanceMeters: 8000 });
    const out = dedupeWorkouts([lean, rich]);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe('rich');
  });
});

describe('cumulative metrics are never summed across sources', () => {
  it('picks one canonical daily steps source, not the sum', () => {
    const base = { kind: 'steps', date: '2026-06-16', start: '', end: '', dedupeKey: '', ingestedAt: '' } as const;
    const samples: Steps[] = [
      { ...base, id: 'a', source: 'apple_health', count: 10000 },
      { ...base, id: 'g', source: 'garmin', count: 9800 },
    ];
    const canonical = canonicalDailyValue(samples);
    expect(canonical?.source).toBe('garmin'); // higher priority
    expect(canonical?.count).toBe(9800); // NOT 19800
  });
});

describe('HRV metric types are never mixed', () => {
  const base = { kind: 'hrv', start: '', end: '', dedupeKey: '', ingestedAt: '' } as const;
  it('prefers RMSSD and averages only within that metric', () => {
    const samples: HrvSample[] = [
      { ...base, id: '1', source: 'whoop', metric: 'rmssd', valueMs: 60 },
      { ...base, id: '2', source: 'whoop', metric: 'rmssd', valueMs: 80 },
      { ...base, id: '3', source: 'apple_health', metric: 'sdnn', valueMs: 200 }, // must be ignored
    ];
    const hrv = canonicalDailyHrv(samples);
    expect(hrv).toEqual({ metric: 'rmssd', valueMs: 70 });
  });

  it('falls back to SDNN only when no RMSSD present', () => {
    const samples: HrvSample[] = [{ ...base, id: '1', source: 'apple_health', metric: 'sdnn', valueMs: 150 }];
    expect(canonicalDailyHrv(samples)?.metric).toBe('sdnn');
  });

  it('returns null with no samples', () => {
    expect(canonicalDailyHrv([])).toBeNull();
  });
});

describe('readiness → bounded recovery-window multiplier', () => {
  it('anchors on a provider recovery score when present', () => {
    expect(computeReadiness({ recovery0to100: 73 })).toBe(73);
  });

  it('synthesizes from HRV/RHR/sleep and stays in 0-100', () => {
    const r = computeReadiness({ hrvDeviationPct: -20, restingHrDeviationBpm: 8, sleepEfficiencyPct: 70 });
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(100);
  });

  it('defaults to neutral 50 with no signal', () => {
    expect(computeReadiness({})).toBe(50);
  });

  it('multiplier is bounded [0.85, 1.2] and monotonic (lower readiness → longer recovery)', () => {
    expect(recoveryWindowMultiplier(50)).toBeCloseTo(1.0);
    expect(recoveryWindowMultiplier(100)).toBe(0.85); // clamped low
    expect(recoveryWindowMultiplier(0)).toBe(1.2); // clamped high
    expect(recoveryWindowMultiplier(20)).toBeGreaterThan(recoveryWindowMultiplier(80));
  });
});

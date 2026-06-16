import { describe, it, expect } from 'vitest';
import { computeMuscleLoad, scoreToColor, scoreLabel } from './scoring';
import { SAMPLE_WEEK, MUSCLE_GROUPS } from './exercises';
import type { WeekData } from './exercises';
import { createProfileStore } from './profiles';
import { createMemoryStore } from './storage';

const EMPTY_WEEK: WeekData = {
  mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
};

describe('computeMuscleLoad — parity with the frozen prototype math', () => {
  const loads = computeMuscleLoad(SAMPLE_WEEK);

  it('returns a score for every muscle group, integer, clamped to [0,100]', () => {
    for (const m of MUSCLE_GROUPS) {
      const v = loads[m.id];
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  // Hand-derived from the SAMPLE_WEEK + the frozen algorithm. These pin behavior:
  // if the math ever changes, these break.
  it('matches known per-muscle scores for SAMPLE_WEEK', () => {
    // chest = BenchPress(Mon 4x6x90 -> 4*1.0*1.0=4 *1.0)
    //       + InclineBench(Mon 3x8x70 -> 3*0.85*1.0=2.55 *0.9=2.295)
    //       + BenchPress(Fri 3x8x80 -> 2.55 *1.0) = 8.845 -> round(8.845/30*100)=29
    expect(loads.chest).toBe(29);
    // quads = BackSquat(Tue 5x5x130 -> 5*1.0*1.3=6.5 *1.0)
    //       + LegPress(Tue 3x12x200 -> 3*0.85*1.3=3.315 *0.9=2.9835) = 9.4835 -> 32
    expect(loads.quads).toBe(32);
  });

  it('returns all zeros for an empty week', () => {
    const empty = computeMuscleLoad(EMPTY_WEEK);
    for (const m of MUSCLE_GROUPS) expect(empty[m.id]).toBe(0);
  });

  it('ignores invalid entries (negative weight / non-positive sets)', () => {
    const dirty: WeekData = {
      ...EMPTY_WEEK,
      mon: [
        { name: 'Bench Press', sets: 0, reps: 6, weight: 90 },   // invalid sets
        { name: 'Bench Press', sets: 4, reps: 6, weight: -5 },   // invalid weight
      ],
    };
    expect(computeMuscleLoad(dirty).chest).toBe(0);
  });
});

describe('scoreToColor — gradient endpoints', () => {
  it('green at 0, yellow at 50, red at 100', () => {
    expect(scoreToColor(0)).toBe('#4caf50');
    expect(scoreToColor(50)).toBe('#ffc107');
    expect(scoreToColor(100)).toBe('#f44336');
  });
  it('clamps out-of-range input', () => {
    expect(scoreToColor(-20)).toBe('#4caf50');
    expect(scoreToColor(200)).toBe('#f44336');
  });
});

describe('scoreLabel — thresholds', () => {
  it('maps scores to labels at the documented boundaries', () => {
    expect(scoreLabel(0)).toBe('Undertrained');
    expect(scoreLabel(29)).toBe('Undertrained');
    expect(scoreLabel(30)).toBe('Balanced');
    expect(scoreLabel(59)).toBe('Balanced');
    expect(scoreLabel(60)).toBe('Well-trained');
    expect(scoreLabel(79)).toBe('Well-trained');
    expect(scoreLabel(80)).toBe('Overtrained');
    expect(scoreLabel(100)).toBe('Overtrained');
  });
});

describe('createProfileStore — storage-agnostic profiles', () => {
  it('saves, lists, loads and removes a profile via an injected store', async () => {
    const profiles = createProfileStore(createMemoryStore());
    await profiles.save('Push Day', SAMPLE_WEEK);
    const list = await profiles.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.slug).toBe('push-day');

    const week = await profiles.loadWeek('push-day');
    expect(week?.mon?.[0]?.name).toBe('Bench Press');

    await profiles.remove('push-day');
    expect(await profiles.list()).toHaveLength(0);
    expect(await profiles.loadWeek('push-day')).toBeNull();
  });
});

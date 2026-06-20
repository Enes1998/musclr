import { describe, expect, it } from 'vitest';
import type { WeekData } from './exercises';
import {
  compareSnapshots,
  epley1RM,
  makeSnapshot,
  muscleTrend,
  personalRecords,
  snapshotStats,
  volumeTrend,
  weeklySetsPerMuscle,
} from './progress';

const emptyWeek = (): WeekData => ({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });

function week1(): WeekData {
  const w = emptyWeek();
  w.mon = [{ name: 'Bench Press', sets: 3, reps: 5, weight: 80 }];
  w.wed = [{ name: 'Back Squat', sets: 4, reps: 5, weight: 100 }];
  return w;
}

function week2(): WeekData {
  const w = emptyWeek();
  w.mon = [{ name: 'Bench Press', sets: 4, reps: 3, weight: 90 }];
  w.wed = [{ name: 'Back Squat', sets: 5, reps: 5, weight: 110 }];
  return w;
}

const snap1 = makeSnapshot(week1(), { id: 's1', weekOf: '2026-06-01', capturedAt: '2026-06-01T10:00:00Z' });
const snap2 = makeSnapshot(week2(), { id: 's2', weekOf: '2026-06-08', capturedAt: '2026-06-08T10:00:00Z' });

describe('weeklySetsPerMuscle (direct/primary sets only)', () => {
  it('counts primary-mover sets and excludes secondary involvement', () => {
    const sets = weeklySetsPerMuscle(week1());
    // Bench Press primary = chest, triceps → 3 each. Back Squat primary = quads, glutes → 4 each.
    expect(sets.chest).toBe(3);
    expect(sets.triceps).toBe(3);
    expect(sets.quads).toBe(4);
    expect(sets.glutes).toBe(4);
    // shoulders is only a SECONDARY mover of Bench Press → not counted.
    expect(sets.shoulders).toBe(0);
    expect(sets.calves).toBe(0);
  });

  it('ignores invalid entries', () => {
    const w = emptyWeek();
    w.mon = [{ name: 'Bench Press', sets: 0, reps: 5, weight: 80 }]; // invalid sets
    expect(weeklySetsPerMuscle(w).chest).toBe(0);
  });
});

describe('snapshotStats', () => {
  it('produces loads, sets, landmark status, and totals', () => {
    const st = snapshotStats(week1());
    expect(st.totals.totalSets).toBe(7); // 3 + 4
    expect(st.totals.daysTrained).toBe(2);
    expect(st.setsPerMuscle.chest).toBe(3);
    // 3 direct chest sets is below chest MEV (10-12) → below_mev.
    expect(st.volumeStatusPerMuscle.chest).toBe('below_mev');
    expect(st.loads.chest).toBeGreaterThan(0);
  });
});

describe('trends', () => {
  it('muscleTrend is ordered oldest-first regardless of input order', () => {
    const trend = muscleTrend([snap2, snap1], 'chest');
    expect(trend.map((p) => p.weekOf)).toEqual(['2026-06-01', '2026-06-08']);
    expect(trend[0]!.sets).toBe(3);
    expect(trend[1]!.sets).toBe(4);
  });

  it('volumeTrend returns total sets per snapshot', () => {
    const v = volumeTrend([snap1, snap2]);
    expect(v.map((p) => p.totalSets)).toEqual([7, 9]);
  });
});

describe('compareSnapshots', () => {
  it('computes curr − prev deltas', () => {
    const cmp = compareSnapshots(snap1, snap2);
    expect(cmp.totalSetsDelta).toBe(2); // 9 − 7
    expect(cmp.daysTrainedDelta).toBe(0);
    const chest = cmp.perMuscle.find((m) => m.muscle === 'chest')!;
    expect(chest.setsDelta).toBe(1); // 4 − 3
  });
});

describe('personal records', () => {
  it('epley1RM matches the Epley formula', () => {
    expect(epley1RM(100, 1)).toBe(100);
    expect(epley1RM(90, 3)).toBe(99); // 90 * (1 + 3/30) = 99
  });

  it('tracks best weight + best estimated 1RM with dates across snapshots', () => {
    const prs = personalRecords([snap1, snap2]);
    const bench = prs.find((p) => p.exercise === 'Bench Press')!;
    expect(bench.bestWeight).toBe(90);
    expect(bench.bestWeightDate).toBe('2026-06-08');
    // epley(80,5)=93.3 vs epley(90,3)=99 → 99 on 2026-06-08
    expect(bench.bestEst1RM).toBe(99);
    expect(bench.bestEst1RMDate).toBe('2026-06-08');
  });

  it('sorts PRs by estimated 1RM descending', () => {
    const prs = personalRecords([snap1, snap2]);
    for (let i = 1; i < prs.length; i++) {
      expect(prs[i - 1]!.bestEst1RM).toBeGreaterThanOrEqual(prs[i]!.bestEst1RM);
    }
  });
});

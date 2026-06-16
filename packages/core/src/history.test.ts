import { describe, it, expect } from 'vitest';
import {
  dayIdForDate,
  sessionsInWindow,
  weekDataFromSessions,
  type TrainingSession,
} from './history';
import { computeMuscleLoad } from './scoring';
import { ALL_EXERCISES } from './exerciseDb';

const sessions: TrainingSession[] = [
  { id: '1', date: '2026-06-15', entries: [{ name: 'Bench Press', sets: 4, reps: 6, weight: 90 }] }, // Mon
  { id: '2', date: '2026-06-10', entries: [{ name: 'Back Squat', sets: 5, reps: 5, weight: 130 }] }, // within 7d of the 16th
  { id: '3', date: '2026-06-01', entries: [{ name: 'Deadlift', sets: 4, reps: 5, weight: 150 }] }, // outside 7d window
];

describe('date → weekday', () => {
  it('maps known dates to the correct DayId', () => {
    expect(dayIdForDate('2026-06-15')).toBe('mon');
    expect(dayIdForDate('2026-06-16')).toBe('tue');
    expect(dayIdForDate('2026-06-14')).toBe('sun');
  });
});

describe('rolling window', () => {
  it('includes only sessions within windowDays of the anchor', () => {
    const inWin = sessionsInWindow(sessions, { today: '2026-06-16', windowDays: 7 });
    expect(inWin.map((s) => s.id).sort()).toEqual(['1', '2']); // not the June 1 deadlift
  });

  it('projects windowed sessions into WeekData bucketed by weekday', () => {
    const week = weekDataFromSessions(sessions, { today: '2026-06-16', windowDays: 7 });
    expect(week.mon.map((e) => e.name)).toEqual(['Bench Press']); // June 15 = Mon
    expect(week.wed.map((e) => e.name)).toEqual(['Back Squat']); // June 10 = Wed
    expect(week.sat).toEqual([]); // June 1 excluded
  });

  it('scores the windowed history with the frozen engine + full catalog', () => {
    const week = weekDataFromSessions(sessions, { today: '2026-06-16', windowDays: 7 });
    const loads = computeMuscleLoad(week, ALL_EXERCISES);
    expect(loads.chest).toBeGreaterThan(0); // Bench Press in window
    expect(loads.quads).toBeGreaterThan(0); // Back Squat in window
  });

  it('honors optional RIR/RPE/unit fields without affecting scoring', () => {
    const a = computeMuscleLoad(
      { mon: [{ name: 'Bench Press', sets: 4, reps: 6, weight: 90 }], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
      ALL_EXERCISES,
    );
    const b = computeMuscleLoad(
      { mon: [{ name: 'Bench Press', sets: 4, reps: 6, weight: 90, rir: 2, rpe: 8, unit: 'kg' }], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
      ALL_EXERCISES,
    );
    expect(a.chest).toBe(b.chest);
  });
});

// Date-based training history + rolling-window scoring.
//
// The prototype modeled a single fixed Mon-Sun template (WeekData). A real tracker needs dated
// sessions over time. `TrainingSession` is the dated unit; `weekDataFromSessions` projects a
// rolling window of sessions back into the WeekData shape the FROZEN computeMuscleLoad consumes
// (bucketed by weekday for display — the scoring math sums all entries regardless of bucket).
//
// Named TrainingSession (not WorkoutSession) to avoid clashing with the wearable
// health.WorkoutSession normalized record.

import type { DayId, WeekData, WorkoutEntry } from './exercises';

export interface TrainingSession {
  id: string;
  /** Local calendar day, 'YYYY-MM-DD'. */
  date: string;
  entries: WorkoutEntry[];
}

const EMPTY_WEEK = (): WeekData => ({
  mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
});

const DAY_IDS: DayId[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Map a 'YYYY-MM-DD' date to its weekday DayId (UTC-safe, no time component). */
export function dayIdForDate(date: string): DayId {
  const [y, m, d] = date.split('-').map(Number);
  const wd = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1)).getUTCDay();
  return DAY_IDS[wd]!;
}

/** Inclusive day difference a - b in whole days (both 'YYYY-MM-DD'). */
function daysBetween(a: string, b: string): number {
  const da = Date.parse(`${a}T00:00:00Z`);
  const db = Date.parse(`${b}T00:00:00Z`);
  return Math.round((da - db) / 86_400_000);
}

export interface WindowOptions {
  /** Rolling window size in days (inclusive of `today`). Default 7. */
  windowDays?: number;
  /** Anchor date 'YYYY-MM-DD'. Pass explicitly in tests; defaults to the local today. */
  today?: string;
}

function localToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Sessions whose date falls within the rolling window [today - windowDays + 1, today]. */
export function sessionsInWindow(
  sessions: TrainingSession[],
  opts: WindowOptions = {},
): TrainingSession[] {
  const windowDays = opts.windowDays ?? 7;
  const today = opts.today ?? localToday();
  return sessions.filter((s) => {
    const age = daysBetween(today, s.date);
    return age >= 0 && age < windowDays;
  });
}

/**
 * Project a rolling window of dated sessions into a WeekData (entries bucketed by weekday) so the
 * frozen computeMuscleLoad can score it unchanged:
 *
 *   computeMuscleLoad(weekDataFromSessions(history), ALL_EXERCISES)
 */
export function weekDataFromSessions(
  sessions: TrainingSession[],
  opts: WindowOptions = {},
): WeekData {
  const week = EMPTY_WEEK();
  for (const s of sessionsInWindow(sessions, opts)) {
    const day = dayIdForDate(s.date);
    week[day] = [...week[day], ...s.entries];
  }
  return week;
}

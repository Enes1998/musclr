// Profile history — weekly snapshots, trends, volume-landmark progression, and personal records.
//
// Framework-agnostic + pure. Builds on the FROZEN scoring (`computeMuscleLoad`), the trusted week
// totals (`validation`), and the evidence volume landmarks (`evidence`). The web + mobile apps
// persist a list of `WeeklySnapshot`s (each = a captured `WeekData` + date) and render the derived
// series/PRs from these functions — no business logic in the UI.

import {
  EXERCISES,
  MUSCLE_GROUPS,
  type Exercise,
  type MuscleId,
  type WeekData,
} from './exercises';
import { computeMuscleLoad } from './scoring';
import { getTrustedWeekTotals, isWorkoutEntryValid, type WeekTotals } from './validation';
import { volumeStatus, type VolumeStatus } from './evidence';

export interface WeeklySnapshot {
  id: string;
  /** Calendar date the snapshot represents (week-of, or the capture day), 'YYYY-MM-DD'. */
  weekOf: string;
  /** ISO 8601 timestamp the snapshot was captured. */
  capturedAt: string;
  /** The raw week captured — kept so PRs + re-derivation stay possible (scoring is frozen). */
  week: WeekData;
  /** Optional free-text note (e.g. "deload", "back from injury"). */
  note?: string;
}

function cloneWeek(week: WeekData): WeekData {
  // JSON clone — WeekData is plain data; works on web, Node, and RN/Hermes (no structuredClone dep).
  return JSON.parse(JSON.stringify(week)) as WeekData;
}

function emptyMuscleRecord(): Record<MuscleId, number> {
  const r = {} as Record<MuscleId, number>;
  for (const g of MUSCLE_GROUPS) r[g.id] = 0;
  return r;
}

/**
 * Weekly DIRECT working sets per muscle, per the evidence set-counting rule: only sets where the
 * muscle is a PRIMARY mover count toward weekly volume (secondary/indirect involvement excluded).
 * This is the unit the MEV/MAV/MRV landmarks are calibrated in.
 */
export function weeklySetsPerMuscle(
  week: WeekData,
  exercises: Exercise[] = EXERCISES,
): Record<MuscleId, number> {
  const sets = emptyMuscleRecord();
  for (const day of Object.values(week)) {
    for (const entry of day) {
      if (!isWorkoutEntryValid(entry)) continue;
      const def = exercises.find((e) => e.name === entry.name);
      if (!def) continue;
      for (const m of Object.keys(def.primary) as MuscleId[]) {
        sets[m] += entry.sets;
      }
    }
  }
  return sets;
}

export interface SnapshotStats {
  loads: Record<MuscleId, number>;
  setsPerMuscle: Record<MuscleId, number>;
  volumeStatusPerMuscle: Record<MuscleId, VolumeStatus>;
  totals: WeekTotals;
}

/** Derive every stat for one week: loads (frozen), direct sets/muscle, landmark status, totals. */
export function snapshotStats(week: WeekData, exercises: Exercise[] = EXERCISES): SnapshotStats {
  const loads = computeMuscleLoad(week, exercises);
  const setsPerMuscle = weeklySetsPerMuscle(week, exercises);
  const volumeStatusPerMuscle = {} as Record<MuscleId, VolumeStatus>;
  for (const g of MUSCLE_GROUPS) {
    volumeStatusPerMuscle[g.id] = volumeStatus(g.id, setsPerMuscle[g.id]);
  }
  return { loads, setsPerMuscle, volumeStatusPerMuscle, totals: getTrustedWeekTotals(week) };
}

/** Build a snapshot from a week. `id`/`capturedAt` are injectable for deterministic tests. */
export function makeSnapshot(
  week: WeekData,
  opts: { weekOf: string; id: string; capturedAt: string; note?: string },
): WeeklySnapshot {
  return {
    id: opts.id,
    weekOf: opts.weekOf,
    capturedAt: opts.capturedAt,
    week: cloneWeek(week),
    ...(opts.note ? { note: opts.note } : {}),
  };
}

/** Snapshots sorted ascending by `weekOf` (ISO dates sort lexically), oldest first. */
export function sortSnapshots(snapshots: WeeklySnapshot[]): WeeklySnapshot[] {
  return [...snapshots].sort((a, b) => a.weekOf.localeCompare(b.weekOf));
}

export interface MuscleTrendPoint {
  weekOf: string;
  score: number;
  sets: number;
  status: VolumeStatus;
}

/** Per-muscle time series (score, direct sets, landmark status) across snapshots, oldest first. */
export function muscleTrend(
  snapshots: WeeklySnapshot[],
  muscle: MuscleId,
  exercises: Exercise[] = EXERCISES,
): MuscleTrendPoint[] {
  return sortSnapshots(snapshots).map((s) => {
    const st = snapshotStats(s.week, exercises);
    return {
      weekOf: s.weekOf,
      score: st.loads[muscle],
      sets: st.setsPerMuscle[muscle],
      status: st.volumeStatusPerMuscle[muscle],
    };
  });
}

export interface VolumeTrendPoint {
  weekOf: string;
  totalSets: number;
  totalVolume: number;
  daysTrained: number;
}

/** Whole-week totals time series across snapshots, oldest first. */
export function volumeTrend(snapshots: WeeklySnapshot[]): VolumeTrendPoint[] {
  return sortSnapshots(snapshots).map((s) => {
    const t = getTrustedWeekTotals(s.week);
    return {
      weekOf: s.weekOf,
      totalSets: t.totalSets,
      totalVolume: t.totalVolume,
      daysTrained: t.daysTrained,
    };
  });
}

export interface MuscleDelta {
  muscle: MuscleId;
  scoreDelta: number;
  setsDelta: number;
}

export interface SnapshotComparison {
  totalVolumeDelta: number;
  totalSetsDelta: number;
  daysTrainedDelta: number;
  perMuscle: MuscleDelta[];
}

/** Compare two snapshots (curr − prev) for score/sets/volume deltas. */
export function compareSnapshots(
  prev: WeeklySnapshot,
  curr: WeeklySnapshot,
  exercises: Exercise[] = EXERCISES,
): SnapshotComparison {
  const a = snapshotStats(prev.week, exercises);
  const b = snapshotStats(curr.week, exercises);
  return {
    totalVolumeDelta: b.totals.totalVolume - a.totals.totalVolume,
    totalSetsDelta: b.totals.totalSets - a.totals.totalSets,
    daysTrainedDelta: b.totals.daysTrained - a.totals.daysTrained,
    perMuscle: MUSCLE_GROUPS.map((g) => ({
      muscle: g.id,
      scoreDelta: b.loads[g.id] - a.loads[g.id],
      setsDelta: b.setsPerMuscle[g.id] - a.setsPerMuscle[g.id],
    })),
  };
}

export interface ExercisePR {
  exercise: string;
  /** Heaviest single working set (any rep count). */
  bestWeight: number;
  bestWeightReps: number;
  bestWeightDate: string;
  /** Highest estimated 1RM via Epley (w × (1 + reps/30)), across all logged sets. */
  bestEst1RM: number;
  bestEst1RMDate: string;
}

/** Epley estimated one-rep max. For a single rep the lift IS the 1RM (the formula is for multi-rep). */
export function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps < 1) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/**
 * Personal records per exercise across all snapshots: heaviest set and best estimated 1RM, each
 * with the date it occurred. Sorted by best estimated 1RM, descending.
 */
export function personalRecords(snapshots: WeeklySnapshot[]): ExercisePR[] {
  const by = new Map<string, ExercisePR>();
  for (const snap of sortSnapshots(snapshots)) {
    for (const day of Object.values(snap.week)) {
      for (const entry of day) {
        if (!isWorkoutEntryValid(entry) || entry.weight <= 0) continue;
        const est = epley1RM(entry.weight, entry.reps);
        const cur = by.get(entry.name);
        if (!cur) {
          by.set(entry.name, {
            exercise: entry.name,
            bestWeight: entry.weight,
            bestWeightReps: entry.reps,
            bestWeightDate: snap.weekOf,
            bestEst1RM: est,
            bestEst1RMDate: snap.weekOf,
          });
          continue;
        }
        if (entry.weight > cur.bestWeight) {
          cur.bestWeight = entry.weight;
          cur.bestWeightReps = entry.reps;
          cur.bestWeightDate = snap.weekOf;
        }
        if (est > cur.bestEst1RM) {
          cur.bestEst1RM = est;
          cur.bestEst1RMDate = snap.weekOf;
        }
      }
    }
  }
  return [...by.values()].sort((a, b) => b.bestEst1RM - a.bestEst1RM);
}

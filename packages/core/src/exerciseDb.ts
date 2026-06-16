// Exercise catalog — the full evidence-based exercise dataset, ingested from the public-domain
// free-exercise-db and mapped onto musclr's 11 MuscleId groups (see scripts/build-exercise-catalog.mjs).
//
// The original 33 hand-tuned EXERCISES (exercises.ts) stay authoritative and are listed FIRST in
// ALL_EXERCISES, so their tuned weights win on name collisions and the frozen scoring parity holds.
// The catalog adds hundreds more exercises for search/selection; uniform primary=1.0 / secondary=0.5
// weights are applied where the source has no per-muscle weighting.

import type { Exercise, MuscleId } from './exercises';
import { EXERCISES } from './exercises';
import { FREE_EXERCISE_DB, FREE_EXERCISE_DB_RETRIEVED } from './data/exerciseCatalog.generated';

export type ExerciseMechanic = 'compound' | 'isolation';

export interface CatalogExercise extends Exercise {
  id: string;
  equipment?: string;
  mechanic?: ExerciseMechanic;
  category?: string;
  level?: string;
  force?: string;
}

export { FREE_EXERCISE_DB_RETRIEVED };

/** The ingested catalog (~865 exercises), mapped to MuscleId groups. */
export const EXERCISE_CATALOG: CatalogExercise[] = FREE_EXERCISE_DB;

const ORIGINAL_NAMES = new Set(EXERCISES.map((e) => e.name));

/** All exercises: the 33 hand-tuned (first, authoritative) + the catalog minus name collisions. */
export const ALL_EXERCISES: Exercise[] = [
  ...EXERCISES,
  ...EXERCISE_CATALOG.filter((e) => !ORIGINAL_NAMES.has(e.name)),
];

const BY_NAME = new Map<string, Exercise>(ALL_EXERCISES.map((e) => [e.name, e]));

/** Look up an exercise by exact name (hand-tuned definitions win on collision). */
export function findExercise(name: string): Exercise | undefined {
  return BY_NAME.get(name);
}

/** Case-insensitive substring search over the full catalog, ranked by match position. */
export function searchExercises(query: string, limit = 20): CatalogExercise[] {
  const q = query.trim().toLowerCase();
  if (!q) return EXERCISE_CATALOG.slice(0, limit);
  const hits: { ex: CatalogExercise; idx: number }[] = [];
  for (const ex of EXERCISE_CATALOG) {
    const idx = ex.name.toLowerCase().indexOf(q);
    if (idx >= 0) hits.push({ ex, idx });
  }
  hits.sort((a, b) => a.idx - b.idx || a.ex.name.localeCompare(b.ex.name));
  return hits.slice(0, limit).map((h) => h.ex);
}

/** Catalog exercises whose primary OR secondary movers include a given muscle group. */
export function exercisesForMuscle(muscle: MuscleId): CatalogExercise[] {
  return EXERCISE_CATALOG.filter(
    (e) => e.primary[muscle] != null || e.secondary?.[muscle] != null,
  );
}

/** free-exercise-db muscle-vocabulary → MuscleId crosswalk (exported for transparency/tests). */
export const MUSCLE_CROSSWALK: Record<string, MuscleId | null> = {
  abdominals: 'core',
  abductors: 'glutes',
  adductors: 'quads',
  biceps: 'biceps',
  calves: 'calves',
  chest: 'chest',
  forearms: 'forearms',
  glutes: 'glutes',
  hamstrings: 'hamstrings',
  lats: 'back',
  'lower back': 'back',
  'middle back': 'back',
  neck: null,
  quadriceps: 'quads',
  shoulders: 'shoulders',
  traps: 'back',
  triceps: 'triceps',
};

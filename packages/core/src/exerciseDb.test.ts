import { describe, it, expect } from 'vitest';
import {
  EXERCISE_CATALOG,
  ALL_EXERCISES,
  findExercise,
  searchExercises,
  exercisesForMuscle,
  MUSCLE_CROSSWALK,
} from './exerciseDb';
import { EXERCISES, MUSCLE_GROUPS, SAMPLE_WEEK } from './exercises';
import type { MuscleId } from './exercises';
import { computeMuscleLoad } from './scoring';

const GROUP_IDS = new Set<MuscleId>(MUSCLE_GROUPS.map((g) => g.id));

describe('exercise catalog ingest', () => {
  it('ingested several hundred exercises', () => {
    expect(EXERCISE_CATALOG.length).toBeGreaterThan(800);
  });

  it('every catalog exercise maps only to valid MuscleId groups (no raw db vocab, no neck)', () => {
    for (const ex of EXERCISE_CATALOG) {
      expect(Object.keys(ex.primary).length).toBeGreaterThan(0);
      for (const k of Object.keys(ex.primary)) expect(GROUP_IDS.has(k as MuscleId)).toBe(true);
      for (const k of Object.keys(ex.secondary ?? {})) expect(GROUP_IDS.has(k as MuscleId)).toBe(true);
      // a muscle is never both primary and secondary on the same exercise
      for (const k of Object.keys(ex.secondary ?? {})) expect(ex.primary[k as MuscleId]).toBeUndefined();
    }
  });

  it('crosswalk drops neck and maps everything else into the 11 groups', () => {
    expect(MUSCLE_CROSSWALK.neck).toBeNull();
    for (const [, g] of Object.entries(MUSCLE_CROSSWALK)) {
      if (g !== null) expect(GROUP_IDS.has(g)).toBe(true);
    }
  });
});

describe('merge with the frozen 33', () => {
  it('ALL_EXERCISES keeps the hand-tuned definitions authoritative on name collision', () => {
    expect(ALL_EXERCISES.length).toBeGreaterThan(EXERCISES.length);
    const bench = findExercise('Bench Press');
    // original tuned weights, not the catalog's uniform 1.0/0.5
    expect(bench?.primary.chest).toBe(1.0);
    expect(bench?.primary.triceps).toBe(0.6);
  });

  it('scoring parity holds even when scoring against the full catalog', () => {
    // original 33 are first, so SAMPLE_WEEK names resolve to the tuned defs → identical scores
    const withCatalog = computeMuscleLoad(SAMPLE_WEEK, ALL_EXERCISES);
    expect(withCatalog.chest).toBe(29);
    expect(withCatalog.quads).toBe(32);
  });
});

describe('catalog queries', () => {
  it('search finds exercises by name', () => {
    const hits = searchExercises('squat', 50);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.name.toLowerCase().includes('squat'))).toBe(true);
  });

  it('exercisesForMuscle returns exercises targeting a group', () => {
    const chest = exercisesForMuscle('chest');
    expect(chest.length).toBeGreaterThan(10);
    expect(chest.every((e) => e.primary.chest != null || e.secondary?.chest != null)).toBe(true);
  });
});

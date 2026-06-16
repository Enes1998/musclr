// Deterministic, evidence-grounded planner. Serves two roles:
//  1. The zero-config fallback so the AI coach works with no API key / no model configured.
//  2. A fixture the request/validate loop is tested against.
// Output always passes generatedPlanSchema + validateGeneratedPlan (schema-valid + grounded).

import {
  MUSCLE_GROUPS,
  EXERCISES,
  getVolumeLandmark,
  exercisesForMuscle,
  EVIDENCE_MODULE,
  PLAN_SCHEMA_VERSION,
  type GeneratedPlan,
  type PlanPromptInput,
  type TrainingGoal,
  type MuscleId,
} from '@musclr/core';

const FOCUS_COUNT = 4;
const TRAIN_DAYS: [string, string][] = [
  ['mon', 'Day 1'],
  ['tue', 'Day 2'],
  ['thu', 'Day 3'],
  ['fri', 'Day 4'],
];
const REST_DAYS: [string, string][] = [
  ['wed', 'Rest'],
  ['sat', 'Rest'],
  ['sun', 'Rest'],
];

function repsFor(goal: TrainingGoal): number {
  return goal === 'strength' ? 5 : goal === 'endurance' ? 18 : 10;
}
function repCitation(goal: TrainingGoal): string {
  return goal === 'strength'
    ? 'load.strength_range'
    : goal === 'endurance'
      ? 'load.endurance_range'
      : 'load.hypertrophy_range';
}
function weightFor(goal: TrainingGoal): 'bodyweight' | 'light' | 'moderate' | 'heavy' {
  return goal === 'strength' ? 'heavy' : goal === 'endurance' ? 'light' : 'moderate';
}

export function mockPlanner(input: PlanPromptInput): GeneratedPlan {
  const goal = input.goal;
  const loads = input.loads;
  const reps = repsFor(goal);
  const wg = weightFor(goal);
  const cite = repCitation(goal);

  // Prioritize the most undertrained groups.
  const focus = MUSCLE_GROUPS.map((g) => ({ id: g.id, label: g.label, score: loads[g.id] ?? 0 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, FOCUS_COUNT);

  const weeklySetsPerMuscle = focus.map((f) => {
    const lm = getVolumeLandmark(f.id);
    const target = lm ? lm.mev[1] : 10; // start of the productive range
    const capped = lm ? Math.min(target, lm.mrv[1]) : target;
    return { muscle: f.id as MuscleId, setsPerWeek: capped };
  });

  const setsByMuscle = new Map(weeklySetsPerMuscle.map((w) => [w.muscle, w.setsPerWeek]));

  // Prefer the hand-picked compound exercises (the original 33) where the muscle is the prime
  // mover; fall back to the broader catalog (strength + compound first).
  const pickExerciseName = (m: MuscleId, label: string): string => {
    // The curated exercise where this muscle is the STRONGEST prime mover (highest primary weight).
    const curated = EXERCISES.filter((e) => e.primary[m] != null).sort(
      (a, b) => (b.primary[m] ?? 0) - (a.primary[m] ?? 0),
    )[0];
    if (curated) return curated.name;
    const c = exercisesForMuscle(m);
    const best =
      c.find((e) => e.primary[m] != null && e.category === 'strength' && e.mechanic === 'compound') ??
      c.find((e) => e.primary[m] != null) ??
      c[0];
    return best?.name ?? `${label} exercise`;
  };

  const mkExercise = (f: { id: MuscleId; label: string }) => {
    const weekly = setsByMuscle.get(f.id) ?? 10;
    const perDay = Math.max(2, Math.min(6, Math.round(weekly / 2))); // trained on 2 days
    return {
      name: pickExerciseName(f.id, f.label),
      targetMuscle: f.id,
      sets: perDay,
      reps,
      rir: 2,
      weightGuidance: wg,
      citations: [cite, 'failure.proximity'],
    };
  };

  // Round-robin pairs so each focus muscle is trained ~2x/week (supports freq.twice_weekly).
  const trainingDays = TRAIN_DAYS.map(([day, label], i) => {
    const a = focus[i % focus.length]!;
    const b = focus[(i + 1) % focus.length]!;
    return { day, label, rest: false, exercises: [mkExercise(a), mkExercise(b)] };
  });
  const restDays = REST_DAYS.map(([day, label]) => ({ day, label, rest: true, exercises: [] }));

  const lacking = input.nutrition?.lacking ?? [];
  const nutrition = {
    summary: lacking.length
      ? `Prioritize protein and address low intake of: ${lacking.join(', ')}.`
      : 'Hit your daily protein target to support recovery and muscle growth.',
    focus: [
      {
        nutrient: 'protein_g',
        direction: 'increase' as const,
        foods: ['chicken breast', 'greek yogurt', 'lentils', 'eggs'],
        citations: ['nutrition.protein'],
      },
    ],
    citations: ['nutrition.protein'],
  };

  return {
    schemaVersion: PLAN_SCHEMA_VERSION,
    evidenceModuleVersion: EVIDENCE_MODULE.moduleVersion,
    workout: {
      summary: `A ${goal} block focused on your most undertrained areas (${focus
        .map((f) => f.label)
        .join(', ')}), training each at least twice per week within evidence-based volume landmarks.`,
      goal,
      weeklySetsPerMuscle,
      days: [...trainingDays, ...restDays],
      citations: ['vol.landmarks_framework', 'freq.twice_weekly', 'overload.progression'],
    },
    nutrition,
  };
}

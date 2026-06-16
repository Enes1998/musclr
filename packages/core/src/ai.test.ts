import { describe, it, expect } from 'vitest';
import {
  generatedPlanSchema,
  validateGeneratedPlan,
  buildPlanPrompt,
  type GeneratedPlan,
} from './ai';
import { EVIDENCE_MODULE } from './evidence';

function validPlan(): GeneratedPlan {
  return {
    schemaVersion: 1,
    evidenceModuleVersion: EVIDENCE_MODULE.moduleVersion,
    workout: {
      summary: 'Balanced hypertrophy week bringing chest and back toward MAV.',
      goal: 'hypertrophy',
      weeklySetsPerMuscle: [
        { muscle: 'chest', setsPerWeek: 14 },
        { muscle: 'back', setsPerWeek: 16 },
      ],
      days: [
        {
          day: 'mon', label: 'Push', rest: false,
          exercises: [
            { name: 'Bench Press', targetMuscle: 'chest', sets: 4, reps: 8, rir: 2, weightGuidance: 'moderate', citations: ['load.hypertrophy_range', 'failure.proximity'] },
          ],
        },
        {
          day: 'tue', label: 'Pull', rest: false,
          exercises: [
            { name: 'Barbell Row', targetMuscle: 'back', sets: 4, reps: 10, rir: 2, weightGuidance: 'moderate', citations: ['load.hypertrophy_range'] },
          ],
        },
      ],
      citations: ['vol.landmarks_framework', 'freq.twice_weekly'],
    },
    nutrition: {
      summary: 'Protein is low; prioritize 1.6-2.0 g/kg.',
      focus: [
        { nutrient: 'protein_g', direction: 'increase', foods: ['chicken', 'greek yogurt'], citations: ['nutrition.protein'] },
      ],
      citations: ['nutrition.protein'],
    },
  };
}

describe('plan schema', () => {
  it('accepts a well-formed plan', () => {
    expect(generatedPlanSchema.safeParse(validPlan()).success).toBe(true);
  });

  it('rejects unknown fields (strict) and out-of-range values', () => {
    const extra = { ...validPlan(), surprise: true } as unknown;
    expect(generatedPlanSchema.safeParse(extra).success).toBe(false);

    const bad = validPlan();
    bad.workout.days[0]!.exercises[0]!.sets = 99; // > max 10
    expect(generatedPlanSchema.safeParse(bad).success).toBe(false);
  });

  it('allows null nutrition', () => {
    const p = validPlan();
    p.nutrition = null;
    expect(generatedPlanSchema.safeParse(p).success).toBe(true);
  });
});

describe('grounding validation', () => {
  it('passes a grounded, in-bounds plan', () => {
    const res = validateGeneratedPlan(validPlan());
    expect(res.ok).toBe(true);
    expect(res.issues).toHaveLength(0);
  });

  it('flags an unknown citation', () => {
    const p = validPlan();
    p.workout.days[0]!.exercises[0]!.citations = ['totally.made.up'];
    const res = validateGeneratedPlan(p);
    expect(res.ok).toBe(false);
    expect(res.issues.some((i) => i.kind === 'unknown_principle')).toBe(true);
  });

  it('flags volume exceeding MRV (40 sets/wk chest)', () => {
    const p = validPlan();
    p.workout.weeklySetsPerMuscle[0]!.setsPerWeek = 40;
    const res = validateGeneratedPlan(p);
    expect(res.ok).toBe(false);
    expect(res.issues.some((i) => i.kind === 'volume_exceeds_mrv')).toBe(true);
  });

  it('flags a rep range that does not fit the goal', () => {
    const p = validPlan();
    p.workout.goal = 'strength';
    p.workout.days[0]!.exercises[0]!.reps = 20; // too high for strength
    const res = validateGeneratedPlan(p);
    expect(res.ok).toBe(false);
    expect(res.issues.some((i) => i.kind === 'rep_range')).toBe(true);
  });

  it('flags a plan with no citations at all', () => {
    const p = validPlan();
    p.workout.citations = [];
    p.workout.days.forEach((d) => d.exercises.forEach((e) => (e.citations = [])));
    p.nutrition = null;
    const res = validateGeneratedPlan(p);
    expect(res.ok).toBe(false);
  });
});

describe('prompt builder', () => {
  it('embeds the evidence module + user context and demands citations', () => {
    const { system, user } = buildPlanPrompt({
      goal: 'hypertrophy',
      loads: { chest: 20, back: 75 },
      readiness: 45,
      nutrition: { lacking: ['protein_g'], overdone: ['sodium_mg'], unknown: ['iron_mg'] },
    });
    expect(system).toContain(EVIDENCE_MODULE.moduleVersion);
    expect(system).toContain('vol.landmarks_framework');
    expect(system).toContain('MRV');
    expect(system).toContain('cite');
    expect(user).toContain('chest: 20');
    expect(user).toContain('readiness'); // bounded nudge
    expect(user).toContain('protein_g');
    expect(user).toContain('iron_mg'); // unknown, must not infer deficiency
  });
});

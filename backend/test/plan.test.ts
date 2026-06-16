import { describe, it, expect } from 'vitest';
import { generatePlan } from '../src/ai/generatePlan';
import { generatedPlanSchema, validateGeneratedPlan } from '@musclr/core';

describe('backend plan generation (mock provider)', () => {
  it('returns a schema-valid, grounded plan with no API key', async () => {
    const { plan, meta } = await generatePlan({
      goal: 'hypertrophy',
      loads: { chest: 20, back: 75, biceps: 10, calves: 5, shoulders: 30 },
      provider: 'mock',
    });
    expect(meta.provider).toBe('mock');
    expect(generatedPlanSchema.safeParse(plan).success).toBe(true);
    expect(validateGeneratedPlan(plan).ok).toBe(true);
  });

  it('prioritizes the most undertrained muscles', async () => {
    // Full loads so the lowest are deterministic: biceps + calves are the most undertrained.
    const { plan } = await generatePlan({
      goal: 'hypertrophy',
      loads: {
        chest: 90, back: 90, shoulders: 88, triceps: 80, forearms: 70, core: 75,
        quads: 85, hamstrings: 80, glutes: 78, biceps: 4, calves: 2,
      },
    });
    const targets = new Set(plan.workout.weeklySetsPerMuscle.map((w) => w.muscle));
    expect(targets.has('biceps')).toBe(true);
    expect(targets.has('calves')).toBe(true);
  });

  it('respects goal-appropriate rep ranges (strength)', async () => {
    const { plan } = await generatePlan({ goal: 'strength', loads: { quads: 10 }, provider: 'mock' });
    const reps = plan.workout.days.flatMap((d) => d.exercises).map((e) => e.reps);
    expect(reps.every((r) => r <= 8)).toBe(true);
    expect(validateGeneratedPlan(plan).ok).toBe(true);
  });

  it('keeps weekly volumes within MRV', async () => {
    const { plan } = await generatePlan({ goal: 'hypertrophy', loads: {}, provider: 'mock' });
    expect(validateGeneratedPlan(plan).ok).toBe(true);
  });
});

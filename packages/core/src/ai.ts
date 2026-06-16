// AI gateway — the provider-agnostic contract for generating evidence-grounded plans.
//
// One zod schema + one prompt builder are shared by every provider route (hosted default,
// BYO cloud keys, local agents). The deterministic guardrails in [[evidence]] validate the
// model's output: every prescriptive claim must cite a known principle and stay within the
// cited numeric bounds. Provider ADAPTERS (Vercel AI SDK `generateObject` calls) live in the
// apps/backend because they need the `ai` package + network; this module is pure + testable.

import { z } from 'zod';
import type { MuscleId } from './exercises';
import {
  EVIDENCE_MODULE,
  validateGrounding,
  type TrainingGoal,
  type GroundingIssue,
} from './evidence';
import type { NutrientKey, NutrientVector } from './nutrition';

const MUSCLE_IDS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'core', 'quads', 'hamstrings', 'glutes', 'calves',
] as const;
// Compile-time guarantee the tuple matches MuscleId.
const _muscleCheck: readonly MuscleId[] = MUSCLE_IDS;
void _muscleCheck;

const GOALS = ['strength', 'hypertrophy', 'endurance', 'general'] as const;

// ---- Plan schema (strict-safe: explicit fields, enums, .strict(), nullable not optional) ----

export const planExerciseSchema = z
  .object({
    name: z.string(),
    targetMuscle: z.enum(MUSCLE_IDS),
    sets: z.number().int().min(1).max(10),
    reps: z.number().int().min(1).max(60),
    rir: z.number().int().min(0).max(6),
    weightGuidance: z.enum(['bodyweight', 'light', 'moderate', 'heavy']),
    /** Evidence principle ids backing this prescription (e.g. 'load.hypertrophy_range'). */
    citations: z.array(z.string()),
  })
  .strict();

export const planDaySchema = z
  .object({
    day: z.string(),
    label: z.string(),
    rest: z.boolean(),
    exercises: z.array(planExerciseSchema),
  })
  .strict();

export const weeklyVolumeSchema = z
  .object({
    muscle: z.enum(MUSCLE_IDS),
    setsPerWeek: z.number().int().min(0).max(60),
  })
  .strict();

export const workoutPlanSchema = z
  .object({
    summary: z.string(),
    goal: z.enum(GOALS),
    weeklySetsPerMuscle: z.array(weeklyVolumeSchema),
    days: z.array(planDaySchema),
    citations: z.array(z.string()),
  })
  .strict();

export const nutritionAdviceSchema = z
  .object({
    summary: z.string(),
    focus: z.array(
      z
        .object({
          nutrient: z.string(),
          direction: z.enum(['increase', 'decrease']),
          foods: z.array(z.string()),
          citations: z.array(z.string()),
        })
        .strict(),
    ),
    citations: z.array(z.string()),
  })
  .strict();

export const generatedPlanSchema = z
  .object({
    schemaVersion: z.number().int(),
    evidenceModuleVersion: z.string(),
    workout: workoutPlanSchema,
    nutrition: nutritionAdviceSchema.nullable(),
  })
  .strict();

export type PlanExercise = z.infer<typeof planExerciseSchema>;
export type PlanDay = z.infer<typeof planDaySchema>;
export type WorkoutPlan = z.infer<typeof workoutPlanSchema>;
export type NutritionAdvice = z.infer<typeof nutritionAdviceSchema>;
export type GeneratedPlan = z.infer<typeof generatedPlanSchema>;

// ---- Grounding validation of a generated plan ------------------------------

export interface PlanValidationResult {
  ok: boolean;
  issues: GroundingIssue[];
}

/**
 * Validate a generated plan against the evidence module: all cited ids must be known
 * principles/citations, weekly volumes must respect MRV, and rep prescriptions must fit the goal.
 */
export function validateGeneratedPlan(plan: GeneratedPlan): PlanValidationResult {
  const principleIds = new Set<string>();
  const addAll = (ids: string[]) => ids.forEach((i) => principleIds.add(i));
  addAll(plan.workout.citations);
  plan.workout.days.forEach((d) => d.exercises.forEach((e) => addAll(e.citations)));
  if (plan.nutrition) {
    addAll(plan.nutrition.citations);
    plan.nutrition.focus.forEach((f) => addAll(f.citations));
  }

  const goal = plan.workout.goal;
  const repPrescriptions = plan.workout.days
    .flatMap((d) => d.exercises)
    .map((e) => ({ goal, reps: e.reps }));

  const weeklyVolumes = plan.workout.weeklySetsPerMuscle.map((v) => ({
    muscle: v.muscle,
    setsPerWeek: v.setsPerWeek,
  }));

  // Citations may reference either a principle id or a raw citation id — accept both.
  const knownIds = new Set([
    ...EVIDENCE_MODULE.principles.map((p) => p.id),
    ...EVIDENCE_MODULE.citations.map((c) => c.id),
  ]);
  const issues: GroundingIssue[] = [];
  for (const id of principleIds) {
    if (!knownIds.has(id)) issues.push({ kind: 'unknown_principle', detail: id });
  }
  // At least one citation overall (the grounding requirement).
  if (principleIds.size === 0) {
    issues.push({ kind: 'unknown_principle', detail: '(no citations provided)' });
  }

  const bounds = validateGrounding({ weeklyVolumes, repPrescriptions });
  issues.push(...bounds.issues);

  return { ok: issues.length === 0, issues };
}

// ---- Prompt builder --------------------------------------------------------

export interface PlanPromptInput {
  goal: TrainingGoal;
  /** Current per-muscle load scores (0-100) from computeMuscleLoad. */
  loads: Partial<Record<MuscleId, number>>;
  /** Recent weekly sets per muscle, if known. */
  recentWeeklySets?: Partial<Record<MuscleId, number>>;
  /** Optional nutrition context — lacking/overdone nutrient keys + a target snapshot. */
  nutrition?: {
    lacking: NutrientKey[];
    overdone: NutrientKey[];
    unknown: NutrientKey[];
    consumed?: NutrientVector;
  };
  /** Optional readiness 0-100 from wearables (bounded nudge only). */
  readiness?: number;
}

/** Build the {system, user} grounding prompt shared by all provider routes. */
export function buildPlanPrompt(input: PlanPromptInput): { system: string; user: string } {
  const m = EVIDENCE_MODULE;
  const principleLines = m.principles
    .map((p) => {
      const bound = p.numeric
        ? ` [${p.numeric.metric}: ${p.numeric.min}-${p.numeric.max} ${p.numeric.unit}]`
        : '';
      return `- ${p.id} (${p.tier}): ${p.statement}${bound} [cite: ${p.citations.join(', ')}]`;
    })
    .join('\n');

  const landmarkLines = m.volumeLandmarks
    .map((l) => `- ${l.muscle}: MEV ${l.mev[0]}-${l.mev[1]}, MAV ${l.mav[0]}-${l.mav[1]}, MRV ${l.mrv[0]}-${l.mrv[1]} sets/wk`)
    .join('\n');

  const system = [
    'You are an evidence-based strength & conditioning coach. You MUST base every prescription ONLY on the evidence below and cite the relevant principle id(s) in each exercise\'s and the plan\'s `citations`. Do not invent numbers outside the stated bounds. Disclose when a recommendation rests on a practitioner_guideline tier rather than peer-reviewed evidence.',
    '',
    `Evidence module version: ${m.moduleVersion}. Set-counting rule: ${m.setCountingRule}`,
    '',
    'PRINCIPLES:',
    principleLines,
    '',
    'WEEKLY VOLUME LANDMARKS (sets/week, practitioner_guideline tier):',
    landmarkLines,
    '',
    'Output ONLY a JSON object matching the provided schema. Every exercise and the plan must include >=1 citation id from the principles above. Weekly sets per muscle must not exceed that muscle\'s MRV. Rep ranges must match the goal.',
  ].join('\n');

  const loadLines = Object.entries(input.loads)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  const userParts: string[] = [
    `Goal: ${input.goal}`,
    `Current muscle load scores (0=undertrained, 100=overtrained):\n${loadLines}`,
  ];
  if (input.recentWeeklySets) {
    userParts.push(
      `Recent weekly sets per muscle:\n${Object.entries(input.recentWeeklySets).map(([k, v]) => `  ${k}: ${v}`).join('\n')}`,
    );
  }
  if (typeof input.readiness === 'number') {
    userParts.push(
      `Today's recovery readiness: ${input.readiness}/100. Use principle recovery.hrv_guided as a BOUNDED nudge only (evidence is endurance-biased); do not override the volume landmarks.`,
    );
  }
  if (input.nutrition) {
    userParts.push(
      `Nutrition status — lacking: ${input.nutrition.lacking.join(', ') || 'none'}; overdone: ${input.nutrition.overdone.join(', ') || 'none'}; unknown (no data, do NOT infer deficiency): ${input.nutrition.unknown.join(', ') || 'none'}. Provide nutrition advice citing nutrition.protein where relevant.`,
    );
  }
  userParts.push(
    'Produce a balanced upcoming program that brings undertrained muscles up toward their MEV-MAV range and respects recovery (>=48-72h, >=2x/week frequency).',
  );

  return { system, user: userParts.join('\n\n') };
}

// ---- Provider gateway contract (adapters implemented in apps/backend) ------

export type ProviderKind = 'hosted' | 'byo-cloud' | 'local';
export type CloudProvider = 'openai' | 'anthropic' | 'google';

export interface PlanRequest {
  kind: ProviderKind;
  prompt: { system: string; user: string };
  /** byo-cloud only */
  cloudProvider?: CloudProvider;
  byoKey?: string;
  /** local only — e.g. http://localhost:11434/v1 (Ollama) or :1234/v1 (LM Studio) */
  localBaseUrl?: string;
  model?: string;
}

export interface PlanResult {
  plan: GeneratedPlan;
  meta: { provider: ProviderKind; model: string; durationMs: number };
}

export interface AIGateway {
  generatePlan(req: PlanRequest): Promise<PlanResult>;
}

export const PLAN_SCHEMA_VERSION = 1;

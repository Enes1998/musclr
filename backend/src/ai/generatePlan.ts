import {
  buildPlanPrompt,
  generatedPlanSchema,
  validateGeneratedPlan,
  type GeneratedPlan,
  type PlanPromptInput,
} from '@musclr/core';
import { mockPlanner } from './mockPlanner';
import { callModel, type ModelProvider } from './providers';

export type PlanProvider = 'mock' | ModelProvider;

export interface GenerateInput extends PlanPromptInput {
  provider?: PlanProvider;
  model?: string;
  byoKey?: string;
  localBaseUrl?: string;
}

export interface GenerateOutput {
  plan: GeneratedPlan;
  meta: { provider: PlanProvider; model: string; durationMs: number; repaired: boolean };
}

export class PlanError extends Error {
  constructor(
    public kind: 'schema' | 'grounding',
    public issues: string[],
  ) {
    super(`${kind} validation failed`);
  }
}

function validate(raw: unknown): { plan?: GeneratedPlan; issues: string[] } {
  const parsed = generatedPlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  }
  const grounding = validateGeneratedPlan(parsed.data);
  if (!grounding.ok) {
    return { issues: grounding.issues.map((i) => `${i.kind}: ${i.detail}`) };
  }
  return { plan: parsed.data, issues: [] };
}

export async function generatePlan(input: GenerateInput): Promise<GenerateOutput> {
  const startedAt = performance.now();
  const provider: PlanProvider = input.provider ?? 'mock';
  const elapsed = () => Math.round(performance.now() - startedAt);

  // Deterministic, always-valid fallback (no API key required).
  if (provider === 'mock') {
    return {
      plan: mockPlanner(input),
      meta: { provider, model: 'deterministic', durationMs: elapsed(), repaired: false },
    };
  }

  const { system, user } = buildPlanPrompt(input);

  let raw = await callModel({
    provider,
    model: input.model,
    byoKey: input.byoKey,
    localBaseUrl: input.localBaseUrl,
    system,
    prompt: user,
    schema: generatedPlanSchema,
  });
  let result = validate(raw);
  let repaired = false;

  // One repair attempt: feed the issues back and ask for a corrected object.
  if (!result.plan) {
    repaired = true;
    const fixPrompt = `${user}\n\nYour previous response was invalid. Fix ONLY these problems and return the corrected JSON object: ${result.issues.join('; ')}`;
    raw = await callModel({
      provider,
      model: input.model,
      byoKey: input.byoKey,
      localBaseUrl: input.localBaseUrl,
      system,
      prompt: fixPrompt,
      schema: generatedPlanSchema,
    });
    result = validate(raw);
  }

  if (!result.plan) {
    const parsed = generatedPlanSchema.safeParse(raw);
    throw new PlanError(parsed.success ? 'grounding' : 'schema', result.issues);
  }

  return {
    plan: result.plan,
    meta: { provider, model: input.model ?? 'default', durationMs: elapsed(), repaired },
  };
}

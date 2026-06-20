// Deterministic nutrition-advice generator (the no-key fallback / fixture). Mirrors the workout
// mock: the deterministic flag engine in @musclr/core decides what's lacking/overdone; this turns
// those gaps into readable, food-specific advice. A real LLM can replace this behind the same
// route, grounded by the same FOODS_RICH_IN + evidence module.

import { FOODS_RICH_IN, nutritionAdviceSchema, type NutrientKey, type NutritionAdvice } from '@musclr/core';
import { callModel, type ModelProvider } from './providers';

export interface NutritionAdviceInput {
  lacking?: NutrientKey[];
  overdone?: NutrientKey[];
  unknown?: NutrientKey[];
}

export type AdviceProvider = 'mock' | ModelProvider;

export interface GenerateAdviceInput extends NutritionAdviceInput {
  provider?: AdviceProvider;
  model?: string;
  byoKey?: string;
  localBaseUrl?: string;
}

function pretty(key: string): string {
  return key
    .replace(/_(g|mg|ug|kcal)$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .replace(/\bB(\d)/, 'B$1');
}

function buildSummary(lacking: NutrientKey[], overdone: NutrientKey[], unknown: NutrientKey[]): string {
  const parts: string[] = [];
  if (lacking.length) parts.push(`You're low on ${lacking.map(pretty).join(', ')} — prioritize the foods below.`);
  if (overdone.length) parts.push(`${overdone.map(pretty).join(', ')} ${overdone.length > 1 ? 'are' : 'is'} above the recommended limit; ease back.`);
  if (!lacking.length && !overdone.length) parts.push('Your tracked intake looks balanced today. Keep hitting your protein target.');
  if (unknown.length >= 6) parts.push(`Several nutrients have no data yet (${unknown.length}) — log more foods for a complete picture; these are not deficiencies.`);
  return parts.join(' ');
}

export function mockNutritionAdvice(input: NutritionAdviceInput): NutritionAdvice {
  const lacking = (input.lacking ?? []).slice(0, 6);
  const overdone = (input.overdone ?? []).slice(0, 4);
  const unknown = input.unknown ?? [];

  const focus: NutritionAdvice['focus'] = [];
  for (const k of lacking) {
    focus.push({
      nutrient: pretty(k),
      direction: 'increase',
      foods: FOODS_RICH_IN[k] ?? [],
      citations: k === 'protein_g' ? ['nutrition.protein'] : [],
    });
  }
  for (const k of overdone) {
    focus.push({ nutrient: pretty(k), direction: 'decrease', foods: [], citations: [] });
  }
  if (focus.length === 0) {
    focus.push({
      nutrient: 'Protein',
      direction: 'increase',
      foods: FOODS_RICH_IN.protein_g ?? [],
      citations: ['nutrition.protein'],
    });
  }

  const advice = {
    summary: buildSummary(lacking, overdone, unknown),
    focus,
    citations: ['nutrition.protein'],
  };
  // Validate against the shared schema (same contract a real LLM must satisfy).
  return nutritionAdviceSchema.parse(advice);
}

/** Grounded prompt for the live nutrition advisor. The model only explains/recommends. */
function buildAdvicePrompt(input: NutritionAdviceInput): { system: string; user: string } {
  const lacking = input.lacking ?? [];
  const overdone = input.overdone ?? [];
  const unknown = input.unknown ?? [];
  const richRef = lacking
    .map((k) => `${pretty(k)}: ${(FOODS_RICH_IN[k] ?? []).join(', ') || '(no curated list)'}`)
    .join('\n');

  const system =
    'You are a sports-nutrition assistant for the musclr app. You ONLY explain and recommend — you ' +
    'do NOT decide what is lacking or overdone; those flags are computed deterministically by the app ' +
    'and given to you. Respond with a JSON object matching the provided schema. For each focus item, ' +
    'recommend concrete whole-food sources (prefer the curated list when given). Cite the evidence ' +
    "principle id 'nutrition.protein' ONLY when advising about protein. Never describe a nutrient that " +
    'has no logged data as a deficiency — those are unknowns, not lows. Keep the summary to 1–3 sentences.';

  const user = [
    lacking.length ? `LOW (increase): ${lacking.map(pretty).join(', ')}` : 'LOW: none',
    overdone.length ? `HIGH/over-limit (decrease): ${overdone.map(pretty).join(', ')}` : 'HIGH: none',
    unknown.length ? `UNKNOWN (no data — do NOT treat as deficiencies): ${unknown.length} nutrients` : '',
    richRef ? `\nCurated food sources for the low nutrients:\n${richRef}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return { system, user };
}

export interface GenerateAdviceOutput {
  advice: NutritionAdvice;
  provider: AdviceProvider;
  repaired: boolean;
}

/**
 * Live nutrition advice via a provider, grounded by the same FOODS_RICH_IN + evidence the mock uses.
 * Falls back to the deterministic advisor when no provider is selected, and degrades to it if the
 * model output can't be made schema-valid (the request never fails for advice).
 */
export async function generateNutritionAdvice(input: GenerateAdviceInput): Promise<GenerateAdviceOutput> {
  const provider = input.provider ?? 'mock';
  if (provider === 'mock') {
    return { advice: mockNutritionAdvice(input), provider, repaired: false };
  }

  const { system, user } = buildAdvicePrompt(input);
  const call = (prompt: string) =>
    callModel({
      provider,
      model: input.model,
      byoKey: input.byoKey,
      localBaseUrl: input.localBaseUrl,
      system,
      prompt,
      schema: nutritionAdviceSchema,
    });

  let raw = await call(user);
  let parsed = nutritionAdviceSchema.safeParse(raw);
  let repaired = false;

  if (!parsed.success) {
    repaired = true;
    raw = await call(
      `${user}\n\nYour previous response was invalid: ${parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}. Return ONLY the corrected JSON object.`,
    );
    parsed = nutritionAdviceSchema.safeParse(raw);
  }

  if (!parsed.success) {
    // Degrade gracefully rather than fail the request.
    return { advice: mockNutritionAdvice(input), provider: 'mock', repaired: true };
  }
  return { advice: parsed.data, provider, repaired };
}

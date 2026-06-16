// Deterministic nutrition-advice generator (the no-key fallback / fixture). Mirrors the workout
// mock: the deterministic flag engine in @musclr/core decides what's lacking/overdone; this turns
// those gaps into readable, food-specific advice. A real LLM can replace this behind the same
// route, grounded by the same FOODS_RICH_IN + evidence module.

import { FOODS_RICH_IN, nutritionAdviceSchema, type NutrientKey, type NutritionAdvice } from '@musclr/core';

export interface NutritionAdviceInput {
  lacking?: NutrientKey[];
  overdone?: NutrientKey[];
  unknown?: NutrientKey[];
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

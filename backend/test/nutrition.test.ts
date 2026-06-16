import { describe, it, expect } from 'vitest';
import { mockNutritionAdvice } from '../src/ai/nutritionAdvisor';
import { nutritionAdviceSchema } from '@musclr/core';

describe('mock nutrition advice', () => {
  it('produces schema-valid, gap-driven advice with food sources', () => {
    const advice = mockNutritionAdvice({
      lacking: ['protein_g', 'vitamin_d_ug', 'iron_mg'],
      overdone: ['sodium_mg'],
      unknown: ['selenium_ug', 'copper_ug', 'manganese_mg', 'zinc_mg', 'folate_ug', 'vitamin_k_ug'],
    });
    expect(nutritionAdviceSchema.safeParse(advice).success).toBe(true);

    const increases = advice.focus.filter((f) => f.direction === 'increase').map((f) => f.nutrient);
    expect(increases).toContain('Protein');
    expect(increases).toContain('Vitamin D');
    const sodium = advice.focus.find((f) => f.nutrient === 'Sodium');
    expect(sodium?.direction).toBe('decrease');
    // lacking nutrients carry concrete food suggestions
    const protein = advice.focus.find((f) => f.nutrient === 'Protein');
    expect(protein?.foods.length).toBeGreaterThan(0);
    // honest "unknown" note
    expect(advice.summary).toMatch(/no data/i);
  });

  it('falls back to a protein nudge when there are no gaps', () => {
    const advice = mockNutritionAdvice({ lacking: [], overdone: [], unknown: [] });
    expect(nutritionAdviceSchema.safeParse(advice).success).toBe(true);
    expect(advice.focus[0]?.nutrient).toBe('Protein');
    expect(advice.focus[0]?.citations).toContain('nutrition.protein');
  });
});

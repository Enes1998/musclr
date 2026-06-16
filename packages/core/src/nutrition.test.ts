import { describe, it, expect } from 'vitest';
import {
  mifflinStJeor,
  deriveTargets,
  getMicronutrientRda,
  statusForNutrient,
  computeDailyStatus,
  summarizeStatus,
  scaleNutrients,
  sumNutrients,
  nutrientsForServing,
  computeDataCompleteness,
  foodFromUsda,
  ALL_NUTRIENT_KEYS,
  type NutritionProfile,
  type Food,
  type UsdaFood,
} from './nutrition';

const MALE: NutritionProfile = {
  sex: 'male', age: 30, heightCm: 180, weightKg: 80, activity: 'sedentary', goal: 'maintain',
};

describe('energy + macro target derivation', () => {
  it('Mifflin-St Jeor matches known worked examples', () => {
    expect(mifflinStJeor('male', 80, 180, 30)).toBe(1780);
    expect(mifflinStJeor('female', 80, 180, 30)).toBe(1614);
  });

  it('TDEE = RMR x activity x goal delta', () => {
    const t = deriveTargets(MALE);
    expect(t.energyKcal).toBe(Math.round(1780 * 1.2 * 1.0)); // 2136
  });

  it('protein target uses goal-based g/kg (gain = 1.8)', () => {
    const t = deriveTargets({ ...MALE, goal: 'gain' });
    expect(t.proteinFactor).toBe(1.8);
    expect(t.rda.protein_g).toBe(Math.round(80 * 1.8)); // 144
  });

  it('macros are internally consistent (carbs fill remaining energy, non-negative)', () => {
    const t = deriveTargets(MALE);
    expect(t.rda.carbs_g!).toBeGreaterThanOrEqual(0);
    expect(t.rda.fiber_g!).toBe(Math.round((14 * t.energyKcal) / 1000));
  });
});

describe('micronutrient DRI table', () => {
  it('covers every tracked micronutrient and is sex-aware', () => {
    const male = getMicronutrientRda('male', 30);
    const female = getMicronutrientRda('female', 30);
    expect(male.iron_mg).toBe(8);
    expect(female.iron_mg).toBe(18);
    expect(male.vitamin_a_ug).toBe(900);
    expect(female.vitamin_a_ug).toBe(700);
  });

  it("applies women's post-menopausal iron drop at 51+", () => {
    expect(getMicronutrientRda('female', 30).iron_mg).toBe(18);
    expect(getMicronutrientRda('female', 55).iron_mg).toBe(8);
  });
});

describe('flag engine — lacking vs overdone', () => {
  const targets = deriveTargets(MALE);

  it('flags low when < 70% RDA', () => {
    expect(statusForNutrient('vitamin_c_mg', 30, targets).flag).toBe('low'); // 30/90 = 33%
  });

  it('flags ok in the normal band', () => {
    expect(statusForNutrient('vitamin_c_mg', 90, targets).flag).toBe('ok');
  });

  it('flags over_ul when a total-intake UL is exceeded', () => {
    expect(statusForNutrient('vitamin_c_mg', 2500, targets).flag).toBe('over_ul'); // UL 2000
  });

  it('sodium uses the CDRR (2300), labeled high not over_ul', () => {
    expect(statusForNutrient('sodium_mg', 3000, targets).flag).toBe('high');
    expect(statusForNutrient('sodium_mg', 1500, targets).flag).toBe('ok');
  });

  it('magnesium food intake is never flagged over_ul (UL is supplemental-only)', () => {
    const s = statusForNutrient('magnesium_mg', 600, targets); // > 350 supplemental UL
    expect(s.flag).not.toBe('over_ul');
  });

  it('flags unknown when there is no data', () => {
    expect(statusForNutrient('iron_mg', undefined, targets).flag).toBe('unknown');
    expect(statusForNutrient('iron_mg', null, targets).flag).toBe('unknown');
  });

  it('summarizeStatus buckets a full day', () => {
    const consumed = { vitamin_c_mg: 10, sodium_mg: 4000 }; // C low, Na high, rest unknown
    const summary = summarizeStatus(computeDailyStatus(consumed, targets));
    expect(summary.low).toContain('vitamin_c_mg');
    expect(summary.high).toContain('sodium_mg');
    expect(summary.unknown).toContain('iron_mg');
  });
});

describe('food math', () => {
  const food: Food = {
    id: 'f1', source: 'custom', name: 'Chicken breast',
    per100: { energy_kcal: 165, protein_g: 31, fat_g: 3.6 },
    servings: [{ id: 's1', label: '100 g', grams: 100 }, { id: 's2', label: '1 breast (170g)', grams: 170 }],
    defaultServingId: 's1', dataCompleteness: 0,
  };

  it('scales per-100g nutrients to grams', () => {
    expect(scaleNutrients(food.per100, 200).protein_g).toBeCloseTo(62);
  });

  it('computes nutrients for a serving + quantity', () => {
    const n = nutrientsForServing(food, 's2', 2); // 340 g
    expect(n.energy_kcal).toBeCloseTo(165 * 3.4);
  });

  it('sums vectors treating missing as absent (unknown != zero)', () => {
    const total = sumNutrients([{ protein_g: 30 }, { protein_g: 20, fat_g: 5 }]);
    expect(total.protein_g).toBe(50);
    expect(total.fat_g).toBe(5);
    expect(total.iron_mg).toBeUndefined();
  });

  it('data completeness reflects fraction of tracked nutrients present', () => {
    expect(computeDataCompleteness({})).toBe(0);
    expect(computeDataCompleteness(food.per100)).toBeCloseTo(3 / ALL_NUTRIENT_KEYS.length);
  });
});

describe('USDA FoodData Central mapping', () => {
  const usda: UsdaFood = {
    fdcId: 123456,
    description: 'Chicken breast, raw',
    dataType: 'Foundation',
    foodNutrients: [
      { nutrientId: 1008, value: 165 }, // energy
      { nutrientId: 1003, value: 31 }, // protein
      { nutrientId: 1093, value: 74 }, // sodium mg
      { nutrientId: 1098, value: 0.05 }, // copper mg -> µg
      { nutrientId: 9999, value: 42 }, // unknown -> dropped
    ],
  };

  it('maps USDA nutrient ids to canonical keys with unit conversion', () => {
    const food = foodFromUsda(usda);
    expect(food.id).toBe('usda:123456');
    expect(food.source).toBe('usda');
    expect(food.per100.energy_kcal).toBe(165);
    expect(food.per100.protein_g).toBe(31);
    expect(food.per100.sodium_mg).toBe(74);
    expect(food.per100.copper_ug).toBeCloseTo(50); // 0.05 mg -> 50 µg
    expect((food.per100 as Record<string, number>)['9999']).toBeUndefined();
    expect(food.dataCompleteness).toBeGreaterThan(0);
  });
});

// Nutrition engine — macro + micro tracking, personalized targets, and a deterministic
// "lacking vs overdone" flag engine. The LLM only explains/recommends; the math here decides.
//
// DRI/RDA/AI/UL values transcribed from the National Academies / NIH Office of Dietary
// Supplements DRI tables (adult 19-50 band encoded; women's iron drops at 51+). Sodium uses
// the 2019 CDRR (2,300 mg) rather than a UL; magnesium's UL applies to SUPPLEMENTAL Mg only,
// so food magnesium is never flagged as over-UL. Athlete protein per ISSN 2017 (1.4-2.0 g/kg);
// energy via Mifflin-St Jeor. See [[evidence]] (`nutrition.protein`).

export type NutrientKey =
  // Macros
  | 'energy_kcal' | 'protein_g' | 'carbs_g' | 'fat_g' | 'fiber_g'
  // Vitamins
  | 'vitamin_a_ug' | 'vitamin_c_mg' | 'vitamin_d_ug' | 'vitamin_e_mg' | 'vitamin_k_ug'
  | 'thiamin_mg' | 'riboflavin_mg' | 'niacin_mg' | 'vitamin_b6_mg' | 'folate_ug' | 'vitamin_b12_ug'
  // Minerals
  | 'calcium_mg' | 'iron_mg' | 'magnesium_mg' | 'zinc_mg' | 'potassium_mg'
  | 'sodium_mg' | 'selenium_ug' | 'copper_ug' | 'manganese_mg' | 'phosphorus_mg';

/** Sparse — a missing key means UNKNOWN (no data), never zero. */
export type NutrientVector = Partial<Record<NutrientKey, number>>;

export type Sex = 'male' | 'female';
export type Goal = 'cut' | 'maintain' | 'gain';
export type LifeStage = 'none' | 'pregnant' | 'lactating';

/** Activity multipliers for Mifflin-St Jeor TDEE. */
export const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
} as const;
export type ActivityLevel = keyof typeof ACTIVITY_FACTORS;

export interface NutritionProfile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
  lifeStage?: LifeStage;
  /** g protein per kg bodyweight; defaults derived from goal if omitted. */
  proteinFactor?: number;
}

// ---- DRI tables (adult) ----------------------------------------------------

interface MicroDri {
  male: number;
  female: number;
  /** Tolerable Upper Intake Level (food + supplements) where defined. */
  ul?: number;
  /** UL applies to supplemental intake only (e.g. magnesium) — don't flag food intake. */
  ulSupplementalOnly?: boolean;
  /** Adequate Intake rather than RDA. */
  ai?: boolean;
}

// Micronutrient RDA/AI + UL for adults 19-50 (NIH ODS / National Academies).
const MICRO_DRI: Partial<Record<NutrientKey, MicroDri>> = {
  vitamin_a_ug:   { male: 900, female: 700, ul: 3000 },
  vitamin_c_mg:   { male: 90, female: 75, ul: 2000 },
  vitamin_d_ug:   { male: 15, female: 15, ul: 100 },
  vitamin_e_mg:   { male: 15, female: 15, ul: 1000 },
  vitamin_k_ug:   { male: 120, female: 90, ai: true },
  thiamin_mg:     { male: 1.2, female: 1.1 },
  riboflavin_mg:  { male: 1.3, female: 1.1 },
  niacin_mg:      { male: 16, female: 14, ul: 35 },
  vitamin_b6_mg:  { male: 1.3, female: 1.3, ul: 100 },
  folate_ug:      { male: 400, female: 400, ul: 1000 },
  vitamin_b12_ug: { male: 2.4, female: 2.4 },
  calcium_mg:     { male: 1000, female: 1000, ul: 2500 },
  iron_mg:        { male: 8, female: 18, ul: 45 },
  magnesium_mg:   { male: 400, female: 310, ul: 350, ulSupplementalOnly: true },
  zinc_mg:        { male: 11, female: 8, ul: 40 },
  potassium_mg:   { male: 3400, female: 2600, ai: true },
  sodium_mg:      { male: 1500, female: 1500, ai: true }, // CDRR 2300 handled separately
  selenium_ug:    { male: 55, female: 55, ul: 400 },
  copper_ug:      { male: 900, female: 900, ul: 10000 },
  manganese_mg:   { male: 2.3, female: 1.8, ai: true, ul: 11 },
  phosphorus_mg:  { male: 700, female: 700, ul: 4000 },
};

/** Chronic Disease Risk Reduction intake for sodium (2019 DRI) — used instead of a UL. */
export const SODIUM_CDRR_MG = 2300;

const DEFAULT_PROTEIN_FACTOR: Record<Goal, number> = {
  cut: 2.0, // higher end preserves lean mass in a deficit (ISSN 2017)
  maintain: 1.6,
  gain: 1.8,
};

const GOAL_ENERGY_DELTA: Record<Goal, number> = {
  cut: 0.82, // ~ -18%
  maintain: 1.0,
  gain: 1.1, // ~ +10%
};

// ---- Energy + macro targets ------------------------------------------------

/** Mifflin-St Jeor resting metabolic rate (kcal/day). */
export function mifflinStJeor(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(base + (sex === 'male' ? 5 : -161));
}

export interface DailyTargets {
  energyKcal: number;
  rda: NutrientVector; // RDA/AI per nutrient (incl. computed macros)
  ul: Partial<Record<NutrientKey, number>>; // ULs that apply to total intake
  sodiumCdrrMg: number;
  proteinFactor: number;
}

/** Resolve sex/age-adjusted micronutrient RDA/AI. */
export function getMicronutrientRda(sex: Sex, age: number): NutrientVector {
  const out: NutrientVector = {};
  for (const key of Object.keys(MICRO_DRI) as NutrientKey[]) {
    const dri = MICRO_DRI[key]!;
    let value = dri[sex];
    // Women's iron RDA drops post-menopause (51+).
    if (key === 'iron_mg' && sex === 'female' && age >= 51) value = 8;
    out[key] = value;
  }
  return out;
}

function getMicronutrientUl(): Partial<Record<NutrientKey, number>> {
  const out: Partial<Record<NutrientKey, number>> = {};
  for (const key of Object.keys(MICRO_DRI) as NutrientKey[]) {
    const dri = MICRO_DRI[key]!;
    if (dri.ul != null && !dri.ulSupplementalOnly) out[key] = dri.ul;
  }
  return out;
}

/** Derive full daily targets (energy + macros + micros) from a profile. */
export function deriveTargets(profile: NutritionProfile): DailyTargets {
  const { sex, age, heightCm, weightKg, activity, goal } = profile;
  const rmr = mifflinStJeor(sex, weightKg, heightCm, age);
  const tdee = Math.round(rmr * ACTIVITY_FACTORS[activity] * GOAL_ENERGY_DELTA[goal]);

  const proteinFactor = profile.proteinFactor ?? DEFAULT_PROTEIN_FACTOR[goal];
  const proteinG = Math.round(weightKg * proteinFactor);
  const fatG = Math.round(Math.max(weightKg * 0.8, (0.25 * tdee) / 9));
  const carbsG = Math.max(0, Math.round((tdee - proteinG * 4 - fatG * 9) / 4));
  const fiberG = Math.round((14 * tdee) / 1000);

  const rda: NutrientVector = {
    energy_kcal: tdee,
    protein_g: proteinG,
    carbs_g: carbsG,
    fat_g: fatG,
    fiber_g: fiberG,
    ...getMicronutrientRda(sex, age),
  };

  return {
    energyKcal: tdee,
    rda,
    ul: getMicronutrientUl(),
    sodiumCdrrMg: SODIUM_CDRR_MG,
    proteinFactor,
  };
}

// ---- Food + logging --------------------------------------------------------

export interface ServingOption {
  id: string;
  label: string;
  grams: number;
}

export interface Food {
  id: string;
  source: 'usda' | 'off' | 'custom';
  sourceId?: string;
  name: string;
  brand?: string;
  /** Nutrients per 100 g/ml (canonical storage basis). Sparse. */
  per100: NutrientVector;
  servings: ServingOption[];
  defaultServingId: string;
  /** Fraction of tracked nutrients present (0..1) — drives AI confidence + honest "unknown". */
  dataCompleteness: number;
}

export interface LogEntry {
  id: string;
  date: string; // 'YYYY-MM-DD' local
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodId: string;
  servingId: string;
  quantity: number;
  /** Immutable nutrient snapshot at log time (per100 * grams/100). */
  nutrients: NutrientVector;
  loggedAt: string; // ISO
}

/** Scale a per-100g nutrient vector to an arbitrary gram amount. */
export function scaleNutrients(per100: NutrientVector, grams: number): NutrientVector {
  const f = grams / 100;
  const out: NutrientVector = {};
  for (const [k, v] of Object.entries(per100) as [NutrientKey, number][]) {
    out[k] = v * f;
  }
  return out;
}

/** Compute the nutrient snapshot for a serving + quantity of a food. */
export function nutrientsForServing(food: Food, servingId: string, quantity: number): NutrientVector {
  const serving = food.servings.find((s) => s.id === servingId);
  if (!serving) return {};
  return scaleNutrients(food.per100, serving.grams * quantity);
}

/** Sum nutrient vectors; present values add, absent stay absent (unknown ≠ zero). */
export function sumNutrients(vectors: NutrientVector[]): NutrientVector {
  const out: NutrientVector = {};
  for (const v of vectors) {
    for (const [k, val] of Object.entries(v) as [NutrientKey, number][]) {
      out[k] = (out[k] ?? 0) + val;
    }
  }
  return out;
}

/** Fraction of tracked nutrients with data in a vector (for honest data-completeness). */
export function computeDataCompleteness(v: NutrientVector): number {
  const all = ALL_NUTRIENT_KEYS.length;
  const present = ALL_NUTRIENT_KEYS.filter((k) => v[k] != null).length;
  return present / all;
}

export const ALL_NUTRIENT_KEYS: NutrientKey[] = [
  'energy_kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g',
  'vitamin_a_ug', 'vitamin_c_mg', 'vitamin_d_ug', 'vitamin_e_mg', 'vitamin_k_ug',
  'thiamin_mg', 'riboflavin_mg', 'niacin_mg', 'vitamin_b6_mg', 'folate_ug', 'vitamin_b12_ug',
  'calcium_mg', 'iron_mg', 'magnesium_mg', 'zinc_mg', 'potassium_mg',
  'sodium_mg', 'selenium_ug', 'copper_ug', 'manganese_mg', 'phosphorus_mg',
];

// ---- Flag engine ("lacking vs overdone") -----------------------------------

export type NutrientFlag = 'low' | 'ok' | 'high' | 'over_ul' | 'unknown';

export interface NutrientStatus {
  key: NutrientKey;
  consumed: number | null; // null = unknown (no data)
  target: number | null; // RDA/AI
  ul?: number;
  pctTarget: number | null;
  flag: NutrientFlag;
}

const LOW_PCT = 70;
const HIGH_PCT = 150;

/** Status for a single nutrient given consumed amount + targets. */
export function statusForNutrient(
  key: NutrientKey,
  consumed: number | null | undefined,
  targets: DailyTargets,
): NutrientStatus {
  const target = targets.rda[key] ?? null;
  const ul = targets.ul[key];

  if (consumed == null || target == null) {
    return { key, consumed: consumed ?? null, target, ul, pctTarget: null, flag: 'unknown' };
  }

  const pct = (consumed / target) * 100;

  // Sodium: flag against CDRR (above recommended limit), not a UL/toxicity.
  if (key === 'sodium_mg') {
    const flag: NutrientFlag = consumed > targets.sodiumCdrrMg ? 'high' : pct < LOW_PCT ? 'low' : 'ok';
    return { key, consumed, target, ul, pctTarget: Math.round(pct), flag };
  }

  let flag: NutrientFlag;
  if (ul != null && consumed > ul) flag = 'over_ul'; // magnesium ul is excluded (supplemental-only)
  else if (pct < LOW_PCT) flag = 'low';
  else if (key !== 'energy_kcal' && pct > HIGH_PCT) flag = 'high';
  else flag = 'ok';

  return { key, consumed, target, ul, pctTarget: Math.round(pct), flag };
}

/** Full daily nutrient status across all tracked nutrients. */
export function computeDailyStatus(consumed: NutrientVector, targets: DailyTargets): NutrientStatus[] {
  return ALL_NUTRIENT_KEYS.map((key) => statusForNutrient(key, consumed[key], targets));
}

// ---- USDA FoodData Central mapping -----------------------------------------
//
// Maps USDA nutrient IDs → our canonical NutrientKey, with a unit-conversion factor.
// USDA Foundation/SR Legacy `foodNutrients` are reported per 100 g (our canonical basis).
// Copper is reported by USDA in mg but our key is µg, hence factor 1000.

export const USDA_NUTRIENT_MAP: Record<number, { key: NutrientKey; factor: number }> = {
  1008: { key: 'energy_kcal', factor: 1 },
  1003: { key: 'protein_g', factor: 1 },
  1005: { key: 'carbs_g', factor: 1 },
  1004: { key: 'fat_g', factor: 1 },
  1079: { key: 'fiber_g', factor: 1 },
  1106: { key: 'vitamin_a_ug', factor: 1 },
  1162: { key: 'vitamin_c_mg', factor: 1 },
  1114: { key: 'vitamin_d_ug', factor: 1 },
  1109: { key: 'vitamin_e_mg', factor: 1 },
  1185: { key: 'vitamin_k_ug', factor: 1 },
  1165: { key: 'thiamin_mg', factor: 1 },
  1166: { key: 'riboflavin_mg', factor: 1 },
  1167: { key: 'niacin_mg', factor: 1 },
  1175: { key: 'vitamin_b6_mg', factor: 1 },
  1177: { key: 'folate_ug', factor: 1 },
  1178: { key: 'vitamin_b12_ug', factor: 1 },
  1087: { key: 'calcium_mg', factor: 1 },
  1089: { key: 'iron_mg', factor: 1 },
  1090: { key: 'magnesium_mg', factor: 1 },
  1095: { key: 'zinc_mg', factor: 1 },
  1092: { key: 'potassium_mg', factor: 1 },
  1093: { key: 'sodium_mg', factor: 1 },
  1103: { key: 'selenium_ug', factor: 1 },
  1098: { key: 'copper_ug', factor: 1000 }, // USDA reports copper in mg
  1101: { key: 'manganese_mg', factor: 1 },
  1091: { key: 'phosphorus_mg', factor: 1 },
};

interface UsdaFoodNutrient {
  nutrientId?: number;
  value?: number;
}
export interface UsdaFood {
  fdcId: number;
  description: string;
  brandName?: string;
  brandOwner?: string;
  dataType?: string;
  foodNutrients?: UsdaFoodNutrient[];
}

/** Convert a USDA FoodData Central food (per-100 g) into our canonical Food. */
export function foodFromUsda(f: UsdaFood): Food {
  const per100: NutrientVector = {};
  for (const n of f.foodNutrients ?? []) {
    if (n.nutrientId == null || typeof n.value !== 'number') continue;
    const m = USDA_NUTRIENT_MAP[n.nutrientId];
    if (!m) continue;
    per100[m.key] = n.value * m.factor;
  }
  return {
    id: `usda:${f.fdcId}`,
    source: 'usda',
    sourceId: String(f.fdcId),
    name: f.description,
    brand: f.brandName ?? f.brandOwner,
    per100,
    servings: [
      { id: '100g', label: '100 g', grams: 100 },
      { id: '1g', label: '1 g', grams: 1 },
    ],
    defaultServingId: '100g',
    dataCompleteness: computeDataCompleteness(per100),
  };
}

/** Convenience: nutrients that are lacking / overdone / unknown, for the AI prompt + UI. */
export function summarizeStatus(statuses: NutrientStatus[]): {
  low: NutrientKey[];
  high: NutrientKey[];
  overUl: NutrientKey[];
  unknown: NutrientKey[];
} {
  return {
    low: statuses.filter((s) => s.flag === 'low').map((s) => s.key),
    high: statuses.filter((s) => s.flag === 'high').map((s) => s.key),
    overUl: statuses.filter((s) => s.flag === 'over_ul').map((s) => s.key),
    unknown: statuses.filter((s) => s.flag === 'unknown').map((s) => s.key),
  };
}

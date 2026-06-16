import type { Food, GeneratedPlan, MuscleId, TrainingGoal } from '@musclr/core';

// On a physical device, localhost won't reach your dev machine — set EXPO_PUBLIC_API_URL to the
// machine's LAN IP (e.g. http://192.168.1.20:8787) in apps/mobile/.env.
const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';

export interface PlanResponse {
  plan: GeneratedPlan;
  meta: { provider: string; model: string; durationMs: number; repaired: boolean };
}

export async function requestPlan(body: {
  goal: TrainingGoal;
  loads: Partial<Record<MuscleId, number>>;
  provider?: string;
}): Promise<PlanResponse> {
  const res = await fetch(`${BASE}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; issues?: string[] };
    throw new Error(err.issues?.join('; ') ?? err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<PlanResponse>;
}

export async function searchFoods(q: string): Promise<Food[]> {
  const res = await fetch(`${BASE}/api/nutrition/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`Food search failed (HTTP ${res.status})`);
  const data = (await res.json()) as { foods: Food[] };
  return data.foods;
}

export interface NutritionAdviceResult {
  advice: {
    summary: string;
    focus: { nutrient: string; direction: 'increase' | 'decrease'; foods: string[]; citations: string[] }[];
    citations: string[];
  };
  meta: { provider: string };
}

export async function requestNutritionAdvice(gaps: {
  lacking: string[];
  overdone: string[];
  unknown: string[];
}): Promise<NutritionAdviceResult> {
  const res = await fetch(`${BASE}/api/nutrition/advice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(gaps),
  });
  if (!res.ok) throw new Error(`Nutrition advice failed (HTTP ${res.status})`);
  return res.json() as Promise<NutritionAdviceResult>;
}

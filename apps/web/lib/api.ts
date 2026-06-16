import type { Food, GeneratedPlan, MuscleId, TrainingGoal } from '@musclr/core';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

export async function searchFoods(q: string): Promise<Food[]> {
  const res = await fetch(`${BASE}/api/nutrition/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`Food search failed (HTTP ${res.status})`);
  const data = (await res.json()) as { foods: Food[] };
  return data.foods;
}

export interface PlanResponse {
  plan: GeneratedPlan;
  meta: { provider: string; model: string; durationMs: number; repaired: boolean };
}

export async function requestPlan(body: {
  goal: TrainingGoal;
  loads: Partial<Record<MuscleId, number>>;
  nutrition?: { lacking: string[]; overdone: string[]; unknown: string[] };
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

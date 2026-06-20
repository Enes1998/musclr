import { Platform } from 'react-native';
import type { Food, GeneratedPlan, MuscleId, TrainingGoal } from '@musclr/core';

// On a physical device, localhost won't reach your dev machine — set EXPO_PUBLIC_API_URL to the
// machine's LAN IP (e.g. http://192.168.1.20:8787) in apps/mobile/.env.
const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';

export type PlanProvider = 'mock' | 'hosted' | 'openai' | 'anthropic' | 'google' | 'local';

export interface AiSettings {
  provider: PlanProvider;
  model?: string;
  byoKey?: string;
  localBaseUrl?: string;
}

function aiBody(ai?: AiSettings): Record<string, unknown> {
  if (!ai || ai.provider === 'mock') return { provider: 'mock' };
  return {
    provider: ai.provider,
    ...(ai.model ? { model: ai.model } : {}),
    ...(ai.byoKey ? { byoKey: ai.byoKey } : {}),
    ...(ai.localBaseUrl ? { localBaseUrl: ai.localBaseUrl } : {}),
  };
}

const HEADERS = { 'Content-Type': 'application/json', 'x-musclr-platform': Platform.OS };

export interface PlanResponse {
  plan: GeneratedPlan;
  meta: { provider: string; model: string; durationMs: number; repaired: boolean };
}

export async function requestPlan(body: {
  goal: TrainingGoal;
  loads: Partial<Record<MuscleId, number>>;
  ai?: AiSettings;
}): Promise<PlanResponse> {
  const { ai, ...rest } = body;
  const res = await fetch(`${BASE}/api/ai`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ ...rest, ...aiBody(ai) }),
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

export interface BarcodeResult {
  found: boolean;
  food?: Food;
}

export async function lookupBarcode(code: string): Promise<BarcodeResult> {
  const res = await fetch(`${BASE}/api/nutrition/barcode/${encodeURIComponent(code)}`);
  if (res.status === 404) return { found: false };
  if (!res.ok) throw new Error(`Barcode lookup failed (HTTP ${res.status})`);
  return res.json() as Promise<BarcodeResult>;
}

export interface NutritionAdviceResult {
  advice: {
    summary: string;
    focus: { nutrient: string; direction: 'increase' | 'decrease'; foods: string[]; citations: string[] }[];
    citations: string[];
  };
  meta: { provider: string; repaired?: boolean };
}

export async function requestNutritionAdvice(
  gaps: { lacking: string[]; overdone: string[]; unknown: string[] },
  ai?: AiSettings,
): Promise<NutritionAdviceResult> {
  const res = await fetch(`${BASE}/api/nutrition/advice`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ ...gaps, ...aiBody(ai) }),
  });
  if (!res.ok) throw new Error(`Nutrition advice failed (HTTP ${res.status})`);
  return res.json() as Promise<NutritionAdviceResult>;
}

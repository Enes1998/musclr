import type { MuscleId, WeekData } from './exercises';
import type { ProgramDay } from './program';

export interface InsightResult {
  summary: string;
  week1: ProgramDay[];
  week2: ProgramDay[];
}

export async function generateInsight(
  loads: Record<MuscleId, number>,
  week: WeekData,
): Promise<InsightResult> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loads, week }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<InsightResult>;
}

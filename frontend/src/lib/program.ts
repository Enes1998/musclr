import type { MuscleId, WeekData } from './exercises';

export interface ProgramExercise {
  name: string;
  sets: number;
  reps: number;
  weight: 'bodyweight' | 'light' | 'moderate' | 'heavy';
  target: MuscleId;
}

export interface ProgramDay {
  day: string;
  label: string;
  rest: boolean;
  exercises: ProgramExercise[];
}

export interface ProgramResult {
  rationale: string;
  week1: ProgramDay[];
  week2: ProgramDay[];
}

export async function generateProgram(
  loads: Record<MuscleId, number>,
  week: WeekData,
): Promise<ProgramResult> {
  const res = await fetch('/api/program', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loads, week }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<ProgramResult>;
}

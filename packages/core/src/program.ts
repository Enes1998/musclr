// Program plan types — ported from the prototype (frontend/src/lib/program.ts).
//
// NOTE: the prototype's `generateProgram()` POSTed to a now-deleted `/api/program`
// endpoint. In this codebase, plan generation moves to the AI gateway
// (packages/core/src/ai) in Phase 4. These types are the shared contract for a
// generated program and are reused by the AI plan schema.

import type { MuscleId } from './exercises';

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

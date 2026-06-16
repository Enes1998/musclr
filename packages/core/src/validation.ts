// Workout-entry validation — ported verbatim from the prototype (frontend/src/lib/validation.ts).

import type { WeekData, WorkoutEntry } from "./exercises";

export type NumericField = "sets" | "reps" | "weight";

export interface WeekValidationResult {
  hasInvalidRows: boolean;
  invalidRowCount: number;
}

export interface WeekTotals {
  totalSets: number;
  totalVolume: number;
  daysTrained: number;
  totalExercises: number;
}

export interface DayTotals {
  sets: number;
  volume: number;
}

export function parseNumericInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function getNumericFieldError(
  field: NumericField,
  value: number,
): string | null {
  if (!Number.isFinite(value)) {
    return "Enter a valid number.";
  }

  if (
    (field === "sets" || field === "reps") &&
    (!Number.isInteger(value) || value <= 0)
  ) {
    return `${field === "sets" ? "Sets" : "Reps"} must be a positive integer.`;
  }

  if (field === "weight" && value < 0) {
    return "Weight cannot be negative.";
  }

  return null;
}

export function getWorkoutEntryErrors(
  entry: WorkoutEntry,
): Partial<Record<NumericField, string>> {
  const setsError = getNumericFieldError("sets", entry.sets);
  const repsError = getNumericFieldError("reps", entry.reps);
  const weightError = getNumericFieldError("weight", entry.weight);

  return {
    ...(setsError ? { sets: setsError } : {}),
    ...(repsError ? { reps: repsError } : {}),
    ...(weightError ? { weight: weightError } : {}),
  };
}

export function isWorkoutEntryValid(entry: WorkoutEntry): boolean {
  const errors = getWorkoutEntryErrors(entry);
  return !errors.sets && !errors.reps && !errors.weight;
}

export function getWeekValidation(week: WeekData): WeekValidationResult {
  const invalidRowCount = Object.values(week)
    .flat()
    .filter((entry) => !isWorkoutEntryValid(entry)).length;

  return {
    hasInvalidRows: invalidRowCount > 0,
    invalidRowCount,
  };
}

export function getTrustedDayTotals(dayEntries: WorkoutEntry[]): DayTotals {
  return dayEntries.reduce(
    (acc, entry) => {
      if (!isWorkoutEntryValid(entry)) return acc;
      acc.sets += entry.sets;
      acc.volume += entry.sets * entry.reps * entry.weight;
      return acc;
    },
    { sets: 0, volume: 0 },
  );
}

export function getTrustedWeekTotals(week: WeekData): WeekTotals {
  const validEntriesByDay = Object.values(week).map((dayEntries) =>
    dayEntries.filter((entry) => isWorkoutEntryValid(entry)),
  );

  const allValidEntries = validEntriesByDay.flat();
  const totalSets = allValidEntries.reduce((sum, entry) => sum + entry.sets, 0);
  const totalVolume = allValidEntries.reduce(
    (sum, entry) => sum + entry.sets * entry.reps * entry.weight,
    0,
  );
  const daysTrained = validEntriesByDay.filter(
    (dayEntries) => dayEntries.length > 0,
  ).length;

  return {
    totalSets,
    totalVolume,
    daysTrained,
    totalExercises: allValidEntries.length,
  };
}

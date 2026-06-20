// Weight-unit display conversion. The FROZEN scoring (computeMuscleLoad) and all stored
// WorkoutEntry.weight values are in KILOGRAMS — the source of truth. The UI may display/enter in
// pounds; convert at the edges only so the scoring math and parity tests stay untouched.

export type DisplayUnit = 'kg' | 'lb';

const LB_PER_KG = 2.2046226218;

/** Kilograms (stored) → the display unit. */
export function fromKg(kg: number, unit: DisplayUnit): number {
  return unit === 'lb' ? kg * LB_PER_KG : kg;
}

/** A value entered in the display unit → kilograms (for storage + scoring). */
export function toKg(value: number, unit: DisplayUnit): number {
  return unit === 'lb' ? value / LB_PER_KG : value;
}

/** Round a displayed weight to 1 decimal (avoids 44.0924… in the input). */
export function roundWeight(n: number): number {
  return Math.round(n * 10) / 10;
}

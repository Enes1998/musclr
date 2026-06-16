// Scoring engine — ported verbatim from the prototype (frontend/src/lib/scoring.ts).
// DO NOT modify the math or thresholds — the whole product hinges on these.

import { EXERCISES, MUSCLE_GROUPS } from "./exercises";
import type { Exercise, MuscleId, WeekData } from "./exercises";
import { isWorkoutEntryValid } from "./validation";

/**
 * Compute weekly muscle load scores (0–100) from workout data.
 *
 * The math and thresholds are frozen. `exercises` defaults to the original 33 definitions so
 * existing callers (and the parity tests) are byte-for-byte unchanged; the app passes the
 * full catalog (ALL_EXERCISES) to score exercises beyond the original set.
 */
export function computeMuscleLoad(
  week: WeekData,
  exercises: Exercise[] = EXERCISES,
): Record<MuscleId, number> {
  const totals: Record<string, number> = {};
  MUSCLE_GROUPS.forEach((m) => {
    totals[m.id] = 0;
  });

  const repFactor = (r: number) => (r <= 6 ? 1.0 : r <= 12 ? 0.85 : 0.7);
  const wFactor = (w: number) =>
    w >= 100 ? 1.3 : w >= 40 ? 1.0 : w > 0 ? 0.85 : 0.7;

  Object.values(week).forEach((day) => {
    day.forEach((ex) => {
      const def = exercises.find((e) => e.name === ex.name);
      if (!def || !isWorkoutEntryValid(ex)) return;
      const contrib = ex.sets * repFactor(ex.reps) * wFactor(ex.weight);
      Object.entries(def.primary || {}).forEach(([m, w]) => {
        totals[m] += contrib * (w as number);
      });
      Object.entries(def.secondary || {}).forEach(([m, w]) => {
        totals[m] += contrib * (w as number) * 0.5;
      });
    });
  });

  // Normalize: 30 = solid baseline of training volume
  const norm = {} as Record<MuscleId, number>;
  Object.entries(totals).forEach(([m, v]) => {
    norm[m as MuscleId] = Math.max(
      0,
      Math.min(100, Math.round((v / 30) * 100)),
    );
  });
  return norm;
}

/**
 * Map score 0..100 → hex color on the green→yellow→red gradient.
 */
export function scoreToColor(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const hex = (r: number, g: number, b: number) =>
    "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");

  const GREEN = [76, 175, 80]; // #4caf50
  const YELLOW = [255, 193, 7]; // #ffc107
  const RED = [244, 67, 54]; // #f44336

  if (s < 50) {
    const t = s / 50;
    return hex(
      lerp(GREEN[0], YELLOW[0], t),
      lerp(GREEN[1], YELLOW[1], t),
      lerp(GREEN[2], YELLOW[2], t),
    );
  } else {
    const t = (s - 50) / 50;
    return hex(
      lerp(YELLOW[0], RED[0], t),
      lerp(YELLOW[1], RED[1], t),
      lerp(YELLOW[2], RED[2], t),
    );
  }
}

/**
 * Map score → human-readable label.
 */
export function scoreLabel(s: number): string {
  if (s < 30) return "Undertrained";
  if (s < 60) return "Balanced";
  if (s < 80) return "Well-trained";
  return "Overtrained";
}

// Gemini insight stub — deterministic generator ported from summary.jsx
// Wrapped in async so swapping to a real /api/gemini call later is trivial.

import { EXERCISES, MUSCLE_GROUPS } from './exercises';
import type { MuscleId } from './exercises';

export interface NextExercise {
  name: string;
  sets: number;
  reps: number;
  weight: string;
  target: MuscleId;
}

export interface InsightResult {
  summary: string;
  next: NextExercise[];
}

interface ScoredMuscle {
  id: MuscleId;
  label: string;
  score: number;
}

export async function generateInsight(
  loads: Record<MuscleId, number>
): Promise<InsightResult> {
  // Artificial delay to simulate LLM call (600–1200ms)
  await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 600));

  const sortedLoads: ScoredMuscle[] = [...MUSCLE_GROUPS]
    .map((m) => ({ id: m.id, label: m.label, score: loads[m.id] }))
    .sort((a, b) => b.score - a.score);

  const over = sortedLoads.filter((m) => m.score >= 70);
  const under = sortedLoads.filter((m) => m.score < 30);
  const balanced = sortedLoads.filter((m) => m.score >= 30 && m.score < 70);

  // Build insight text
  const topOver = over.slice(0, 2).map((m) => m.label.toLowerCase()).join(' and ');
  const topUnder = under.slice(0, 2).map((m) => m.label.toLowerCase()).join(' and ');

  let s1 = '';
  let s2 = '';
  let s3 = '';

  if (over.length) {
    s1 = `Your ${topOver} are sitting in the red — high cumulative load this week with not much room left for recovery.`;
  } else {
    s1 = `No muscle group crossed the overtrained threshold this week, which is a healthy sign.`;
  }

  if (under.length) {
    s2 = `Meanwhile your ${topUnder} got noticeably less attention; balancing this out will reduce injury risk and unlock total-body strength.`;
  } else if (balanced.length) {
    s2 = `Most groups landed in the balanced 30–70 band, so you have a solid foundation to push from.`;
  }

  s3 = `For your next session, I'd run a ${
    under.length
      ? topUnder.split(' and ')[0] + '-led pull day'
      : 'lighter mobility-focused session'
  } to even out the ledger before another heavy push.`;

  const summary = [s1, s2, s3].filter(Boolean).join(' ');

  // Build next workout recommendation
  const target = under.length ? under[0].id : sortedLoads[sortedLoads.length - 1].id;
  const second = under[1]?.id || sortedLoads[sortedLoads.length - 2]?.id;

  const picks = EXERCISES.filter(
    (e) => e.primary[target] || (second && e.primary[second])
  ).slice(0, 4);

  if (picks.length < 4) {
    const extra = EXERCISES.filter((e) => !picks.includes(e)).slice(0, 4 - picks.length);
    picks.push(...extra);
  }

  const next: NextExercise[] = picks.slice(0, 4).map((e, i) => ({
    name: e.name,
    sets: [4, 4, 3, 3][i],
    reps: [6, 8, 10, 12][i],
    weight: 'moderate',
    target: (Object.keys(e.primary)[0] as MuscleId),
  }));

  return { summary, next };
}

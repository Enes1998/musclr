'use client';

import { useMemo, useState } from 'react';
import {
  MUSCLE_GROUPS,
  computeMuscleLoad,
  scoreLabel,
  scoreToColor,
  ALL_EXERCISES,
  buildPlanPrompt,
  EVIDENCE_MODULE,
  type TrainingGoal,
  type MuscleId,
} from '@musclr/core';
import { useWeekStore, useHasHydrated } from '../../lib/store';
import { MuscleViewer } from '../../components/MuscleViewer';
import { requestPlan, type PlanResponse } from '../../lib/api';

const GOALS: TrainingGoal[] = ['hypertrophy', 'strength', 'endurance', 'general'];

export default function SummaryPage() {
  const hydrated = useHasHydrated();
  const week = useWeekStore((s) => s.week);
  const [goal, setGoal] = useState<TrainingGoal>('hypertrophy');
  const [showPrompt, setShowPrompt] = useState(false);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  async function generate() {
    setLoadingPlan(true);
    setPlanError(null);
    try {
      const res = await requestPlan({ goal, loads: loads as Partial<Record<MuscleId, number>> });
      setPlan(res);
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingPlan(false);
    }
  }

  const loads = useMemo(() => computeMuscleLoad(week, ALL_EXERCISES), [week]);
  const groups = useMemo(
    () =>
      MUSCLE_GROUPS.map((g) => ({
        ...g,
        score: loads[g.id],
        label: scoreLabel(loads[g.id]),
        color: scoreToColor(loads[g.id]),
      })).sort((a, b) => b.score - a.score),
    [loads],
  );

  const prompt = useMemo(
    () => buildPlanPrompt({ goal, loads: loads as Partial<Record<MuscleId, number>> }),
    [goal, loads],
  );

  if (!hydrated) {
    return <main className="mx-auto max-w-3xl px-6 py-10 text-ink-3">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 font-display text-2xl font-semibold">Weekly summary</h1>

      <section className="mb-6">
        <MuscleViewer scores={loads as Partial<Record<MuscleId, number>>} />
        <p className="mt-2 text-center font-mono text-xs text-ink-3">
          Drag to rotate · green = undertrained, red = overtrained
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Muscle load</h2>
        <ul className="space-y-2">
          {groups.map((g) => (
            <li key={g.id} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-sm">{g.label}</span>
              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${g.score}%`, backgroundColor: g.color }}
                />
              </span>
              <span className="w-10 shrink-0 text-right font-mono text-xs text-ink-2">{g.score}</span>
              <span className="w-28 shrink-0 text-right font-mono text-xs text-ink-3">{g.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">AI coach</h2>
          <div className="flex gap-1">
            {GOALS.map((gOpt) => (
              <button
                key={gOpt}
                onClick={() => setGoal(gOpt)}
                className={`rounded-md px-3 py-1.5 text-xs ${
                  goal === gOpt ? 'bg-accent text-bg' : 'bg-surface-2 text-ink-2 hover:text-ink'
                }`}
              >
                {gOpt}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm text-ink-2">
          The coach is grounded only in a versioned, citable evidence module (v
          {EVIDENCE_MODULE.moduleVersion}; {EVIDENCE_MODULE.principles.length} principles,{' '}
          {EVIDENCE_MODULE.citations.length} sources) and must keep prescriptions within cited
          bounds. The live model call runs through the backend AI relay (pending) — below is the
          exact grounded prompt that will be sent.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={generate}
            disabled={loadingPlan}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg disabled:opacity-50"
          >
            {loadingPlan ? 'Generating…' : 'Generate plan'}
          </button>
          <button
            onClick={() => setShowPrompt((v) => !v)}
            className="rounded-md bg-surface-2 px-3 py-1.5 text-sm hover:bg-surface-3"
          >
            {showPrompt ? 'Hide' : 'Preview'} grounded prompt
          </button>
        </div>

        {planError && <p className="mt-3 text-sm text-load-over">⚠ {planError}</p>}

        {plan && (
          <div className="mt-5 rounded-xl border border-line bg-bg-2 p-4">
            <p className="font-mono text-xs text-ink-3">
              {plan.meta.provider} · {plan.meta.model} · {plan.meta.durationMs}ms
              {plan.meta.repaired ? ' · repaired' : ''}
            </p>
            <p className="mt-2 text-sm text-ink">{plan.plan.workout.summary}</p>

            <p className="mt-4 font-mono text-xs uppercase tracking-wider text-ink-3">Weekly sets</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {plan.plan.workout.weeklySetsPerMuscle.map((w) => (
                <span key={w.muscle} className="rounded-md bg-surface-2 px-2 py-1 font-mono text-xs">
                  {w.muscle} {w.setsPerWeek}
                </span>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {plan.plan.workout.days
                .filter((d) => !d.rest)
                .map((d, i) => (
                  <div key={i} className="rounded-lg bg-surface p-3">
                    <p className="text-sm font-medium">{d.label}</p>
                    <ul className="mt-1 space-y-0.5 text-sm text-ink-2">
                      {d.exercises.map((e, j) => (
                        <li key={j}>
                          {e.name} — {e.sets}×{e.reps} @ {e.weightGuidance} (RIR {e.rir})
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>

            {plan.plan.nutrition && (
              <div className="mt-4">
                <p className="font-mono text-xs uppercase tracking-wider text-ink-3">Nutrition</p>
                <p className="mt-1 text-sm text-ink-2">{plan.plan.nutrition.summary}</p>
              </div>
            )}

            <p className="mt-4 font-mono text-[10px] text-ink-3">
              Cited: {plan.plan.workout.citations.join(', ')}
            </p>
          </div>
        )}
        {showPrompt && (
          <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-bg-2 p-4 font-mono text-xs leading-relaxed text-ink-2">
            {`# SYSTEM\n${prompt.system}\n\n# USER\n${prompt.user}`}
          </pre>
        )}
      </section>

      <p className="mt-6 font-mono text-xs text-ink-3">
        Anatomically segmented 3D heatmap (~40 muscles) rendered by the shared three.js viewer — the
        same renderer drives the iOS/Android app via an offline WebView.
      </p>
    </main>
  );
}

'use client';

import { useMemo } from 'react';
import {
  DAYS,
  ALL_EXERCISES,
  parseNumericInput,
  getWorkoutEntryErrors,
  getTrustedDayTotals,
  getTrustedWeekTotals,
  fromKg,
  toKg,
  roundWeight,
  type WorkoutEntry,
} from '@musclr/core';
import { useWeekStore, useHasHydrated } from '../../lib/store';
import { useSettingsStore } from '../../lib/settingsStore';

const EXERCISE_NAMES = [...new Set(ALL_EXERCISES.map((e) => e.name))].sort();

export default function LogPage() {
  const hydrated = useHasHydrated();
  const { week, activeDay, setActiveDay, addExercise, updateExercise, removeExercise } =
    useWeekStore();
  const unit = useSettingsStore((s) => s.weightUnit);

  const dayTotals = useMemo(() => getTrustedDayTotals(week[activeDay]), [week, activeDay]);
  const weekTotals = useMemo(() => getTrustedWeekTotals(week), [week]);

  if (!hydrated) {
    return <main className="mx-auto max-w-3xl px-6 py-10 text-ink-3">Loading…</main>;
  }

  const entries = week[activeDay];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 font-display text-2xl font-semibold">Log your week</h1>

      <div className="mb-6 flex flex-wrap gap-1">
        {DAYS.map((d) => (
          <button
            key={d.id}
            onClick={() => setActiveDay(d.id)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              activeDay === d.id ? 'bg-accent text-bg' : 'bg-surface-2 text-ink-2 hover:text-ink'
            }`}
          >
            {d.label}
            <span className="ml-1 font-mono text-xs opacity-60">{week[d.id].length || ''}</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-xs text-ink-3">
              <th className="px-3 py-2 font-normal">Exercise</th>
              <th className="w-16 px-2 py-2 font-normal">Sets</th>
              <th className="w-16 px-2 py-2 font-normal">Reps</th>
              <th className="w-20 px-2 py-2 font-normal">{unit}</th>
              <th className="w-14 px-2 py-2 font-normal" title="Reps in reserve (optional)">RIR</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const errors = getWorkoutEntryErrors(entry);
              return (
                <tr key={i} className="border-b border-line/60 last:border-0">
                  <td className="px-3 py-1.5">
                    <input
                      list="exercise-names"
                      value={entry.name}
                      onChange={(e) => updateExercise(activeDay, i, { name: e.target.value })}
                      className="w-full rounded bg-surface-2 px-2 py-1 outline-none focus:ring-1 focus:ring-accent"
                    />
                  </td>
                  {(['sets', 'reps'] as const).map((f) => (
                    <td key={f} className="px-2 py-1.5">
                      <input
                        inputMode="numeric"
                        value={String(entry[f])}
                        onChange={(e) =>
                          updateExercise(activeDay, i, {
                            [f]: parseNumericInput(e.target.value) ?? 0,
                          } as Partial<WorkoutEntry>)
                        }
                        className={`w-full rounded bg-surface-2 px-2 py-1 text-right outline-none focus:ring-1 focus:ring-accent ${
                          errors[f] ? 'ring-1 ring-load-over' : ''
                        }`}
                        title={errors[f] ?? ''}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <input
                      inputMode="numeric"
                      value={String(roundWeight(fromKg(entry.weight, unit)))}
                      onChange={(e) => {
                        const v = parseNumericInput(e.target.value);
                        updateExercise(activeDay, i, {
                          weight: v == null ? 0 : toKg(v, unit),
                          unit,
                        });
                      }}
                      className={`w-full rounded bg-surface-2 px-2 py-1 text-right outline-none focus:ring-1 focus:ring-accent ${
                        errors.weight ? 'ring-1 ring-load-over' : ''
                      }`}
                      title={errors.weight ?? ''}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      inputMode="numeric"
                      value={entry.rir == null ? '' : String(entry.rir)}
                      placeholder="—"
                      onChange={(e) => {
                        const v = parseNumericInput(e.target.value);
                        updateExercise(activeDay, i, { rir: v == null ? undefined : v });
                      }}
                      className="w-full rounded bg-surface-2 px-2 py-1 text-right text-ink-2 outline-none focus:ring-1 focus:ring-accent"
                    />
                  </td>
                  <td className="px-2 text-center">
                    <button
                      onClick={() => removeExercise(activeDay, i)}
                      className="text-ink-3 hover:text-load-over"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-ink-3">
                  Rest day — no exercises logged.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <datalist id="exercise-names">
          {EXERCISE_NAMES.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => addExercise(activeDay, { name: '', sets: 3, reps: 10, weight: 20 })}
          className="rounded-md bg-surface-2 px-3 py-1.5 text-sm text-ink hover:bg-surface-3"
        >
          + Add exercise
        </button>
        <p className="font-mono text-xs text-ink-3">
          {dayTotals.sets} sets today · {weekTotals.daysTrained} days · {weekTotals.totalExercises} exercises this week
        </p>
      </div>
    </main>
  );
}

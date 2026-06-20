'use client';

import { useMemo } from 'react';
import {
  MUSCLE_GROUPS,
  compareSnapshots,
  muscleTrend,
  personalRecords,
  loadColor,
  snapshotStats,
  sortSnapshots,
  volumeTrend,
  type MuscleId,
  type VolumeStatus,
} from '@musclr/core';
import { useWeekStore, useHasHydrated } from '../../lib/store';
import { useHistoryStore } from '../../lib/historyStore';
import { useSettingsStore } from '../../lib/settingsStore';

const STATUS_LABEL: Record<VolumeStatus, string> = {
  below_mev: 'Below MEV',
  productive: 'Productive',
  approaching_mrv: 'Near MRV',
  above_mrv: 'Above MRV',
};
const STATUS_COLOR: Record<VolumeStatus, string> = {
  below_mev: '#60a5fa', // under-volume (informational, not alarming)
  productive: '#4caf50',
  approaching_mrv: '#ffc107',
  above_mrv: '#f44336',
};

/** Tiny inline sparkline (bars) for a numeric series, scaled to its own max. */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  return (
    <span className="inline-flex h-6 items-end gap-0.5" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className="w-1.5 rounded-sm"
          style={{ height: `${Math.max(6, (v / max) * 100)}%`, backgroundColor: color }}
        />
      ))}
    </span>
  );
}

export default function HistoryPage() {
  const hydrated = useHasHydrated();
  const week = useWeekStore((s) => s.week);
  const snapshots = useHistoryStore((s) => s.snapshots);
  const capture = useHistoryStore((s) => s.capture);
  const remove = useHistoryStore((s) => s.remove);
  const palette = useSettingsStore((s) => s.palette);

  const ordered = useMemo(() => sortSnapshots(snapshots), [snapshots]);
  const latest = ordered[ordered.length - 1];
  const prev = ordered[ordered.length - 2];
  const latestStats = useMemo(() => (latest ? snapshotStats(latest.week) : null), [latest]);
  const vTrend = useMemo(() => volumeTrend(ordered), [ordered]);
  const delta = useMemo(
    () => (prev && latest ? compareSnapshots(prev, latest) : null),
    [prev, latest],
  );
  const prs = useMemo(() => personalRecords(ordered), [ordered]);

  if (!hydrated) {
    return <main className="mx-auto max-w-3xl px-6 py-10 text-ink-3">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">History</h1>
        <button
          onClick={() => capture(week)}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg"
        >
          Capture this week
        </button>
      </div>

      {ordered.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-6 text-sm text-ink-2">
          No snapshots yet. Log your week on <span className="text-ink">Log</span>, then{' '}
          <span className="text-ink">Capture this week</span> to start tracking trends, volume
          landmarks, and personal records over time.
        </p>
      ) : (
        <>
          {/* Week-over-week deltas */}
          {delta && (
            <section className="mb-6 rounded-2xl border border-line bg-surface p-6">
              <h2 className="mb-3 font-display text-lg font-semibold">This week vs. last</h2>
              <div className="flex flex-wrap gap-3">
                <Stat label="Total sets" value={signed(delta.totalSetsDelta)} />
                <Stat label="Total volume" value={`${signed(Math.round(delta.totalVolumeDelta))}`} />
                <Stat label="Days trained" value={signed(delta.daysTrainedDelta)} />
              </div>
              <p className="mt-3 font-mono text-xs uppercase tracking-wider text-ink-3">
                Biggest movers
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {delta.perMuscle
                  .filter((m) => m.scoreDelta !== 0)
                  .sort((a, b) => Math.abs(b.scoreDelta) - Math.abs(a.scoreDelta))
                  .slice(0, 5)
                  .map((m) => (
                    <span key={m.muscle} className="rounded-md bg-surface-2 px-2 py-1 font-mono text-xs">
                      {label(m.muscle)} {signed(m.scoreDelta)}
                    </span>
                  ))}
              </div>
            </section>
          )}

          {/* Total volume trend */}
          <section className="mb-6 rounded-2xl border border-line bg-surface p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Weekly volume</h2>
              <Sparkline values={vTrend.map((p) => p.totalSets)} color="#f97316" />
            </div>
            <div className="mt-3 space-y-1">
              {vTrend
                .slice()
                .reverse()
                .map((p) => (
                  <div key={p.weekOf} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 font-mono text-xs text-ink-3">{p.weekOf}</span>
                    <span className="w-20 text-ink-2">{p.totalSets} sets</span>
                    <span className="w-16 text-ink-3">{p.daysTrained} d</span>
                    <span className="font-mono text-xs text-ink-3">
                      vol {Math.round(p.totalVolume).toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </section>

          {/* Per-muscle volume landmarks + score trend (latest week) */}
          {latestStats && (
            <section className="mb-6 rounded-2xl border border-line bg-surface p-6">
              <h2 className="mb-1 font-display text-lg font-semibold">Volume landmarks</h2>
              <p className="mb-4 text-xs text-ink-3">
                Direct working sets per muscle this week vs. evidence-based MEV/MAV/MRV bands.
              </p>
              <ul className="space-y-2">
                {MUSCLE_GROUPS.map((g) => {
                  const sets = latestStats.setsPerMuscle[g.id];
                  const status = latestStats.volumeStatusPerMuscle[g.id];
                  const trend = muscleTrend(ordered, g.id).map((p) => p.score);
                  return (
                    <li key={g.id} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-sm">{g.label}</span>
                      <span className="w-16 shrink-0 font-mono text-xs text-ink-2">{sets} sets</span>
                      <span
                        className="w-24 shrink-0 rounded-md px-2 py-0.5 text-center font-mono text-[10px]"
                        style={{ backgroundColor: `${STATUS_COLOR[status]}22`, color: STATUS_COLOR[status] }}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                      <span className="flex-1" />
                      <Sparkline values={trend} color={loadColor(latestStats.loads[g.id], palette)} />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Personal records */}
          {prs.length > 0 && (
            <section className="mb-6 rounded-2xl border border-line bg-surface p-6">
              <h2 className="mb-3 font-display text-lg font-semibold">Personal records</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left font-mono text-xs uppercase tracking-wider text-ink-3">
                      <th className="pb-2">Exercise</th>
                      <th className="pb-2">Top set</th>
                      <th className="pb-2">Est. 1RM</th>
                      <th className="pb-2">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prs.slice(0, 15).map((pr) => (
                      <tr key={pr.exercise} className="border-t border-line">
                        <td className="py-1.5">{pr.exercise}</td>
                        <td className="py-1.5 text-ink-2">
                          {pr.bestWeight} × {pr.bestWeightReps}
                        </td>
                        <td className="py-1.5 font-mono text-xs text-accent">{pr.bestEst1RM}</td>
                        <td className="py-1.5 font-mono text-xs text-ink-3">{pr.bestEst1RMDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Snapshot list */}
          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="mb-3 font-display text-lg font-semibold">Snapshots</h2>
            <ul className="space-y-1">
              {ordered
                .slice()
                .reverse()
                .map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-mono text-xs text-ink-2">
                      {s.weekOf}
                      {s.note ? ` · ${s.note}` : ''}
                    </span>
                    <button
                      onClick={() => remove(s.id)}
                      className="rounded-md px-2 py-1 text-xs text-ink-3 hover:text-load-over"
                      aria-label={`Delete snapshot ${s.weekOf}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg-2 p-3">
      <p className="font-mono text-xs text-ink-3">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}
function label(id: MuscleId): string {
  return MUSCLE_GROUPS.find((g) => g.id === id)?.label ?? id;
}

import { useMemo } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import {
  MUSCLE_GROUPS,
  compareSnapshots,
  muscleTrend,
  personalRecords,
  scoreToColor,
  snapshotStats,
  sortSnapshots,
  volumeTrend,
  type MuscleId,
  type VolumeStatus,
} from '@musclr/core';
import { useWeekStore } from '../../lib/store';
import { useHistoryStore } from '../../lib/historyStore';

const STATUS_LABEL: Record<VolumeStatus, string> = {
  below_mev: 'Below MEV',
  productive: 'Productive',
  approaching_mrv: 'Near MRV',
  above_mrv: 'Above MRV',
};
const STATUS_COLOR: Record<VolumeStatus, string> = {
  below_mev: '#60a5fa',
  productive: '#4caf50',
  approaching_mrv: '#ffc107',
  above_mrv: '#f44336',
};

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  return (
    <View className="h-6 flex-row items-end gap-0.5">
      {values.map((v, i) => (
        <View
          key={i}
          style={{ width: 6, height: Math.max(3, (v / max) * 24), backgroundColor: color, borderRadius: 2 }}
        />
      ))}
    </View>
  );
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

export default function HistoryScreen() {
  const week = useWeekStore((s) => s.week);
  const snapshots = useHistoryStore((s) => s.snapshots);
  const capture = useHistoryStore((s) => s.capture);
  const remove = useHistoryStore((s) => s.remove);

  const ordered = useMemo(() => sortSnapshots(snapshots), [snapshots]);
  const latest = ordered[ordered.length - 1];
  const prev = ordered[ordered.length - 2];
  const latestStats = useMemo(() => (latest ? snapshotStats(latest.week) : null), [latest]);
  const vTrend = useMemo(() => volumeTrend(ordered), [ordered]);
  const delta = useMemo(() => (prev && latest ? compareSnapshots(prev, latest) : null), [prev, latest]);
  const prs = useMemo(() => personalRecords(ordered), [ordered]);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="font-display text-2xl text-ink">History</Text>
        <Pressable onPress={() => capture(week)} className="rounded-md bg-accent px-3 py-1.5">
          <Text className="font-medium text-bg">Capture this week</Text>
        </Pressable>
      </View>

      {ordered.length === 0 ? (
        <View className="rounded-2xl border border-line bg-surface p-4">
          <Text className="text-sm text-ink-2">
            No snapshots yet. Log your week, then Capture this week to track trends, volume
            landmarks, and personal records over time.
          </Text>
        </View>
      ) : (
        <>
          {delta && (
            <View className="mb-4 rounded-2xl border border-line bg-surface p-4">
              <Text className="mb-3 font-display text-lg text-ink">This week vs. last</Text>
              <View className="flex-row flex-wrap gap-2">
                <Stat label="Total sets" value={signed(delta.totalSetsDelta)} />
                <Stat label="Volume" value={signed(Math.round(delta.totalVolumeDelta))} />
                <Stat label="Days" value={signed(delta.daysTrainedDelta)} />
              </View>
            </View>
          )}

          <View className="mb-4 rounded-2xl border border-line bg-surface p-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-display text-lg text-ink">Weekly volume</Text>
              <Sparkline values={vTrend.map((p) => p.totalSets)} color="#f97316" />
            </View>
            {vTrend
              .slice()
              .reverse()
              .map((p) => (
                <View key={p.weekOf} className="mt-1 flex-row items-center gap-2">
                  <Text className="w-24 font-mono text-xs text-ink-3">{p.weekOf}</Text>
                  <Text className="w-16 text-sm text-ink-2">{p.totalSets} sets</Text>
                  <Text className="w-10 text-xs text-ink-3">{p.daysTrained}d</Text>
                  <Text className="font-mono text-xs text-ink-3">
                    vol {Math.round(p.totalVolume).toLocaleString()}
                  </Text>
                </View>
              ))}
          </View>

          {latestStats && (
            <View className="mb-4 rounded-2xl border border-line bg-surface p-4">
              <Text className="font-display text-lg text-ink">Volume landmarks</Text>
              <Text className="mb-3 text-xs text-ink-3">
                Direct sets/muscle this week vs. evidence MEV/MAV/MRV bands.
              </Text>
              {MUSCLE_GROUPS.map((g) => {
                const sets = latestStats.setsPerMuscle[g.id];
                const status = latestStats.volumeStatusPerMuscle[g.id];
                const trend = muscleTrend(ordered, g.id).map((p) => p.score);
                return (
                  <View key={g.id} className="mb-2 flex-row items-center gap-2">
                    <Text className="w-24 text-sm text-ink">{g.label}</Text>
                    <Text className="w-14 font-mono text-xs text-ink-2">{sets} sets</Text>
                    <View
                      className="w-24 rounded-md px-2 py-0.5"
                      style={{ backgroundColor: `${STATUS_COLOR[status]}22` }}
                    >
                      <Text className="text-center font-mono text-[10px]" style={{ color: STATUS_COLOR[status] }}>
                        {STATUS_LABEL[status]}
                      </Text>
                    </View>
                    <View className="flex-1" />
                    <Sparkline values={trend} color={scoreToColor(latestStats.loads[g.id])} />
                  </View>
                );
              })}
            </View>
          )}

          {prs.length > 0 && (
            <View className="mb-4 rounded-2xl border border-line bg-surface p-4">
              <Text className="mb-3 font-display text-lg text-ink">Personal records</Text>
              {prs.slice(0, 15).map((pr) => (
                <View key={pr.exercise} className="mb-1 flex-row items-center justify-between border-t border-line pt-1">
                  <Text className="flex-1 text-sm text-ink">{pr.exercise}</Text>
                  <Text className="w-20 text-sm text-ink-2">
                    {pr.bestWeight}×{pr.bestWeightReps}
                  </Text>
                  <Text className="w-14 text-right font-mono text-xs text-accent">{pr.bestEst1RM}</Text>
                </View>
              ))}
            </View>
          )}

          <View className="rounded-2xl border border-line bg-surface p-4">
            <Text className="mb-3 font-display text-lg text-ink">Snapshots</Text>
            {ordered
              .slice()
              .reverse()
              .map((s) => (
                <View key={s.id} className="mb-1 flex-row items-center justify-between">
                  <Text className="font-mono text-xs text-ink-2">
                    {s.weekOf}
                    {s.note ? ` · ${s.note}` : ''}
                  </Text>
                  <Pressable onPress={() => remove(s.id)} className="px-2 py-1">
                    <Text className="text-xs text-ink-3">✕</Text>
                  </Pressable>
                </View>
              ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-xl border border-line bg-bg-2 p-3">
      <Text className="font-mono text-xs text-ink-3">{label}</Text>
      <Text className="mt-1 text-base font-semibold text-ink">{value}</Text>
    </View>
  );
}

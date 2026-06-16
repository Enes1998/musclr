import { useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import {
  MUSCLE_GROUPS,
  computeMuscleLoad,
  scoreLabel,
  scoreToColor,
  ALL_EXERCISES,
  type MuscleId,
  type TrainingGoal,
} from '@musclr/core';
import { useWeekStore } from '../../lib/store';
import { MuscleHeatmap } from '../../components/MuscleHeatmap';
import { requestPlan, type PlanResponse } from '../../lib/api';

const GOALS: TrainingGoal[] = ['hypertrophy', 'strength', 'endurance', 'general'];

export default function SummaryScreen() {
  const week = useWeekStore((s) => s.week);
  const [goal, setGoal] = useState<TrainingGoal>('hypertrophy');
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loads = useMemo(() => computeMuscleLoad(week, ALL_EXERCISES), [week]);
  const groups = useMemo(
    () => MUSCLE_GROUPS.map((g) => ({ ...g, score: loads[g.id] })).sort((a, b) => b.score - a.score),
    [loads],
  );

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      setPlan(await requestPlan({ goal, loads: loads as Partial<Record<MuscleId, number>> }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Text className="mb-4 font-display text-2xl text-ink">Weekly summary</Text>

      <MuscleHeatmap scores={loads as Partial<Record<MuscleId, number>>} />
      <Text className="mb-4 mt-2 text-center font-mono text-xs text-ink-3">
        green = undertrained · red = overtrained
      </Text>

      <View className="rounded-2xl border border-line bg-surface p-4">
        <Text className="mb-3 font-display text-lg text-ink">Muscle load</Text>
        {groups.map((g) => (
          <View key={g.id} className="mb-2 flex-row items-center gap-2">
            <Text className="w-24 text-sm text-ink">{g.label}</Text>
            <View className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
              <View style={{ width: `${g.score}%`, backgroundColor: scoreToColor(g.score) }} className="h-full rounded-full" />
            </View>
            <Text className="w-8 text-right font-mono text-xs text-ink-2">{g.score}</Text>
            <Text className="w-24 text-right font-mono text-xs text-ink-3">{scoreLabel(g.score)}</Text>
          </View>
        ))}
      </View>

      <View className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <Text className="font-display text-lg text-ink">AI coach</Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {GOALS.map((g) => (
            <Pressable key={g} onPress={() => setGoal(g)} className={`rounded-md px-3 py-1.5 ${goal === g ? 'bg-accent' : 'bg-surface-2'}`}>
              <Text className={goal === g ? 'text-bg' : 'text-ink-2'}>{g}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={generate} disabled={loading} className="mt-4 self-start rounded-md bg-accent px-4 py-2">
          <Text className="font-medium text-bg">{loading ? 'Generating…' : 'Generate plan'}</Text>
        </Pressable>
        {error && <Text className="mt-3 text-sm text-load-over">⚠ {error}</Text>}

        {plan && (
          <View className="mt-4 rounded-xl border border-line bg-bg-2 p-3">
            <Text className="font-mono text-[10px] text-ink-3">
              {plan.meta.provider} · {plan.meta.model} · {plan.meta.durationMs}ms
            </Text>
            <Text className="mt-1 text-sm text-ink">{plan.plan.workout.summary}</Text>
            {plan.plan.workout.days
              .filter((d) => !d.rest)
              .map((d, i) => (
                <View key={i} className="mt-3">
                  <Text className="text-sm font-medium text-ink">{d.label}</Text>
                  {d.exercises.map((e, j) => (
                    <Text key={j} className="text-sm text-ink-2">
                      {e.name} — {e.sets}×{e.reps} @ {e.weightGuidance} (RIR {e.rir})
                    </Text>
                  ))}
                </View>
              ))}
            <Text className="mt-3 font-mono text-[10px] text-ink-3">Cited: {plan.plan.workout.citations.join(', ')}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

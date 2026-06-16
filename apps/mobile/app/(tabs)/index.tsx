import { useMemo } from 'react';
import { ScrollView, View, Text, Pressable, TextInput } from 'react-native';
import {
  DAYS,
  parseNumericInput,
  getWorkoutEntryErrors,
  getTrustedDayTotals,
  getTrustedWeekTotals,
  type WorkoutEntry,
} from '@musclr/core';
import { useWeekStore } from '../../lib/store';

export default function LogScreen() {
  const { week, activeDay, setActiveDay, addExercise, updateExercise, removeExercise } = useWeekStore();
  const entries = week[activeDay];
  const dayTotals = useMemo(() => getTrustedDayTotals(entries), [entries]);
  const weekTotals = useMemo(() => getTrustedWeekTotals(week), [week]);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Text className="mb-4 font-display text-2xl text-ink">Log your week</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-1">
        {DAYS.map((d) => {
          const active = activeDay === d.id;
          return (
            <Pressable
              key={d.id}
              onPress={() => setActiveDay(d.id)}
              className={`mx-1 rounded-md px-3 py-2 ${active ? 'bg-accent' : 'bg-surface-2'}`}
            >
              <Text className={active ? 'text-bg' : 'text-ink-2'}>
                {d.label}
                {week[d.id].length ? `  ${week[d.id].length}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="overflow-hidden rounded-xl border border-line bg-surface">
        <View className="flex-row border-b border-line px-3 py-2">
          <Text className="flex-1 font-mono text-xs text-ink-3">Exercise</Text>
          <Text className="w-12 text-center font-mono text-xs text-ink-3">Sets</Text>
          <Text className="w-12 text-center font-mono text-xs text-ink-3">Reps</Text>
          <Text className="w-14 text-center font-mono text-xs text-ink-3">kg</Text>
          <View className="w-6" />
        </View>

        {entries.length === 0 ? (
          <Text className="px-3 py-6 text-center text-ink-3">Rest day — no exercises logged.</Text>
        ) : (
          entries.map((entry, i) => {
            const errors = getWorkoutEntryErrors(entry);
            const numField = (f: 'sets' | 'reps' | 'weight') => (
              <TextInput
                value={String(entry[f])}
                keyboardType="numeric"
                onChangeText={(t) =>
                  updateExercise(activeDay, i, { [f]: parseNumericInput(t) ?? 0 } as Partial<WorkoutEntry>)
                }
                className={`rounded bg-surface-2 px-1 py-1 text-center text-ink ${errors[f] ? 'border border-load-over' : ''}`}
              />
            );
            return (
              <View key={i} className="flex-row items-center gap-1 border-b border-line/40 px-3 py-1.5">
                <TextInput
                  value={entry.name}
                  placeholder="Exercise"
                  placeholderTextColor="#52525c"
                  onChangeText={(t) => updateExercise(activeDay, i, { name: t })}
                  className="flex-1 rounded bg-surface-2 px-2 py-1 text-ink"
                />
                <View className="w-12">{numField('sets')}</View>
                <View className="w-12">{numField('reps')}</View>
                <View className="w-14">{numField('weight')}</View>
                <Pressable onPress={() => removeExercise(activeDay, i)} className="w-6 items-center">
                  <Text className="text-ink-3">✕</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Pressable
          onPress={() => addExercise(activeDay, { name: '', sets: 3, reps: 10, weight: 20 })}
          className="rounded-md bg-surface-2 px-3 py-2"
        >
          <Text className="text-ink">+ Add exercise</Text>
        </Pressable>
        <Text className="font-mono text-xs text-ink-3">
          {dayTotals.sets} sets today · {weekTotals.daysTrained} days · {weekTotals.totalExercises} ex
        </Text>
      </View>
    </ScrollView>
  );
}

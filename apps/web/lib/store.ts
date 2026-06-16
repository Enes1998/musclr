'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import { SAMPLE_WEEK, type DayId, type WeekData, type WorkoutEntry } from '@musclr/core';

interface WeekStore {
  week: WeekData;
  activeDay: DayId;
  setActiveDay: (day: DayId) => void;
  addExercise: (day: DayId, entry: WorkoutEntry) => void;
  updateExercise: (day: DayId, index: number, patch: Partial<WorkoutEntry>) => void;
  removeExercise: (day: DayId, index: number) => void;
  resetWeek: () => void;
}

const EMPTY_WEEK: WeekData = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };

export const useWeekStore = create<WeekStore>()(
  persist(
    (set) => ({
      week: SAMPLE_WEEK,
      activeDay: 'mon',
      setActiveDay: (day) => set({ activeDay: day }),
      addExercise: (day, entry) =>
        set((s) => ({ week: { ...s.week, [day]: [...s.week[day], { ...entry }] } })),
      updateExercise: (day, index, patch) =>
        set((s) => ({
          week: { ...s.week, [day]: s.week[day].map((e, i) => (i === index ? { ...e, ...patch } : e)) },
        })),
      removeExercise: (day, index) =>
        set((s) => ({ week: { ...s.week, [day]: s.week[day].filter((_, i) => i !== index) } })),
      resetWeek: () => set({ week: EMPTY_WEEK }),
    }),
    { name: 'musclr.week.v1', storage: createJSONStorage(() => localStorage) },
  ),
);

/** Avoid SSR/client hydration mismatch for persisted state. */
export function useHasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

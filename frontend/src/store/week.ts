// Zustand store — single source of truth for workout data

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DayId, WeekData, WorkoutEntry } from '../lib/exercises';
import { SAMPLE_WEEK } from '../lib/exercises';

interface WeekStore {
  week: WeekData;
  activeDay: DayId;
  setActiveDay: (day: DayId) => void;
  addExercise: (day: DayId, entry: WorkoutEntry) => void;
  insertExercise: (day: DayId, afterIndex: number, entry: WorkoutEntry) => void;
  removeExercise: (day: DayId, index: number) => void;
  updateExercise: (day: DayId, index: number, patch: Partial<WorkoutEntry>) => void;
  setWeek: (updater: (w: WeekData) => WeekData) => void;
  resetWeek: () => void;
}

const EMPTY_WEEK: WeekData = {
  mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: []
};

export const useWeekStore = create<WeekStore>()(
  persist(
    (set) => ({
      week: SAMPLE_WEEK,
      activeDay: 'mon',

      setActiveDay: (day) => set({ activeDay: day }),

      addExercise: (day, entry) =>
        set((s) => ({
          week: { ...s.week, [day]: [...s.week[day], { ...entry }] },
        })),

      insertExercise: (day, afterIndex, entry) =>
        set((s) => {
          const list = s.week[day];
          const next = [
            ...list.slice(0, afterIndex + 1),
            { ...entry },
            ...list.slice(afterIndex + 1),
          ];
          return { week: { ...s.week, [day]: next } };
        }),

      removeExercise: (day, index) =>
        set((s) => ({
          week: { ...s.week, [day]: s.week[day].filter((_, i) => i !== index) },
        })),

      updateExercise: (day, index, patch) =>
        set((s) => ({
          week: {
            ...s.week,
            [day]: s.week[day].map((ex, i) => (i === index ? { ...ex, ...patch } : ex)),
          },
        })),

      setWeek: (updater) => set((s) => ({ week: updater(s.week) })),
      resetWeek: () => set({ week: EMPTY_WEEK }),
    }),
    {
      name: 'musclr.week.v1',
    }
  )
);

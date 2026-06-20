import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeSnapshot, type WeekData, type WeeklySnapshot } from '@musclr/core';

/** Monday (ISO week start) of the given date, as 'YYYY-MM-DD' (local). */
export function mondayOf(d: Date = new Date()): string {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - dow);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface HistoryStore {
  snapshots: WeeklySnapshot[];
  /** Capture the given week as this week's snapshot (replaces any existing snapshot for the week). */
  capture: (week: WeekData, note?: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      snapshots: [],
      capture: (week, note) =>
        set((s) => {
          const weekOf = mondayOf();
          const snap = makeSnapshot(week, {
            weekOf,
            id: `${weekOf}:${Math.random().toString(36).slice(2, 7)}`,
            capturedAt: new Date().toISOString(),
            note,
          });
          const rest = s.snapshots.filter((x) => x.weekOf !== weekOf);
          return { snapshots: [snap, ...rest] };
        }),
      remove: (id) => set((s) => ({ snapshots: s.snapshots.filter((x) => x.id !== id) })),
      clear: () => set({ snapshots: [] }),
    }),
    { name: 'musclr.history.v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

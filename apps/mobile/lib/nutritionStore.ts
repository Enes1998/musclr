import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Food } from '@musclr/core';

export interface FoodItem {
  key: string;
  food: Food;
  grams: number;
}

interface NutritionStore {
  items: FoodItem[];
  add: (food: Food, grams: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

export const useNutritionStore = create<NutritionStore>()(
  persist(
    (set) => ({
      items: [],
      add: (food, grams) =>
        set((s) => ({
          items: [
            ...s.items,
            { key: `${food.id}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`, food, grams },
          ],
        })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'musclr.nutrition.v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

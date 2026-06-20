'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LoadPalette, Locale } from '@musclr/core';
import type { AiSettings, PlanProvider } from './api';

export type WeightUnit = 'kg' | 'lb';

interface SettingsState {
  provider: PlanProvider;
  model: string;
  byoKey: string;
  localBaseUrl: string;
  palette: LoadPalette;
  reducedMotion: boolean;
  weightUnit: WeightUnit;
  locale: Locale;
  setProvider: (p: PlanProvider) => void;
  setModel: (m: string) => void;
  setByoKey: (k: string) => void;
  setLocalBaseUrl: (u: string) => void;
  setPalette: (p: LoadPalette) => void;
  setReducedMotion: (v: boolean) => void;
  setWeightUnit: (u: WeightUnit) => void;
  setLocale: (l: Locale) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      provider: 'mock',
      model: '',
      byoKey: '',
      localBaseUrl: '',
      palette: 'default',
      reducedMotion: false,
      weightUnit: 'kg',
      locale: 'en',
      setProvider: (provider) => set({ provider }),
      setModel: (model) => set({ model }),
      setByoKey: (byoKey) => set({ byoKey }),
      setLocalBaseUrl: (localBaseUrl) => set({ localBaseUrl }),
      setPalette: (palette) => set({ palette }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setWeightUnit: (weightUnit) => set({ weightUnit }),
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'musclr.settings.v1', storage: createJSONStorage(() => localStorage) },
  ),
);

/** Build the per-request AiSettings from the persisted state (empty strings → undefined). */
export function toAiSettings(s: Pick<SettingsState, 'provider' | 'model' | 'byoKey' | 'localBaseUrl'>): AiSettings {
  return {
    provider: s.provider,
    model: s.model.trim() || undefined,
    byoKey: s.byoKey.trim() || undefined,
    localBaseUrl: s.localBaseUrl.trim() || undefined,
  };
}

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AiSettings, PlanProvider } from './api';

interface SettingsState {
  provider: PlanProvider;
  model: string;
  byoKey: string;
  localBaseUrl: string;
  setProvider: (p: PlanProvider) => void;
  setModel: (m: string) => void;
  setByoKey: (k: string) => void;
  setLocalBaseUrl: (u: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      provider: 'mock',
      model: '',
      byoKey: '',
      localBaseUrl: '',
      setProvider: (provider) => set({ provider }),
      setModel: (model) => set({ model }),
      setByoKey: (byoKey) => set({ byoKey }),
      setLocalBaseUrl: (localBaseUrl) => set({ localBaseUrl }),
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

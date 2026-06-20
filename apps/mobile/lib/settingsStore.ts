import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { AiSettings, PlanProvider } from './api';

// BYO API keys are SECRETS → expo-secure-store (Keychain/Keystore), never AsyncStorage.
const KEY_STORE = 'musclr_byo_ai_key';

interface SettingsState {
  provider: PlanProvider;
  model: string;
  localBaseUrl: string;
  byoKey: string; // kept in memory only; persisted to SecureStore, not AsyncStorage
  keyLoaded: boolean;
  setProvider: (p: PlanProvider) => void;
  setModel: (m: string) => void;
  setLocalBaseUrl: (u: string) => void;
  setByoKey: (k: string) => void;
  loadKey: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      provider: 'mock',
      model: '',
      localBaseUrl: '',
      byoKey: '',
      keyLoaded: false,
      setProvider: (provider) => set({ provider }),
      setModel: (model) => set({ model }),
      setLocalBaseUrl: (localBaseUrl) => set({ localBaseUrl }),
      setByoKey: (byoKey) => {
        set({ byoKey });
        SecureStore.setItemAsync(KEY_STORE, byoKey).catch(() => {});
      },
      loadKey: async () => {
        try {
          const k = await SecureStore.getItemAsync(KEY_STORE);
          set({ byoKey: k ?? '', keyLoaded: true });
        } catch {
          set({ keyLoaded: true });
        }
      },
    }),
    {
      name: 'musclr.settings.v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Never persist the secret key to AsyncStorage — it lives only in SecureStore.
      partialize: (s) => ({ provider: s.provider, model: s.model, localBaseUrl: s.localBaseUrl }),
    },
  ),
);

export function toAiSettings(s: Pick<SettingsState, 'provider' | 'model' | 'byoKey' | 'localBaseUrl'>): AiSettings {
  return {
    provider: s.provider,
    model: s.model.trim() || undefined,
    byoKey: s.byoKey.trim() || undefined,
    localBaseUrl: s.localBaseUrl.trim() || undefined,
  };
}

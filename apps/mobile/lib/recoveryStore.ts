import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeReadiness, type ReadinessInput } from '@musclr/core';

export interface RecoveryState extends ReadinessInput {
  bodyWeightKg?: number;
  connectedSources: string[];
  set: (patch: Partial<RecoveryState>) => void;
  clear: () => void;
}

export const useRecoveryStore = create<RecoveryState>()(
  persist(
    (set) => ({
      recovery0to100: undefined,
      hrvDeviationPct: undefined,
      restingHrDeviationBpm: undefined,
      sleepEfficiencyPct: undefined,
      bodyWeightKg: undefined,
      connectedSources: [],
      set: (patch) => set(patch),
      clear: () =>
        set({
          recovery0to100: undefined,
          hrvDeviationPct: undefined,
          restingHrDeviationBpm: undefined,
          sleepEfficiencyPct: undefined,
        }),
    }),
    { name: 'musclr.recovery.v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export function hasRecoverySignal(s: ReadinessInput): boolean {
  return (
    typeof s.recovery0to100 === 'number' ||
    typeof s.hrvDeviationPct === 'number' ||
    typeof s.restingHrDeviationBpm === 'number' ||
    typeof s.sleepEfficiencyPct === 'number'
  );
}

export function readinessFrom(s: ReadinessInput): number | undefined {
  return hasRecoverySignal(s) ? computeReadiness(s) : undefined;
}

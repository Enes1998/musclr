'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { computeReadiness, type ReadinessInput } from '@musclr/core';

/**
 * Today's recovery signals. Entered manually now; the same shape is populated by on-device
 * (Apple Health / Health Connect) and cloud (Whoop/Oura/…) adapters once connected — see
 * docs/WEARABLES.md. Feeds the AI coach's readiness-aware autoregulation and nutrition bodyweight.
 */
export interface RecoveryState extends ReadinessInput {
  bodyWeightKg?: number;
  /** Connected health sources (manual is always implicitly present). */
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
    { name: 'musclr.recovery.v1', storage: createJSONStorage(() => localStorage) },
  ),
);

/** True when any recovery signal is present (so we only send readiness when meaningful). */
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

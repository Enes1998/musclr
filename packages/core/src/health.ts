// Health integration — the unified, source-agnostic model + dedup/readiness logic.
//
// Two runtimes implement the same `HealthProvider` interface: on-device stores (Apple
// HealthKit / Android Health Connect — client-only) and cloud OAuth providers (Whoop, Fitbit,
// Garmin, Oura, Polar — backend). The scoring/AI/nutrition engines read ONLY the normalized
// records here, so the source is invisible to them.
//
// Hard rules encoded below:
//  - The same workout appears in multiple sources (e.g. Garmin also writes to Apple Health):
//    collapse by `dedupeKey`, keeping the higher-priority source.
//  - NEVER sum cumulative metrics (steps, energy) across sources — pick one canonical source.
//  - HRV is SDNN (Apple) vs RMSSD (Whoop/Oura) — never average across metric types.
//  - Wearable data ENRICHES; it never modifies the frozen scoring math.

export type HealthSourceId =
  | 'apple_health' | 'health_connect' // on-device aggregators
  | 'whoop' | 'fitbit' | 'garmin' | 'oura' | 'polar' // cloud OAuth
  | 'manual';

export type Runtime = 'device' | 'cloud';

export type HealthDataKind =
  | 'workout' | 'heart_rate' | 'hrv' | 'sleep' | 'recovery'
  | 'daily_energy' | 'body_weight' | 'steps' | 'vo2max' | 'resting_hr';

export type HrvMetric = 'rmssd' | 'sdnn';

export interface RecordBase {
  id: string;
  source: HealthSourceId;
  sourceRecordId?: string;
  start: string; // ISO-8601 UTC
  end: string; // ISO-8601 UTC (instantaneous samples set start === end)
  dedupeKey: string;
  ingestedAt: string;
}

export interface WorkoutSession extends RecordBase {
  kind: 'workout';
  activityType: string; // 'strength_training' | 'running' | 'cycling' | ...
  totalEnergyKcal?: number;
  activeEnergyKcal?: number;
  distanceMeters?: number;
  avgHrBpm?: number;
  maxHrBpm?: number;
  /** Link to a manually-logged entry this objective record companions (never overwrite it). */
  linkedManualEntryId?: string;
}
export interface HeartRateSample extends RecordBase { kind: 'heart_rate'; bpm: number }
export interface HrvSample extends RecordBase { kind: 'hrv'; valueMs: number; metric: HrvMetric }
export interface SleepSession extends RecordBase {
  kind: 'sleep';
  durationSec: number;
  efficiencyPct?: number;
  stages?: { awakeSec?: number; lightSec?: number; deepSec?: number; remSec?: number };
}
export interface RecoveryScore extends RecordBase {
  kind: 'recovery';
  score0to100: number;
  providerScoreName: 'whoop_recovery' | 'oura_readiness' | 'garmin_body_battery' | 'derived';
  restingHrBpm?: number;
  hrvRmssdMs?: number;
}
export interface DailyEnergy extends RecordBase { kind: 'daily_energy'; date: string; activeKcal: number; restingKcal?: number }
export interface BodyWeight extends RecordBase { kind: 'body_weight'; massKg: number }
export interface Steps extends RecordBase { kind: 'steps'; date: string; count: number }
export interface Vo2Max extends RecordBase { kind: 'vo2max'; mlPerKgPerMin: number }
export interface RestingHr extends RecordBase { kind: 'resting_hr'; date: string; bpm: number }

export type NormalizedRecord =
  | WorkoutSession | HeartRateSample | HrvSample | SleepSession
  | RecoveryScore | DailyEnergy | BodyWeight | Steps | Vo2Max | RestingHr;

// ---- Provider interface ----------------------------------------------------

export interface HealthAuthState {
  source: HealthSourceId;
  connected: boolean;
  grantedKinds: HealthDataKind[];
  expiresAt?: string; // cloud only
}

export interface HealthQuery {
  kinds: HealthDataKind[];
  start: string;
  end: string;
  anchor?: string; // opaque incremental-sync cursor
}

export interface HealthPullResult {
  records: NormalizedRecord[];
  nextAnchor?: string;
}

export interface HealthProvider {
  readonly id: HealthSourceId;
  readonly runtime: Runtime;
  readonly supports: HealthDataKind[];
  isAvailable(): Promise<boolean>;
  getAuthState(): Promise<HealthAuthState>;
  requestAccess(kinds: HealthDataKind[]): Promise<HealthAuthState>;
  disconnect(): Promise<void>;
  pull(query: HealthQuery): Promise<HealthPullResult>;
  ingestWebhook?(payload: unknown): Promise<NormalizedRecord[]>;
}

// ---- Dedup -----------------------------------------------------------------

// Higher = preferred. Dedicated device cloud APIs are richest; on-device aggregators are
// echoes; manual is the fallback for non-objective data.
export const DEFAULT_SOURCE_PRIORITY: Record<HealthSourceId, number> = {
  garmin: 5, whoop: 5, oura: 5, polar: 5, fitbit: 4,
  apple_health: 2, health_connect: 2,
  manual: 1,
};

/** Round an ISO timestamp down to the minute (epoch minutes) for fuzzy interval matching. */
function epochMinute(iso: string): number {
  return Math.floor(Date.parse(iso) / 60000);
}

/** Deterministic dedupe key for a workout: type + start-minute + duration bucket (5-min). */
export function makeWorkoutDedupeKey(activityType: string, startIso: string, endIso: string): string {
  const startMin = epochMinute(startIso);
  const durMin = Math.max(0, epochMinute(endIso) - startMin);
  const durBucket = Math.round(durMin / 5) * 5;
  return `workout:${activityType}:${startMin}:${durBucket}`;
}

function richness(w: WorkoutSession): number {
  let n = 0;
  for (const v of [w.totalEnergyKcal, w.activeEnergyKcal, w.distanceMeters, w.avgHrBpm, w.maxHrBpm]) {
    if (v != null) n++;
  }
  return n;
}

/**
 * Collapse duplicate workouts (same dedupeKey from multiple sources) keeping the
 * higher-priority source; ties broken by richer record.
 */
export function dedupeWorkouts(
  workouts: WorkoutSession[],
  priority: Record<HealthSourceId, number> = DEFAULT_SOURCE_PRIORITY,
): WorkoutSession[] {
  const best = new Map<string, WorkoutSession>();
  for (const w of workouts) {
    const existing = best.get(w.dedupeKey);
    if (!existing) {
      best.set(w.dedupeKey, w);
      continue;
    }
    const better =
      priority[w.source] > priority[existing.source] ||
      (priority[w.source] === priority[existing.source] && richness(w) > richness(existing));
    if (better) best.set(w.dedupeKey, w);
  }
  return [...best.values()];
}

/**
 * Pick the canonical value for a cumulative daily metric (steps, energy) — the value from the
 * single highest-priority source. NEVER sums across sources (aggregators already de-overlap).
 */
export function canonicalDailyValue<T extends { source: HealthSourceId }>(
  candidates: T[],
  priority: Record<HealthSourceId, number> = DEFAULT_SOURCE_PRIORITY,
): T | null {
  if (candidates.length === 0) return null;
  return candidates.reduce((best, c) => (priority[c.source] > priority[best.source] ? c : best));
}

/**
 * Combine HRV samples for a day WITHOUT mixing metric types. Prefers RMSSD (more common in
 * recovery wearables); falls back to SDNN only if no RMSSD present. Returns the chosen metric
 * + the mean within that metric, or null.
 */
export function canonicalDailyHrv(samples: HrvSample[]): { metric: HrvMetric; valueMs: number } | null {
  const rmssd = samples.filter((s) => s.metric === 'rmssd');
  const chosen = rmssd.length > 0 ? rmssd : samples.filter((s) => s.metric === 'sdnn');
  if (chosen.length === 0) return null;
  const mean = chosen.reduce((sum, s) => sum + s.valueMs, 0) / chosen.length;
  return { metric: chosen[0]!.metric, valueMs: mean };
}

// ---- Readiness (bounded autoregulation nudge) ------------------------------

export interface ReadinessInput {
  /** Provider recovery/readiness 0-100 if available (Whoop/Oura). */
  recovery0to100?: number;
  /** Today's HRV vs the user's rolling baseline, as a signed % deviation. */
  hrvDeviationPct?: number;
  /** Today's resting HR minus baseline, in bpm (positive = elevated = worse). */
  restingHrDeviationBpm?: number;
  /** Last night's sleep efficiency 0-100. */
  sleepEfficiencyPct?: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Derive a 0-100 readiness score. If a provider recovery score exists, anchor on it; otherwise
 * synthesize from HRV/RHR/sleep deviations. Returns 50 (neutral) when no signal is available.
 */
export function computeReadiness(input: ReadinessInput): number {
  if (typeof input.recovery0to100 === 'number') {
    return clamp(Math.round(input.recovery0to100), 0, 100);
  }
  const signals: number[] = [];
  if (typeof input.hrvDeviationPct === 'number') {
    signals.push(clamp(50 + input.hrvDeviationPct * 1.5, 0, 100));
  }
  if (typeof input.restingHrDeviationBpm === 'number') {
    signals.push(clamp(50 - input.restingHrDeviationBpm * 4, 0, 100));
  }
  if (typeof input.sleepEfficiencyPct === 'number') {
    signals.push(clamp(input.sleepEfficiencyPct, 0, 100));
  }
  if (signals.length === 0) return 50;
  return Math.round(signals.reduce((a, b) => a + b, 0) / signals.length);
}

/**
 * Map readiness to a BOUNDED multiplier on the evidence module's 48-72h recovery window.
 * Low readiness → longer recovery (>1); high readiness → shorter (<1). Clamped to [0.85, 1.2]
 * so wearable noise can nudge but never override the science-based window. See [[evidence]]
 * principle `recovery.hrv_guided` (endurance-biased; bounded nudge only).
 */
export function recoveryWindowMultiplier(readiness: number): number {
  const r = clamp(readiness, 0, 100);
  return clamp(1 + (50 - r) / 100 * 0.4, 0.85, 1.2);
}

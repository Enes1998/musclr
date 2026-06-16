// Evidence module — the versioned, citable sports-science knowledge base that grounds the AI.
//
// Design principles:
//  - Deterministic facts live here, in code, with citations + DOIs. The LLM must ground its
//    prescriptions in these `principle.id`s and stay within the numeric bounds.
//  - Every numeric/prescriptive claim is tagged with a `tier` so practitioner heuristics
//    (e.g. Renaissance Periodization volume landmarks) are never presented as equal to
//    meta-analyses.
//  - Bump `moduleVersion` (date-based) on any change; outputs are version-stamped.
//
// Sources verified 2026-06-16 (see DOIs). Volume landmarks are a practitioner framework
// (Israetel / RP), tagged accordingly; underlying peer-reviewed support = Schoenfeld 2017.

import type { MuscleId } from './exercises';

export type EvidenceTier =
  | 'peer_reviewed'
  | 'position_stand'
  | 'textbook'
  | 'practitioner_guideline';

export type TrainingGoal = 'strength' | 'hypertrophy' | 'endurance' | 'general';

export interface Citation {
  id: string;
  ref: string; // human-readable citation
  doi?: string;
  isbn?: string;
  pmcid?: string;
  tier: EvidenceTier;
}

export interface NumericBound {
  metric: string; // e.g. 'reps', 'sets_per_week', 'rir', 'rest_min', 'recovery_hours'
  min: number;
  max: number;
  unit: string;
}

export interface Principle {
  id: string;
  statement: string;
  appliesTo: { goals?: TrainingGoal[]; muscles?: MuscleId[] };
  numeric?: NumericBound;
  tier: EvidenceTier;
  citations: string[]; // Citation.id[] — at least one required
  confidence: 'high' | 'moderate' | 'low';
}

export interface VolumeLandmark {
  muscle: MuscleId;
  /** Maintenance volume — sets/week to maintain. */
  mv: [number, number];
  /** Minimum effective volume. */
  mev: [number, number];
  /** Maximum adaptive volume. */
  mav: [number, number];
  /** Maximum recoverable volume. */
  mrv: [number, number];
  unit: 'sets_per_week';
  tier: EvidenceTier;
  citations: string[];
}

export interface EvidenceModule {
  schemaVersion: number;
  moduleVersion: string; // date-based; bump on any change
  lastReviewed: string;
  setCountingRule: string; // fixed direct-vs-fractional rule the AI must use
  citations: Citation[];
  principles: Principle[];
  volumeLandmarks: VolumeLandmark[];
}

const CITATIONS: Citation[] = [
  { id: 'acsm_2009', tier: 'position_stand', doi: '10.1249/MSS.0b013e3181915670',
    ref: 'American College of Sports Medicine. Progression Models in Resistance Training for Healthy Adults (Position Stand). Med Sci Sports Exerc. 2009;41(3):687-708.' },
  { id: 'schoenfeld_volume_2017', tier: 'peer_reviewed', doi: '10.1080/02640414.2016.1210197',
    ref: 'Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly resistance training volume and increases in muscle mass: a systematic review and meta-analysis. J Sports Sci. 2017;35(11):1073-1082.' },
  { id: 'schoenfeld_freq_2019', tier: 'peer_reviewed', doi: '10.1080/02640414.2018.1555906',
    ref: 'Schoenfeld BJ, Grgic J, Krieger J. How many times per week should a muscle be trained to maximize muscle hypertrophy? A systematic review and meta-analysis. J Sports Sci. 2019;37(11):1286-1295.' },
  { id: 'schoenfeld_load_2017', tier: 'peer_reviewed', doi: '10.1519/JSC.0000000000002200',
    ref: 'Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW. Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training. J Strength Cond Res. 2017;31(12):3508-3523.' },
  { id: 'schoenfeld_rest_2016', tier: 'peer_reviewed', doi: '10.1519/JSC.0000000000001272',
    ref: 'Schoenfeld BJ, Pope ZK, et al. Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men. J Strength Cond Res. 2016;30(7):1805-1812.' },
  { id: 'helms_rir_2016', tier: 'peer_reviewed', doi: '10.1519/SSC.0000000000000218',
    ref: 'Helms ER, Cronin J, Storey A, Zourdos MC. Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training. Strength Cond J. 2016;38(4):42-49.' },
  { id: 'robinson_failure_2024', tier: 'peer_reviewed', doi: '10.1007/s40279-024-02069-2',
    ref: 'Robinson ZP, et al. Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy. Sports Med. 2024;54(9):2209-2231.' },
  { id: 'pelland_doseresponse_2026', tier: 'peer_reviewed', doi: '10.1007/s40279-025-02344-w',
    ref: 'Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC. The Resistance Training Dose-Response: Volume and Frequency. Sports Med. 2026;56(2):481-505.' },
  { id: 'nsca_essentials_2016', tier: 'textbook', isbn: '9781492501626',
    ref: 'Haff GG, Triplett NT (eds). Essentials of Strength Training and Conditioning, 4th ed. NSCA / Human Kinetics; 2016.' },
  { id: 'rp_hypertrophy_2021', tier: 'practitioner_guideline',
    ref: 'Israetel M, Hoffmann J, Smith CW. Scientific Principles of Hypertrophy Training. Renaissance Periodization; 2021.' },
  { id: 'issn_protein_2017', tier: 'position_stand', doi: '10.1186/s12970-017-0177-8',
    ref: 'Jäger R, Kerksick CM, Campbell BI, et al. International Society of Sports Nutrition Position Stand: protein and exercise. J Int Soc Sports Nutr. 2017;14:20.' },
  { id: 'granero_hrv_2020', tier: 'peer_reviewed', pmcid: 'PMC7663087',
    ref: 'Granero-Gallegos A, et al. Importance of the Heart Rate Variability-Guided Training in Endurance Athletes: a systematic review and meta-analysis. Int J Environ Res Public Health. 2020;17(21):7999.' },
];

const PRINCIPLES: Principle[] = [
  {
    id: 'vol.dose_response',
    statement: 'Weekly hypertrophy increases with resistance-training volume in a dose-response fashion (~0.37% per added weekly set), with diminishing returns at high volumes.',
    appliesTo: { goals: ['hypertrophy'] },
    numeric: { metric: 'hypertrophy_pct_per_added_set', min: 0.3, max: 0.4, unit: '%' },
    tier: 'peer_reviewed', citations: ['schoenfeld_volume_2017', 'pelland_doseresponse_2026'], confidence: 'high',
  },
  {
    id: 'vol.min_threshold',
    statement: '≥10 working sets per muscle per week produces meaningfully greater hypertrophy than <10 sets per week.',
    appliesTo: { goals: ['hypertrophy'] },
    numeric: { metric: 'sets_per_week', min: 10, max: 10, unit: 'sets_per_week' },
    tier: 'peer_reviewed', citations: ['schoenfeld_volume_2017'], confidence: 'high',
  },
  {
    id: 'vol.landmarks_framework',
    statement: 'Program weekly volume per muscle between its Minimum Effective Volume (MEV) and Maximum Recoverable Volume (MRV); progress from MEV toward MAV over a mesocycle. Practitioner framework.',
    appliesTo: { goals: ['hypertrophy', 'general'] },
    tier: 'practitioner_guideline', citations: ['rp_hypertrophy_2021'], confidence: 'moderate',
  },
  {
    id: 'freq.twice_weekly',
    statement: 'Train each muscle at least twice per week; when weekly volume is equated, higher frequency adds little for hypertrophy but helps distribute volume.',
    appliesTo: { goals: ['hypertrophy', 'strength', 'general'] },
    numeric: { metric: 'sessions_per_muscle_per_week', min: 2, max: 6, unit: 'sessions_per_week' },
    tier: 'peer_reviewed', citations: ['schoenfeld_freq_2019', 'pelland_doseresponse_2026'], confidence: 'high',
  },
  {
    id: 'load.hypertrophy_range',
    statement: 'Hypertrophy is similar across a broad load range when sets are taken near failure; 6-12 reps is practical, with the full effective range ~5-30 reps.',
    appliesTo: { goals: ['hypertrophy'] },
    numeric: { metric: 'reps', min: 5, max: 30, unit: 'reps' },
    tier: 'peer_reviewed', citations: ['schoenfeld_load_2017'], confidence: 'high',
  },
  {
    id: 'load.strength_range',
    statement: 'Maximal strength is best developed with heavy loads (~≥80% 1RM), roughly 1-6 reps per set.',
    appliesTo: { goals: ['strength'] },
    numeric: { metric: 'reps', min: 1, max: 6, unit: 'reps' },
    tier: 'position_stand', citations: ['acsm_2009', 'nsca_essentials_2016'], confidence: 'high',
  },
  {
    id: 'load.endurance_range',
    statement: 'Local muscular endurance is developed with lighter loads and higher reps (~15-25+), short rests.',
    appliesTo: { goals: ['endurance'] },
    numeric: { metric: 'reps', min: 15, max: 30, unit: 'reps' },
    tier: 'position_stand', citations: ['acsm_2009'], confidence: 'moderate',
  },
  {
    id: 'failure.proximity',
    statement: 'Training within ~0-3 reps in reserve drives hypertrophy; gains plateau or reverse with excessive failure. Operationalize with RIR-based RPE.',
    appliesTo: { goals: ['hypertrophy', 'strength'] },
    numeric: { metric: 'rir', min: 0, max: 3, unit: 'reps_in_reserve' },
    tier: 'peer_reviewed', citations: ['robinson_failure_2024', 'helms_rir_2016'], confidence: 'moderate',
  },
  {
    id: 'rest.intervals',
    statement: 'Rest ~2-3 minutes between sets for compound strength/hypertrophy work; longer (3-5 min) for heavy strength, shorter (60-90 s) acceptable for isolation.',
    appliesTo: { goals: ['strength', 'hypertrophy'] },
    numeric: { metric: 'rest_minutes', min: 2, max: 3, unit: 'minutes' },
    tier: 'peer_reviewed', citations: ['schoenfeld_rest_2016'], confidence: 'moderate',
  },
  {
    id: 'overload.progression',
    statement: 'Apply progressive overload — gradually increase load, volume, or proximity to failure over time; periodize for trained individuals.',
    appliesTo: { goals: ['strength', 'hypertrophy', 'general'] },
    tier: 'position_stand', citations: ['acsm_2009'], confidence: 'high',
  },
  {
    id: 'recovery.window',
    statement: 'Allow ~48-72 hours between hard sessions for the same muscle group; this underpins the ≥2×/week frequency default.',
    appliesTo: { goals: ['strength', 'hypertrophy', 'general'] },
    numeric: { metric: 'recovery_hours', min: 48, max: 72, unit: 'hours' },
    tier: 'position_stand', citations: ['acsm_2009'], confidence: 'moderate',
  },
  {
    id: 'nutrition.protein',
    statement: 'For exercising individuals, 1.4-2.0 g protein per kg bodyweight per day supports muscle maintenance and growth; the higher end applies during caloric restriction.',
    appliesTo: { goals: ['hypertrophy', 'strength', 'general'] },
    numeric: { metric: 'protein_g_per_kg', min: 1.4, max: 2.0, unit: 'g/kg/day' },
    tier: 'position_stand', citations: ['issn_protein_2017'], confidence: 'high',
  },
  {
    id: 'recovery.hrv_guided',
    statement: 'HRV-guided autoregulation can improve adaptation. Evidence is strongest for endurance/VO2max outcomes and thinner for resistance hypertrophy — use readiness as a bounded nudge, not a primary driver.',
    appliesTo: { goals: ['endurance', 'general'] },
    tier: 'peer_reviewed', citations: ['granero_hrv_2020'], confidence: 'low',
  },
];

// Practitioner volume landmarks (sets/week), tier=practitioner_guideline.
// Traps/rhomboids/erectors roll into `back`; abs into `core`.
const VOLUME_LANDMARKS: VolumeLandmark[] = [
  { muscle: 'chest',      mv: [4, 8], mev: [10, 12], mav: [12, 20], mrv: [20, 22], unit: 'sets_per_week', tier: 'practitioner_guideline', citations: ['rp_hypertrophy_2021', 'schoenfeld_volume_2017'] },
  { muscle: 'back',       mv: [6, 8], mev: [10, 14], mav: [16, 24], mrv: [22, 25], unit: 'sets_per_week', tier: 'practitioner_guideline', citations: ['rp_hypertrophy_2021'] },
  { muscle: 'shoulders',  mv: [4, 8], mev: [8, 12],  mav: [14, 20], mrv: [20, 26], unit: 'sets_per_week', tier: 'practitioner_guideline', citations: ['rp_hypertrophy_2021'] },
  { muscle: 'biceps',     mv: [4, 6], mev: [8, 10],  mav: [12, 20], mrv: [18, 26], unit: 'sets_per_week', tier: 'practitioner_guideline', citations: ['rp_hypertrophy_2021'] },
  { muscle: 'triceps',    mv: [4, 6], mev: [6, 10],  mav: [10, 18], mrv: [18, 26], unit: 'sets_per_week', tier: 'practitioner_guideline', citations: ['rp_hypertrophy_2021'] },
  { muscle: 'forearms',   mv: [0, 2], mev: [2, 4],   mav: [10, 16], mrv: [16, 25], unit: 'sets_per_week', tier: 'practitioner_guideline', citations: ['rp_hypertrophy_2021'] },
  { muscle: 'core',       mv: [0, 2], mev: [0, 6],   mav: [16, 20], mrv: [20, 25], unit: 'sets_per_week', tier: 'practitioner_guideline', citations: ['rp_hypertrophy_2021'] },
  { muscle: 'quads',      mv: [6, 8], mev: [8, 12],  mav: [12, 18], mrv: [18, 20], unit: 'sets_per_week', tier: 'practitioner_guideline', citations: ['rp_hypertrophy_2021'] },
  { muscle: 'hamstrings', mv: [3, 4], mev: [4, 6],   mav: [10, 16], mrv: [16, 20], unit: 'sets_per_week', tier: 'practitioner_guideline', citations: ['rp_hypertrophy_2021'] },
  { muscle: 'glutes',     mv: [0, 4], mev: [4, 8],   mav: [8, 16],  mrv: [16, 20], unit: 'sets_per_week', tier: 'practitioner_guideline', citations: ['rp_hypertrophy_2021'] },
  { muscle: 'calves',     mv: [6, 8], mev: [8, 12],  mav: [12, 16], mrv: [16, 20], unit: 'sets_per_week', tier: 'practitioner_guideline', citations: ['rp_hypertrophy_2021'] },
];

export const EVIDENCE_MODULE: EvidenceModule = {
  schemaVersion: 1,
  moduleVersion: '2026-06-16',
  lastReviewed: '2026-06-16',
  setCountingRule:
    'Count only DIRECT working sets for a muscle (the muscle is a primary mover). Indirect/secondary involvement is not counted toward weekly set volume. Warm-up sets are excluded.',
  citations: CITATIONS,
  principles: PRINCIPLES,
  volumeLandmarks: VOLUME_LANDMARKS,
};

// ---- Lookups + guardrails --------------------------------------------------

const CITATION_IDS = new Set(CITATIONS.map((c) => c.id));
const PRINCIPLE_BY_ID = new Map(PRINCIPLES.map((p) => [p.id, p]));
const LANDMARK_BY_MUSCLE = new Map(VOLUME_LANDMARKS.map((l) => [l.muscle, l]));

export function isKnownCitation(id: string): boolean {
  return CITATION_IDS.has(id);
}

export function isKnownPrinciple(id: string): boolean {
  return PRINCIPLE_BY_ID.has(id);
}

export function getPrinciple(id: string): Principle | undefined {
  return PRINCIPLE_BY_ID.get(id);
}

export function getCitation(id: string): Citation | undefined {
  return CITATIONS.find((c) => c.id === id);
}

export function getVolumeLandmark(muscle: MuscleId): VolumeLandmark | undefined {
  return LANDMARK_BY_MUSCLE.get(muscle);
}

export type VolumeStatus = 'below_mev' | 'productive' | 'approaching_mrv' | 'above_mrv';

/** Classify a weekly set count for a muscle against its volume landmarks. */
export function volumeStatus(muscle: MuscleId, setsPerWeek: number): VolumeStatus {
  const lm = LANDMARK_BY_MUSCLE.get(muscle);
  if (!lm) return 'productive';
  if (setsPerWeek < lm.mev[0]) return 'below_mev';
  if (setsPerWeek > lm.mrv[1]) return 'above_mrv';
  if (setsPerWeek >= lm.mav[1]) return 'approaching_mrv';
  return 'productive';
}

/**
 * Guardrail: a prescribed weekly set volume is "sane" if it does not exceed the muscle's MRV
 * upper bound (with a small tolerance). Rejects e.g. 40 sets/week for chest.
 */
export function isVolumeSane(muscle: MuscleId, setsPerWeek: number): boolean {
  if (setsPerWeek < 0) return false;
  const lm = LANDMARK_BY_MUSCLE.get(muscle);
  if (!lm) return setsPerWeek <= 40; // generic ceiling for muscles without a landmark
  return setsPerWeek <= lm.mrv[1] + 2;
}

/** Guardrail: a rep prescription is within the cited range for the goal. */
export function isRepRangeSane(goal: TrainingGoal, reps: number): boolean {
  if (reps <= 0) return false;
  if (goal === 'strength') return reps <= 8; // allow a small buffer over 1-6
  if (goal === 'endurance') return reps >= 12;
  return reps >= 3 && reps <= 35; // hypertrophy / general: ~5-30 with buffer
}

export interface GroundingIssue {
  kind: 'unknown_citation' | 'unknown_principle' | 'volume_exceeds_mrv' | 'rep_range';
  detail: string;
}

/**
 * Validate that a set of claimed citation/principle ids and prescribed volumes/reps are
 * grounded in the evidence module and within bounds. The AI plan schema (Phase 4) feeds this.
 */
export function validateGrounding(input: {
  citationIds?: string[];
  principleIds?: string[];
  weeklyVolumes?: { muscle: MuscleId; setsPerWeek: number }[];
  repPrescriptions?: { goal: TrainingGoal; reps: number }[];
}): { ok: boolean; issues: GroundingIssue[] } {
  const issues: GroundingIssue[] = [];
  for (const id of input.citationIds ?? []) {
    if (!isKnownCitation(id)) issues.push({ kind: 'unknown_citation', detail: id });
  }
  for (const id of input.principleIds ?? []) {
    if (!isKnownPrinciple(id)) issues.push({ kind: 'unknown_principle', detail: id });
  }
  for (const v of input.weeklyVolumes ?? []) {
    if (!isVolumeSane(v.muscle, v.setsPerWeek)) {
      issues.push({ kind: 'volume_exceeds_mrv', detail: `${v.muscle}: ${v.setsPerWeek} sets/wk` });
    }
  }
  for (const r of input.repPrescriptions ?? []) {
    if (!isRepRangeSane(r.goal, r.reps)) {
      issues.push({ kind: 'rep_range', detail: `${r.goal}: ${r.reps} reps` });
    }
  }
  return { ok: issues.length === 0, issues };
}

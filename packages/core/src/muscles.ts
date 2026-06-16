// Anatomical muscle taxonomy (~40 leaves) for the segmented 3D model.
//
// The original product has 11 coarse muscle GROUPS (`MuscleId` in exercises.ts) and a
// frozen scoring engine. We keep those 11 as PARENTS so the existing EXERCISES data and
// `computeMuscleLoad` stay untouched, and add a finer LEAF layer (`MuscleLeafId`) that the
// anatomical 3D model is segmented into. Each leaf maps to one parent group, a body region,
// and a GLTF mesh node name (`m_<leafId>`).
//
// Today, group-level scores are expanded down to leaves for the heatmap
// (`expandGroupScoresToLeaves`). When Phase 3 adds per-leaf exercise activation, scores can be
// computed per leaf and rolled up for group summaries (`rollupLeafScores`).
//
// A few leaves have no clean parent among the legacy 11 groups (hip adductors, hip flexors);
// they are mapped to the closest group (`quads`) for backward-compatible coloring and noted
// below. Phase 3 will give them dedicated activation.

import type { MuscleId } from './exercises';

export type MuscleRegion =
  | 'chest'
  | 'shoulders'
  | 'back'
  | 'arms'
  | 'core'
  | 'hips'
  | 'thighs'
  | 'lower_leg';

export type MuscleLeafId =
  // Chest
  | 'pectoralis_major_clavicular' | 'pectoralis_major_sternal' | 'pectoralis_minor' | 'serratus_anterior'
  // Shoulders
  | 'deltoid_anterior' | 'deltoid_lateral' | 'deltoid_posterior' | 'rotator_cuff'
  // Back
  | 'latissimus_dorsi' | 'trapezius_upper' | 'trapezius_middle' | 'trapezius_lower'
  | 'rhomboids' | 'teres_major' | 'erector_spinae'
  // Arms
  | 'biceps_brachii' | 'brachialis' | 'brachioradialis'
  | 'triceps_long' | 'triceps_lateral' | 'triceps_medial'
  | 'forearm_flexors' | 'forearm_extensors'
  // Core
  | 'rectus_abdominis' | 'oblique_external' | 'oblique_internal' | 'transverse_abdominis'
  // Hips
  | 'gluteus_maximus' | 'gluteus_medius' | 'gluteus_minimus' | 'hip_adductors' | 'hip_flexors'
  // Thighs — quadriceps
  | 'rectus_femoris' | 'vastus_lateralis' | 'vastus_medialis' | 'vastus_intermedius'
  // Thighs — hamstrings
  | 'biceps_femoris' | 'semitendinosus' | 'semimembranosus'
  // Lower leg
  | 'gastrocnemius' | 'soleus' | 'tibialis_anterior';

export interface MuscleLeaf {
  id: MuscleLeafId;
  label: string;
  region: MuscleRegion;
  /** Parent group among the legacy 11 `MuscleId`s (closest match for the few without one). */
  group: MuscleId;
  /** GLTF node name in the anatomical model. L/R meshes use `<meshId>_l` / `<meshId>_r`. */
  meshId: string;
  /** Deep / occluded muscle — an optional layer that may be hidden on the surface heatmap. */
  optionalDeep?: boolean;
}

// [id, label, region, group, optionalDeep?]
type LeafDef = [MuscleLeafId, string, MuscleRegion, MuscleId, boolean?];

const LEAF_DEFS: LeafDef[] = [
  // Chest
  ['pectoralis_major_clavicular', 'Pectoralis Major (Clavicular)', 'chest', 'chest'],
  ['pectoralis_major_sternal', 'Pectoralis Major (Sternal)', 'chest', 'chest'],
  ['pectoralis_minor', 'Pectoralis Minor', 'chest', 'chest', true],
  ['serratus_anterior', 'Serratus Anterior', 'chest', 'chest'],
  // Shoulders
  ['deltoid_anterior', 'Deltoid (Anterior)', 'shoulders', 'shoulders'],
  ['deltoid_lateral', 'Deltoid (Lateral)', 'shoulders', 'shoulders'],
  ['deltoid_posterior', 'Deltoid (Posterior)', 'shoulders', 'shoulders'],
  ['rotator_cuff', 'Rotator Cuff', 'shoulders', 'shoulders', true],
  // Back
  ['latissimus_dorsi', 'Latissimus Dorsi', 'back', 'back'],
  ['trapezius_upper', 'Trapezius (Upper)', 'back', 'back'],
  ['trapezius_middle', 'Trapezius (Middle)', 'back', 'back'],
  ['trapezius_lower', 'Trapezius (Lower)', 'back', 'back'],
  ['rhomboids', 'Rhomboids', 'back', 'back'],
  ['teres_major', 'Teres Major', 'back', 'back'],
  ['erector_spinae', 'Erector Spinae', 'back', 'back'],
  // Arms
  ['biceps_brachii', 'Biceps Brachii', 'arms', 'biceps'],
  ['brachialis', 'Brachialis', 'arms', 'biceps'],
  ['brachioradialis', 'Brachioradialis', 'arms', 'forearms'],
  ['triceps_long', 'Triceps (Long Head)', 'arms', 'triceps'],
  ['triceps_lateral', 'Triceps (Lateral Head)', 'arms', 'triceps'],
  ['triceps_medial', 'Triceps (Medial Head)', 'arms', 'triceps'],
  ['forearm_flexors', 'Forearm Flexors', 'arms', 'forearms'],
  ['forearm_extensors', 'Forearm Extensors', 'arms', 'forearms'],
  // Core
  ['rectus_abdominis', 'Rectus Abdominis', 'core', 'core'],
  ['oblique_external', 'External Oblique', 'core', 'core'],
  ['oblique_internal', 'Internal Oblique', 'core', 'core', true],
  ['transverse_abdominis', 'Transverse Abdominis', 'core', 'core', true],
  // Hips
  ['gluteus_maximus', 'Gluteus Maximus', 'hips', 'glutes'],
  ['gluteus_medius', 'Gluteus Medius', 'hips', 'glutes'],
  ['gluteus_minimus', 'Gluteus Minimus', 'hips', 'glutes', true],
  ['hip_adductors', 'Hip Adductors', 'hips', 'quads'], // closest legacy group
  ['hip_flexors', 'Hip Flexors (Iliopsoas)', 'hips', 'quads'], // closest legacy group
  // Thighs — quadriceps
  ['rectus_femoris', 'Rectus Femoris', 'thighs', 'quads'],
  ['vastus_lateralis', 'Vastus Lateralis', 'thighs', 'quads'],
  ['vastus_medialis', 'Vastus Medialis', 'thighs', 'quads'],
  ['vastus_intermedius', 'Vastus Intermedius', 'thighs', 'quads', true],
  // Thighs — hamstrings
  ['biceps_femoris', 'Biceps Femoris', 'thighs', 'hamstrings'],
  ['semitendinosus', 'Semitendinosus', 'thighs', 'hamstrings'],
  ['semimembranosus', 'Semimembranosus', 'thighs', 'hamstrings'],
  // Lower leg
  ['gastrocnemius', 'Gastrocnemius', 'lower_leg', 'calves'],
  ['soleus', 'Soleus', 'lower_leg', 'calves'],
  ['tibialis_anterior', 'Tibialis Anterior', 'lower_leg', 'calves'],
];

export const MUSCLE_LEAVES: MuscleLeaf[] = LEAF_DEFS.map(
  ([id, label, region, group, optionalDeep]) => ({
    id,
    label,
    region,
    group,
    meshId: `m_${id}`,
    ...(optionalDeep ? { optionalDeep: true } : {}),
  }),
);

export const LEAF_BY_ID: Record<MuscleLeafId, MuscleLeaf> = Object.fromEntries(
  MUSCLE_LEAVES.map((l) => [l.id, l]),
) as Record<MuscleLeafId, MuscleLeaf>;

const LEAF_BY_MESH: Record<string, MuscleLeaf> = Object.fromEntries(
  MUSCLE_LEAVES.map((l) => [l.meshId, l]),
);

/** All leaf muscles belonging to a legacy group. */
export function leavesForGroup(group: MuscleId): MuscleLeaf[] {
  return MUSCLE_LEAVES.filter((l) => l.group === group);
}

/** The parent group of a leaf muscle. */
export function groupForLeaf(leaf: MuscleLeafId): MuscleId {
  return LEAF_BY_ID[leaf].group;
}

/** Resolve a GLTF mesh node name (optionally `_l`/`_r` suffixed) to its leaf, or null. */
export function leafForMeshId(meshId: string): MuscleLeaf | null {
  if (LEAF_BY_MESH[meshId]) return LEAF_BY_MESH[meshId];
  const base = meshId.replace(/_(l|r)$/i, '');
  return LEAF_BY_MESH[base] ?? null;
}

/**
 * Expand group-level scores (the current scoring output) down to every leaf — each leaf
 * takes its parent group's score. This is what the 3D heatmap consumes today.
 */
export function expandGroupScoresToLeaves(
  groupScores: Partial<Record<MuscleId, number>>,
): Record<MuscleLeafId, number> {
  const out = {} as Record<MuscleLeafId, number>;
  for (const leaf of MUSCLE_LEAVES) {
    out[leaf.id] = groupScores[leaf.group] ?? 0;
  }
  return out;
}

/**
 * Roll leaf-level scores up to group scores using the max across the group's leaves
 * (mirrors the prototype's `score = max(loads[id])` mesh aggregation). Groups with no
 * leaf score present default to 0.
 */
export function rollupLeafScores(
  leafScores: Partial<Record<MuscleLeafId, number>>,
): Record<MuscleId, number> {
  const out = {} as Record<MuscleId, number>;
  for (const leaf of MUSCLE_LEAVES) {
    const v = leafScores[leaf.id];
    if (v == null) continue;
    out[leaf.group] = Math.max(out[leaf.group] ?? 0, v);
  }
  return out;
}

/** Leaves grouped by anatomical region, in display order. */
export const REGION_ORDER: MuscleRegion[] = [
  'chest', 'shoulders', 'back', 'arms', 'core', 'hips', 'thighs', 'lower_leg',
];

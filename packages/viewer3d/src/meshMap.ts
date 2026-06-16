import type { MuscleId } from '@musclr/core';

/**
 * Maps a GLTF mesh node name → the MuscleId group(s) it represents.
 * Score for a mesh = max(scores) across its mapped muscles. Empty array = inert (no data).
 *
 * This is the SWAP POINT: when the segmented ~40-muscle anatomical model lands, replace this
 * with the `m_<leafId>` → leaf mapping (see @musclr/core `MUSCLE_LEAVES`). The current model has
 * 10 coarse regions.
 */
export type MeshMuscleMap = Record<string, MuscleId[]>;

export const LEGACY_REGION_MAP: MeshMuscleMap = {
  region_chest: ['chest'],
  region_back: ['back'],
  region_shoulders: ['shoulders'],
  region_upper_arms: ['biceps', 'triceps'],
  region_forearms: ['forearms'],
  region_abdomen: ['core'],
  region_glutes: ['glutes'],
  region_thighs: ['quads', 'hamstrings'],
  region_calves: ['calves'],
  region_neck: [],
};

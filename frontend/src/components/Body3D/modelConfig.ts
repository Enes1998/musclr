import type { MuscleId } from '../../lib/exercises';

/**
 * SWAP POINT — to use a different GLB:
 *   1. Replace MODEL_PATH with the new file path.
 *   2. Update MESH_MUSCLE_MAP keys to match the new mesh names.
 *   3. Nothing else needs to change.
 */

export const MODEL_PATH = '/model.glb';

/**
 * Maps every GLB mesh name to the app MuscleIds it represents.
 * Score = max(loads[id]) across all mapped IDs.
 * Empty array → inert mesh (rendered with default material, no muscle data).
 */
export const MESH_MUSCLE_MAP: Record<string, MuscleId[]> = {
  region_chest:      ['chest'],
  region_back:       ['back'],
  region_shoulders:  ['shoulders'],
  region_upper_arms: ['biceps', 'triceps'],
  region_forearms:   ['forearms'],
  region_abdomen:    ['core'],
  region_glutes:     ['glutes'],
  region_thighs:     ['quads', 'hamstrings'],
  region_calves:     ['calves'],
  region_neck:       [],
};

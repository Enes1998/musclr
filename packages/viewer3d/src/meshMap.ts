import { groupForLeaf, leafForMeshId, MUSCLE_LEAVES, type MuscleId } from '@musclr/core';

/**
 * Maps a GLTF mesh node name → the MuscleId group(s) it represents.
 * Score for a mesh = max(scores) across its mapped muscles. Empty array = inert (no data).
 */
export type MeshMuscleMap = Record<string, MuscleId[]>;

/**
 * Legacy 10-region model (kept for backward compatibility / older GLBs). The current shipped model
 * is the segmented ~40-muscle anatomy whose mesh names (`m_<leafId>` + `_l`/`_r`) resolve directly
 * through the core taxonomy — see `musclesForMesh`.
 */
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

/**
 * The anatomical model's mesh→group map, derived from the core taxonomy: every visible leaf's
 * `m_<leafId>` node maps to its parent group. Built once so the viewer can also enumerate it (e.g.
 * to verify a loaded model against the taxonomy, or drive the a11y text alternative).
 */
export const ANATOMICAL_MESH_MAP: MeshMuscleMap = Object.fromEntries(
  MUSCLE_LEAVES.map((leaf) => [leaf.meshId, [leaf.group]]),
);

/**
 * Resolve the muscle group(s) a mesh represents. Resolution order:
 *  1. an explicit override map (exact name, then `_l`/`_r`-stripped base),
 *  2. the core taxonomy via `leafForMeshId` (handles `m_<leafId>` and `_l`/`_r` suffixes),
 *  3. otherwise `null` → inert (no data) — e.g. head/neck/hands/feet context meshes.
 */
export function musclesForMesh(meshName: string, override?: MeshMuscleMap): MuscleId[] | null {
  if (override) {
    if (override[meshName]) return override[meshName];
    const base = meshName.replace(/_(l|r)$/i, '');
    if (override[base]) return override[base];
  }
  const leaf = leafForMeshId(meshName);
  if (leaf) return [groupForLeaf(leaf.id)];
  return null;
}

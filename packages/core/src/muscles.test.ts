import { describe, it, expect } from 'vitest';
import {
  MUSCLE_LEAVES,
  LEAF_BY_ID,
  leavesForGroup,
  groupForLeaf,
  leafForMeshId,
  expandGroupScoresToLeaves,
  rollupLeafScores,
} from './muscles';
import { MUSCLE_GROUPS } from './exercises';
import type { MuscleId } from './exercises';

const GROUP_IDS = new Set(MUSCLE_GROUPS.map((g) => g.id));

describe('muscle taxonomy', () => {
  it('has ~40 leaves with unique ids and mesh ids', () => {
    expect(MUSCLE_LEAVES.length).toBeGreaterThanOrEqual(40);
    const ids = new Set(MUSCLE_LEAVES.map((l) => l.id));
    const meshes = new Set(MUSCLE_LEAVES.map((l) => l.meshId));
    expect(ids.size).toBe(MUSCLE_LEAVES.length);
    expect(meshes.size).toBe(MUSCLE_LEAVES.length);
  });

  it('every leaf maps to a valid legacy parent group', () => {
    for (const leaf of MUSCLE_LEAVES) {
      expect(GROUP_IDS.has(leaf.group)).toBe(true);
      expect(groupForLeaf(leaf.id)).toBe(leaf.group);
    }
  });

  it('every legacy group has at least one leaf (so rollup covers all groups)', () => {
    for (const g of MUSCLE_GROUPS) {
      expect(leavesForGroup(g.id).length).toBeGreaterThan(0);
    }
  });

  it('mesh ids follow the m_<leafId> convention and resolve back (incl. L/R suffix)', () => {
    for (const leaf of MUSCLE_LEAVES) {
      expect(leaf.meshId).toBe(`m_${leaf.id}`);
      expect(leafForMeshId(leaf.meshId)?.id).toBe(leaf.id);
      expect(leafForMeshId(`${leaf.meshId}_l`)?.id).toBe(leaf.id);
      expect(leafForMeshId(`${leaf.meshId}_R`)?.id).toBe(leaf.id);
    }
    expect(leafForMeshId('m_not_a_muscle')).toBeNull();
  });

  it('expand → rollup(max) reproduces the original group scores', () => {
    const groupScores: Record<MuscleId, number> = {
      chest: 29, back: 40, shoulders: 55, biceps: 12, triceps: 33, forearms: 8,
      core: 60, quads: 32, hamstrings: 70, glutes: 80, calves: 15,
    };
    const leafScores = expandGroupScoresToLeaves(groupScores);
    // every leaf inherits its group's score
    for (const leaf of MUSCLE_LEAVES) {
      expect(leafScores[leaf.id]).toBe(groupScores[leaf.group]);
    }
    const rolled = rollupLeafScores(leafScores);
    for (const g of MUSCLE_GROUPS) {
      expect(rolled[g.id]).toBe(groupScores[g.id]);
    }
  });

  it('marks a handful of deep muscles as optional layers', () => {
    const deep = MUSCLE_LEAVES.filter((l) => l.optionalDeep);
    expect(deep.length).toBeGreaterThanOrEqual(4);
    expect(deep.length).toBeLessThanOrEqual(8);
    expect(LEAF_BY_ID.transverse_abdominis.optionalDeep).toBe(true);
  });
});

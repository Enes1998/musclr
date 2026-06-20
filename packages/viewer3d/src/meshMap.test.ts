import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MUSCLE_LEAVES, groupForLeaf } from '@musclr/core';
import { musclesForMesh, ANATOMICAL_MESH_MAP, LEGACY_REGION_MAP } from './meshMap';

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  readFileSync(resolve(here, '../model/model.manifest.json'), 'utf8'),
) as {
  leafCount: number;
  meshCount: number;
  muscleMeshes: string[];
  inertMeshes: string[];
  leafIds: string[];
};

describe('anatomical mesh map ↔ taxonomy', () => {
  it('the anatomical map covers exactly the taxonomy leaves', () => {
    expect(Object.keys(ANATOMICAL_MESH_MAP).sort()).toEqual(
      MUSCLE_LEAVES.map((l) => l.meshId).sort(),
    );
  });

  it('every leaf mesh (incl. _l/_r) resolves to its parent group', () => {
    for (const leaf of MUSCLE_LEAVES) {
      const group = groupForLeaf(leaf.id);
      expect(musclesForMesh(leaf.meshId)).toEqual([group]);
      expect(musclesForMesh(`${leaf.meshId}_l`)).toEqual([group]);
      expect(musclesForMesh(`${leaf.meshId}_r`)).toEqual([group]);
    }
  });

  it('non-muscle / unknown meshes resolve to inert (null)', () => {
    expect(musclesForMesh('head')).toBeNull();
    expect(musclesForMesh('foot_l')).toBeNull();
    expect(musclesForMesh('totally_unknown')).toBeNull();
  });

  it('explicit override map still works (legacy 10-region model)', () => {
    expect(musclesForMesh('region_thighs', LEGACY_REGION_MAP)).toEqual(['quads', 'hamstrings']);
    expect(musclesForMesh('region_neck', LEGACY_REGION_MAP)).toEqual([]);
  });
});

describe('generated model manifest ↔ taxonomy (drift guard)', () => {
  it('manifest leaf ids match the taxonomy exactly', () => {
    expect([...manifest.leafIds].sort()).toEqual(MUSCLE_LEAVES.map((l) => l.id).sort());
    expect(manifest.leafCount).toBe(MUSCLE_LEAVES.length);
  });

  it('every taxonomy leaf has at least one mesh in the generated model', () => {
    for (const leaf of MUSCLE_LEAVES) {
      const present =
        manifest.muscleMeshes.includes(leaf.meshId) ||
        manifest.muscleMeshes.includes(`${leaf.meshId}_l`) ||
        manifest.muscleMeshes.includes(`${leaf.meshId}_r`);
      expect(present, `missing mesh for leaf ${leaf.id}`).toBe(true);
    }
  });

  it('every muscle mesh in the model resolves to a real group (no orphans)', () => {
    for (const meshName of manifest.muscleMeshes) {
      expect(musclesForMesh(meshName), `orphan mesh ${meshName}`).not.toBeNull();
    }
  });
});

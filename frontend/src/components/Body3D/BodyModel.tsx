import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { scoreToColor } from '../../lib/scoring';
import { MODEL_PATH, MESH_MUSCLE_MAP } from './modelConfig';

function meshScore(meshName: string, loads: Record<string, number>): number | null {
  const ids = MESH_MUSCLE_MAP[meshName];
  if (!ids || ids.length === 0) return null;
  return ids.reduce((m, id) => Math.max(m, loads[id] ?? 0), 0);
}

function makeMat(score: number) {
  const color = new THREE.Color(scoreToColor(score));
  let emissiveIntensity = 0;
  if (score > 70)      emissiveIntensity = 0.35;
  else if (score > 40) emissiveIntensity = 0.18;
  else if (score > 0)  emissiveIntensity = 0.08;
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.05,
    emissive: color.clone().multiplyScalar(emissiveIntensity),
    emissiveIntensity: emissiveIntensity > 0 ? 1 : 0,
  });
}

const INERT_MAT = new THREE.MeshStandardMaterial({
  color: 0x26262f,
  roughness: 0.8,
  metalness: 0.02,
});

export default function BodyModel({ loads }: { loads: Record<string, number> }) {
  const { scene } = useGLTF(MODEL_PATH);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  const meshMats = useMemo(() => {
    const map: Record<string, THREE.MeshStandardMaterial> = {};
    for (const meshName of Object.keys(MESH_MUSCLE_MAP)) {
      const score = meshScore(meshName, loads);
      if (score !== null) map[meshName] = makeMat(score);
    }
    return map;
  }, [loads]);

  useMemo(() => {
    clonedScene.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      node.material = meshMats[node.name] ?? INERT_MAT;
      node.castShadow = true;
      node.receiveShadow = true;
    });
  }, [clonedScene, meshMats]);

  return <primitive object={clonedScene} position={[0, -0.7, 0]} />;
}

useGLTF.preload(MODEL_PATH);

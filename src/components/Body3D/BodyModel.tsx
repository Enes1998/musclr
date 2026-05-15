import { useMemo } from 'react';
import * as THREE from 'three';
import { scoreToColor } from '../../lib/scoring';
import type { MuscleId } from '../../lib/exercises';

export default function BodyModel({ loads }: { loads: Record<string, number> }) {
  // Shared inert material
  const inertMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x26262f,
    roughness: 0.8,
    metalness: 0.02,
  }), []);

  // Helper to create region materials driven by loads
  const getMat = (id: MuscleId) => {
    const score = loads[id] || 0;
    const color = new THREE.Color(scoreToColor(score));
    
    // Overtrained muscles faintly glow
    let emissiveIntensity = 0;
    if (score > 70) emissiveIntensity = 0.35;
    else if (score > 40) emissiveIntensity = 0.18;
    else if (score > 0) emissiveIntensity = 0.08;

    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: 0.05,
      emissive: color.clone().multiplyScalar(emissiveIntensity),
      emissiveIntensity: emissiveIntensity > 0 ? 1 : 0,
    });
  };

  const mats = {
    chest: getMat('chest'),
    core: getMat('core'),
    back: getMat('back'),
    shoulders: getMat('shoulders'),
    biceps: getMat('biceps'),
    triceps: getMat('triceps'),
    glutes: getMat('glutes'),
    quads: getMat('quads'),
    hamstrings: getMat('hamstrings'),
    calves: getMat('calves'),
  };

  return (
    <group>
      {/* Inert base */}
      <mesh material={inertMat} position={[0, 2.55, 0]}>
        <sphereGeometry args={[0.38, 32, 32]} />
      </mesh>
      <mesh material={inertMat} position={[0, 2.18, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.25, 24]} />
      </mesh>
      <mesh material={inertMat} position={[0, 1.35, -0.05]}>
        <capsuleGeometry args={[0.55, 0.9, 8, 24]} />
      </mesh>

      {/* Chest */}
      <mesh material={mats.chest} position={[-0.22, 1.72, 0.42]} scale={[1.05, 0.9, 0.55]}>
        <sphereGeometry args={[0.32, 24, 24]} />
      </mesh>
      <mesh material={mats.chest} position={[0.22, 1.72, 0.42]} scale={[1.05, 0.9, 0.55]}>
        <sphereGeometry args={[0.32, 24, 24]} />
      </mesh>

      {/* Core */}
      <mesh material={mats.core} position={[0, 1.15, 0.4]}>
        <boxGeometry args={[0.55, 0.75, 0.22]} />
      </mesh>

      {/* Back */}
      <mesh material={mats.back} position={[0, 1.5, -0.4]}>
        <boxGeometry args={[0.95, 1.05, 0.22]} />
      </mesh>

      {/* Shoulders */}
      <mesh material={mats.shoulders} position={[-0.62, 1.95, 0.05]}>
        <sphereGeometry args={[0.26, 24, 24]} />
      </mesh>
      <mesh material={mats.shoulders} position={[0.62, 1.95, 0.05]}>
        <sphereGeometry args={[0.26, 24, 24]} />
      </mesh>

      {/* Biceps */}
      <mesh material={mats.biceps} position={[-0.78, 1.5, 0.12]}>
        <capsuleGeometry args={[0.16, 0.42, 6, 16]} />
      </mesh>
      <mesh material={mats.biceps} position={[0.78, 1.5, 0.12]}>
        <capsuleGeometry args={[0.16, 0.42, 6, 16]} />
      </mesh>

      {/* Triceps */}
      <mesh material={mats.triceps} position={[-0.78, 1.5, -0.18]}>
        <capsuleGeometry args={[0.16, 0.42, 6, 16]} />
      </mesh>
      <mesh material={mats.triceps} position={[0.78, 1.5, -0.18]}>
        <capsuleGeometry args={[0.16, 0.42, 6, 16]} />
      </mesh>

      {/* Forearms (inert) */}
      <mesh material={inertMat} position={[-0.78, 0.85, 0]}>
        <capsuleGeometry args={[0.13, 0.5, 6, 16]} />
      </mesh>
      <mesh material={inertMat} position={[0.78, 0.85, 0]}>
        <capsuleGeometry args={[0.13, 0.5, 6, 16]} />
      </mesh>

      {/* Hips (inert) */}
      <mesh material={inertMat} position={[0, 0.65, -0.05]}>
        <boxGeometry args={[0.95, 0.3, 0.55]} />
      </mesh>

      {/* Glutes */}
      <mesh material={mats.glutes} position={[-0.22, 0.55, -0.32]} scale={[1, 0.9, 0.85]}>
        <sphereGeometry args={[0.3, 24, 24]} />
      </mesh>
      <mesh material={mats.glutes} position={[0.22, 0.55, -0.32]} scale={[1, 0.9, 0.85]}>
        <sphereGeometry args={[0.3, 24, 24]} />
      </mesh>

      {/* Quads */}
      <mesh material={mats.quads} position={[-0.25, 0.05, 0.1]}>
        <capsuleGeometry args={[0.2, 0.65, 6, 16]} />
      </mesh>
      <mesh material={mats.quads} position={[0.25, 0.05, 0.1]}>
        <capsuleGeometry args={[0.2, 0.65, 6, 16]} />
      </mesh>

      {/* Hamstrings */}
      <mesh material={mats.hamstrings} position={[-0.25, 0.05, -0.18]}>
        <capsuleGeometry args={[0.18, 0.6, 6, 16]} />
      </mesh>
      <mesh material={mats.hamstrings} position={[0.25, 0.05, -0.18]}>
        <capsuleGeometry args={[0.18, 0.6, 6, 16]} />
      </mesh>

      {/* Knees (inert) */}
      <mesh material={inertMat} position={[-0.25, -0.5, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
      </mesh>
      <mesh material={inertMat} position={[0.25, -0.5, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
      </mesh>

      {/* Calves */}
      <mesh material={mats.calves} position={[-0.25, -0.95, -0.1]}>
        <capsuleGeometry args={[0.16, 0.4, 6, 16]} />
      </mesh>
      <mesh material={mats.calves} position={[0.25, -0.95, -0.1]}>
        <capsuleGeometry args={[0.16, 0.4, 6, 16]} />
      </mesh>

      {/* Shins & Feet (inert) */}
      <mesh material={inertMat} position={[-0.25, -0.95, 0.1]}>
        <capsuleGeometry args={[0.14, 0.4, 6, 16]} />
      </mesh>
      <mesh material={inertMat} position={[0.25, -0.95, 0.1]}>
        <capsuleGeometry args={[0.14, 0.4, 6, 16]} />
      </mesh>
      <mesh material={inertMat} position={[-0.25, -1.4, 0.08]}>
        <boxGeometry args={[0.22, 0.12, 0.4]} />
      </mesh>
      <mesh material={inertMat} position={[0.25, -1.4, 0.08]}>
        <boxGeometry args={[0.22, 0.12, 0.4]} />
      </mesh>
    </group>
  );
}

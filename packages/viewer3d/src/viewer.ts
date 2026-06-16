// Framework-agnostic three.js muscle-heatmap viewer — the ONE 3D implementation reused by the
// Next.js web app (imported directly) and the Expo mobile app (bundled into a react-native-webview).
// No React, no DOM framework — just a canvas-mounting factory with a tiny imperative API.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { scoreToColor, type MuscleId } from '@musclr/core';
import { LEGACY_REGION_MAP, type MeshMuscleMap } from './meshMap';

export interface MuscleViewerOptions {
  modelUrl: string;
  meshMap?: MeshMuscleMap;
  autoRotate?: boolean;
  background?: number | null; // null = transparent
}

export interface MuscleViewerHandle {
  /** Recolor the model from per-muscle-group scores (0-100). */
  setScores(scores: Partial<Record<MuscleId, number>>): void;
  resize(): void;
  dispose(): void;
}

const INERT_COLOR = 0x26262f;

function makeMaterial(score: number): THREE.MeshStandardMaterial {
  const color = new THREE.Color(scoreToColor(score));
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
}

export function createMuscleViewer(
  container: HTMLElement,
  options: MuscleViewerOptions,
): MuscleViewerHandle {
  const meshMap = options.meshMap ?? LEGACY_REGION_MAP;
  const autoRotate = options.autoRotate ?? true;

  const scene = new THREE.Scene();
  if (options.background != null) scene.background = new THREE.Color(options.background);

  const width = container.clientWidth || 1;
  const height = container.clientHeight || 1;

  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.set(0, 0, 3.6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: options.background == null });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // Lights (ported from the prototype's Body3D scene).
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const fill = new THREE.DirectionalLight(0xffffff, 1.1);
  fill.position.set(2, 3, 4);
  fill.castShadow = true;
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x5eead4, 0.4);
  rim.position.set(-3, 1, -4);
  scene.add(rim);
  const accent = new THREE.PointLight(0xffc107, 0.2);
  accent.position.set(0, -2, 3);
  scene.add(accent);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = 1.2;

  const meshes: THREE.Mesh[] = [];
  let pendingScores: Partial<Record<MuscleId, number>> | null = null;

  function applyScores(scores: Partial<Record<MuscleId, number>>): void {
    for (const mesh of meshes) {
      const muscles = meshMap[mesh.name];
      const old = mesh.material as THREE.Material | THREE.Material[];
      if (!muscles || muscles.length === 0) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: INERT_COLOR,
          roughness: 0.8,
          metalness: 0.02,
        });
      } else {
        const score = Math.max(...muscles.map((m) => scores[m] ?? 0));
        mesh.material = makeMaterial(score);
      }
      if (Array.isArray(old)) old.forEach((m) => m.dispose());
      else old?.dispose();
    }
  }

  const loader = new GLTFLoader();
  loader.load(
    options.modelUrl,
    (gltf) => {
      const model = gltf.scene;
      model.position.set(0, -0.7, 0);
      model.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const mesh = node as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          meshes.push(mesh);
        }
      });
      scene.add(model);
      applyScores(pendingScores ?? {});
    },
    undefined,
    (err) => {
      // eslint-disable-next-line no-console
      console.error('[viewer3d] failed to load model', err);
    },
  );

  let raf = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, camera);
  };
  tick();

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  ro?.observe(container);

  return {
    setScores(scores) {
      if (meshes.length === 0) pendingScores = scores;
      else applyScores(scores);
    },
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      controls.dispose();
      scene.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          const mat = mesh.material as THREE.Material | THREE.Material[];
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}

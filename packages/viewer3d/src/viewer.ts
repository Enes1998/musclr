// Framework-agnostic three.js muscle-heatmap viewer — the ONE 3D implementation reused by the
// Next.js web app (imported directly) and the Expo mobile app (bundled into a react-native-webview).
// No React, no DOM framework — just a canvas-mounting factory with a tiny imperative API.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { scoreToColor, type MuscleId } from '@musclr/core';
import { musclesForMesh, type MeshMuscleMap } from './meshMap';

export interface MuscleViewerOptions {
  modelUrl: string;
  /** Optional override map (name → groups). Defaults to taxonomy-driven resolution + legacy fallback. */
  meshMap?: MeshMuscleMap;
  autoRotate?: boolean;
  background?: number | null; // null = transparent
  /**
   * Render only when something changes (model load, score update, user interaction, resize) instead
   * of a continuous RAF loop. Saves battery/GPU for a mostly-static heatmap — recommended in the
   * mobile WebView. Forces autoRotate off (continuous rotation needs a loop). Default: false (web).
   */
  renderOnDemand?: boolean;
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
  const meshMap = options.meshMap;
  const renderOnDemand = options.renderOnDemand ?? false;
  const autoRotate = renderOnDemand ? false : (options.autoRotate ?? true);

  const scene = new THREE.Scene();
  if (options.background != null) scene.background = new THREE.Color(options.background);

  const width = container.clientWidth || 1;
  const height = container.clientHeight || 1;

  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.set(0, 0, 3.6);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: options.background == null,
    powerPreference: 'low-power',
  });
  // Cap DPR — 2 is plenty and keeps the WebView lighter on dense mobile screens.
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
  controls.enableDamping = !renderOnDemand; // damping needs a continuous loop to settle
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = 1.2;

  const meshes: THREE.Mesh[] = [];
  let pendingScores: Partial<Record<MuscleId, number>> | null = null;
  let lastScores: Partial<Record<MuscleId, number>> = {};
  let contextLost = false;

  function renderOnce(): void {
    if (contextLost) return;
    renderer.render(scene, camera);
  }

  function applyScores(scores: Partial<Record<MuscleId, number>>): void {
    lastScores = scores;
    for (const mesh of meshes) {
      const muscles = musclesForMesh(mesh.name, meshMap);
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
    if (renderOnDemand) renderOnce();
  }

  // Recenter the model to the origin and frame the camera from its bounding sphere, so any model
  // (10-region legacy or segmented anatomy) is correctly framed without magic offsets.
  function frameModel(model: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center); // recenter to origin
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const r = sphere.radius || 1;
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (r / Math.sin(fov / 2)) * 1.08; // small margin
    camera.position.set(0, 0, dist);
    camera.near = Math.max(0.01, dist - r * 2);
    camera.far = dist + r * 2;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.update();
  }

  const loader = new GLTFLoader();
  loader.load(
    options.modelUrl,
    (gltf) => {
      const model = gltf.scene;
      model.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const mesh = node as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          meshes.push(mesh);
        }
      });
      scene.add(model);
      frameModel(model);
      applyScores(pendingScores ?? {});
      if (renderOnDemand) renderOnce();
    },
    undefined,
    (err) => {
      // eslint-disable-next-line no-console
      console.error('[viewer3d] failed to load model', err);
    },
  );

  // --- Render loop (continuous) or on-demand rendering ---
  let raf = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (contextLost) return;
    controls.update();
    renderer.render(scene, camera);
  };
  if (!renderOnDemand) {
    tick();
  } else {
    controls.addEventListener('change', renderOnce);
  }

  // --- WebGL context loss/restore (iOS WKWebView drops the GL context on backgrounding) ---
  const canvas = renderer.domElement;
  const onContextLost = (e: Event) => {
    e.preventDefault();
    contextLost = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const onContextRestored = () => {
    contextLost = false;
    // three rebuilds GL programs lazily on the next render; reapply current scores + resume.
    applyScores(lastScores);
    if (!renderOnDemand) tick();
    else renderOnce();
  };
  canvas.addEventListener('webglcontextlost', onContextLost, false);
  canvas.addEventListener('webglcontextrestored', onContextRestored, false);

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (renderOnDemand) renderOnce();
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
      if (raf) cancelAnimationFrame(raf);
      ro?.disconnect();
      controls.removeEventListener('change', renderOnce);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
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

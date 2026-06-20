// Procedurally generate the segmented anatomical muscle model (GLB) for the 3D heatmap.
//
// Each of the ~40 leaf muscles in @musclr/core's taxonomy (`MUSCLE_LEAVES`) becomes one or two
// (left/right) separately-named meshes so the heatmap can recolor individual heads (e.g. anterior
// vs. lateral vs. posterior deltoid; the three triceps heads; the four quadriceps). Mesh names
// follow the `m_<leafId>` convention (`_l`/`_r` suffix for paired muscles) that `leafForMeshId`
// in @musclr/core resolves. The figure is a stylized anatomical mannequin (ellipsoid muscle
// volumes in anatomical positions) — license-free, fully regenerable, and the documented "swap
// point": a photoreal Blender/medical GLB can replace it later with zero code change, as long as
// it keeps the same `m_<leafId>` node names.
//
// Run:  node scripts/build-muscle-model.mjs
// Out:  packages/viewer3d/model/model.glb       (canonical asset, inlined into the mobile viewer)
//       packages/viewer3d/model/model.manifest.json  (mesh inventory; CI drift guard)
//       apps/web/public/model.glb               (served by Next.js at /model.glb)
//
// Drift guard: scripts assert the layout covers exactly EXPECTED_LEAF_IDS (below); the vitest test
// packages/viewer3d/src/meshMap.test.ts ties EXPECTED_LEAF_IDS ↔ core's MUSCLE_LEAVES so a taxonomy
// change that isn't reflected here fails CI.

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// --- FileReader polyfill: GLTFExporter uses it for binary GLB output (absent in Node) ---
class FileReaderPolyfill {
  constructor() { this._cbs = {}; this.result = null; }
  addEventListener(ev, cb) { this._cbs[ev] = cb; }
  _fire(name) { const e = { target: this }; this[`on${name}`]?.(e); this._cbs[name]?.(e); }
  readAsArrayBuffer(blob) {
    Promise.resolve(blob.arrayBuffer()).then((ab) => { this.result = ab; this._fire('load'); this._fire('loadend'); });
  }
  readAsDataURL(blob) {
    Promise.resolve(blob.arrayBuffer()).then((ab) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(ab).toString('base64')}`;
      this._fire('load'); this._fire('loadend');
    });
  }
}
globalThis.FileReader ??= FileReaderPolyfill;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// The 42 leaf ids — must stay in lockstep with @musclr/core MUSCLE_LEAVES (guarded by the vitest test).
const EXPECTED_LEAF_IDS = [
  'pectoralis_major_clavicular', 'pectoralis_major_sternal', 'pectoralis_minor', 'serratus_anterior',
  'deltoid_anterior', 'deltoid_lateral', 'deltoid_posterior', 'rotator_cuff',
  'latissimus_dorsi', 'trapezius_upper', 'trapezius_middle', 'trapezius_lower', 'rhomboids', 'teres_major', 'erector_spinae',
  'biceps_brachii', 'brachialis', 'brachioradialis', 'triceps_long', 'triceps_lateral', 'triceps_medial', 'forearm_flexors', 'forearm_extensors',
  'rectus_abdominis', 'oblique_external', 'oblique_internal', 'transverse_abdominis',
  'gluteus_maximus', 'gluteus_medius', 'gluteus_minimus', 'hip_adductors', 'hip_flexors',
  'rectus_femoris', 'vastus_lateralis', 'vastus_medialis', 'vastus_intermedius',
  'biceps_femoris', 'semitendinosus', 'semimembranosus',
  'gastrocnemius', 'soleus', 'tibialis_anterior',
];

// Anatomical layout. pos = [x, y, z] (x≥0; for 'pair' it's the offset magnitude, mirrored to _l/_r).
// size = [rx, ry, rz] ellipsoid radii. side: 'pair' → two meshes; 'mid' → one mesh at x=pos.x.
// Frame: figure faces +Z (front toward camera). y up. ~1.7 units tall, centred near origin.
const M = [
  // Chest (front, z+)
  { id: 'pectoralis_major_clavicular', side: 'pair', pos: [0.085, 0.46, 0.10], size: [0.075, 0.045, 0.055] },
  { id: 'pectoralis_major_sternal', side: 'pair', pos: [0.09, 0.37, 0.11], size: [0.085, 0.07, 0.06] },
  { id: 'pectoralis_minor', side: 'pair', pos: [0.08, 0.40, 0.065], size: [0.05, 0.05, 0.035] },
  { id: 'serratus_anterior', side: 'pair', pos: [0.155, 0.33, 0.05], size: [0.035, 0.08, 0.06] },
  // Shoulders
  { id: 'deltoid_anterior', side: 'pair', pos: [0.185, 0.48, 0.06], size: [0.055, 0.06, 0.05] },
  { id: 'deltoid_lateral', side: 'pair', pos: [0.225, 0.49, 0.0], size: [0.055, 0.075, 0.07] },
  { id: 'deltoid_posterior', side: 'pair', pos: [0.185, 0.48, -0.07], size: [0.055, 0.06, 0.05] },
  { id: 'rotator_cuff', side: 'pair', pos: [0.17, 0.52, -0.02], size: [0.04, 0.04, 0.04] },
  // Back (z-)
  { id: 'latissimus_dorsi', side: 'pair', pos: [0.125, 0.30, -0.09], size: [0.075, 0.13, 0.05] },
  { id: 'trapezius_upper', side: 'pair', pos: [0.07, 0.55, -0.05], size: [0.06, 0.06, 0.05] },
  { id: 'trapezius_middle', side: 'pair', pos: [0.085, 0.42, -0.095], size: [0.07, 0.06, 0.04] },
  { id: 'trapezius_lower', side: 'pair', pos: [0.06, 0.33, -0.095], size: [0.05, 0.07, 0.04] },
  { id: 'rhomboids', side: 'pair', pos: [0.075, 0.40, -0.085], size: [0.05, 0.06, 0.035] },
  { id: 'teres_major', side: 'pair', pos: [0.14, 0.40, -0.075], size: [0.04, 0.045, 0.04] },
  { id: 'erector_spinae', side: 'pair', pos: [0.04, 0.26, -0.10], size: [0.035, 0.20, 0.05] },
  // Arms — upper + forearm (hanging at sides)
  { id: 'biceps_brachii', side: 'pair', pos: [0.235, 0.35, 0.05], size: [0.045, 0.10, 0.045] },
  { id: 'brachialis', side: 'pair', pos: [0.235, 0.26, 0.04], size: [0.035, 0.06, 0.035] },
  { id: 'brachioradialis', side: 'pair', pos: [0.25, 0.17, 0.035], size: [0.035, 0.07, 0.035] },
  { id: 'triceps_long', side: 'pair', pos: [0.24, 0.36, -0.05], size: [0.04, 0.10, 0.04] },
  { id: 'triceps_lateral', side: 'pair', pos: [0.265, 0.34, -0.02], size: [0.035, 0.08, 0.04] },
  { id: 'triceps_medial', side: 'pair', pos: [0.23, 0.28, -0.05], size: [0.03, 0.06, 0.035] },
  { id: 'forearm_flexors', side: 'pair', pos: [0.245, 0.08, 0.04], size: [0.035, 0.09, 0.04] },
  { id: 'forearm_extensors', side: 'pair', pos: [0.255, 0.08, -0.03], size: [0.035, 0.09, 0.04] },
  // Core (front)
  { id: 'rectus_abdominis', side: 'mid', pos: [0, 0.20, 0.10], size: [0.07, 0.13, 0.05] },
  { id: 'oblique_external', side: 'pair', pos: [0.115, 0.18, 0.07], size: [0.04, 0.09, 0.05] },
  { id: 'oblique_internal', side: 'pair', pos: [0.105, 0.155, 0.05], size: [0.035, 0.06, 0.04] },
  { id: 'transverse_abdominis', side: 'mid', pos: [0, 0.16, 0.04], size: [0.08, 0.06, 0.03] },
  // Hips / glutes (back)
  { id: 'gluteus_maximus', side: 'pair', pos: [0.10, -0.02, -0.10], size: [0.085, 0.085, 0.07] },
  { id: 'gluteus_medius', side: 'pair', pos: [0.13, 0.07, -0.05], size: [0.05, 0.06, 0.05] },
  { id: 'gluteus_minimus', side: 'pair', pos: [0.12, 0.05, -0.04], size: [0.035, 0.04, 0.035] },
  { id: 'hip_adductors', side: 'pair', pos: [0.05, -0.12, 0.02], size: [0.04, 0.12, 0.06] },
  { id: 'hip_flexors', side: 'pair', pos: [0.07, 0.03, 0.07], size: [0.035, 0.06, 0.04] },
  // Thighs — quadriceps (front)
  { id: 'rectus_femoris', side: 'pair', pos: [0.09, -0.18, 0.085], size: [0.05, 0.15, 0.05] },
  { id: 'vastus_lateralis', side: 'pair', pos: [0.135, -0.20, 0.04], size: [0.045, 0.14, 0.05] },
  { id: 'vastus_medialis', side: 'pair', pos: [0.06, -0.30, 0.06], size: [0.045, 0.09, 0.05] },
  { id: 'vastus_intermedius', side: 'pair', pos: [0.095, -0.20, 0.03], size: [0.035, 0.12, 0.04] },
  // Thighs — hamstrings (back)
  { id: 'biceps_femoris', side: 'pair', pos: [0.12, -0.20, -0.07], size: [0.045, 0.14, 0.05] },
  { id: 'semitendinosus', side: 'pair', pos: [0.06, -0.22, -0.075], size: [0.035, 0.13, 0.045] },
  { id: 'semimembranosus', side: 'pair', pos: [0.085, -0.26, -0.065], size: [0.035, 0.10, 0.045] },
  // Lower leg
  { id: 'gastrocnemius', side: 'pair', pos: [0.09, -0.52, -0.06], size: [0.05, 0.10, 0.05] },
  { id: 'soleus', side: 'pair', pos: [0.09, -0.63, -0.045], size: [0.04, 0.08, 0.045] },
  { id: 'tibialis_anterior', side: 'pair', pos: [0.075, -0.55, 0.06], size: [0.035, 0.10, 0.04] },
];

// Inert context meshes (no `m_` prefix → grey/inert in the viewer) for body orientation.
const INERT = [
  { name: 'head', pos: [0, 0.80, 0.0], size: [0.11, 0.13, 0.115] },
  { name: 'neck', pos: [0, 0.64, 0.0], size: [0.05, 0.06, 0.05] },
  { name: 'hand_l', pos: [-0.255, -0.03, 0.03], size: [0.04, 0.06, 0.025] },
  { name: 'hand_r', pos: [0.255, -0.03, 0.03], size: [0.04, 0.06, 0.025] },
  { name: 'foot_l', pos: [-0.09, -0.78, 0.05], size: [0.045, 0.035, 0.10] },
  { name: 'foot_r', pos: [0.09, -0.78, 0.05], size: [0.045, 0.035, 0.10] },
];

function makeMesh(name, pos, size, material) {
  // Unit sphere scaled into an ellipsoid; modest segments keep the model light (offline WebView).
  const geo = new THREE.SphereGeometry(1, 16, 10);
  geo.scale(size[0], size[1], size[2]);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.position.set(pos[0], pos[1], pos[2]);
  return mesh;
}

function build() {
  // Validate layout covers exactly the expected leaves (no typos / omissions / dupes).
  const layoutIds = M.map((m) => m.id);
  const expected = new Set(EXPECTED_LEAF_IDS);
  const seen = new Set();
  for (const id of layoutIds) {
    if (!expected.has(id)) throw new Error(`Layout has unknown leaf id: ${id}`);
    if (seen.has(id)) throw new Error(`Layout has duplicate leaf id: ${id}`);
    seen.add(id);
  }
  const missing = EXPECTED_LEAF_IDS.filter((id) => !seen.has(id));
  if (missing.length) throw new Error(`Layout is missing leaves: ${missing.join(', ')}`);

  const scene = new THREE.Scene();
  scene.name = 'musclr_anatomy';
  const muscleMat = new THREE.MeshStandardMaterial({ color: 0x8a8f99, roughness: 0.6, metalness: 0.05 });
  const inertMat = new THREE.MeshStandardMaterial({ color: 0x33343c, roughness: 0.85, metalness: 0.02 });

  const meshNames = [];
  for (const m of M) {
    if (m.side === 'mid') {
      const mesh = makeMesh(`m_${m.id}`, m.pos, m.size, muscleMat);
      scene.add(mesh); meshNames.push(mesh.name);
    } else {
      const r = makeMesh(`m_${m.id}_r`, m.pos, m.size, muscleMat);
      const l = makeMesh(`m_${m.id}_l`, [-m.pos[0], m.pos[1], m.pos[2]], m.size, muscleMat);
      scene.add(r, l); meshNames.push(r.name, l.name);
    }
  }
  for (const inert of INERT) {
    const mesh = makeMesh(inert.name, inert.pos, inert.size, inertMat);
    scene.add(mesh); meshNames.push(mesh.name);
  }

  return { scene, meshNames };
}

function exportGlb(scene) {
  return new Promise((res, rej) => {
    new GLTFExporter().parse(
      scene,
      (result) => res(Buffer.from(result)),
      (err) => rej(err),
      { binary: true, onlyVisible: true },
    );
  });
}

const { scene, meshNames } = build();
const glb = await exportGlb(scene);

const viewerModelDir = resolve(ROOT, 'packages/viewer3d/model');
const webPublic = resolve(ROOT, 'apps/web/public');
mkdirSync(viewerModelDir, { recursive: true });
mkdirSync(webPublic, { recursive: true });

const manifest = {
  generatedBy: 'scripts/build-muscle-model.mjs',
  format: 'glb',
  leafCount: EXPECTED_LEAF_IDS.length,
  meshCount: meshNames.length,
  muscleMeshes: meshNames.filter((n) => n.startsWith('m_')).sort(),
  inertMeshes: meshNames.filter((n) => !n.startsWith('m_')).sort(),
  leafIds: [...EXPECTED_LEAF_IDS].sort(),
};

writeFileSync(resolve(viewerModelDir, 'model.glb'), glb);
writeFileSync(resolve(viewerModelDir, 'model.manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(resolve(webPublic, 'model.glb'), glb);

console.log(`✓ Generated segmented model: ${meshNames.length} meshes (${manifest.muscleMeshes.length} muscle, ${manifest.inertMeshes.length} inert) for ${EXPECTED_LEAF_IDS.length} leaves`);
console.log(`  ${(glb.length / 1024).toFixed(0)} KB → packages/viewer3d/model/model.glb + apps/web/public/model.glb`);

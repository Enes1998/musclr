// Bundle the framework-agnostic three.js viewer (packages/viewer3d/src/embed/main.ts) + the
// segmented GLB (inlined as a base64 data URL) into ONE self-contained, fully-offline viewer.html,
// written to apps/mobile/assets/viewer.html. The mobile MuscleHeatmap loads this in a WebView, so
// iOS + Android render the EXACT same three.js heatmap as the web app — no native GL dependency.
//
// Run:  node scripts/build-mobile-viewer.mjs   (after scripts/build-muscle-model.mjs)

import * as esbuild from 'esbuild';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENTRY = resolve(ROOT, 'packages/viewer3d/src/embed/main.ts');
const OUT = resolve(ROOT, 'apps/mobile/assets/viewer.html');

const result = await esbuild.build({
  entryPoints: [ENTRY],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  // Modern device WebViews only (iOS 16.4+ / current Android Chrome) — three.js 0.184 uses syntax
  // that can't be downleveled below ES2020.
  target: ['es2020', 'safari16', 'chrome90'],
  minify: true,
  write: false,
  legalComments: 'none',
  loader: { '.glb': 'dataurl' }, // inline the model as a base64 data URL → fully offline
});

const js = result.outputFiles[0].text;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<title>musclr heatmap</title>
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: transparent; overflow: hidden; }
  #app { position: fixed; inset: 0; width: 100vw; height: 100vh; touch-action: none; }
</style>
</head>
<body>
<div id="app"></div>
<script>${js}</script>
</body>
</html>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);

const kb = (statSync(OUT).size / 1024).toFixed(0);
console.log(`✓ Built single-file mobile viewer → apps/mobile/assets/viewer.html (${kb} KB, three.js + GLB inlined)`);

// Entry point for the mobile WebView 3D heatmap. esbuild bundles this (three.js + viewer + the GLB
// inlined as a base64 data URL) into ONE offline viewer.html consumed by apps/mobile. Same renderer
// as the web app — the WebView just hosts it. Bridge: RN calls `window.__viewer.setScores(...)` via
// injectJavaScript; this page posts `{type:'ready'}` back through `window.ReactNativeWebView`.

import type { MuscleId } from '@musclr/core';
import { createMuscleViewer, type MuscleViewerHandle } from '../viewer';
import glbDataUrl from '../../model/model.glb';

declare global {
  interface Window {
    __viewer?: { setScores(scores: Partial<Record<MuscleId, number>>): void };
    ReactNativeWebView?: { postMessage(data: string): void };
  }
}

function mount(): void {
  const container = document.getElementById('app');
  if (!container) return;

  const viewer: MuscleViewerHandle = createMuscleViewer(container, {
    modelUrl: glbDataUrl,
    background: null,
    renderOnDemand: true, // static heatmap — render only on score/interaction changes (battery-friendly)
  });

  // createMuscleViewer already buffers scores until the model loads, so we just forward.
  window.__viewer = {
    setScores(scores) {
      try {
        viewer.setScores(scores);
      } catch {
        /* ignore malformed payloads */
      }
    },
  };

  // Tell React Native we're ready to receive scores.
  const postReady = () => window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'ready' }));
  postReady();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}

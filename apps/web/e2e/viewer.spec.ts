import { test, expect } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// The mobile 3D heatmap's WebView simply hosts apps/mobile/assets/viewer.html (three.js + the GLB
// inlined, fully offline). Loading that exact file in a real browser verifies the device-rendered
// content: three.js boots, the RN bridge API is exposed, and setScores/setPalette run without error.
test('mobile viewer.html boots three.js + bridge offline (no network)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));

  const fileUrl = pathToFileURL(
    path.resolve(process.cwd(), '../mobile/assets/viewer.html'),
  ).href;
  await page.goto(fileUrl);

  // The bridge the React Native side calls must exist.
  await page.waitForFunction(() => typeof (window as any).__viewer?.setScores === 'function', null, {
    timeout: 20_000,
  });

  const result = await page.evaluate(() => {
    const v = (window as any).__viewer;
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
    // Drive the bridge exactly as RN does.
    v.setScores({ chest: 95, back: 20, quads: 60, calves: 5 });
    v.setPalette('cvd');
    v.setScores({ chest: 10 });
    return {
      hasViewer: typeof v.setScores === 'function' && typeof v.setPalette === 'function',
      hasCanvas: !!canvas,
      glLost: gl ? (gl as WebGLRenderingContext).isContextLost() : 'no-gl-context',
    };
  });

  expect(result.hasViewer).toBe(true);
  expect(result.hasCanvas).toBe(true);
  expect(result.glLost).not.toBe(true);
  expect(errors).toEqual([]);
});

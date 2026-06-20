// Heatmap color palettes. The default green→yellow→red scale (scoring.scoreToColor, FROZEN) is the
// product's signature, but color-only encoding fails WCAG 2.2 for red-green color-vision deficiency
// (~8% of men). This adds a CVD-safe blue→grey→orange diverging scale (Okabe–Ito-inspired) that
// stays distinguishable for deuteranopia/protanopia, selectable in Settings and threaded into the
// 3D viewer + the load bars + the text alternative. scoring.scoreToColor is untouched.

import { scoreToColor } from './scoring';

export type LoadPalette = 'default' | 'cvd';

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}
function hex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => clamp(x, 0, 255).toString(16).padStart(2, '0')).join('');
}

// CVD-safe diverging scale: blue (undertrained) → light grey (balanced) → orange (overtrained).
const CVD_LOW = [5, 113, 176]; // #0571b0
const CVD_MID = [222, 222, 222]; // #dedede
const CVD_HIGH = [230, 97, 1]; // #e66101

function cvdColor(score: number): string {
  const s = clamp(score, 0, 100);
  if (s < 50) {
    const t = s / 50;
    return hex(lerp(CVD_LOW[0], CVD_MID[0], t), lerp(CVD_LOW[1], CVD_MID[1], t), lerp(CVD_LOW[2], CVD_MID[2], t));
  }
  const t = (s - 50) / 50;
  return hex(lerp(CVD_MID[0], CVD_HIGH[0], t), lerp(CVD_MID[1], CVD_HIGH[1], t), lerp(CVD_MID[2], CVD_HIGH[2], t));
}

/** Color for a 0–100 load score under the chosen palette. `default` delegates to the frozen scale. */
export function loadColor(score: number, palette: LoadPalette = 'default'): string {
  return palette === 'cvd' ? cvdColor(score) : scoreToColor(score);
}

/** Short legend pairs (label → color) for a palette, for the heatmap caption / text alternative. */
export function paletteLegend(palette: LoadPalette = 'default'): { label: string; color: string }[] {
  return [
    { label: 'Undertrained', color: loadColor(10, palette) },
    { label: 'Balanced', color: loadColor(50, palette) },
    { label: 'Overtrained', color: loadColor(90, palette) },
  ];
}

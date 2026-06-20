import { describe, expect, it } from 'vitest';
import { loadColor, paletteLegend } from './palette';
import { scoreToColor } from './scoring';

describe('load palettes', () => {
  it('default palette delegates to the frozen scoreToColor', () => {
    for (const s of [0, 25, 50, 75, 100]) {
      expect(loadColor(s, 'default')).toBe(scoreToColor(s));
    }
  });

  it('cvd palette produces valid, distinct colors that differ from default', () => {
    const lo = loadColor(10, 'cvd');
    const mid = loadColor(50, 'cvd');
    const hi = loadColor(90, 'cvd');
    for (const c of [lo, mid, hi]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    expect(lo).not.toBe(hi);
    // CVD scale is blue→orange, materially different from the green→red default at the extremes.
    expect(lo).not.toBe(loadColor(10, 'default'));
    expect(hi).not.toBe(loadColor(90, 'default'));
  });

  it('legend has three labeled stops', () => {
    expect(paletteLegend('cvd').map((l) => l.label)).toEqual(['Undertrained', 'Balanced', 'Overtrained']);
  });
});

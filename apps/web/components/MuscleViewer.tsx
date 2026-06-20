'use client';

import { useEffect, useRef } from 'react';
import type { MuscleId } from '@musclr/core';
import type { MuscleViewerHandle } from '@musclr/viewer3d';
import { useSettingsStore } from '../lib/settingsStore';

export function MuscleViewer({ scores }: { scores: Partial<Record<MuscleId, number>> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<MuscleViewerHandle | null>(null);
  const palette = useSettingsStore((s) => s.palette);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const paletteRef = useRef(palette);
  paletteRef.current = palette;

  // Create the three.js viewer once, on the client only (dynamic import avoids any SSR/WebGL eval).
  // Recreate when reduced-motion changes (it toggles the autorotate loop at construction).
  useEffect(() => {
    let disposed = false;
    void (async () => {
      const { createMuscleViewer } = await import('@musclr/viewer3d');
      if (disposed || !containerRef.current) return;
      handleRef.current = createMuscleViewer(containerRef.current, {
        modelUrl: '/model.glb',
        background: null,
        autoRotate: !reducedMotion,
        palette: paletteRef.current,
      });
      handleRef.current.setScores(scoresRef.current);
    })();
    return () => {
      disposed = true;
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [reducedMotion]);

  const scoresRef = useRef(scores);
  scoresRef.current = scores;
  useEffect(() => {
    handleRef.current?.setScores(scores);
  }, [scores]);

  useEffect(() => {
    handleRef.current?.setPalette(palette);
  }, [palette]);

  return (
    <div
      ref={containerRef}
      className="h-[440px] w-full overflow-hidden rounded-xl border border-line bg-bg-2"
      role="img"
      aria-label="3D muscle heatmap. A text equivalent of every muscle's training load is in the Muscle load list below."
    />
  );
}

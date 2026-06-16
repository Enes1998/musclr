'use client';

import { useEffect, useRef } from 'react';
import type { MuscleId } from '@musclr/core';
import type { MuscleViewerHandle } from '@musclr/viewer3d';

export function MuscleViewer({ scores }: { scores: Partial<Record<MuscleId, number>> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<MuscleViewerHandle | null>(null);

  // Create the three.js viewer once, on the client only (dynamic import avoids any SSR/WebGL eval).
  useEffect(() => {
    let disposed = false;
    void (async () => {
      const { createMuscleViewer } = await import('@musclr/viewer3d');
      if (disposed || !containerRef.current) return;
      handleRef.current = createMuscleViewer(containerRef.current, {
        modelUrl: '/model.glb',
        background: null,
      });
      handleRef.current.setScores(scoresRef.current);
    })();
    return () => {
      disposed = true;
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, []);

  // Keep latest scores in a ref so the create-effect can read them, and push updates live.
  const scoresRef = useRef(scores);
  scoresRef.current = scores;
  useEffect(() => {
    handleRef.current?.setScores(scores);
  }, [scores]);

  return (
    <div
      ref={containerRef}
      className="h-[440px] w-full overflow-hidden rounded-xl border border-line bg-bg-2"
      aria-label="3D muscle heatmap"
    />
  );
}

import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import BodyModel from './BodyModel';
import { Body3DErrorBoundary } from './Body3DErrorBoundary';
import type { MuscleId } from '../../lib/exercises';

function Rig({
  view,
  autoRotate,
  loads,
}: {
  view: 'front' | 'back';
  autoRotate: boolean;
  loads: Record<string, number>;
}) {
  const root = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!root.current) return;
    const targetY = view === 'back' ? Math.PI : 0;
    const spin = autoRotate ? state.clock.getElapsedTime() * 0.3 : 0;
    const currentY = root.current.rotation.y;
    root.current.rotation.y += (targetY + spin - currentY) * 0.08;
  });

  return (
    <group ref={root} position={[0, -0.2, 0]}>
      <BodyModel loads={loads} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.75, 0]}>
        <circleGeometry args={[1.0, 32]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function Body3DInner({ loads }: { loads?: Record<MuscleId, number> }) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [autoRotate, setAutoRotate] = useState(true);
  const { active: loading } = useProgress();

  return (
    <div
      className="body3d-wrap"
      role="region"
      aria-labelledby="body3d-title"
      aria-describedby="body3d-desc"
    >
      <span id="body3d-title" className="sr-only">Muscle heatmap</span>
      <span id="body3d-desc" className="sr-only">
        Interactive 3D body model showing weekly muscle load scores. Green
        indicates undertrained muscles, yellow balanced, red overtrained. Use
        Front and Back buttons to change view, or drag to rotate.
      </span>

      {loading && (
        <div className="body3d-loading" aria-live="polite" aria-label="3D viewer loading">
          <div className="body3d-skel" aria-hidden="true" />
          <span className="body3d-loading-txt mono dim">3D viewer loading…</span>
        </div>
      )}

      <div
        className="body3d-canvas"
        aria-hidden="true"
        style={{ opacity: loading ? 0 : 1, transition: 'opacity 0.4s' }}
      >
        <Canvas camera={{ position: [0, 0.0, 3.6], fov: 35 }}>
          <fog attach="fog" args={[0x0a0a0c, 10, 22]} />
          <ambientLight intensity={0.35} />
          <directionalLight position={[2, 3, 4]} intensity={1.1} />
          <directionalLight position={[-3, 1, -4]} intensity={0.4} color={0x5eead4} />
          <pointLight position={[0, -2, 3]} intensity={0.2} color={0xffc107} distance={12} />

          <Suspense fallback={null}>
            <Rig view={view} autoRotate={autoRotate} loads={loads ?? {}} />
          </Suspense>

          <OrbitControls enableZoom={false} enablePan={false} enableDamping={true} />
        </Canvas>
      </div>

      <div className="body3d-controls" role="group" aria-label="3D view controls">
        <div className="seg" role="group" aria-label="View angle">
          <button
            className={view === 'front' ? 'on' : ''}
            onClick={() => setView('front')}
            aria-pressed={view === 'front'}
          >Front</button>
          <button
            className={view === 'back' ? 'on' : ''}
            onClick={() => setView('back')}
            aria-pressed={view === 'back'}
          >Back</button>
        </div>
        <button
          className={`pill ${autoRotate ? 'on' : ''}`}
          onClick={() => setAutoRotate(!autoRotate)}
          aria-pressed={autoRotate}
          aria-label={autoRotate ? 'Auto-rotate on' : 'Auto-rotate off'}
        >
          <span className="dot" aria-hidden="true" /> {autoRotate ? 'Auto-rotate' : 'Locked'}
        </button>
      </div>

      <div className="body3d-legend">
        <div className="legend-row">
          <span className="legend-label">Load</span>
          <div className="legend-bar" />
          <div className="legend-ticks">
            <span>0</span><span>50</span><span>100</span>
          </div>
        </div>
        <div className="legend-tags">
          <span><i style={{ background: '#4caf50' }} />Undertrained</span>
          <span><i style={{ background: '#ffc107' }} />Balanced</span>
          <span><i style={{ background: '#f44336' }} />Overtrained</span>
        </div>
      </div>
    </div>
  );
}

export default function Body3D(props: { loads?: Record<MuscleId, number> }) {
  return (
    <Body3DErrorBoundary>
      <Body3DInner {...props} />
    </Body3DErrorBoundary>
  );
}

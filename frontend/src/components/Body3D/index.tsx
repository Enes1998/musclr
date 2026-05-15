import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import BodyModel from './BodyModel';
import type { MuscleId } from '../../lib/exercises';

export default function Body3D({ loads }: { loads?: Record<MuscleId, number> }) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [autoRotate, setAutoRotate] = useState(true);

  // Auto-rotation logic
  const Rig = () => {
    const root = useRef<THREE.Group>(null);
    useFrame((state) => {
      if (!root.current) return;
      const targetY = view === 'back' ? Math.PI : 0;
      const spin = autoRotate ? state.clock.getElapsedTime() * 0.3 : 0;
      
      // We manually lerp the group rotation. 
      // OrbitControls handles manual drag, we rotate the group inside it for front/back/spin.
      const currentY = root.current.rotation.y;
      const desiredY = targetY + spin;
      
      root.current.rotation.y += (desiredY - currentY) * 0.08;
    });

    return (
      <group ref={root} position={[0, -0.2, 0]}>
        <BodyModel loads={loads || {}} />
        
        {/* Ground shadow disc */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
          <circleGeometry args={[1.2, 32]} />
          <meshBasicMaterial color={0x000000} transparent opacity={0.4} />
        </mesh>
      </group>
    );
  };

  return (
    <div className="body3d-wrap">
      <div className="body3d-canvas">
        <Canvas camera={{ position: [0, 0.2, 7], fov: 35 }}>
          <fog attach="fog" args={[0x0a0a0c, 8, 18]} />
          
          <ambientLight intensity={0.35} />
          <directionalLight position={[2, 3, 4]} intensity={1.1} />
          <directionalLight position={[-3, 1, -4]} intensity={0.4} color={0x5eead4} />
          <pointLight position={[0, -2, 3]} intensity={0.2} color={0xffc107} distance={12} />

          <Rig />
          
          <OrbitControls 
            enableZoom={false} 
            enablePan={false}
            enableDamping={true}
          />
        </Canvas>
      </div>

      <div className="body3d-controls">
        <div className="seg">
          <button className={view === 'front' ? 'on' : ''} onClick={() => setView('front')}>Front</button>
          <button className={view === 'back' ? 'on' : ''} onClick={() => setView('back')}>Back</button>
        </div>
        <button className={`pill ${autoRotate ? 'on' : ''}`} onClick={() => setAutoRotate(!autoRotate)}>
          <span className="dot" /> {autoRotate ? 'Auto-rotate' : 'Locked'}
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

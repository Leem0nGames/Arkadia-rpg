import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Entity, BattleAction } from '../../types';

interface TargetLockRing3DProps {
  targetEntity: Entity | null;
  activeEntity: Entity | null;
  surfaceY: number;
  selectedAction: BattleAction | null;
  isAutoSnapped?: boolean;
}

// Shared geometries across target lock instances to eliminate allocations
const SHARED_INNER_RING_GEO = new THREE.RingGeometry(0.62, 0.76, 24);
const SHARED_OUTER_RING_GEO = new THREE.RingGeometry(0.82, 0.94, 20);
const SHARED_SHOCKWAVE_RING_GEO = new THREE.RingGeometry(0.5, 0.8, 20);
const SHARED_CROSS_BAR_1 = new THREE.BoxGeometry(0.08, 0.22, 0.02);
const SHARED_CROSS_BAR_2 = new THREE.BoxGeometry(0.18, 0.08, 0.02);
const CROSSHAIR_ANGLES = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];

/**
 * Auto-Target Lock Ring 3D Component
 * 
 * Provides crisp visual feedback with a rotating 3D targeting reticle,
 * crosshair brackets, expanding lock rings, and a floating D&D distance badge
 * whenever an entity is snapped by the Auto-Target Radius helper.
 */
export const TargetLockRing3D: React.FC<TargetLockRing3DProps> = ({
  targetEntity,
  activeEntity,
  surfaceY,
  selectedAction,
  isAutoSnapped = false
}) => {
  const innerRingRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const crosshairGroupRef = useRef<THREE.Group>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);

  const isEnemy = targetEntity?.type === 'ENEMY';
  const isPlayerAlly = targetEntity?.type === 'PLAYER';

  // Color theme selection
  const primaryColor = isEnemy ? '#ef4444' : isPlayerAlly ? '#10b981' : '#38bdf8';
  const emissiveColor = isEnemy ? '#f87171' : isPlayerAlly ? '#34d399' : '#7dd3fc';

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();

    // 1. Inner Reticle Ring Spin (Clockwise)
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = elapsed * 1.8;
      const pulseScale = 1.0 + Math.sin(elapsed * 5.0) * 0.06;
      innerRingRef.current.scale.set(pulseScale, pulseScale, 1.0);
    }

    // 2. Outer Dashed Ring Spin (Counter-Clockwise)
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = -elapsed * 1.2;
      const pulseOpacity = 0.45 + Math.sin(elapsed * 4.0) * 0.2;
      (outerRingRef.current.material as THREE.MeshBasicMaterial).opacity = pulseOpacity;
    }

    // 3. Corner Crosshair Brackets Spin
    if (crosshairGroupRef.current) {
      crosshairGroupRef.current.rotation.z = elapsed * 0.9;
    }

    // 4. Shockwave Expansion
    if (shockwaveRef.current) {
      const wavePhase = (elapsed * 2.2) % 1.0;
      const waveScale = 0.7 + wavePhase * 0.6;
      shockwaveRef.current.scale.set(waveScale, waveScale, 1.0);
      (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1.0 - wavePhase) * 0.6);
    }
  });

  if (!targetEntity) return null;

  const x = targetEntity.position.x;
  const z = targetEntity.position.y;

  // Calculate distance from active unit
  let distanceTiles = 0;
  if (activeEntity && (activeEntity.position.x !== x || activeEntity.position.y !== z)) {
    const dx = activeEntity.position.x - x;
    const dz = activeEntity.position.y - z;
    distanceTiles = Math.round(Math.hypot(dx, dz));
  }

  const distanceFeet = distanceTiles * 5; // D&D 5E 5-foot grid scale

  let actionLabel = 'BLANCO FIJADO';
  if (selectedAction === BattleAction.ATTACK) actionLabel = 'OBJETIVO DE ATAQUE';
  else if (selectedAction === BattleAction.MAGIC) actionLabel = 'OBJETIVO MÁGICO';

  return (
    <group position={[x, surfaceY + 0.06, z]}>
      {/* Inner Rotating Target Lock Ring */}
      <mesh ref={innerRingRef} geometry={SHARED_INNER_RING_GEO} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial
          color={primaryColor}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Outer Rotating Dashed Ring */}
      <mesh ref={outerRingRef} geometry={SHARED_OUTER_RING_GEO} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial
          color={emissiveColor}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Pulsing Shockwave Wave */}
      <mesh ref={shockwaveRef} geometry={SHARED_SHOCKWAVE_RING_GEO} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial
          color={primaryColor}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 4 Crosshair Reticle Brackets */}
      <group ref={crosshairGroupRef} rotation={[-Math.PI / 2, 0, 0]}>
        {CROSSHAIR_ANGLES.map((angle, idx) => (
          <group key={idx} rotation={[0, 0, angle]}>
            <mesh geometry={SHARED_CROSS_BAR_1} position={[0, 0.85, 0]}>
              <meshBasicMaterial color={primaryColor} />
            </mesh>
            <mesh geometry={SHARED_CROSS_BAR_2} position={[0.08, 0.94, 0]}>
              <meshBasicMaterial color={primaryColor} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Floating 3D/HTML Target Lock Badge & Distance Indicator */}
      <Html position={[0, 2.2, 0]} center zIndexRange={[130, 90]}>
        <div className="pointer-events-none select-none flex flex-col items-center gap-1 animate-in zoom-in-75 duration-200">
          {/* Main Lock Badge */}
          <div
            className={`px-3 py-1 rounded-full border text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xl backdrop-blur-md ${
              isEnemy
                ? 'bg-red-950/90 text-red-200 border-red-500 shadow-red-900/60 animate-pulse'
                : isPlayerAlly
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500 shadow-emerald-900/60'
                : 'bg-sky-950/90 text-sky-200 border-sky-500 shadow-sky-900/60'
            }`}
          >
            <span className="text-sm">{isEnemy ? '🎯' : '❇️'}</span>
            <span>{actionLabel}</span>
            <span className="text-slate-300 font-sans font-extrabold border-l border-white/20 pl-1.5">
              {targetEntity.name}
            </span>
            {isAutoSnapped && (
              <span className="ml-1 text-[9px] bg-amber-500/90 text-slate-950 font-black px-1.5 py-0.2 rounded-full uppercase tracking-tighter">
                AUTO-SNAP
              </span>
            )}
          </div>

          {/* D&D Distance & Stats Meter */}
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-200 bg-slate-950/90 px-2.5 py-0.8 rounded-lg border border-slate-800 shadow-lg">
            <span>
              Distancia:{' '}
              <span className="text-amber-300 font-bold">{distanceFeet} pies</span> ({distanceTiles} casillas)
            </span>
            <span className="text-slate-600">|</span>
            <span>
              HP:{' '}
              <span
                className={`font-bold ${
                  targetEntity.stats.hp <= targetEntity.stats.maxHp * 0.3
                    ? 'text-red-400'
                    : 'text-emerald-400'
                }`}
              >
                {targetEntity.stats.hp}/{targetEntity.stats.maxHp}
              </span>
            </span>
            <span className="text-slate-600">|</span>
            <span>
              CA: <span className="text-sky-300 font-bold">{targetEntity.stats.ac}</span>
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
};

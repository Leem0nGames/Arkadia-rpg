import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Html } from '@react-three/drei';
import { BattleHazard, BattleHazardType, BattleCell } from '../../types';
import { gpuManager } from '../../services/GPUPerformanceManager';

interface HazardParticlesProps {
  hazards: BattleHazard[];
  mapData: BattleCell[];
  hoveredCoord?: { x: number; z: number } | null;
}

// Shared static geometries
const SHARED_HAZARD_RING_GEO = new THREE.RingGeometry(0.2, 0.46, 20);
const SHARED_HAZARD_CIRCLE_GEO = new THREE.CircleGeometry(0.22, 16);
const SHARED_SPIKE_CONE_GEO = new THREE.ConeGeometry(0.05, 0.28, 4);

const HAZARD_CONFIG: Record<BattleHazardType, {
  color: string;
  secondaryColor: string;
  lightColor: string;
  icon: string;
  badgeLabel: string;
  badgeBg: string;
  sparkleCount: number;
  sparkleSpeed: number;
  sparkleScale: [number, number, number];
}> = {
  [BattleHazardType.FIRE]: {
    color: '#ea580c',
    secondaryColor: '#facc15',
    lightColor: '#ff4400',
    icon: '🔥',
    badgeLabel: 'FIRE (1d6 DMG)',
    badgeBg: 'bg-orange-950/90 border-orange-500/80 text-orange-200',
    sparkleCount: 24,
    sparkleSpeed: 1.6,
    sparkleScale: [0.8, 1.4, 0.8]
  },
  [BattleHazardType.POISON_CLOUD]: {
    color: '#16a34a',
    secondaryColor: '#a3e635',
    lightColor: '#22c55e',
    icon: '☠',
    badgeLabel: 'POISON (DC 13 CON)',
    badgeBg: 'bg-emerald-950/90 border-emerald-500/80 text-emerald-200',
    sparkleCount: 18,
    sparkleSpeed: 0.6,
    sparkleScale: [0.9, 1.2, 0.9]
  },
  [BattleHazardType.ICE_SHEET]: {
    color: '#0284c7',
    secondaryColor: '#bae6fd',
    lightColor: '#38bdf8',
    icon: '❄',
    badgeLabel: 'ICE (SLIP DC 10)',
    badgeBg: 'bg-cyan-950/90 border-cyan-500/80 text-cyan-200',
    sparkleCount: 16,
    sparkleSpeed: 0.4,
    sparkleScale: [0.9, 0.5, 0.9]
  },
  [BattleHazardType.ELECTRIFIED]: {
    color: '#7c3aed',
    secondaryColor: '#38bdf8',
    lightColor: '#818cf8',
    icon: '⚡',
    badgeLabel: 'VOLTAGE (1d8 DMG)',
    badgeBg: 'bg-indigo-950/90 border-indigo-500/80 text-indigo-200',
    sparkleCount: 22,
    sparkleSpeed: 2.2,
    sparkleScale: [0.85, 1.0, 0.85]
  },
  [BattleHazardType.SPIKE_GROWTH]: {
    color: '#4d7c0f',
    secondaryColor: '#78350f',
    lightColor: '#84cc16',
    icon: '🌵',
    badgeLabel: 'THORNS (2d4 DMG)',
    badgeBg: 'bg-lime-950/90 border-lime-600/80 text-lime-200',
    sparkleCount: 12,
    sparkleSpeed: 0.5,
    sparkleScale: [0.8, 0.6, 0.8]
  },
  [BattleHazardType.HOLY_GROUND]: {
    color: '#eab308',
    secondaryColor: '#fef08a',
    lightColor: '#fde047',
    icon: '✨',
    badgeLabel: 'HOLY (+1d4 HP)',
    badgeBg: 'bg-amber-950/90 border-amber-400/80 text-amber-100',
    sparkleCount: 20,
    sparkleSpeed: 0.8,
    sparkleScale: [0.85, 1.5, 0.85]
  },
  [BattleHazardType.DIFFICULT_TERRAIN]: {
    color: '#854d0e',
    secondaryColor: '#ca8a04',
    lightColor: '#a16207',
    icon: '🐌',
    badgeLabel: 'DIFFICULT (2x COST)',
    badgeBg: 'bg-stone-950/90 border-stone-600/80 text-stone-300',
    sparkleCount: 8,
    sparkleSpeed: 0.3,
    sparkleScale: [0.8, 0.4, 0.8]
  }
};

/**
 * Animated individual 3D Hazard Cell
 */
const SingleHazardVisual: React.FC<{
  hazard: BattleHazard;
  surfaceY: number;
  isHovered: boolean;
  canLight: boolean;
}> = ({ hazard, surfaceY, isHovered, canLight }) => {
  const cfg = HAZARD_CONFIG[hazard.type] || HAZARD_CONFIG[BattleHazardType.DIFFICULT_TERRAIN];
  const ringMeshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ringMeshRef.current) {
      // Gentle pulse & rotation
      ringMeshRef.current.rotation.z = t * 0.4;
      const scale = 0.95 + Math.sin(t * 3 + hazard.x) * 0.05;
      ringMeshRef.current.scale.set(scale, scale, 1);
    }
    if (lightRef.current && canLight) {
      // Light flicker
      if (hazard.type === BattleHazardType.FIRE) {
        lightRef.current.intensity = 1.6 + Math.sin(t * 12 + hazard.x * 2) * 0.5;
      } else if (hazard.type === BattleHazardType.ELECTRIFIED) {
        lightRef.current.intensity = Math.random() > 0.85 ? 2.5 : 0.8;
      }
    }
  });

  return (
    <group position={[hazard.x, surfaceY, hazard.z]}>
      {/* 1. Glowing Ground Decal Disc */}
      <mesh
        ref={ringMeshRef}
        geometry={SHARED_HAZARD_RING_GEO}
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshBasicMaterial
          color={cfg.color}
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Inner Rune Core */}
      <mesh 
        geometry={SHARED_HAZARD_CIRCLE_GEO}
        position={[0, 0.025, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshBasicMaterial
          color={cfg.secondaryColor}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Physical Spike Geometry for Spike Growth / Briars */}
      {hazard.type === BattleHazardType.SPIKE_GROWTH && (
        <group position={[0, 0, 0]}>
          {[
            [-0.2, -0.2],
            [0.2, -0.15],
            [-0.1, 0.2],
            [0.22, 0.22],
            [0, 0]
          ].map(([ox, oz], idx) => (
            <mesh 
              key={idx} 
              geometry={SHARED_SPIKE_CONE_GEO}
              position={[ox, 0.15 + (idx % 2) * 0.08, oz]} 
              rotation={[0.2 * (idx - 2), 0, 0.2 * (idx - 1)]}
            >
              <meshStandardMaterial color="#4d7c0f" roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}

      {/* 4. Volumetric 3D Particle Sparkles */}
      <group position={[0, 0.35, 0]}>
        <Sparkles
          count={gpuManager.getClampedParticleCount(cfg.sparkleCount)}
          scale={cfg.sparkleScale}
          size={2.5}
          speed={cfg.sparkleSpeed}
          color={cfg.secondaryColor}
        />
      </group>

      {/* 5. Colored Ambient Hazard Point Light (Budgeted for Mobile) */}
      {canLight && (
        <pointLight
          ref={lightRef}
          color={cfg.lightColor}
          intensity={1.2}
          distance={2.5}
          decay={2}
          position={[0, 0.5, 0]}
        />
      )}

      {/* 6. Hover Badge Tooltip */}
      {isHovered && (
        <Html position={[0, 1.4, 0]} center zIndexRange={[200, 50]} className="pointer-events-none">
          <div className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold shadow-2xl border backdrop-blur-md whitespace-nowrap flex items-center gap-1.5 ${cfg.badgeBg}`}>
            <span>{cfg.icon}</span>
            <span>{cfg.badgeLabel}</span>
          </div>
        </Html>
      )}
    </group>
  );
};

export const HazardParticles: React.FC<HazardParticlesProps> = ({
  hazards,
  mapData,
  hoveredCoord
}) => {
  if (!hazards || hazards.length === 0 || !mapData) return null;

  return (
    <group name="battle-environmental-hazards">
      {hazards.map((hazard, index) => {
        const cell = mapData.find((c) => c.x === hazard.x && c.z === hazard.z);
        const surfaceY = cell ? (cell.offsetY || 0) + cell.height : 0.5;
        const isHovered = hoveredCoord?.x === hazard.x && hoveredCoord?.z === hazard.z;
        const canLight = isHovered || gpuManager.canRenderDynamicLight(index);

        return (
          <SingleHazardVisual
            key={hazard.id}
            hazard={hazard}
            surfaceY={surfaceY}
            isHovered={isHovered}
            canLight={canLight}
          />
        );
      })}
    </group>
  );
};

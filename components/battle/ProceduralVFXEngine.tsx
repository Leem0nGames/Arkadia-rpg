import React, { useRef, useMemo, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Billboard, QuadraticBezierLine, Trail } from '@react-three/drei';
import * as THREE from 'three';
import { Entity, SpellEffectData, BattleCell } from '../../types';
import { gpuManager } from '../../services/GPUPerformanceManager';

interface ParticleBurstProps {
  position: [number, number, number];
  color: string;
  type?: 'FIRE' | 'FROST' | 'ARCANE' | 'HOLY' | 'POISON' | 'LIGHTNING' | 'VOID' | 'GENERIC';
  onComplete?: () => void;
}

const _scratchPos = new THREE.Vector3();
const _scratchDummy = new THREE.Object3D();

/**
 * Procedural 3D Particle Burst for Spell Hits
 */
export const ProceduralParticleBurst: React.FC<ParticleBurstProps> = ({
  position,
  color,
  type = 'GENERIC',
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const particlesRef = useRef<THREE.InstancedMesh>(null);

  const rawParticleCount = 28;
  const particleCount = useMemo(() => gpuManager.getClampedParticleCount(rawParticleCount), [rawParticleCount]);

  // Pre-calculate randomized particle vectors
  const particlesData = useMemo(() => {
    const data = [];
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const speed = 2.0 + Math.random() * 3.5;
      data.push({
        velocity: new THREE.Vector3(
          Math.cos(theta) * Math.cos(phi) * speed,
          Math.sin(phi) * speed + (type === 'HOLY' || type === 'FIRE' ? 2.0 : 0.5),
          Math.sin(theta) * Math.cos(phi) * speed
        ),
        rotationSpeed: (Math.random() - 0.5) * 8,
        scale: 0.15 + Math.random() * 0.2,
      });
    }
    return data;
  }, [type, particleCount]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Animate shockwave ring
    if (ringRef.current) {
      const scale = 0.5 + (time % 1) * 4;
      ringRef.current.scale.set(scale, scale, 1);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = Math.max(0, 1 - (time % 1));
    }

    // Animate light flare decay
    if (lightRef.current) {
      lightRef.current.intensity = Math.max(0, 4 - (time % 1) * 4);
    }

    // Animate instanced particles without per-frame Vector3 allocations
    if (particlesRef.current) {
      const len = particlesData.length;
      for (let i = 0; i < len; i++) {
        const p = particlesData[i];
        const progress = (time * 1.5) % 1;
        _scratchPos.set(
          position[0] + p.velocity.x * progress * 0.5,
          position[1] + p.velocity.y * progress * 0.5,
          position[2] + p.velocity.z * progress * 0.5
        );

        _scratchDummy.position.copy(_scratchPos);
        const s = p.scale * (1 - progress);
        _scratchDummy.scale.set(s, s, s);
        _scratchDummy.rotation.set(progress * p.rotationSpeed, progress * p.rotationSpeed, 0);
        _scratchDummy.updateMatrix();

        particlesRef.current.setMatrixAt(i, _scratchDummy.matrix);
      }
      particlesRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Shockwave Floor Ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.3, 0.8, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* Dynamic Flashing Light */}
      <pointLight ref={lightRef} color={color} intensity={4} distance={8} decay={2} />

      {/* Instanced Geometry Particles */}
      <instancedMesh ref={particlesRef} args={[undefined, undefined, particleCount]}>
        {type === 'FROST' ? (
          <octahedronGeometry args={[0.2, 0]} />
        ) : type === 'FIRE' || type === 'POISON' ? (
          <dodecahedronGeometry args={[0.15, 0]} />
        ) : (
          <sphereGeometry args={[0.12, 8, 8]} />
        )}
        <meshBasicMaterial color={color} transparent opacity={0.9} toneMapped={false} />
      </instancedMesh>

      {/* Sparkles / Ember Spray */}
      <Sparkles
        count={gpuManager.getClampedParticleCount(35)}
        scale={type === 'HOLY' ? 4 : 2.5}
        size={type === 'HOLY' ? 5 : 3.5}
        speed={1.2}
        opacity={0.8}
        color={color}
      />
    </group>
  );
};

// ====================================================
// 2. PROCEDURAL LIGHTNING BOLT VFX
// ====================================================

export const LightningBoltVFX: React.FC<{
  startPos: [number, number, number];
  endPos: [number, number, number];
  color?: string;
}> = ({ startPos, endPos, color = '#38bdf8' }) => {
  const points = useMemo(() => {
    const start = new THREE.Vector3(...startPos);
    const end = new THREE.Vector3(...endPos);
    const result = [start];
    const segments = 8;

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const interp = new THREE.Vector3().lerpVectors(start, end, t);
      // Add jagged electric noise offset
      interp.x += (Math.random() - 0.5) * 0.8;
      interp.y += (Math.random() - 0.5) * 0.8;
      interp.z += (Math.random() - 0.5) * 0.8;
      result.push(interp);
    }
    result.push(end);
    return result;
  }, [startPos, endPos]);

  const lineGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color, linewidth: 3 }), [color]);
  const lineObject = useMemo(() => new THREE.Line(lineGeo, lineMat), [lineGeo, lineMat]);

  useEffect(() => {
    return () => {
      lineGeo.dispose();
      lineMat.dispose();
    };
  }, [lineGeo, lineMat]);

  return (
    <group>
      <primitive object={lineObject} />
      <pointLight position={endPos} color={color} intensity={4} distance={8} decay={2} />
      <Sparkles count={gpuManager.getClampedParticleCount(25)} scale={2} size={4} speed={2} color={color} />
    </group>
  );
};

// ====================================================
// 3. CONTINUOUS STATUS EFFECT AURA ENGINE
// ====================================================

interface UnitStatusAuraProps {
  position: [number, number, number];
  conditions: string[];
}

export const UnitStatusAura: React.FC<UnitStatusAuraProps> = ({ position, conditions }) => {
  const shieldRef = useRef<THREE.Mesh>(null);
  const starsGroupRef = useRef<THREE.Group>(null);
  const isMobile = gpuManager.getProfile().isMobile;

  const hasBurning = conditions.some(c => c.toLowerCase().includes('ardien') || c.toLowerCase().includes('burn') || c.toLowerCase().includes('fuego'));
  const hasPoison = conditions.some(c => c.toLowerCase().includes('veneno') || c.toLowerCase().includes('poison'));
  const hasFrozen = conditions.some(c => c.toLowerCase().includes('congel') || c.toLowerCase().includes('frost') || c.toLowerCase().includes('hielo'));
  const hasBlessed = conditions.some(c => c.toLowerCase().includes('bendi') || c.toLowerCase().includes('bless') || c.toLowerCase().includes('curac'));
  const hasShield = conditions.some(c => c.toLowerCase().includes('escud') || c.toLowerCase().includes('shield') || c.toLowerCase().includes('barrera'));
  const hasStunned = conditions.some(c => c.toLowerCase().includes('aturd') || c.toLowerCase().includes('stun'));
  const hasCursed = conditions.some(c => c.toLowerCase().includes('mald') || c.toLowerCase().includes('curse') || c.toLowerCase().includes('sombra'));

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Shield pulsating effect
    if (shieldRef.current) {
      const scale = 1.1 + Math.sin(t * 3) * 0.05;
      shieldRef.current.scale.set(scale, scale, scale);
      shieldRef.current.rotation.y = t * 0.5;
    }

    // Stunned stars rotating around unit head
    if (starsGroupRef.current) {
      starsGroupRef.current.rotation.y = t * 3;
    }
  });

  return (
    <group position={position}>
      {/* 1. BURNING AURA (Fuego / Ardiendo) */}
      {hasBurning && (
        <group position={[0, 0.8, 0]}>
          <Sparkles count={gpuManager.getClampedParticleCount(24)} scale={[1.2, 1.8, 1.2]} size={4} speed={1.5} color="#f97316" />
          {!isMobile && <pointLight color="#ef4444" intensity={1.8} distance={3} decay={2} />}
        </group>
      )}

      {/* 2. POISON AURA (Veneno) */}
      {hasPoison && (
        <group position={[0, 0.6, 0]}>
          <Sparkles count={gpuManager.getClampedParticleCount(20)} scale={[1.4, 1.2, 1.4]} size={3.5} speed={0.8} color="#22c55e" />
          {!isMobile && <pointLight color="#10b981" intensity={1.2} distance={2.5} />}
        </group>
      )}

      {/* 3. FROZEN / ICE AURA (Congelado) */}
      {hasFrozen && (
        <group position={[0, 0.05, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3, 0.8, 16]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
          <Sparkles count={gpuManager.getClampedParticleCount(15)} scale={[1.2, 1.0, 1.2]} size={3} speed={0.4} color="#06b6d4" />
        </group>
      )}

      {/* 4. BLESSED / HEAL AURA (Bendito) */}
      {hasBlessed && (
        <group position={[0, 1.0, 0]}>
          <Sparkles count={gpuManager.getClampedParticleCount(20)} scale={[1.0, 2.0, 1.0]} size={4} speed={1.0} color="#fbbf24" />
          {!isMobile && <pointLight color="#f59e0b" intensity={1.2} distance={3} />}
        </group>
      )}

      {/* 5. SHIELD / ENERGY BARRIER (Escudado) */}
      {hasShield && (
        <group position={[0, 1.0, 0]}>
          <mesh ref={shieldRef}>
            <icosahedronGeometry args={[1.0, 2]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.3} wireframe toneMapped={false} />
          </mesh>
        </group>
      )}

      {/* 6. STUNNED STARS (Aturdido) */}
      {hasStunned && (
        <group position={[0, 2.2, 0]} ref={starsGroupRef}>
          {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, idx) => (
            <mesh key={idx} position={[Math.cos(angle) * 0.5, 0, Math.sin(angle) * 0.5]}>
              <octahedronGeometry args={[0.12, 0]} />
              <meshBasicMaterial color="#facc15" toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}

      {/* 7. CURSED / VOID AURA (Maldito) */}
      {hasCursed && (
        <group position={[0, 0.8, 0]}>
          <Sparkles count={gpuManager.getClampedParticleCount(20)} scale={[1.2, 1.6, 1.2]} size={4} speed={1.0} color="#a855f7" />
          {!isMobile && <pointLight color="#7e22ce" intensity={1.5} distance={3} />}
        </group>
      )}
    </group>
  );
};

// ====================================================
// 4. MASTER PROCEDURAL VFX ENGINE COMPONENT
// ====================================================

export const ProceduralVFXEngine: React.FC<{
  entities: Entity[];
  mapData: BattleCell[];
}> = ({ entities, mapData }) => {
  return (
    <group>
      {/* Continuous Status Effect Particle Auras for combat entities */}
      {entities.map((ent: any) => {
        const conditions = ent?.stats?.conditions || [];
        if (!conditions || conditions.length === 0) return null;

        const cell = mapData.find(c => c.x === ent.position?.x && c.z === ent.position?.y);
        const surfaceY = cell ? (cell.offsetY || 0) + cell.height : 0.5;

        return (
          <UnitStatusAura
            key={`status-aura-${ent.id}`}
            position={[ent.position.x, surfaceY, ent.position.y]}
            conditions={conditions}
          />
        );
      })}
    </group>
  );
};

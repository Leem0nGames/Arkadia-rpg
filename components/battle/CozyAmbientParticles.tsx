import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BATTLE_MAP_SIZE } from '../../constants';
import { gpuManager } from '../../services/GPUPerformanceManager';

export const CozyAmbientParticles: React.FC<{ isShadowRealm?: boolean }> = React.memo(({ isShadowRealm = false }) => {
  const count = useMemo(() => gpuManager.getClampedParticleCount(45), []);
  const mesh = useRef<THREE.Points>(null);
  const center = BATTLE_MAP_SIZE / 2;

  const { positions, speeds, phases, basePos } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const base = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const phs = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const bx = center + (Math.random() - 0.5) * (BATTLE_MAP_SIZE + 6);
      const by = 0.5 + Math.random() * 4.5;
      const bz = center + (Math.random() - 0.5) * (BATTLE_MAP_SIZE + 6);

      pos[i * 3] = bx;
      pos[i * 3 + 1] = by;
      pos[i * 3 + 2] = bz;

      base[i * 3] = bx;
      base[i * 3 + 1] = by;
      base[i * 3 + 2] = bz;

      spd[i] = 0.3 + Math.random() * 0.5;
      phs[i] = Math.random() * Math.PI * 2;
    }

    return { positions: pos, speeds: spd, phases: phs, basePos: base };
  }, [center, count]);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const time = clock.getElapsedTime();
    const posArray = mesh.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const pTime = time * speeds[i] + phases[i];

      // Gentle floating ascent and side-to-side drift
      posArray[idx] = basePos[idx] + Math.sin(pTime * 0.7) * 0.4;
      posArray[idx + 1] = ((basePos[idx + 1] + time * speeds[i] * 0.25) % 5.5) + 0.5;
      posArray[idx + 2] = basePos[idx + 2] + Math.cos(pTime * 0.5) * 0.4;
    }

    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  const particleColor = isShadowRealm ? '#c084fc' : '#fbbf24';

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.22}
        color={particleColor}
        transparent
        opacity={isShadowRealm ? 0.5 : 0.65}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
});

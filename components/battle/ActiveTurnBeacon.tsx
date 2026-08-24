import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Entity } from '../../types';

interface ActiveTurnBeaconProps {
  activeEntity: Entity | null;
  surfaceY: number;
}

// Shared static geometries to eliminate allocation on re-render/turn transitions
const SHARED_BEACON_INNER_RING = new THREE.RingGeometry(0.55, 0.72, 24);
const SHARED_BEACON_OUTER_RING = new THREE.RingGeometry(0.75, 0.88, 20);
const SHARED_BEACON_CYLINDER = new THREE.CylinderGeometry(0.2, 0.55, 3.6, 12, 1, true);

export const ActiveTurnBeacon: React.FC<ActiveTurnBeaconProps> = ({ activeEntity, surfaceY }) => {
  const beaconGroupRef = useRef<THREE.Group>(null);
  const ringMeshRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const beamMeshRef = useRef<THREE.Mesh>(null);

  const isPlayer = activeEntity?.type === 'PLAYER';
  const color = isPlayer ? '#34d399' : '#f43f5e';

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();

    if (ringMeshRef.current) {
      ringMeshRef.current.rotation.z = elapsed * 0.8;
      const s = 1 + Math.sin(elapsed * 4) * 0.08;
      ringMeshRef.current.scale.set(s, s, 1);
    }

    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = -elapsed * 0.5;
      const pulse = 1 + (Math.sin(elapsed * 3) + 1) * 0.15;
      outerRingRef.current.scale.set(pulse, pulse, 1);
      (outerRingRef.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(elapsed * 4) * 0.15;
    }

    if (beamMeshRef.current) {
      (beamMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(elapsed * 3) * 0.1;
    }
  });

  if (!activeEntity) return null;

  const x = activeEntity.position.x;
  const z = activeEntity.position.y;

  return (
    <group ref={beaconGroupRef} position={[x, surfaceY + 0.05, z]}>
      {/* Ground Tactical Turn Ring */}
      <mesh ref={ringMeshRef} geometry={SHARED_BEACON_INNER_RING} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>

      {/* Expanding Outer Pulsing Ring */}
      <mesh ref={outerRingRef} geometry={SHARED_BEACON_OUTER_RING} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Vertical Light Pillar Beam */}
      <mesh ref={beamMeshRef} geometry={SHARED_BEACON_CYLINDER} position={[0, 1.8, 0]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

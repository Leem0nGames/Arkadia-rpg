import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface TargetTrajectoryLineProps {
  startPos: [number, number, number];
  endPos: [number, number, number];
  hasLos: boolean;
  hasHighGround: boolean;
  color?: string;
}

const SHARED_ENERGY_SPHERE_GEO = new THREE.SphereGeometry(0.15, 8, 8);
const SHARED_DEST_RING_GEO = new THREE.RingGeometry(0.4, 0.5, 20);

export const TargetTrajectoryLine: React.FC<TargetTrajectoryLineProps> = ({
  startPos,
  endPos,
  hasLos,
  hasHighGround,
  color = '#38bdf8'
}) => {
  const particleGroupRef = useRef<THREE.Group>(null);

  // Compute curve points
  const points = useMemo(() => {
    const midX = (startPos[0] + endPos[0]) / 2;
    const midZ = (startPos[2] + endPos[2]) / 2;
    const dist = Math.sqrt(Math.pow(endPos[0] - startPos[0], 2) + Math.pow(endPos[2] - startPos[2], 2));
    const arcHeight = Math.max(1.5, dist * 0.25) + Math.max(startPos[1], endPos[1]);

    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(startPos[0], startPos[1] + 1.2, startPos[2]),
      new THREE.Vector3(midX, arcHeight, midZ),
      new THREE.Vector3(endPos[0], endPos[1] + 1.0, endPos[2])
    );

    return curve.getPoints(24);
  }, [startPos, endPos]);

  const lineColor = hasLos ? (hasHighGround ? '#fbbf24' : color) : '#ef4444';

  const { lineObject, geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: lineColor, linewidth: 3, transparent: true, opacity: 0.8 });
    const line = new THREE.Line(geo, mat);
    return { lineObject: line, geometry: geo, material: mat };
  }, [points, lineColor]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((state) => {
    if (particleGroupRef.current) {
      const t = (state.clock.elapsedTime * 2) % 1;
      const idx = Math.floor(t * (points.length - 1));
      const pt = points[idx] || points[0];
      particleGroupRef.current.position.set(pt.x, pt.y, pt.z);
    }
  });

  const midPoint = points[Math.floor(points.length / 2)] || new THREE.Vector3(startPos[0], startPos[1] + 2, startPos[2]);

  return (
    <group>
      {/* Curved Trajectory Line */}
      <primitive object={lineObject} />

      {/* Traveling Energy Orb along trajectory */}
      <group ref={particleGroupRef}>
        <mesh geometry={SHARED_ENERGY_SPHERE_GEO}>
          <meshBasicMaterial color={lineColor} toneMapped={false} />
        </mesh>
      </group>

      {/* Target Marker Ring at destination */}
      <mesh geometry={SHARED_DEST_RING_GEO} position={[endPos[0], endPos[1] + 0.05, endPos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={lineColor} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Floating Tactical Badge over trajectory midpoint */}
      <Html position={[midPoint.x, midPoint.y + 0.5, midPoint.z]} center zIndexRange={[100, 0]}>
        <div className="pointer-events-none select-none flex flex-col items-center gap-1">
          {hasHighGround && (
            <div className="bg-amber-900/90 border border-amber-400 text-amber-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-lg backdrop-blur flex items-center gap-1 animate-bounce">
              <span>⛰️</span>
              <span>+2 Ventaja Altura</span>
            </div>
          )}

          {!hasLos && (
            <div className="bg-red-950/90 border border-red-500 text-red-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-lg backdrop-blur flex items-center gap-1">
              <span>🚫</span>
              <span>Línea Bloqueada</span>
            </div>
          )}

          {hasLos && !hasHighGround && (
            <div className="bg-slate-900/90 border border-sky-400/50 text-sky-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-lg backdrop-blur flex items-center gap-1">
              <span>🎯</span>
              <span>Objetivo Fijado</span>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { BattleCell, BattleHazard, Entity } from '../../types';
import { getHazardMovementMultiplier } from '../../services/dndRules';

interface MovementPathLine3DProps {
  path: BattleCell[];
  startPos: { x: number; y: number };
  mapData: BattleCell[];
  hazards?: BattleHazard[];
  activeEntity?: Entity | null;
}

const SHARED_STEP_RING_GEO = new THREE.RingGeometry(0.32, 0.42, 24);
const SHARED_ORB_GEO = new THREE.SphereGeometry(0.12, 12, 12);

export const MovementPathLine3D: React.FC<MovementPathLine3DProps> = ({
  path,
  startPos,
  mapData,
  hazards = [],
  activeEntity
}) => {
  const pulseOrbRef = useRef<THREE.Group>(null);

  // Compute 3D world coordinates and cumulative AP costs for each step
  const { pathPoints, stepDetails, totalApCost, totalFeet } = useMemo(() => {
    if (!path || path.length === 0) {
      return { pathPoints: [], stepDetails: [], totalApCost: 0, totalFeet: 0 };
    }

    const startCell = mapData.find(c => c.x === startPos.x && c.z === startPos.y);
    const startY = startCell ? (startCell.offsetY || 0) + startCell.height + 0.12 : 0.62;

    const points: THREE.Vector3[] = [new THREE.Vector3(startPos.x, startY, startPos.y)];
    const details: { cell: BattleCell; stepAp: number; cumulativeAp: number; cumulativeFeet: number; position: [number, number, number] }[] = [];

    let cumAp = 0;

    path.forEach((cell) => {
      const surfaceY = (cell.offsetY || 0) + cell.height + 0.12;
      const hazardOnCell = hazards.find(h => h.x === cell.x && h.z === cell.z);
      const stepCost = getHazardMovementMultiplier(hazardOnCell?.type);

      cumAp += stepCost;
      const feet = cumAp * 5;

      const posVec = new THREE.Vector3(cell.x, surfaceY, cell.z);
      points.push(posVec);

      details.push({
        cell,
        stepAp: stepCost,
        cumulativeAp: cumAp,
        cumulativeFeet: feet,
        position: [cell.x, surfaceY, cell.z]
      });
    });

    return {
      pathPoints: points,
      stepDetails: details,
      totalApCost: cumAp,
      totalFeet: cumAp * 5
    };
  }, [path, startPos, mapData, hazards]);

  // Create curved line object
  const { lineObject, geometry, material } = useMemo(() => {
    if (pathPoints.length < 2) {
      return { lineObject: null, geometry: null, material: null };
    }

    const curve = new THREE.CatmullRomCurve3(pathPoints, false, 'centripetal', 0.2);
    const curvePoints = curve.getPoints(Math.max(24, pathPoints.length * 8));

    const geo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const mat = new THREE.LineBasicMaterial({
      color: '#38bdf8',
      linewidth: 4,
      transparent: true,
      opacity: 0.95
    });

    const line = new THREE.Line(geo, mat);
    return { lineObject: line, geometry: geo, material: mat };
  }, [pathPoints]);

  useFrame((state) => {
    if (pulseOrbRef.current && pathPoints.length >= 2) {
      const t = (state.clock.elapsedTime * 1.8) % 1;
      const totalSegs = pathPoints.length - 1;
      const pIdx = t * totalSegs;
      const segIndex = Math.min(Math.floor(pIdx), totalSegs - 1);
      const frac = pIdx - segIndex;

      const p1 = pathPoints[segIndex];
      const p2 = pathPoints[segIndex + 1];
      if (p1 && p2) {
        pulseOrbRef.current.position.lerpVectors(p1, p2, frac);
      }
    }
  });

  if (!lineObject || stepDetails.length === 0) return null;

  return (
    <group>
      {/* Glowing 3D Path Line */}
      <primitive object={lineObject} />

      {/* Traveling Energy Pulse Orb along path */}
      <group ref={pulseOrbRef}>
        <mesh geometry={SHARED_ORB_GEO}>
          <meshBasicMaterial color="#38bdf8" toneMapped={false} />
        </mesh>
      </group>

      {/* Step Rings & AP Badges at each path tile */}
      {stepDetails.map((step, idx) => {
        const isFinal = idx === stepDetails.length - 1;

        return (
          <group key={`path_step_${step.cell.x}_${step.cell.z}_${idx}`} position={step.position}>
            {/* Step Ring on Grid Surface */}
            <mesh geometry={SHARED_STEP_RING_GEO} rotation={[-Math.PI / 2, 0, 0]}>
              <meshBasicMaterial color={isFinal ? '#f59e0b' : '#38bdf8'} transparent opacity={isFinal ? 0.95 : 0.75} side={THREE.DoubleSide} />
            </mesh>

            {/* Floating AP Cost Badge above step */}
            <Html position={[0, 0.45 + (isFinal ? 0.15 : 0), 0]} center zIndexRange={[100, 0]}>
              <div className="pointer-events-none select-none flex flex-col items-center">
                {isFinal ? (
                  <div className="bg-slate-950/95 border-2 border-amber-400 text-amber-200 text-[10px] font-mono font-black px-2.5 py-1 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.6)] backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap animate-bounce">
                    <span className="text-xs">🏁</span>
                    <span>COSTO: {step.cumulativeAp} AP ({step.cumulativeFeet} FT)</span>
                  </div>
                ) : (
                  <div className="bg-slate-950/90 border border-sky-400/80 text-sky-200 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-lg shadow-lg backdrop-blur flex items-center gap-1 whitespace-nowrap">
                    <span>🦶 {step.cumulativeAp} AP</span>
                  </div>
                )}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
};

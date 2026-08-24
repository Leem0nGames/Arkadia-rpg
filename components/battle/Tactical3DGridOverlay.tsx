import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BattleCell, BattleAction } from '../../types';

// ===================================================
// GLSL SHADER DEFINITIONS FOR SINGLE INSTANCED GRID
// ===================================================

const GridVertexShader = `
  attribute float aOverlayType;

  varying vec2 vUv;
  varying vec3 vColor;
  varying float vOverlayType;

  void main() {
    vUv = uv;
    vColor = instanceColor;
    vOverlayType = aOverlayType;

    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const GridFragmentShader = `
  uniform float uTime;
  uniform float uShowGridLines;

  varying vec2 vUv;
  varying vec3 vColor;
  varying float vOverlayType;

  void main() {
    vec2 uv = vUv;

    // Outer Border Line width
    float borderSize = 0.08;
    float borderX = step(uv.x, borderSize) + step(1.0 - borderSize, uv.x);
    float borderY = step(uv.y, borderSize) + step(1.0 - borderSize, uv.y);
    float isBorder = clamp(borderX + borderY, 0.0, 1.0);

    // Tactical Corner Brackets
    float cornerLen = 0.30;
    float inCornerX = step(uv.x, cornerLen) + step(1.0 - cornerLen, uv.x);
    float inCornerY = step(uv.y, cornerLen) + step(1.0 - cornerLen, uv.y);
    float isCorner = inCornerX * inCornerY * isBorder;

    // Square blocky distance for Minecraft style instead of radial/circular/hexagonal
    float distFromCenter = max(abs(uv.x - 0.5), abs(uv.y - 0.5)) * 2.0;

    vec3 finalColor = vColor;
    float alpha = 0.0;

    if (vOverlayType < 0.5) {
      // 0.0 MOVEMENT RANGE TILE: Vibrant Royal Blue Matrix (Translucent)
      float pulse = sin(uTime * 3.5 - distFromCenter * 10.0) * 0.5 + 0.5;
      float scanline = sin((uv.x + uv.y) * 18.0 + uTime * 4.0) * 0.15;
      float fillAlpha = 0.12 + 0.05 * pulse + scanline * 0.03;
      float borderAlpha = isBorder * 0.85 + isCorner * 0.15;
      alpha = max(fillAlpha, borderAlpha);
      finalColor = mix(vColor, vColor * 1.5 + vec3(0.2, 0.4, 0.8), pulse * 0.35);

    } else if (vOverlayType < 1.5) {
      // 1.0 ATTACK / SPELL RANGE TILE: Red Hazard or Violet Glow (Translucent & Soft)
      float pulse = sin(uTime * 4.5 - distFromCenter * 10.0) * 0.5 + 0.5;
      float fillAlpha = 0.10 + pulse * 0.04;
      float borderAlpha = isBorder * 0.85 + isCorner * 0.15;
      alpha = max(fillAlpha, borderAlpha);
      finalColor = mix(vColor, vColor * 1.4 + vec3(0.2, 0.1, 0.1), pulse * 0.25);

    } else if (vOverlayType < 2.5) {
      // 2.0 SELECTED / HOVERED TILE: Golden Target Core (Translucent & Crisp)
      float fastPulse = sin(uTime * 8.0) * 0.5 + 0.5;
      float ring = smoothstep(0.35, 0.40, distFromCenter) - smoothstep(0.42, 0.47, distFromCenter);
      float fillAlpha = 0.15 + 0.05 * fastPulse + ring * 0.45;
      float borderAlpha = isBorder * 0.90;
      alpha = max(fillAlpha, borderAlpha);
      finalColor = mix(vColor, vec3(1.0, 0.95, 0.3), fastPulse * 0.4 + ring * 0.6);

    } else if (vOverlayType < 4.5) {
      // 4.0 DANGER ZONE OVERLAY: Threat Hazard Stripes (Translucent & Soft)
      float pulse = sin(uTime * 5.0 + (uv.x + uv.y) * 12.0) * 0.5 + 0.5;
      float stripe = step(0.5, fract((uv.x - uv.y) * 10.0 + uTime * 2.0));
      float fillAlpha = 0.08 + stripe * 0.04 + pulse * 0.04;
      float borderAlpha = isBorder * 0.60;
      alpha = max(fillAlpha, borderAlpha);
      finalColor = mix(vColor, vec3(0.95, 0.15, 0.15), stripe * 0.45 + pulse * 0.35);

    } else {
      // 3.0 BASELINE TACTICAL GRID
      alpha = isBorder * 0.35 * uShowGridLines;
    }

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const _tempObj = new THREE.Object3D();
const _tempColor = new THREE.Color();
const MAX_GRID_CELLS = 500; // Accommodate standard battle grids up to 20x20+

export const Tactical3DGridOverlay: React.FC<{
  mapData: BattleCell[];
  validMoves: { x: number; y: number }[];
  validTargets: { x: number; y: number }[];
  attackRangeTiles?: { x: number; y: number }[];
  dangerZoneTiles?: { x: number; y: number }[];
  showDangerZone?: boolean;
}> = ({ mapData, validMoves, validTargets, attackRangeTiles = [], dangerZoneTiles = [], showDangerZone = false }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const attrRef = useRef<THREE.InstancedBufferAttribute>(null);
  const { selectedTile, hoveredEntity, selectedAction, showGridLines } = useGameStore();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uShowGridLines: { value: 1.0 },
    }),
    []
  );

  const overlayTypeBuffer = useMemo(() => new Float32Array(MAX_GRID_CELLS), []);

  const isMagic = selectedAction === BattleAction.MAGIC;
  const rangeColor = isMagic ? '#a855f7' : '#ef4444'; // Violet for spells, Red for physical attack
  const targetColor = isMagic ? '#c084fc' : '#dc2626';

  useLayoutEffect(() => {
    if (!meshRef.current || !mapData || mapData.length === 0) return;

    const count = Math.min(mapData.length, MAX_GRID_CELLS);
    meshRef.current.count = count;

    // Fast O(1) coordinate lookup sets with numeric keys (x * 1000 + y) to eliminate string allocation
    const pack = (x: number, y: number) => x * 1000 + y;
    const moveSet = new Set(validMoves.map((p) => pack(p.x, p.y)));
    const targetSet = new Set(validTargets.map((p) => pack(p.x, p.y)));
    const rangeSet = new Set(attackRangeTiles.map((p) => pack(p.x, p.y)));
    const dangerSet = new Set((showDangerZone ? dangerZoneTiles : []).map((p) => pack(p.x, p.y)));

    let focusKey: number | null = null;
    if (selectedTile) {
      focusKey = pack(selectedTile.x, selectedTile.z);
    } else if (hoveredEntity && (hoveredEntity as any).position) {
      focusKey = pack((hoveredEntity as any).position.x, (hoveredEntity as any).position.y);
    }

    for (let i = 0; i < count; i++) {
      const cell = mapData[i];
      const cellKey = pack(cell.x, cell.z);
      const surfaceY = (cell.offsetY || 0) + cell.height;

      let type = 3; // 3.0 = Baseline Grid
      let hexColor = '#475569';

      if (focusKey !== null && cellKey === focusKey) {
        type = 2; // 2.0 = Golden Focus / Hover
        hexColor = '#f59e0b';
      } else if (targetSet.has(cellKey)) {
        type = 1; // 1.0 = Valid Target
        hexColor = targetColor;
      } else if (rangeSet.has(cellKey)) {
        type = 1; // 1.0 = Attack / Spell Range Perimeter
        hexColor = rangeColor;
      } else if (moveSet.has(cellKey)) {
        type = 0; // 0.0 = Valid Move Matrix
        hexColor = '#2563eb';
      } else if (showDangerZone && dangerSet.has(cellKey)) {
        type = 4; // 4.0 = Danger Zone Hazard Overlay
        hexColor = '#ef4444';
      }

      _tempObj.position.set(cell.x, surfaceY + 0.05, cell.z);
      _tempObj.rotation.set(-Math.PI / 2, 0, 0);
      _tempObj.scale.set(0.96, 0.96, 1.0);
      _tempObj.updateMatrix();

      meshRef.current.setMatrixAt(i, _tempObj.matrix);

      _tempColor.set(hexColor);
      meshRef.current.setColorAt(i, _tempColor);

      overlayTypeBuffer[i] = type;
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    if (attrRef.current) {
      attrRef.current.needsUpdate = true;
    }
  }, [
    mapData,
    validMoves,
    validTargets,
    attackRangeTiles,
    selectedTile,
    hoveredEntity,
    rangeColor,
    targetColor,
    overlayTypeBuffer,
  ]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.getElapsedTime();
    uniforms.uShowGridLines.value = showGridLines ? 1.0 : 0.0;
  });

  if (!mapData || mapData.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_GRID_CELLS]}
      frustumCulled={false}
      renderOrder={100}
    >
      <planeGeometry args={[1, 1]}>
        <instancedBufferAttribute
          ref={attrRef}
          attach="attributes-aOverlayType"
          args={[overlayTypeBuffer, 1]}
        />
      </planeGeometry>
      <shaderMaterial
        attach="material"
        vertexShader={GridVertexShader}
        fragmentShader={GridFragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        depthTest={true}
        side={THREE.DoubleSide}
        polygonOffset={true}
        polygonOffsetFactor={-10}
        polygonOffsetUnits={-10}
      />
    </instancedMesh>
  );
};

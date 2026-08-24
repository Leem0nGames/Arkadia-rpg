import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BattleCell, Entity, CharacterClass } from '../../types';
import { checkLineOfSight } from '../../services/dndRules';

interface FogOfWarLayerProps {
  mapData: BattleCell[];
  entities: Entity[];
  fogOfWarEnabled?: boolean;
  onVisibleTilesChange?: (visibleKeys: Set<string>) => void;
}

// Helper to determine sight radius per character class and WIS modifier
const getUnitSightRange = (unit: any): number => {
  if (!unit || !unit.stats) return 5;
  const cls = unit.stats.class;
  const wis = unit.stats.attributes?.WIS || 10;
  const wisBonus = Math.max(0, Math.floor((wis - 10) / 2));
  let base = 5;
  if (cls === CharacterClass.RANGER || cls === CharacterClass.ROGUE) base = 7;
  else if (cls === CharacterClass.WIZARD || cls === CharacterClass.SORCERER || cls === CharacterClass.DRUID) base = 6;
  return Math.min(10, base + wisBonus);
};

// Procedural soft cloud mist texture generator for high-quality alpha blending
const createMistTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);

    // Radial gradient for soft feathered mist block
    const grad = ctx.createRadialGradient(64, 64, 5, 64, 64, 62);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
    grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.85)');
    grad.addColorStop(0.8, 'rgba(9, 13, 22, 0.70)');
    grad.addColorStop(1, 'rgba(3, 7, 18, 0.15)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    // Subtle swirling mist noise overlay
    for (let i = 0; i < 18; i++) {
      const rx = 20 + Math.random() * 88;
      const ry = 20 + Math.random() * 88;
      const radius = 10 + Math.random() * 25;
      const subGrad = ctx.createRadialGradient(rx, ry, 2, rx, ry, radius);
      subGrad.addColorStop(0, 'rgba(30, 41, 59, 0.4)');
      subGrad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
      ctx.fillStyle = subGrad;
      ctx.beginPath();
      ctx.arc(rx, ry, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
};

export const FogOfWarLayer: React.FC<FogOfWarLayerProps> = React.memo(({
  mapData,
  entities,
  fogOfWarEnabled = true,
  onVisibleTilesChange
}) => {
  const [exploredSet, setExploredSet] = useState<Set<string>>(() => new Set());
  const fogGroupRef = useRef<THREE.Group>(null);

  // Generate procedural mist texture once
  const mistTexture = useMemo(() => createMistTexture(), []);

  // Reset explored set when battle map changes completely
  const mapKey = useMemo(() => {
    return mapData.map(c => `${c.x}_${c.z}`).slice(0, 5).join('-');
  }, [mapData]);

  useEffect(() => {
    setExploredSet(new Set());
  }, [mapKey]);

  // Calculate currently visible tile keys based on living player units
  const visibleSet = useMemo(() => {
    const visible = new Set<string>();
    if (!fogOfWarEnabled) {
      // If FoV is disabled, all map tiles are visible
      mapData.forEach(c => visible.add(`${c.x}_${c.z}`));
      return visible;
    }

    const livingPlayerUnits = entities.filter((e: any) => {
      const isPlayer = e.type === 'PLAYER' || e.isPlayerControlled;
      return isPlayer && e.stats && e.stats.hp > 0;
    });

    if (livingPlayerUnits.length === 0) {
      // Fallback: reveal all if no player units are found
      mapData.forEach(c => visible.add(`${c.x}_${c.z}`));
      return visible;
    }

    mapData.forEach(cell => {
      const cellKey = `${cell.x}_${cell.z}`;

      for (const unit of livingPlayerUnits) {
        const uX = unit.position.x;
        const uZ = unit.position.y;
        const sightRange = getUnitSightRange(unit);
        const dist = Math.hypot(cell.x - uX, cell.z - uZ);

        if (dist <= sightRange) {
          const hasLos = checkLineOfSight(
            { x: uX, y: uZ },
            { x: cell.x, y: cell.z },
            mapData
          );

          if (hasLos) {
            visible.add(cellKey);
            break; // Cell is visible, no need to check other units
          }
        }
      }
    });

    return visible;
  }, [mapData, entities, fogOfWarEnabled]);

  // Update persistent explored set whenever visible set changes
  useEffect(() => {
    if (!fogOfWarEnabled) return;

    setExploredSet(prev => {
      let changed = false;
      const updated = new Set(prev);
      visibleSet.forEach(key => {
        if (!updated.has(key)) {
          updated.add(key);
          changed = true;
        }
      });
      return changed ? updated : prev;
    });

    if (onVisibleTilesChange) {
      onVisibleTilesChange(visibleSet);
    }
  }, [visibleSet, fogOfWarEnabled, onVisibleTilesChange]);

  // Animated mist wave effect on fog tiles
  useFrame(({ clock }) => {
    if (!fogGroupRef.current) return;
    const t = clock.getElapsedTime();

    fogGroupRef.current.children.forEach((child, idx) => {
      if (child instanceof THREE.Mesh) {
        const wave = Math.sin(t * 1.2 + idx * 0.4) * 0.03;
        child.position.y = (child.userData.baseY || 0) + wave;
        if (child.material && child.material.opacity !== undefined) {
          const baseOpacity = child.userData.baseOpacity || 0.8;
          child.material.opacity = Math.min(0.95, Math.max(0.2, baseOpacity + Math.cos(t * 1.5 + idx * 0.3) * 0.04));
        }
      }
    });
  });

  if (!fogOfWarEnabled) return null;

  // Filter tiles that require fog (either Unexplored or Explored-but-not-currently-Visible)
  const fogTiles = mapData.filter(cell => {
    const key = `${cell.x}_${cell.z}`;
    return !visibleSet.has(key);
  });

  return (
    <group ref={fogGroupRef} name="FogOfWarLayer">
      {fogTiles.map(cell => {
        const key = `${cell.x}_${cell.z}`;
        const isExplored = exploredSet.has(key);
        const surfaceY = (cell.offsetY || 0) + cell.height + 0.06;
        const baseOpacity = isExplored ? 0.42 : 0.84;
        const fogColor = isExplored ? '#1e293b' : '#070a13';

        return (
          <mesh
            key={`fog-${key}`}
            position={[cell.x, surfaceY, cell.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            userData={{ baseY: surfaceY, baseOpacity }}
          >
            <planeGeometry args={[1.08, 1.08]} />
            <meshBasicMaterial
              map={mistTexture}
              color={fogColor}
              transparent={true}
              opacity={baseOpacity}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
});

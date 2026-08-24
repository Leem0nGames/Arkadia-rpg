import React, { useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BattleCell, BattleAction, Entity } from '../../types';
import { BATTLE_MAP_SIZE } from '../../constants';
import { TargetTrajectoryLine } from './TargetTrajectoryLine';
import { Tactical3DGridOverlay } from './Tactical3DGridOverlay';
import { TargetLockRing3D } from './TargetLockRing3D';
import { CombatForecastOverlay } from './CombatForecastOverlay';
import { MovementPathLine3D } from './MovementPathLine3D';
import { checkLineOfSight } from '../../services/dndRules';
import { calculateDangerZoneTiles, findBattlePath } from '../../services/pathfinding';

export const InteractionLayer = ({ mapData, validMoves, validTargets, attackRangeTiles, onTileClick, onTileHover }: any) => {
    const { turnOrder, currentTurnIndex, battleEntities, selectedAction, selectedTile, hoveredEntity, showDangerZone, battleHazards } = useGameStore();
    const [snappedLockEntity, setSnappedLockEntity] = useState<Entity | null>(null);
    const [isAutoSnapped, setIsAutoSnapped] = useState<boolean>(false);

    if (!mapData || mapData.length === 0) return null;
    const center = BATTLE_MAP_SIZE / 2;

    const activeId = turnOrder[currentTurnIndex];
    const activeEntity = battleEntities.find(e => e.id === activeId);

    // Compute Danger Zone tiles
    const dangerZoneTiles = useMemo(() => {
      return calculateDangerZoneTiles(battleEntities, mapData);
    }, [battleEntities, mapData]);

    /**
     * Raycasting de precisión para detectar el tile bajo el cursor.
     */
    const getTileFromRaycast = (px: number, pz: number) => {
        // En lugar de Math.round, usamos Math.floor para obtener el índice del tile
        // y ajustamos por el centro del tile (px, pz son coordenadas del mundo en el plano del grid)
        // El grid está centrado en (center-0.5, center-0.5)
        const x = Math.floor(px + 0.5);
        const z = Math.floor(pz + 0.5);
        
        return { x, z };
    };

    const resolveAutoTarget = useCallback((px: number, pz: number) => {
      const { x, z } = getTileFromRaycast(px, pz);

      const clampedX = Math.max(0, Math.min(BATTLE_MAP_SIZE - 1, x));
      const clampedZ = Math.max(0, Math.min(BATTLE_MAP_SIZE - 1, z));

      let closestEnt: Entity | null = null;
      let minDistance = 1.2; // Reduced snap radius from 2.5 to 1.2

      for (const ent of battleEntities) {
        if (!ent.position || ent.stats.hp <= 0) continue;
        
        // Prevent snapping to other units when in MOVE mode
        if (selectedAction === BattleAction.MOVE && ent.id !== activeId) continue;

        const dx = ent.position.x - px;
        const dz = ent.position.y - pz;
        const dist = Math.hypot(dx, dz);

        // Prioritize targetable entities during ATTACK or MAGIC mode
        const isTargetable = validTargets && validTargets.some((vt: any) => vt.x === ent.position.x && vt.y === ent.position.y);
        const weight = isTargetable ? 0.75 : 1.0;
        const weightedDist = dist * weight;

        if (weightedDist < minDistance) {
          minDistance = weightedDist;
          closestEnt = ent;
        }
      }

      if (closestEnt) {
        const rawDist = Math.hypot(closestEnt.position.x - px, closestEnt.position.y - pz);
        return {
          tile: { x: closestEnt.position.x, z: closestEnt.position.y },
          entity: closestEnt,
          isSnapped: rawDist > 0.35 // True if touch point was offset from exact tile center
        };
      }

      return {
        tile: { x: clampedX, z: clampedZ },
        entity: null,
        isSnapped: false
      };
    }, [battleEntities, validTargets]);

    const handlePointerMove = (e: any) => { 
      e.stopPropagation(); 
      const targetRes = resolveAutoTarget(e.point.x, e.point.z);
      
      setSnappedLockEntity(targetRes.entity);
      setIsAutoSnapped(targetRes.isSnapped);

      if (targetRes.tile.x >= 0 && targetRes.tile.x < BATTLE_MAP_SIZE && targetRes.tile.z >= 0 && targetRes.tile.z < BATTLE_MAP_SIZE) {
        onTileHover(targetRes.tile.x, targetRes.tile.z); 
      }
    };

    const handleClick = (e: any) => { 
      e.stopPropagation(); 
      const targetRes = resolveAutoTarget(e.point.x, e.point.z);

      setSnappedLockEntity(targetRes.entity);
      setIsAutoSnapped(targetRes.isSnapped);

      if (targetRes.tile.x >= 0 && targetRes.tile.x < BATTLE_MAP_SIZE && targetRes.tile.z >= 0 && targetRes.tile.z < BATTLE_MAP_SIZE) {
        onTileClick(targetRes.tile.x, targetRes.tile.z); 
      }
    };

    // Calculate Trajectory Line parameters
    let trajectoryData = null;
    if (activeEntity && (selectedAction === BattleAction.ATTACK || selectedAction === BattleAction.MAGIC)) {
        const targetTile = selectedTile || ((hoveredEntity as any)?.position ? { x: (hoveredEntity as any).position.x, z: (hoveredEntity as any).position.y } : null);
        
        if (targetTile && (targetTile.x !== activeEntity.position.x || targetTile.z !== activeEntity.position.y)) {
            const startCell = mapData.find((c: BattleCell) => c.x === activeEntity.position.x && c.z === activeEntity.position.y);
            const targetCell = mapData.find((c: BattleCell) => c.x === targetTile.x && c.z === targetTile.z);

            const startY = startCell ? (startCell.offsetY + startCell.height) : 0.5;
            const targetY = targetCell ? (targetCell.offsetY + targetCell.height) : 0.5;

            const hasLos = checkLineOfSight(activeEntity.position, { x: targetTile.x, y: targetTile.z }, mapData);
            const hasHighGround = startY > targetY + 0.5;

            trajectoryData = {
                startPos: [activeEntity.position.x, startY, activeEntity.position.y] as [number, number, number],
                endPos: [targetTile.x, targetY, targetTile.z] as [number, number, number],
                hasLos,
                hasHighGround
            };
        }
    }

    // Calculate movement path when in MOVE mode
    let movementPath: BattleCell[] | null = null;
    if (activeEntity && selectedAction === BattleAction.MOVE) {
        const targetTile = selectedTile || ((hoveredEntity as any)?.position ? { x: (hoveredEntity as any).position.x, z: (hoveredEntity as any).position.y } : null);
        if (targetTile && (targetTile.x !== activeEntity.position.x || targetTile.z !== activeEntity.position.y)) {
            const isValidMoveTarget = (validMoves || []).some((m: any) => m.x === targetTile.x && m.y === targetTile.z);
            if (isValidMoveTarget) {
                movementPath = findBattlePath(
                    activeEntity.position,
                    { x: targetTile.x, y: targetTile.z },
                    mapData,
                    battleHazards
                );
            }
        }
    }

    // Determine target lock entity (priority: snapped entity > hovered entity > selected tile entity)
    const lockedTarget = snappedLockEntity || (hoveredEntity as Entity) || (selectedTile ? battleEntities.find((e: Entity) => e.position.x === selectedTile.x && e.position.y === selectedTile.z) : null);
    
    let targetSurfaceY = 0.5;
    if (lockedTarget) {
      const cell = mapData.find((c: BattleCell) => c.x === lockedTarget.position.x && c.z === lockedTarget.position.y);
      targetSurfaceY = cell ? (cell.offsetY + cell.height) : 0.5;
    }

    return (
        <group>
             {/* Invisible Interaction Plane for mouse/touch raycasting */}
             <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center - 0.5, 0.5, center - 0.5]} onPointerMove={handlePointerMove} onClick={handleClick}>
               <planeGeometry args={[BATTLE_MAP_SIZE, BATTLE_MAP_SIZE]} />
               <meshBasicMaterial transparent opacity={0} depthWrite={false} />
             </mesh>

             {/* Custom GLSL 3D Grid Overlay with Color-Coded Shaders */}
             <Tactical3DGridOverlay 
               mapData={mapData} 
               validMoves={validMoves || []} 
               validTargets={validTargets || []} 
               attackRangeTiles={attackRangeTiles || []}
               dangerZoneTiles={dangerZoneTiles}
               showDangerZone={showDangerZone}
             />

             {/* 3D AP Movement Path Line */}
             {movementPath && activeEntity && (
                 <MovementPathLine3D 
                     path={movementPath} 
                     startPos={activeEntity.position} 
                     mapData={mapData} 
                     hazards={battleHazards} 
                     activeEntity={activeEntity}
                 />
             )}

             {/* 3D Auto-Target Lock Ring & Visual Feedback (Only in Attack or Magic mode) */}
             {(selectedAction === BattleAction.ATTACK || selectedAction === BattleAction.MAGIC) && lockedTarget && lockedTarget.id !== activeId && (
                 <>
                   <TargetLockRing3D 
                       targetEntity={lockedTarget}
                       activeEntity={activeEntity || null}
                       surfaceY={targetSurfaceY}
                       selectedAction={selectedAction}
                       isAutoSnapped={isAutoSnapped}
                   />
                   <CombatForecastOverlay
                       targetEntity={lockedTarget}
                       mapData={mapData}
                   />
                 </>
             )}

             {/* 3D Trajectory Projection Arc */}
             {trajectoryData && (
                 <TargetTrajectoryLine 
                     startPos={trajectoryData.startPos} 
                     endPos={trajectoryData.endPos} 
                     hasLos={trajectoryData.hasLos} 
                     hasHighGround={trajectoryData.hasHighGround} 
                     color={selectedAction === BattleAction.MAGIC ? "#a855f7" : "#38bdf8"}
                 />
             )}
        </group>
    );
};



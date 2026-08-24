import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BATTLE_MAP_SIZE } from '../../constants';
import { BattleCell, BattleAction } from '../../types';

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const CinematicCamera = () => {
  const {
    isActionAnimating,
    activeDiceRoll,
    battleEntities,
    turnOrder,
    currentTurnIndex,
    selectedTile,
    selectedAction,
    hoveredEntity,
    activeSpellEffect,
    screenShake,
    battleMap,
    isRadialMenuOpen,
  } = useGameStore();

  const { camera, controls } = useThree();
  const center = BATTLE_MAP_SIZE / 2;

  // Interaction tracking
  const isInteractingRef = useRef(false);

  // Transition tracking
  const startLookAt = useRef(new THREE.Vector3());
  const startCamPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const targetCamPos = useRef(new THREE.Vector3());
  const targetFovVal = useRef(26);
  const transitionProgress = useRef(1.0); // 1.0 = transition finished/inactive

  // Last state tracking for triggers
  const lastTurnIndex = useRef<number | null>(null);
  const lastSelectedAction = useRef<BattleAction | null>(null);
  const lastDiceRoll = useRef<any>(null);
  const lastSpellEffect = useRef<any>(null);
  const lastActionAnimating = useRef<boolean>(false);
  const lastSelectedTile = useRef<any>(null);
  const lastHoveredEntity = useRef<any>(null);

  const victoryAngleRef = useRef(0);

  // Initialize camera position/target on mount
  useEffect(() => {
    if (controls) {
      const orbit = controls as any;
      orbit.target.set(center, 1.0, center);
      camera.position.set(center, 12, center + 18);
      orbit.update();
    }
  }, [controls, camera, center]);

  // Zero-latency user interaction listeners
  useEffect(() => {
    const handleUserInteractionStart = () => {
      isInteractingRef.current = true;
      transitionProgress.current = 1.0; // Instantly halt any automatic panning
    };

    const handleUserInteractionEnd = () => {
      isInteractingRef.current = false;
    };

    window.addEventListener('mousedown', handleUserInteractionStart, { passive: true });
    window.addEventListener('touchstart', handleUserInteractionStart, { passive: true });
    window.addEventListener('wheel', handleUserInteractionStart, { passive: true });
    window.addEventListener('mouseup', handleUserInteractionEnd, { passive: true });
    window.addEventListener('touchend', handleUserInteractionEnd, { passive: true });

    return () => {
      window.removeEventListener('mousedown', handleUserInteractionStart);
      window.removeEventListener('touchstart', handleUserInteractionStart);
      window.removeEventListener('wheel', handleUserInteractionStart);
      window.removeEventListener('mouseup', handleUserInteractionEnd);
      window.removeEventListener('touchend', handleUserInteractionEnd);
    };
  }, []);

  useFrame((state, delta) => {
    if (!controls) return;
    const orbit = controls as any;

    const activeId = turnOrder[currentTurnIndex];
    const activeEntity = battleEntities.find((e) => e.id === activeId);

    // Check if victory condition met (all enemies defeated)
    const enemies = battleEntities.filter(e => e.type === 'ENEMY');
    const isVictory = enemies.length > 0 && enemies.every(e => e.stats.hp <= 0);

    const getCellY = (x: number, z: number) => {
      const cell = battleMap.find((c: BattleCell) => c.x === x && c.z === z);
      return cell ? (cell.offsetY || 0) + cell.height : 0.5;
    };

    // Detect state-based triggers for auto-focusing
    let triggerFocus = false;

    if (currentTurnIndex !== lastTurnIndex.current) {
      lastTurnIndex.current = currentTurnIndex;
      triggerFocus = true;
    }
    if (selectedAction !== lastSelectedAction.current) {
      lastSelectedAction.current = selectedAction;
      triggerFocus = true;
    }
    if (isActionAnimating !== lastActionAnimating.current) {
      lastActionAnimating.current = isActionAnimating;
      triggerFocus = true;
    }
    if (activeDiceRoll !== lastDiceRoll.current) {
      lastDiceRoll.current = activeDiceRoll;
      triggerFocus = true;
    }
    if (activeSpellEffect !== lastSpellEffect.current) {
      lastSpellEffect.current = activeSpellEffect;
      triggerFocus = true;
    }
    if (selectedTile?.x !== lastSelectedTile.current?.x || selectedTile?.z !== lastSelectedTile.current?.z) {
      lastSelectedTile.current = selectedTile;
      triggerFocus = true;
    }
    if (hoveredEntity?.id !== lastHoveredEntity.current?.id) {
      lastHoveredEntity.current = hoveredEntity;
      triggerFocus = true;
    }

    // Process focus target calculation on trigger
    if (triggerFocus && !isVictory && !isInteractingRef.current) {
      let focusX = center;
      let focusY = 1.0;
      let focusZ = center;
      let focusDist = 7.0;
      let focusFov = 26;

      if (activeEntity) {
        const activeX = activeEntity.position.x;
        const activeZ = activeEntity.position.y;
        const activeY = getCellY(activeX, activeZ);

        focusX = activeX;
        focusY = activeY + 1.1;
        focusZ = activeZ;
        focusDist = 7.0;
        focusFov = 26;

        // 1. ACTIVE ATTACK / SPELL / DICE ROLL ANIMATION
        if (activeDiceRoll || activeSpellEffect || isActionAnimating) {
          let impactX = activeX;
          let impactZ = activeZ;
          let impactY = activeY;

          if (activeDiceRoll) {
            const targetEnt = battleEntities.find((e) => e.name === activeDiceRoll.targetName);
            if (targetEnt) {
              impactX = targetEnt.position.x;
              impactZ = targetEnt.position.y;
              impactY = getCellY(impactX, impactZ);
            }
          } else if (activeSpellEffect?.endPos) {
            impactX = activeSpellEffect.endPos[0];
            impactY = activeSpellEffect.endPos[1];
            impactZ = activeSpellEffect.endPos[2];
          } else if (selectedTile) {
            impactX = selectedTile.x;
            impactZ = selectedTile.z;
            impactY = getCellY(impactX, impactZ);
          }

          focusX = THREE.MathUtils.lerp(activeX, impactX, 0.75);
          focusY = THREE.MathUtils.lerp(activeY, impactY, 0.75) + 1.1;
          focusZ = THREE.MathUtils.lerp(activeZ, impactZ, 0.75);
          focusDist = 4.5; // Action close-up!
          focusFov = 22;
        }
        // 2. TARGETING MODE (ATTACK / MAGIC WITH HOVERED OR SELECTED TARGET)
        else if (
          selectedAction === BattleAction.ATTACK ||
          selectedAction === BattleAction.MAGIC ||
          (hoveredEntity && selectedAction !== BattleAction.MOVE) ||
          (selectedTile && selectedAction !== BattleAction.MOVE)
        ) {
          let destX = activeX;
          let destZ = activeZ;
          let destY = activeY;

          if (hoveredEntity && (hoveredEntity as any).position) {
            destX = (hoveredEntity as any).position.x;
            destZ = (hoveredEntity as any).position.y;
            destY = getCellY(destX, destZ);
          } else if (selectedTile) {
            destX = selectedTile.x;
            destZ = selectedTile.z;
            destY = getCellY(destX, destZ);
          }

          focusX = (activeX + destX) * 0.5;
          focusY = Math.max(activeY, destY) + 1.1;
          focusZ = (activeZ + destZ) * 0.5;

          const combatantDist = Math.hypot(destX - activeX, destZ - activeZ);
          focusDist = Math.max(5.0, combatantDist * 0.8 + 2.0);
          focusFov = 24;
        }
        // 3. TACTICAL MOVEMENT MODE
        else if (selectedAction === BattleAction.MOVE) {
          focusDist = 6.0;
          focusFov = 26;
        }
      }

      // Calculate new camera position preserving the user's custom azimuth angle
      const relativeOffset = new THREE.Vector3().copy(camera.position).sub(orbit.target);
      let azimuth = Math.atan2(relativeOffset.x, relativeOffset.z);

      const elevation = Math.PI / 5.5; // beautiful ~32.7 degree tactical slant
      const yOffset = Math.sin(elevation) * focusDist;
      const hDist = Math.cos(elevation) * focusDist;

      const newX = Math.sin(azimuth) * hDist;
      const newZ = Math.cos(azimuth) * hDist;

      // Set starting transition states
      startLookAt.current.copy(orbit.target);
      startCamPos.current.copy(camera.position);

      targetLookAt.current.set(focusX, focusY, focusZ);
      targetCamPos.current.set(focusX + newX, focusY + yOffset, focusZ + newZ);
      targetFovVal.current = focusFov;

      transitionProgress.current = 0.0;
    }

    // VICTORY CINEMATIC: Slow orbit around party
    if (isVictory) {
      victoryAngleRef.current += delta * 0.25;
      const avgPlayers = battleEntities.filter(e => e.type === 'PLAYER' && e.stats.hp > 0);
      if (avgPlayers.length > 0) {
        const avgX = avgPlayers.reduce((sum, p) => sum + p.position.x, 0) / avgPlayers.length;
        const avgZ = avgPlayers.reduce((sum, p) => sum + p.position.y, 0) / avgPlayers.length;
        const avgY = getCellY(avgX, avgZ) + 1.2;

        orbit.target.set(avgX, avgY, avgZ);
        
        const r = 6.5;
        const yOffset = 4.5;
        const theta = victoryAngleRef.current;
        camera.position.set(avgX + Math.sin(theta) * r, avgY + yOffset, avgZ + Math.cos(theta) * r);
        orbit.update();
      }
    }
    // Interpolate the camera auto-pan transition
    else if (transitionProgress.current < 1.0) {
      if (isInteractingRef.current) {
        transitionProgress.current = 1.0; // Let go instantly
      } else {
        transitionProgress.current = Math.min(1.0, transitionProgress.current + delta * 2.2); // ~0.45 seconds glide
        const t = easeInOutCubic(transitionProgress.current);

        orbit.target.lerpVectors(startLookAt.current, targetLookAt.current, t);
        camera.position.lerpVectors(startCamPos.current, targetCamPos.current, t);

        if ('fov' in camera) {
          const pCam = camera as THREE.PerspectiveCamera;
          pCam.fov = THREE.MathUtils.lerp(pCam.fov, targetFovVal.current, t);
          pCam.updateProjectionMatrix();
        }

        orbit.update();
      }
    }

    // Apply Screen Shake Camera Jitter if screenShake active
    if (screenShake && screenShake > 0) {
      const shakeIntensity = Math.min(1.5, screenShake * 0.22);
      camera.position.x += (Math.random() - 0.5) * shakeIntensity;
      camera.position.y += (Math.random() - 0.5) * shakeIntensity * 0.8;
      camera.position.z += (Math.random() - 0.5) * shakeIntensity;
    }
  });

  return null;
};

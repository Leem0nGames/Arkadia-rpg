import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BATTLE_MAP_SIZE } from '../../constants';
import { BattleCell } from '../../types';

export const CinematicCamera = () => {
  const {
    isActionAnimating,
    activeDiceRoll,
    battleEntities,
    turnOrder,
    currentTurnIndex,
    activeSpellEffect,
    screenShake,
    battleMap,
  } = useGameStore();

  const { camera, controls } = useThree();
  const center = BATTLE_MAP_SIZE / 2;

  // Interaction tracking & grace period
  const isInteractingRef = useRef(false);
  const lastManualTimeRef = useRef(0);

  // Smooth target positions
  const targetLookAt = useRef(new THREE.Vector3(center, 1.0, center));
  const targetCamPos = useRef(new THREE.Vector3(center, 12, center + 18));
  const targetFovVal = useRef(26);

  // Last state tracking for triggers
  const lastTurnIndex = useRef<number | null>(null);
  const lastDiceRoll = useRef<any>(null);
  const lastSpellEffect = useRef<any>(null);

  const victoryAngleRef = useRef(0);

  // Initialize camera position/target on mount
  useEffect(() => {
    if (controls) {
      const orbit = controls as any;
      orbit.target.set(center, 1.0, center);
      camera.position.set(center, 12, center + 18);
      targetLookAt.current.set(center, 1.0, center);
      targetCamPos.current.set(center, 12, center + 18);
      orbit.update();
    }
  }, [controls, camera, center]);

  // Zero-latency user interaction listeners
  useEffect(() => {
    const handleUserInteractionStart = () => {
      isInteractingRef.current = true;
      lastManualTimeRef.current = Date.now();
    };

    const handleUserInteractionEnd = () => {
      isInteractingRef.current = false;
      lastManualTimeRef.current = Date.now();
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

    // Selective triggers: Only reframe on Turn Change or Major Combat Resolution (Dice Roll / Spell)
    let triggerFocus = false;
    let isCombatImpact = false;

    if (currentTurnIndex !== lastTurnIndex.current) {
      lastTurnIndex.current = currentTurnIndex;
      triggerFocus = true;
    }
    if (activeDiceRoll && activeDiceRoll !== lastDiceRoll.current) {
      lastDiceRoll.current = activeDiceRoll;
      triggerFocus = true;
      isCombatImpact = true;
    } else if (!activeDiceRoll) {
      lastDiceRoll.current = null;
    }

    if (activeSpellEffect && activeSpellEffect !== lastSpellEffect.current) {
      lastSpellEffect.current = activeSpellEffect;
      triggerFocus = true;
      isCombatImpact = true;
    } else if (!activeSpellEffect) {
      lastSpellEffect.current = null;
    }

    const timeSinceManual = Date.now() - lastManualTimeRef.current;
    const isUnderManualControl = isInteractingRef.current || (timeSinceManual < 2200 && !isCombatImpact);

    // Process focus target calculation on trigger
    if (triggerFocus && !isVictory && !isUnderManualControl) {
      let focusX = center;
      let focusY = 1.0;
      let focusZ = center;
      let focusDist = 7.2;
      let focusFov = 26;

      if (activeEntity) {
        const activeX = activeEntity.position.x;
        const activeZ = activeEntity.position.y;
        const activeY = getCellY(activeX, activeZ);

        focusX = activeX;
        focusY = activeY + 1.1;
        focusZ = activeZ;
        focusDist = 7.2;
        focusFov = 26;

        // Active Attack / Spell / Dice Roll Action Close-Up
        if (activeDiceRoll || activeSpellEffect) {
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
          }

          // Frame between attacker and defender with cinematic emphasis
          focusX = THREE.MathUtils.lerp(activeX, impactX, 0.6);
          focusY = THREE.MathUtils.lerp(activeY, impactY, 0.6) + 1.1;
          focusZ = THREE.MathUtils.lerp(activeZ, impactZ, 0.6);
          focusDist = 5.5;
          focusFov = 24;
        }
      }

      // Preserve player's current azimuth angle so the perspective stays aligned
      const relativeOffset = new THREE.Vector3().copy(camera.position).sub(orbit.target);
      const azimuth = Math.atan2(relativeOffset.x, relativeOffset.z) || 0;

      const elevation = Math.PI / 5.5; // ~32.7 degree tactical slant
      const yOffset = Math.sin(elevation) * focusDist;
      const hDist = Math.cos(elevation) * focusDist;

      const newX = Math.sin(azimuth) * hDist;
      const newZ = Math.cos(azimuth) * hDist;

      targetLookAt.current.set(focusX, focusY, focusZ);
      targetCamPos.current.set(focusX + newX, focusY + yOffset, focusZ + newZ);
      targetFovVal.current = focusFov;
    }

    // VICTORY CINEMATIC: Smooth orbit around victorious party
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
    // Smooth, zero-jerk exponential damping towards target
    else if (!isInteractingRef.current && timeSinceManual > 1200) {
      const dampSpeed = isCombatImpact ? 5.5 : 4.0;
      orbit.target.x = THREE.MathUtils.damp(orbit.target.x, targetLookAt.current.x, dampSpeed, delta);
      orbit.target.y = THREE.MathUtils.damp(orbit.target.y, targetLookAt.current.y, dampSpeed, delta);
      orbit.target.z = THREE.MathUtils.damp(orbit.target.z, targetLookAt.current.z, dampSpeed, delta);

      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.current.x, dampSpeed, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.current.y, dampSpeed, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.current.z, dampSpeed, delta);

      if ('fov' in camera) {
        const pCam = camera as THREE.PerspectiveCamera;
        pCam.fov = THREE.MathUtils.damp(pCam.fov, targetFovVal.current, dampSpeed, delta);
        pCam.updateProjectionMatrix();
      }

      orbit.update();
    }

    // Apply Screen Shake Camera Jitter if screenShake active
    if (screenShake && screenShake > 0) {
      const shakeIntensity = Math.min(1.5, screenShake * 0.18);
      camera.position.x += (Math.random() - 0.5) * shakeIntensity;
      camera.position.y += (Math.random() - 0.5) * shakeIntensity * 0.7;
      camera.position.z += (Math.random() - 0.5) * shakeIntensity;
    }
  });

  return null;
};

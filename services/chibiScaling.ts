import * as THREE from 'three';

/**
 * Standardized Chibi & Cozy World Metrics & Scale Multipliers
 * Exaggerates horizontal width and compacts vertical height for a chubby, toy-like silhouette.
 */
export const CHIBI_SCALES = {
  TILE_UNIT_SIZE: 1.0,           // 1 Three.js unit = 1 standard tactical block / grid cell
  CHARACTER_HEIGHT: 1.85,        // Enriched, vivid sprite height
  CHARACTER_WIDTH: 1.85,         // Enriched chubby aspect ratio
  MINION_HEIGHT: 1.55,          // Minions (Goblins, Bats, Kobolds)
  MINION_WIDTH: 1.55,           
  BOSS_HEIGHT: 2.50,             // Bosses (Dragons, Trolls, Golems)
  BOSS_WIDTH: 2.50,              
  PREY_HEIGHT: 1.85,             // Hunt roaming beast
  PREY_WIDTH: 1.90,              
  PROP_CHEST_HEIGHT: 0.95,       // Plump chests
  PROP_DECORATION_HEIGHT: 0.95,  
  FLOOR_Y_OFFSET: 0.02,          // Precision offset above floor surface
  SHADOW_SCALE: 0.60,            // Generous rounded drop shadow radius
} as const;

export type ChibiCategory = 'HERO' | 'MINION' | 'BOSS' | 'PREY' | 'PROP' | 'DECORATION';

export interface ChibiProportions {
  width: number;
  height: number;
  shadowScale: number;
  auraRadius: number;
  category: ChibiCategory;
  scaleMultiplier: number;
}

/**
 * Detects entity category and returns exaggerated Chibi proportions.
 */
export function getChibiProportions(entity?: {
  name?: string;
  type?: string;
  maxHp?: number;
  stats?: { maxHp?: number; level?: number };
}): ChibiProportions {
  const name = (entity?.name || '').toLowerCase();
  const type = (entity?.type || '').toUpperCase();
  const hp = entity?.stats?.maxHp || entity?.maxHp || 10;

  // Boss Detection (Dragons, Trolls, Golems, Liches, Beholders, or high HP)
  const isBoss = 
    hp >= 60 ||
    name.includes('dragon') ||
    name.includes('troll') ||
    name.includes('boss') ||
    name.includes('golem') ||
    name.includes('lich') ||
    name.includes('demon');

  // Minion Detection (Goblins, Bats, Rats, Skeletons, Kobolds)
  const isMinion =
    !isBoss && (
      name.includes('goblin') ||
      name.includes('bat') ||
      name.includes('rat') ||
      name.includes('kobold') ||
      name.includes('slime') ||
      (hp <= 12 && type === 'ENEMY')
    );

  if (isBoss) {
    return {
      width: CHIBI_SCALES.BOSS_WIDTH,
      height: CHIBI_SCALES.BOSS_HEIGHT,
      shadowScale: CHIBI_SCALES.SHADOW_SCALE * 1.5,
      auraRadius: 0.75,
      category: 'BOSS',
      scaleMultiplier: 1.35
    };
  }

  if (isMinion) {
    return {
      width: CHIBI_SCALES.MINION_WIDTH,
      height: CHIBI_SCALES.MINION_HEIGHT,
      shadowScale: CHIBI_SCALES.SHADOW_SCALE * 0.85,
      auraRadius: 0.42,
      category: 'MINION',
      scaleMultiplier: 0.88
    };
  }

  // Standard Hero / Companion / Normal Enemy
  return {
    width: CHIBI_SCALES.CHARACTER_WIDTH,
    height: CHIBI_SCALES.CHARACTER_HEIGHT,
    shadowScale: CHIBI_SCALES.SHADOW_SCALE,
    auraRadius: 0.52,
    category: type === 'PLAYER' ? 'HERO' : 'MINION',
    scaleMultiplier: 1.0
  };
}

/**
 * Normalizes and squashes a 3D Object/Mesh to enforce a chunky chibi silhouette.
 */
export function applyChibiTransform(
  object: THREE.Object3D,
  options: {
    category?: ChibiCategory;
    targetHeight?: number;
    squashFactor?: number;      // < 1.0 squashes Y
    widenFactor?: number;       // > 1.0 widens X and Z
    floorOffset?: number;
  } = {}
): { scale: THREE.Vector3; offsetY: number } {
  const {
    targetHeight = CHIBI_SCALES.CHARACTER_HEIGHT,
    squashFactor = 0.92,
    widenFactor = 1.12,
    floorOffset = CHIBI_SCALES.FLOOR_Y_OFFSET
  } = options;

  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);

  if (box.isEmpty()) {
    return { scale: new THREE.Vector3(1, 1, 1), offsetY: floorOffset };
  }

  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const baseScale = targetHeight / Math.max(size.y, 0.001);
  const finalScale = new THREE.Vector3(
    baseScale * widenFactor,
    baseScale * squashFactor,
    baseScale * widenFactor
  );

  object.scale.copy(finalScale);

  const offsetY = -box.min.y * finalScale.y + floorOffset;
  object.position.set(-center.x * finalScale.x, offsetY, -center.z * finalScale.z);
  object.updateMatrixWorld(true);

  return { scale: finalScale, offsetY };
}

/**
 * Calculates organic squash-and-stretch parameters for cozy chibi animations.
 * Ensures the feet remain strictly anchored to the floor (bobY = 0) during idle breathing,
 * preventing any vertical floating while expanding the torso and head upwards.
 */
export function calculateChibiSquashAndStretch(params: {
  time: number;
  phaseOffset: number;
  isCurrentTurn?: boolean;
  isFlashing?: boolean;
  isMoving?: boolean;
}) {
  const { time, phaseOffset, isCurrentTurn, isFlashing, isMoving } = params;

  if (isFlashing) {
    // Impact recoil squash - feet stay grounded at y = 0
    return {
      bobY: 0,
      scaleX: 1.18,
      scaleY: 0.82,
      shadowScaleModifier: 1.15
    };
  }

  if (isMoving) {
    // Running waddle / step bounce: Only lift during actual walking steps
    const hop = Math.abs(Math.sin(time * 8.0 + phaseOffset));
    const bobY = hop * 0.12;
    const scaleY = 1.0 + (hop - 0.5) * 0.14;
    const scaleX = 1.0 - (hop - 0.5) * 0.08;
    return {
      bobY,
      scaleX,
      scaleY,
      shadowScaleModifier: 1.0 - hop * 0.3
    };
  }

  if (isCurrentTurn) {
    // Keep perfectly static when idle to feel like a classic RPG piece, even on current turn
    return {
      bobY: 0,
      scaleX: 1.0,
      scaleY: 1.0,
      shadowScaleModifier: 1.0
    };
  }

  // Standard idle is completely static: solid, classic RPG feel with no breathing scale oscillations
  return {
    bobY: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    shadowScaleModifier: 1.0
  };
}

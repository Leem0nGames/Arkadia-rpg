import { Attributes, CharacterClass, CharacterRace, TerrainType } from '../types';
import { ArmorResistances, ArmorSpecialEffects, ArmorImmunities } from './armor';

export enum BattleAction {
  MOVE = 'MOVE',
  ATTACK = 'ATTACK',
  MAGIC = 'MAGIC',
  ITEM = 'ITEM',
  WAIT = 'WAIT',
  RUN = 'RUN',
  LOOT = 'LOOT'
}

export enum SpellType {
  DAMAGE = 'DAMAGE',
  HEAL = 'HEAL',
  BUFF = 'BUFF',
  PROJECTILE = 'PROJECTILE',
  BURST = 'BURST',
  BEAM = 'BEAM'
}

export interface Spell {
  id: string;
  name: string;
  level: number;
  range: number;
  type: SpellType;
  diceCount: number;
  diceSides: number;
  description: string;
  animation?: string;
  manaCost?: number;
}

export enum AIBehavior {
  BASIC_MELEE = 'BASIC_MELEE',
  AGRESSIVE_BEAST = 'AGRESSIVE_BEAST',
  SPELLCASTER = 'SPELLCASTER',
  DEFENSIVE = 'DEFENSIVE'
}

export interface CombatStatsComponent {
  level: number;
  class: CharacterClass;
  race?: CharacterRace;
  xp: number;
  xpToNextLevel: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  ac: number;
  initiativeBonus: number;
  speed: number;
  attributes: Attributes;
  baseAttributes: Attributes;
  spellSlots: {
      current: number;
      max: number;
  };
  hitDice?: {
      current: number;
      max: number;
      dieSides: number;
  };
  conditions?: string[];
  // New Armor Stats (optional for backward compatibility)
  resistances?: ArmorResistances;
  immunities?: ArmorImmunities[];
  specialEffects?: ArmorSpecialEffects;
  warmth?: number;
  movementSpeedModifier?: number;
}

export enum BattleHazardType {
  FIRE = 'FIRE',
  DIFFICULT_TERRAIN = 'DIFFICULT_TERRAIN',
  SPIKE_GROWTH = 'SPIKE_GROWTH',
  POISON_CLOUD = 'POISON_CLOUD',
  ICE_SHEET = 'ICE_SHEET',
  ELECTRIFIED = 'ELECTRIFIED',
  HOLY_GROUND = 'HOLY_GROUND'
}

export interface BattleHazard {
  id: string;
  type: BattleHazardType;
  x: number;
  z: number;
  duration?: number;
  name: string;
  description: string;
  sourceEntityId?: string;
}

export interface BattleCell {
  x: number;
  z: number;
  height: number;
  offsetY: number;
  color: string;
  textureUrl: string;
  isObstacle: boolean;
  terrain?: TerrainType;
  hazard?: BattleHazard;
}

export interface VoxelBlock {
  x: number;
  y: number;
  z: number;
  textureUrl: string;
  isSolid?: boolean;
  color?: string;
  isObstacle?: boolean;
}


export interface DamagePopup {
  id: string;
  x?: number;
  y?: number;
  z?: number;
  position?: [number, number, number];
  amount: number | string;
  color?: string;
  isCrit?: boolean;
  timestamp: number;
}

export interface DiceRollOverlayData {
  d20Roll?: number;
  modifier?: number;
  totalRoll?: number;
  total?: number;
  isCrit?: boolean;
  targetName?: string;
  rollerName?: string;
  actionType?: string;
  targetAc?: number;
  targetDc?: number;
  isCritFail?: boolean;
  isHit?: boolean;
  damagePreview?: number | string;
  onResolved?: () => void;
}

export interface SpellEffectData {
  id?: string;
  type: SpellType;
  diceCount?: number;
  diceSides?: number;
  targetName?: string;
  result?: number;
  textureUrl?: string;
  color?: string;
  startPos?: [number, number, number];
  endPos?: [number, number, number];
  duration?: number;
  animationKey?: string;
  projectileSprite?: string;
  spriteSheetUrl?: string;
  timestamp?: number;
}

export interface InitiativeRollDetail {
  entityId: string;
  roll?: number;
  d20Roll?: number;
  dexModifier?: number;
  dexScore?: number;
  total?: number;
}

export interface AttackForecast {
  attacker: any;
  target: any;
  actionName: string;
  actionIcon?: string;
  actionType: 'MELEE' | 'RANGED' | 'SPELL' | 'HEAL';
  hitChance: number;
  minDamage: number;
  maxDamage: number;
  avgDamage: number;
  diceFormula: string;
  currentHp: number;
  maxHp: number;
  projectedHp: number;
  isHealing?: boolean;
  isFullCover?: boolean;
  isHalfCover?: boolean;
  hasHighGround?: boolean;
  isFriendlyTarget?: boolean;
  effectiveAC?: number;
}

export interface PendingLevelUp {
  entityId: string;
  newLevel: number;
  entityName?: string;
  previousLevel?: number;
  spriteUrl?: string;
  race?: string;
  className?: string;
  proficiencyBonus?: number;
  availableStatPoints?: number;
  allocatedStats?: Attributes;
  previousAttributes?: Attributes;
  previousMaxHp?: number;
  previousMaxStamina?: number;
  hitDie?: number;
  rolledHpGain?: number;
  averageHpGain?: number;
  hpChoice?: 'FIXED' | 'ROLL' | 'average' | 'rolled';
  isRollingDie?: boolean;
  newSpellSlots?: any;
  previousSpellSlots?: any;
}



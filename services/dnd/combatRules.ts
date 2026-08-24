import {
  Entity,
  CombatStatsComponent,
  PositionComponent,
  BattleCell,
  EquipmentSlot,
  CharacterClass,
  Difficulty,
  InitiativeRollDetail,
} from '../../types';
import { DIFFICULTY_SETTINGS } from '../../constants';
import { useContentStore } from '../../store/contentStore';
import { rollD20 } from './dice';
import { getModifier, getProficiencyBonus } from './stats';
import { DamageType } from '../../types/armor';
import { calculateScaledEnemyStats } from './zoneDifficulty';

export interface DetailedAttackRoll {
  d20: number;
  attrBonus: number;
  attrName: string;
  profBonus: number;
  heightBonus: number;
  total: number;
  isCrit: boolean;
  isCritFail: boolean;
  targetAC: number;
  hit: boolean;
  formulaString: string;
}

export interface DetailedDamageRoll {
  diceCount: number;
  diceSides: number;
  diceRolls: number[];
  diceSum: number;
  attrBonus: number;
  attrName: string;
  total: number;
  isCrit: boolean;
  damageType: string;
  formulaString: string;
}

/**
 * Calculates D&D 5E Initiative for combatants:
 * Formula: 1d20 + DEX Modifier (or explicit initiativeBonus)
 * Tie-breaker: Highest Dexterity score, then random d20 tie-breaker.
 */
export const calculateInitiativeRolls = (
  entities: Array<Entity & { stats: CombatStatsComponent }>
): { turnOrder: string[]; rollDetails: Record<string, InitiativeRollDetail> } => {
  const rollDetails: Record<string, InitiativeRollDetail> = {};

  const evaluated = entities.map((entity) => {
    const d20 = rollD20().result;
    const dexScore = entity.stats.attributes?.DEX ?? 10;
    const dexModifier =
      entity.stats.initiativeBonus !== undefined
        ? entity.stats.initiativeBonus
        : getModifier(dexScore);
    const total = d20 + dexModifier;

    rollDetails[entity.id] = {
      entityId: entity.id,
      d20Roll: d20,
      dexModifier,
      dexScore,
      total,
    };

    return {
      id: entity.id,
      total,
      dexScore,
      tieBreaker: Math.random(),
    };
  });

  // Sort descending: Total Initiative > DEX Score > Tie Breaker
  evaluated.sort((a, b) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }
    if (b.dexScore !== a.dexScore) {
      return b.dexScore - a.dexScore;
    }
    return b.tieBreaker - a.tieBreaker;
  });

  return {
    turnOrder: evaluated.map((e) => e.id),
    rollDetails,
  };
};

export const checkLineOfSight = (
  start: PositionComponent,
  end: PositionComponent,
  map: BattleCell[]
): boolean => {
  let x0 = start.x;
  let y0 = start.y;
  const x1 = end.x;
  const y1 = end.y;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    if (x0 === x1 && y0 === y1) break;

    if (x0 !== start.x || y0 !== start.y) {
      const cell = map.find((c) => c.x === x0 && c.z === y0);
      // Tall obstacles (height >= 3.0) block Line of Sight completely (Full Cover)
      if (cell && cell.isObstacle && (cell.height || 1) >= 3.0) {
        return false;
      }
    }

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return true;
};

/**
 * Calculates D&D 5E Cover bonus:
 * Height >= 3.0 = Full Cover (blocks line of sight completely)
 * Height 2.0 (boulders, barrels, etc.) = Half Cover (+2 AC bonus)
 * Height <= 1.0 or non-obstacle = No Cover (+0 AC)
 */
export const calculateCoverBonus = (
  start: PositionComponent,
  end: PositionComponent,
  map: BattleCell[]
): number => {
  let x0 = start.x;
  let y0 = start.y;
  const x1 = end.x;
  const y1 = end.y;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let hasHalfCover = false;

  while (true) {
    if (x0 === x1 && y0 === y1) break;

    if (x0 !== start.x || y0 !== start.y) {
      const cell = map.find((c) => c.x === x0 && c.z === y0);
      if (cell && cell.isObstacle) {
        if ((cell.height || 1) >= 3.0) {
          return 99; // Full Cover (Blocks LoS entirely)
        } else {
          hasHalfCover = true; // Half Cover (+2 AC bonus)
        }
      }
    }

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return hasHalfCover ? 2 : 0;
};

/**
 * Helper to determine the attacking attribute modifier and attribute name
 * based on weapon properties (Finesse, Range) and character class (Rogue, Ranger).
 */
export const getAttackingModifierAndName = (
  attacker: Entity & { stats: CombatStatsComponent },
  weapon: any
): { mod: number; attrName: string } => {
  let mod = getModifier(attacker.stats.attributes.STR);
  let attrName = 'STR';

  if (weapon?.equipmentStats?.properties?.includes('Finesse')) {
    const strMod = getModifier(attacker.stats.attributes.STR);
    const dexMod = getModifier(attacker.stats.attributes.DEX);
    if (dexMod > strMod) {
      mod = dexMod;
      attrName = 'DEX';
    } else {
      mod = strMod;
      attrName = 'STR';
    }
  } else if (weapon?.equipmentStats?.properties?.includes('Range')) {
    mod = getModifier(attacker.stats.attributes.DEX);
    attrName = 'DEX';
  } else if (
    attacker.stats.class === CharacterClass.ROGUE ||
    attacker.stats.class === CharacterClass.RANGER
  ) {
    const strMod = getModifier(attacker.stats.attributes.STR);
    const dexMod = getModifier(attacker.stats.attributes.DEX);
    if (dexMod > strMod) {
      mod = dexMod;
      attrName = 'DEX';
    } else {
      mod = strMod;
      attrName = 'STR';
    }
  }

  return { mod, attrName };
};

export const calculateHeightBonus = (
  attackerPos: { x: number; y: number },
  defenderPos: { x: number; y: number },
  map: BattleCell[]
): number => {
  if (!map || map.length === 0) return 0;
  const attackerCell = map.find((c) => c.x === attackerPos.x && c.z === attackerPos.y);
  const defenderCell = map.find((c) => c.x === defenderPos.x && c.z === defenderPos.y);

  const attackerH = attackerCell ? (attackerCell.offsetY || 0) + (attackerCell.height || 1) : 1;
  const defenderH = defenderCell ? (defenderCell.offsetY || 0) + (defenderCell.height || 1) : 1;

  return attackerH > defenderH + 0.5 ? 2 : 0;
};

// 1. Attack Roll
export const calculateAttackRoll = (
  attacker: Entity & { stats: CombatStatsComponent },
  weaponSlot: EquipmentSlot = EquipmentSlot.MAIN_HAND
) => {
  const weapon = attacker.equipment[weaponSlot];
  const { mod, attrName } = getAttackingModifierAndName(attacker, weapon);

  const prof = getProficiencyBonus(attacker.stats.level);
  const roll = rollD20();
  const isCrit = roll.result === 20;
  const isCritFail = roll.result === 1;
  const total = roll.result + mod + prof;

  return { total, isCrit, isCritFail, roll: roll.result, mod, attrName, prof };
};

export const calculateDetailedAttackRoll = (
  attacker: Entity & { stats: CombatStatsComponent },
  targetAC: number,
  heightBonus = 0,
  weaponSlot: EquipmentSlot = EquipmentSlot.MAIN_HAND
): DetailedAttackRoll => {
  const baseRoll = calculateAttackRoll(attacker, weaponSlot);
  const total = baseRoll.total + heightBonus;
  const isCrit = baseRoll.isCrit;
  const isCritFail = baseRoll.isCritFail;

  const hit = isCrit || (!isCritFail && total >= targetAC);

  const parts = [
    `d20(${baseRoll.roll})`,
    `${baseRoll.mod >= 0 ? '+' : ''}${baseRoll.mod}(${baseRoll.attrName})`,
    `+${baseRoll.prof}(Prof)`,
  ];
  if (heightBonus > 0) parts.push(`+${heightBonus}(HighGround)`);

  const formulaString = `[${parts.join(' ')} = ${total} vs AC ${targetAC}]`;

  return {
    d20: baseRoll.roll,
    attrBonus: baseRoll.mod,
    attrName: baseRoll.attrName,
    profBonus: baseRoll.prof,
    heightBonus,
    total,
    isCrit,
    isCritFail,
    targetAC,
    hit,
    formulaString,
  };
};

// 2. Damage Roll
export const calculateDamage = (
  attacker: Entity & { stats: CombatStatsComponent },
  defender: Entity & { stats: CombatStatsComponent },
  weaponSlot: EquipmentSlot = EquipmentSlot.MAIN_HAND,
  isCrit = false,
  customDamageType?: DamageType
) => {
  const detailed = calculateDetailedDamage(attacker, defender, weaponSlot, isCrit, customDamageType);
  return detailed.total;
};

export const calculateDetailedDamage = (
  attacker: Entity & { stats: CombatStatsComponent },
  defender: Entity & { stats: CombatStatsComponent },
  weaponSlot: EquipmentSlot = EquipmentSlot.MAIN_HAND,
  isCrit = false,
  customDamageType?: DamageType
): DetailedDamageRoll => {
  const weapon = attacker.equipment[weaponSlot];
  const { mod, attrName } = getAttackingModifierAndName(attacker, weapon);

  const baseDiceCount = weapon?.equipmentStats?.diceCount || 1;
  const diceSides = weapon?.equipmentStats?.diceSides || (weapon ? 4 : 1);
  const totalDiceCount = isCrit ? baseDiceCount * 2 : baseDiceCount;

  const diceRolls: number[] = [];
  for (let i = 0; i < totalDiceCount; i++) {
    diceRolls.push(Math.floor(Math.random() * diceSides) + 1);
  }
  const diceSum = diceRolls.reduce((a, b) => a + b, 0);

  const attrBonus = weaponSlot === EquipmentSlot.MAIN_HAND ? mod : 0;
  let total = Math.max(1, diceSum + attrBonus);

  // Apply Resistance
  if (customDamageType && defender.stats.resistances) {
    const resistance = defender.stats.resistances[customDamageType] || 0;
    total = Math.floor(total * (1 - resistance));
  }

  const damageType =
    customDamageType ||
    (weapon?.equipmentStats?.properties?.includes('Range')
      ? 'Piercing'
      : weapon?.equipmentStats?.properties?.includes('Finesse')
      ? 'Piercing'
      : weapon
      ? 'Slashing'
      : 'Bludgeoning');

  const formulaString = isCrit
    ? `[Crit ${totalDiceCount}d${diceSides}(${diceRolls.join(', ')}) + ${attrBonus}(${attrName}) = ${total} ${damageType}]`
    : `[${totalDiceCount}d${diceSides}(${diceRolls.join(', ')}) + ${attrBonus}(${attrName}) = ${total} ${damageType}]`;

  return {
    diceCount: totalDiceCount,
    diceSides,
    diceRolls,
    diceSum,
    attrBonus,
    attrName,
    total,
    isCrit,
    damageType,
    formulaString,
  };
};

// 3. Enemy Scaling
export const calculateEnemyStats = (
  baseDef: any,
  level: number,
  difficulty: Difficulty,
  q: number = 0,
  r: number = 0,
  dimension: any = undefined,
  isBoss: boolean = false
) => {
  return calculateScaledEnemyStats(baseDef, level, difficulty, q, r, dimension, isBoss);
};

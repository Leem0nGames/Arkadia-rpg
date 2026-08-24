import { Attributes, CharacterClass } from '../../types';

export const getModifier = (score: number): number => {
  return Math.floor((score - 10) / 2);
};

export const getProficiencyBonus = (level: number): number => {
  return Math.floor((level - 1) / 4) + 2;
};

export const calculateAC = (
  dex: number,
  armorBase: number = 10,
  hasShield: boolean = false,
  armorType: 'light' | 'medium' | 'heavy' = 'light'
): number => {
  let dexBonus = getModifier(dex);
  if (armorType === 'medium') dexBonus = Math.min(2, dexBonus);
  if (armorType === 'heavy') dexBonus = 0;

  return armorBase + dexBonus + (hasShield ? 2 : 0);
};

export const calculateHp = (level: number, con: number, hitDie: number): number => {
  const mod = getModifier(con);
  return hitDie + mod + (level - 1) * Math.max(1, Math.floor(hitDie / 2) + 1 + mod);
};

export const getHitDieForClass = (cls: CharacterClass): number => {
  if (cls === CharacterClass.BARBARIAN) return 12;
  if ([CharacterClass.FIGHTER, CharacterClass.PALADIN, CharacterClass.RANGER].includes(cls)) return 10;
  if ([CharacterClass.WIZARD, CharacterClass.SORCERER].includes(cls)) return 6;
  return 8; // Rogue, Cleric, Druid, Bard, Warlock
};

export const getCasterSpellSlots = (
  cls: CharacterClass,
  level: number
): { current: number; max: number } => {
  const isFullCaster = [
    CharacterClass.WIZARD,
    CharacterClass.CLERIC,
    CharacterClass.DRUID,
    CharacterClass.SORCERER,
    CharacterClass.BARD,
  ].includes(cls);

  if (isFullCaster) {
    if (level === 1) return { current: 2, max: 2 };
    if (level === 2) return { current: 3, max: 3 };
    if (level === 3) return { current: 4, max: 4 };
    if (level === 4) return { current: 4, max: 4 };
    return {
      current: Math.min(10, 4 + Math.floor((level - 4) * 1.5)),
      max: Math.min(10, 4 + Math.floor((level - 4) * 1.5)),
    };
  }
  if (cls === CharacterClass.WARLOCK) {
    if (level === 1) return { current: 1, max: 1 };
    if (level < 11) return { current: 2, max: 2 };
    return { current: 3, max: 3 };
  }
  if ([CharacterClass.PALADIN, CharacterClass.RANGER].includes(cls)) {
    if (level === 1) return { current: 0, max: 0 };
    if (level === 2) return { current: 2, max: 2 };
    if (level === 3) return { current: 3, max: 3 };
    return {
      current: Math.min(6, 3 + Math.floor((level - 3) * 1)),
      max: Math.min(6, 3 + Math.floor((level - 3) * 1)),
    };
  }
  return { current: 0, max: 0 };
};

export const calculateMaxStamina = (con: number, level: number): number => {
  return Math.max(5, 10 + getModifier(con) + Math.floor(level / 2));
};

export const calculateLevelHpGain = (
  hitDie: number,
  conScore: number,
  rolledValue?: number
): number => {
  const conMod = getModifier(conScore);
  const baseGain = rolledValue !== undefined ? rolledValue : Math.floor(hitDie / 2) + 1;
  return Math.max(1, baseGain + conMod);
};

export const calculateVisionRange = (wis: number): number => {
  return Math.max(1, 2 + getModifier(wis));
};

// Character creation attributes
export const POINT_BUY_TOTAL = 27;

export const POINT_BUY_COST_TABLE: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export const calculatePointBuyCost = (stats: Attributes): number => {
  return Object.values(stats).reduce((sum, val) => {
    const clamped = Math.min(15, Math.max(8, val));
    return sum + (POINT_BUY_COST_TABLE[clamped] ?? 0);
  }, 0);
};

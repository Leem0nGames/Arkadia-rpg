import { Dimension, Difficulty, Item, ItemRarity } from '../../types';
import { DIFFICULTY_SETTINGS, ITEMS } from '../../constants';
import { useContentStore } from '../../store/contentStore';

export interface FatiguePenalties {
  tierName: string;
  initiativePenalty: number;
  speedPenalty: number;
  attackPenalty: number;
  disadvantage: boolean;
}

/**
 * Calculates the Zone Danger Level based on distance from the capital (0,0)
 * and dimension (Normal vs. Upside-Down Shadow Realm).
 */
export const calculateZoneLevel = (q: number = 0, r: number = 0, dimension: Dimension = Dimension.NORMAL): number => {
  const distFromOrigin = (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2;
  
  let baseZoneLevel = 1;
  if (distFromOrigin <= 8) {
    baseZoneLevel = 1 + Math.floor(distFromOrigin / 4); // Lvl 1 - 2
  } else if (distFromOrigin <= 18) {
    baseZoneLevel = 3 + Math.floor((distFromOrigin - 8) / 3.3); // Lvl 3 - 5
  } else if (distFromOrigin <= 32) {
    baseZoneLevel = 6 + Math.floor((distFromOrigin - 18) / 3.5); // Lvl 6 - 9
  } else {
    baseZoneLevel = 10 + Math.floor((distFromOrigin - 32) / 4); // Lvl 10+
  }

  if (dimension === Dimension.UPSIDE_DOWN) {
    baseZoneLevel += 5; // Shadow Realm is inherently higher danger
  }

  return Math.max(1, Math.min(20, baseZoneLevel));
};

/**
 * Calculates mechanical fatigue penalties based on expedition travel stamina (0% to 100%).
 */
export const getFatiguePenalties = (fatiguePercent: number): FatiguePenalties => {
  if (fatiguePercent >= 100) {
    return {
      tierName: 'Agotamiento Extremo (100%)',
      initiativePenalty: -4,
      speedPenalty: -15,
      attackPenalty: -2,
      disadvantage: true
    };
  } else if (fatiguePercent >= 75) {
    return {
      tierName: 'Exhausto (75%-99%)',
      initiativePenalty: -2,
      speedPenalty: -10,
      attackPenalty: -1,
      disadvantage: false
    };
  } else if (fatiguePercent >= 50) {
    return {
      tierName: 'Fatigado (50%-74%)',
      initiativePenalty: -1,
      speedPenalty: -5,
      attackPenalty: 0,
      disadvantage: false
    };
  }
  return {
    tierName: 'Fresco (0%-49%)',
    initiativePenalty: 0,
    speedPenalty: 0,
    attackPenalty: 0,
    disadvantage: false
  };
};

/**
 * Calculates unified enemy stats and rewards incorporating party level,
 * zone danger (overworld distance), difficulty settings, and boss modifiers.
 */
export const calculateScaledEnemyStats = (
  baseDef: any,
  partyLevel: number,
  difficulty: Difficulty,
  q: number = 0,
  r: number = 0,
  dimension: Dimension = Dimension.NORMAL,
  isBoss: boolean = false
) => {
  const zoneLvl = calculateZoneLevel(q, r, dimension);
  const effectiveLevel = Math.max(partyLevel, zoneLvl);

  const diffSettings = useContentStore.getState().difficultySettings[difficulty] || DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.NORMAL;
  
  const hpBase = baseDef.hp || 20;
  const acBase = baseDef.ac || 11;
  const damageBase = baseDef.damage || 4;
  const baseXp = baseDef.xpReward || 50;

  // Level scaling multiplier
  const levelHpGain = (effectiveLevel - 1) * 6;
  let hp = Math.floor((hpBase + levelHpGain) * diffSettings.enemyStatMod);
  let ac = Math.min(22, acBase + Math.floor((effectiveLevel - 1) / 3));
  let damage = Math.floor((damageBase + Math.floor((effectiveLevel - 1) * 1.2)) * diffSettings.enemyStatMod);

  // Boss scaling
  if (isBoss || baseDef.name?.toLowerCase().includes('dragón') || baseDef.name?.toLowerCase().includes('dragon') || baseDef.name?.toLowerCase().includes('jefe')) {
    hp = Math.floor(hp * 2.2);
    ac = Math.min(24, ac + 2);
    damage = Math.floor(damage * 1.3);
  }

  // XP & Gold Reward calculation
  const xpReward = Math.floor(baseXp * (1 + effectiveLevel * 0.25) * (isBoss ? 2.5 : 1.0) * diffSettings.xpMod);

  return {
    ...baseDef,
    hp: Math.max(5, hp),
    maxHp: Math.max(5, hp),
    ac: Math.max(8, ac),
    damage: Math.max(1, damage),
    level: effectiveLevel,
    xpReward,
    zoneLevel: zoneLvl
  };
};

/**
 * Determines item loot tier dropped by defeated enemies based on zone level and difficulty.
 */
export const getLootDropForZone = (
  zoneLevel: number,
  difficulty: Difficulty
): { gold: number; items: Item[] } => {
  const diffSettings = useContentStore.getState().difficultySettings[difficulty] || DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.NORMAL;

  const baseGold = Math.floor((Math.random() * 15 + 5 + zoneLevel * 8) * diffSettings.goldMod);
  const droppedItems: Item[] = [];

  const dbItems = useContentStore.getState().items;
  const allItems = Object.keys(dbItems).length > 0 ? Object.values(dbItems) : Object.values(ITEMS);

  // Item drop probability scales with zone level
  const dropChance = 0.35 + Math.min(0.4, zoneLevel * 0.03);
  if (Math.random() < dropChance) {
    let eligibleRarities: ItemRarity[] = [ItemRarity.COMMON];
    if (zoneLevel >= 3) eligibleRarities = [ItemRarity.COMMON, ItemRarity.UNCOMMON];
    if (zoneLevel >= 6) eligibleRarities = [ItemRarity.UNCOMMON, ItemRarity.RARE];
    if (zoneLevel >= 10) eligibleRarities = [ItemRarity.RARE, ItemRarity.VERY_RARE, ItemRarity.LEGENDARY];

    const candidates = allItems.filter(i => eligibleRarities.includes(i.rarity));
    if (candidates.length > 0) {
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      droppedItems.push(selected);
    }
  }

  // 40% chance to also drop survival consumables (rations, healing potion, stamina)
  if (Math.random() < 0.40) {
    const consumables = allItems.filter(i => i.type === 'consumable');
    if (consumables.length > 0) {
      const droppedConsumable = consumables[Math.floor(Math.random() * consumables.length)];
      droppedItems.push(droppedConsumable);
    }
  }

  return { gold: baseGold, items: droppedItems };
};

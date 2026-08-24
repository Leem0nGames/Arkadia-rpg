import { Entity, CombatStatsComponent, BattleHazard, BattleHazardType } from '../../types';
import { rollD20, rollDice } from './dice';
import { getModifier } from './stats';

export interface HazardResolutionResult {
  damage: number;
  healing: number;
  isSlip: boolean;
  message: string;
  popupAmount: string;
  popupColor: string;
  popupCrit?: boolean;
}

/**
 * Returns movement cost penalty for a given hazard type.
 * In D&D 5E, difficult terrain costs 2 ft per 1 ft moved (2x cost).
 */
export const getHazardMovementMultiplier = (hazardType?: BattleHazardType): number => {
  if (!hazardType) return 1;
  switch (hazardType) {
    case BattleHazardType.DIFFICULT_TERRAIN:
    case BattleHazardType.SPIKE_GROWTH:
    case BattleHazardType.ICE_SHEET:
      return 2;
    default:
      return 1;
  }
};

/**
 * Evaluates D&D 5E hazard effects when an entity enters a hazard tile.
 */
export const resolveHazardEntry = (
  entity: Entity & { stats: CombatStatsComponent },
  hazard: BattleHazard
): HazardResolutionResult => {
  const isPlayer = entity.type === 'PLAYER';
  const dexScore = entity.stats.attributes?.DEX ?? 10;
  const conScore = entity.stats.attributes?.CON ?? 10;
  const dexMod = getModifier(dexScore);
  const conMod = getModifier(conScore);

  switch (hazard.type) {
    case BattleHazardType.FIRE: {
      const saveRoll = rollD20();
      const saveTotal = saveRoll.result + dexMod;
      const rawDmg = rollDice(6, 1);
      const passed = saveTotal >= 12;
      const dmg = passed ? Math.max(1, Math.floor(rawDmg / 2)) : rawDmg;

      return {
        damage: dmg,
        healing: 0,
        isSlip: false,
        message: `${entity.name} enters Fire Surface! DEX Save (${saveTotal} vs DC 12 - ${passed ? 'Saved' : 'Failed'}). Takes ${dmg} Fire Damage.`,
        popupAmount: `-${dmg} 🔥`,
        popupColor: '#f97316',
      };
    }

    case BattleHazardType.SPIKE_GROWTH: {
      const dmg = rollDice(4, 2);
      return {
        damage: dmg,
        healing: 0,
        isSlip: false,
        message: `${entity.name} treads on Spike Growth thorns! Takes ${dmg} Piercing Damage.`,
        popupAmount: `-${dmg} 🌵`,
        popupColor: '#84cc16',
      };
    }

    case BattleHazardType.POISON_CLOUD: {
      const saveRoll = rollD20();
      const saveTotal = saveRoll.result + conMod;
      const passed = saveTotal >= 13;
      const dmg = passed ? 0 : rollDice(6, 1);

      return {
        damage: dmg,
        healing: 0,
        isSlip: false,
        message: `${entity.name} steps into Poison Cloud! CON Save (${saveTotal} vs DC 13 - ${passed ? 'Resisted' : 'Failed'}). ${dmg > 0 ? `Takes ${dmg} Poison Damage.` : 'No effect.'}`,
        popupAmount: dmg > 0 ? `-${dmg} ☠` : 'RESIST',
        popupColor: dmg > 0 ? '#22c55e' : '#94a3b8',
      };
    }

    case BattleHazardType.ICE_SHEET: {
      const saveRoll = rollD20();
      const saveTotal = saveRoll.result + dexMod;
      const slipped = saveTotal < 10;

      return {
        damage: 0,
        healing: 0,
        isSlip: slipped,
        message: `${entity.name} traverses Slippery Ice! DEX Save (${saveTotal} vs DC 10 - ${slipped ? 'Slipped & Lost Footing!' : 'Balanced'}).`,
        popupAmount: slipped ? 'SLIP! ❄' : 'STEADY',
        popupColor: slipped ? '#38bdf8' : '#cbd5e1',
      };
    }

    case BattleHazardType.ELECTRIFIED: {
      const dmg = rollDice(8, 1);
      return {
        damage: dmg,
        healing: 0,
        isSlip: false,
        message: `${entity.name} stepped into Electrified Surge! Takes ${dmg} Lightning Damage.`,
        popupAmount: `-${dmg} ⚡`,
        popupColor: '#c084fc',
      };
    }

    case BattleHazardType.HOLY_GROUND: {
      if (isPlayer) {
        const heal = rollDice(4, 1);
        return {
          damage: 0,
          healing: heal,
          isSlip: false,
          message: `${entity.name} steps onto Holy Ground! Restores ${heal} HP.`,
          popupAmount: `+${heal} ✨`,
          popupColor: '#fbbf24',
        };
      }
      return {
        damage: 0,
        healing: 0,
        isSlip: false,
        message: `${entity.name} is standing on consecrated Holy Ground.`,
        popupAmount: '',
        popupColor: '#fbbf24',
      };
    }

    case BattleHazardType.DIFFICULT_TERRAIN:
    default: {
      return {
        damage: 0,
        healing: 0,
        isSlip: false,
        message: `${entity.name} pushes through Difficult Terrain (Movement cost doubled).`,
        popupAmount: 'SLOW',
        popupColor: '#ca8a04',
      };
    }
  }
};

/**
 * Resolves hazard effects when an entity starts or ends its turn on a hazard.
 */
export const resolveHazardTurnTick = (
  entity: Entity & { stats: CombatStatsComponent },
  hazard: BattleHazard
): HazardResolutionResult | null => {
  const isPlayer = entity.type === 'PLAYER';

  if (hazard.type === BattleHazardType.FIRE) {
    const dmg = rollDice(6, 1);
    return {
      damage: dmg,
      healing: 0,
      isSlip: false,
      message: `${entity.name} takes ${dmg} Fire Damage from standing in flames.`,
      popupAmount: `-${dmg} 🔥`,
      popupColor: '#f97316',
    };
  }

  if (hazard.type === BattleHazardType.POISON_CLOUD) {
    const dmg = rollDice(4, 1);
    return {
      damage: dmg,
      healing: 0,
      isSlip: false,
      message: `${entity.name} suffocates in Poison Cloud for ${dmg} Poison Damage.`,
      popupAmount: `-${dmg} ☠`,
      popupColor: '#22c55e',
    };
  }

  if (hazard.type === BattleHazardType.HOLY_GROUND && isPlayer) {
    const heal = rollDice(4, 1);
    return {
      damage: 0,
      healing: heal,
      isSlip: false,
      message: `${entity.name} is revitalized by Holy Ground (+${heal} HP).`,
      popupAmount: `+${heal} ✨`,
      popupColor: '#fbbf24',
    };
  }

  return null;
};

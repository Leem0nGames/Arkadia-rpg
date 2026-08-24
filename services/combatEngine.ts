import {
  Entity,
  CombatStatsComponent,
  PositionComponent,
  DamagePopup,
  SpellEffectData,
  AIBehavior,
  LootDrop,
  ItemRarity,
  Item,
  GameState,
  SpellType,
} from '../types';
import { findBattlePath } from './pathfinding';
import {
  rollD20,
  rollDice,
  resolveHazardEntry,
  calculateHeightBonus,
} from './dndRules';
import { sfx } from './SoundSystem';
import { ASSETS, DIFFICULTY_SETTINGS, ITEMS } from '../constants';
import { useContentStore } from '../store/contentStore';
import { GameStore } from '../store/gameStore';

export const STAT_COSTS = {
  ATTACK: 3,
  RUN: 5,
  MAGIC: 2,
  LOOT: 2,
} as const;

export const generateId = (): string =>
  Math.random().toString(36).substr(2, 9);

export const getEnemyBehavior = (id: string): AIBehavior => {
  if (id.includes('wolf')) return AIBehavior.AGRESSIVE_BEAST;
  if (
    id.includes('necromancer') ||
    id.includes('adept') ||
    id.includes('mage') ||
    id.includes('sorcerer')
  ) {
    return AIBehavior.SPELLCASTER;
  }
  return AIBehavior.BASIC_MELEE;
};

export interface ApplyDamageResult {
  battleEntities: any[];
  damagePopups: DamagePopup[];
  gameState: GameState;
  lootDrops: LootDrop[];
  battleRewards: { xp: number; gold: number; items: Item[] };
}

export const applyDamage = (
  store: GameStore,
  targetId: string,
  amount: number,
  isCrit = false
): ApplyDamageResult | null => {
  const target = store.battleEntities.find((e: any) => e.id === targetId);
  if (!target) return null;

  if (isCrit || amount >= 10) {
    if (store.triggerScreenShake) store.triggerScreenShake(isCrit ? 3.0 : 1.5);
  }

  const newPopups: DamagePopup[] = [
    ...store.damagePopups,
    {
      id: generateId(),
      position: [target.position.x, 0, target.position.y],
      amount: isCrit ? `${amount}!` : amount,
      color: isCrit ? '#fbbf24' : '#ef4444',
      isCrit,
      timestamp: Date.now(),
    },
  ];

  const newEntities = store.battleEntities.map((e: any) =>
    e.id === targetId
      ? { ...e, stats: { ...e.stats, hp: Math.max(0, e.stats.hp - amount) } }
      : e
  );

  const nextState = {
    ...store,
    gameState: store.gameState,
    lootDrops: store.lootDrops || [],
    battleRewards: store.battleRewards,
  };

  const defeatedTarget = newEntities.find((e: any) => e.id === targetId);
  if (defeatedTarget && defeatedTarget.stats.hp === 0) {
    store.addLog(`${target.name} defeated!`, 'narrative');

    if (target.type === 'ENEMY') {
      const dropChance = 0.3; // 30% base drop rate
      if (Math.random() < dropChance) {
        const diffSettings = useContentStore.getState().difficultySettings[store.difficulty] || DIFFICULTY_SETTINGS[store.difficulty];
        const goldAmount = Math.floor((Math.random() * 15 + 5) * diffSettings.goldMod);

        const droppedItems: Item[] = [];
        if (Math.random() > 1.0 - 0.1 * diffSettings.xpMod) {
          const dbItems = useContentStore.getState().items;
          const allItems = Object.keys(dbItems).length > 0 ? Object.values(dbItems) : Object.values(ITEMS);
          droppedItems.push(allItems[Math.floor(Math.random() * allItems.length)]);
        }

        let maxRarity = ItemRarity.COMMON;
        droppedItems.forEach((i) => {
          if (i.rarity === ItemRarity.LEGENDARY) maxRarity = ItemRarity.LEGENDARY;
          else if (i.rarity === ItemRarity.VERY_RARE && maxRarity !== ItemRarity.LEGENDARY)
            maxRarity = ItemRarity.VERY_RARE;
          else if (i.rarity === ItemRarity.RARE && maxRarity !== ItemRarity.VERY_RARE)
            maxRarity = ItemRarity.RARE;
        });

        const newDrop: LootDrop = {
          id: generateId(),
          position: { ...target.position },
          gold: goldAmount,
          items: droppedItems,
          rarity: maxRarity,
        };
        nextState.lootDrops = [...nextState.lootDrops, newDrop];
        store.addLog('A loot bag drops to the ground.', 'loot');
      }
    }

    // VICTORY / DEFEAT CHECK
    if (!newEntities.some((e: any) => e.type === 'ENEMY' && e.stats.hp > 0)) {
      const allGold = nextState.lootDrops.reduce(
        (sum: number, drop: LootDrop) => sum + drop.gold,
        nextState.battleRewards.gold
      );
      const allItems = nextState.lootDrops.reduce(
        (list: Item[], drop: LootDrop) => [...list, ...drop.items],
        nextState.battleRewards.items
      );

      nextState.battleRewards = { ...nextState.battleRewards, gold: allGold, items: allItems };
      nextState.lootDrops = [];
      setTimeout(() => store.setGameState(GameState.BATTLE_VICTORY), 1500);
    } else if (!newEntities.some((e: any) => e.type === 'PLAYER' && e.stats.hp > 0)) {
      setTimeout(() => store.setGameState(GameState.BATTLE_DEFEAT), 1500);
    }
  }

  return {
    battleEntities: newEntities,
    damagePopups: newPopups,
    gameState: nextState.gameState,
    lootDrops: nextState.lootDrops,
    battleRewards: nextState.battleRewards,
  };
};

export const performEnemyAction = (
  store: GameStore,
  enemy: Entity & { stats: CombatStatsComponent; position: PositionComponent },
  targets: any[],
  set: (partial: any) => void
): Record<string, any> => {
  // Clear "SHIELDED" condition if the enemy starts their turn with it
  let clearedShieldLog = false;
  let activeEntities = store.battleEntities.map((e: any) => {
    if (e.id === enemy.id && e.stats.conditions?.includes('SHIELDED')) {
      clearedShieldLog = true;
      const filteredConditions = e.stats.conditions.filter((c: string) => c !== 'SHIELDED');
      return {
        ...e,
        stats: {
          ...e.stats,
          ac: Math.max(10, e.stats.ac - 4),
          conditions: filteredConditions
        }
      };
    }
    return e;
  });

  const refreshedEnemy = activeEntities.find((e: any) => e.id === enemy.id) || enemy;
  if (clearedShieldLog) {
    store.addLog(`🛡️ El escudo de baluarte de ${enemy.name} se ha disipado.`, 'info');
  }

  const aiBehavior = refreshedEnemy.aiBehavior || AIBehavior.BASIC_MELEE;

  // ------------------ DYNAMIC TARGET SELECTION ------------------
  let target = targets[0];
  if (aiBehavior === AIBehavior.AGRESSIVE_BEAST || aiBehavior === AIBehavior.SPELLCASTER) {
    // Target the squishiest/weakest player (lowest HP)
    let lowestHp = 999;
    targets.forEach((p) => {
      if (p.stats.hp < lowestHp) {
        lowestHp = p.stats.hp;
        target = p;
      }
    });
  } else {
    // Target the closest player
    let minDist = 999;
    targets.forEach((p) => {
      const d = Math.abs(refreshedEnemy.position.x - p.position.x) + Math.abs(refreshedEnemy.position.y - p.position.y);
      if (d < minDist) {
        minDist = d;
        target = p;
      }
    });
  }

  // Intercept and guard mechanic for DEFENSIVE role
  if (aiBehavior === AIBehavior.DEFENSIVE) {
    // If a player is adjacent to any friendly spellcaster, intercept them instead!
    const spellcasterAlly = activeEntities.find((e: any) => e.type === 'ENEMY' && e.id !== refreshedEnemy.id && e.aiBehavior === AIBehavior.SPELLCASTER && e.stats.hp > 0);
    if (spellcasterAlly) {
      const adjacentPlayer = targets.find((p) => Math.abs(spellcasterAlly.position.x - p.position.x) + Math.abs(spellcasterAlly.position.y - p.position.y) <= 1);
      if (adjacentPlayer) {
        target = adjacentPlayer;
        store.addLog(`🛡️ ${refreshedEnemy.name} se apresura a proteger a ${spellcasterAlly.name}!`, 'info');
      }
    }
  }

  let dist = Math.abs(refreshedEnemy.position.x - target.position.x) + Math.abs(refreshedEnemy.position.y - target.position.y);
  let newState: Record<string, any> = { battleEntities: activeEntities };

  // ------------------ 1. SPELLCASTER BEHAVIOR ------------------
  if (aiBehavior === AIBehavior.SPELLCASTER) {
    // A. HEALING ACTION: Heal a damaged ally
    if (refreshedEnemy.stats.spellSlots.current > 0) {
      const damagedAlly = activeEntities.find((e: any) => {
        return e.type === 'ENEMY' && 
               e.id !== refreshedEnemy.id && 
               e.stats.hp > 0 && 
               e.stats.hp < e.stats.maxHp * 0.6 &&
               Math.abs(refreshedEnemy.position.x - e.position.x) + Math.abs(refreshedEnemy.position.y - e.position.y) <= 4;
      });

      if (damagedAlly) {
        const healAmount = rollDice(8, 2) + 2; // 2d8 + 2
        store.addLog(`✨ ${refreshedEnemy.name} casts Dark Mend on ${damagedAlly.name}!`, 'combat');
        sfx.playSpellCast('Heal', 1);

        const effect: SpellEffectData = {
          id: generateId(),
          type: SpellType.BURST,
          startPos: [damagedAlly.position.x, 1.5, damagedAlly.position.y],
          endPos: [damagedAlly.position.x, 1.0, damagedAlly.position.y],
          color: '#a855f7',
          duration: 900,
          timestamp: Date.now(),
          spriteSheetUrl: ASSETS.SPELL_FX.CASTING,
        };
        set({ activeSpellEffect: effect });
        setTimeout(() => set({ activeSpellEffect: null }), 1000);

        const updatedEntities = activeEntities.map((e: any) => {
          if (e.id === damagedAlly.id) {
            return { ...e, stats: { ...e.stats, hp: Math.min(e.stats.maxHp, e.stats.hp + healAmount) } };
          }
          if (e.id === refreshedEnemy.id) {
            return {
              ...e,
              stats: {
                ...e.stats,
                spellSlots: { ...e.stats.spellSlots, current: e.stats.spellSlots.current - 1 }
              }
            };
          }
          return e;
        });

        const popups = [
          ...store.damagePopups,
          {
            id: generateId(),
            position: [damagedAlly.position.x, 0, damagedAlly.position.y] as [number, number, number],
            amount: `+${healAmount}`,
            color: '#a855f7',
            isCrit: false,
            timestamp: Date.now()
          }
        ];

        return { battleEntities: updatedEntities, damagePopups: popups };
      }
    }

    // B. KITING / RETREAT ACTION: If adjacent, back off to casting range
    let currentPos = { ...refreshedEnemy.position };
    if (dist <= 1) {
      // Find empty cell adjacent to current tile that is further from the target
      const retreatTiles = store.battleMap.filter((cell) => {
        if (cell.isObstacle) return false;
        const cellDist = Math.abs(cell.x - target.position.x) + Math.abs(cell.z - target.position.y);
        const selfDist = Math.abs(cell.x - refreshedEnemy.position.x) + Math.abs(cell.z - refreshedEnemy.position.y);
        // Adjacent to current pos, and further from player
        return selfDist === 1 && cellDist > dist && !activeEntities.some((ent: any) => ent.stats.hp > 0 && ent.position.x === cell.x && ent.position.y === cell.z);
      });

      if (retreatTiles.length > 0) {
        const bestTile = retreatTiles[0];
        store.addLog(`🏃 ${refreshedEnemy.name} se retira tácticamente para mantener distancia.`, 'info');
        sfx.playTacticalMove(bestTile.terrain);
        currentPos = { x: bestTile.x, y: bestTile.z };
        activeEntities = activeEntities.map((e: any) => {
          if (e.id === refreshedEnemy.id) {
            return { ...e, position: currentPos };
          }
          return e;
        });
        dist = Math.abs(currentPos.x - target.position.x) + Math.abs(currentPos.y - target.position.y);
        newState = { battleEntities: activeEntities };
      }
    }

    // C. ATTACK SPELL ACTION
    if (dist > 1 && dist <= 6 && refreshedEnemy.stats.spellSlots.current > 0) {
      store.addLog(`${refreshedEnemy.name} casts Dark Bolt!`, 'combat');
      sfx.playSpellCast('Dark Bolt');

      const effect: SpellEffectData = {
        id: generateId(),
        type: SpellType.PROJECTILE,
        startPos: [currentPos.x, 1.5, currentPos.y],
        endPos: [target.position.x, 1.0, target.position.y],
        color: '#7e22ce',
        duration: 800,
        timestamp: Date.now(),
        projectileSprite: ASSETS.PROJECTILES.NECRO_BOLT,
        spriteSheetUrl: ASSETS.SPELL_FX.PHANTOM,
      };
      set({ activeSpellEffect: effect });
      setTimeout(() => set({ activeSpellEffect: null }), 1000);

      const updatedEntities = activeEntities.map((e: any) =>
        e.id === refreshedEnemy.id
          ? {
              ...e,
              stats: {
                ...e.stats,
                spellSlots: {
                  ...e.stats.spellSlots,
                  current: e.stats.spellSlots.current - 1,
                },
              },
            }
          : e
      );

      const roll = rollD20();
      const spellMod = 3 + Math.floor((refreshedEnemy.stats.level || 1) / 3);
      const heightBonus = calculateHeightBonus(currentPos, target.position, store.battleMap);
      if (heightBonus > 0) {
        store.addLog(`⛰️ Ventaja de Altura! ${refreshedEnemy.name} ataca desde posición elevada (+2 Ataque).`, 'info');
      }
      const totalSpell = roll.result + spellMod + heightBonus;
      const isCrit = roll.result === 20;
      const isCritFail = roll.result === 1;
      const hits = isCrit || (!isCritFail && totalSpell >= target.stats.ac);

      if (store.triggerDiceRoll) {
        store.triggerDiceRoll({
          id: generateId(),
          rollerName: refreshedEnemy.name,
          targetName: target.name,
          actionType: 'SPELL',
          d20Roll: roll.result,
          modifier: spellMod + heightBonus,
          total: totalSpell,
          targetAc: target.stats.ac,
          isHit: hits,
          isCrit,
          isCritFail,
          formulaString: `d20(${roll.result}) + ${spellMod}(Dark Spell)${heightBonus ? ' + 2(HighGround)' : ''} = ${totalSpell} vs CA ${target.stats.ac}`,
          damagePreview: 'Dark Bolt (1d10 + 2 Necrotic)',
        });
      }

      if (hits) {
        const diceCount = isCrit ? 2 : 1;
        const dmg = rollDice(10, diceCount) + 2; // 1d10 + 2
        const res = applyDamage(
          { ...store, battleEntities: updatedEntities },
          target.id,
          dmg,
          isCrit
        );
        if (res) newState = res;
        else newState = { battleEntities: updatedEntities };
      } else {
        store.addLog('Spell fizzled.', 'combat');
        const popups: DamagePopup[] = [
          ...store.damagePopups,
          {
            id: generateId(),
            position: [target.position.x, 0, target.position.y],
            amount: 'MISS',
            color: '#94a3b8',
            isCrit: false,
            timestamp: Date.now(),
          },
        ];
        newState = { battleEntities: updatedEntities, damagePopups: popups };
      }
      return newState;
    }
  }

  // ------------------ 2. AGRESSIVE_BEAST BEHAVIOR (Leap & Pounce) ------------------
  if (aiBehavior === AIBehavior.AGRESSIVE_BEAST) {
    if (dist > 1 && dist <= 3) {
      // Find empty cell adjacent to the target to pounce on
      const adjacentCells = store.battleMap.filter((cell) => {
        if (cell.isObstacle) return false;
        const toTarget = Math.abs(cell.x - target.position.x) + Math.abs(cell.z - target.position.y);
        const isOccupied = activeEntities.some((ent: any) => ent.stats.hp > 0 && ent.position.x === cell.x && ent.position.y === cell.z);
        return toTarget === 1 && !isOccupied;
      });

      if (adjacentCells.length > 0) {
        const bestCell = adjacentCells[0];
        store.addLog(`🐾 ¡Abalanzamiento! ${refreshedEnemy.name} ejecuta un salto feroz sobre ${target.name}.`, 'combat');
        sfx.playTacticalMove(bestCell.terrain);

        // Update position instantly
        activeEntities = activeEntities.map((e: any) => {
          if (e.id === refreshedEnemy.id) {
            return { ...e, position: { x: bestCell.x, y: bestCell.z } };
          }
          return e;
        });

        dist = 1; // Now adjacent!
        refreshedEnemy.position = { x: bestCell.x, y: bestCell.z };
        newState = { battleEntities: activeEntities };
      }
    }
  }

  // ------------------ 3. DEFENSIVE BEHAVIOR (Dodge/Shield & Stun) ------------------
  if (aiBehavior === AIBehavior.DEFENSIVE) {
    const hpRatio = refreshedEnemy.stats.hp / refreshedEnemy.stats.maxHp;
    if (hpRatio < 0.4 || (dist > 1 && refreshedEnemy.stats.stamina < 3)) {
      // Activate Bulwark Stance
      store.addLog(`🛡️ ${refreshedEnemy.name} activa Baluarte defensivo (+4 CA, recupera vitalidad).`, 'info');
      sfx.playSpellCast('Shield', 0);

      set({
        activeSpellEffect: {
          id: generateId(),
          type: SpellType.BURST,
          startPos: [refreshedEnemy.position.x, 1.2, refreshedEnemy.position.y],
          endPos: [refreshedEnemy.position.x, 1.2, refreshedEnemy.position.y],
          color: '#eab308',
          duration: 800,
          timestamp: Date.now(),
          spriteSheetUrl: ASSETS.SPELL_FX.PROTECTION_CIRCLE
        }
      });
      setTimeout(() => set({ activeSpellEffect: null }), 850);

      const popups: DamagePopup[] = [
        ...store.damagePopups,
        {
          id: generateId(),
          position: [refreshedEnemy.position.x, 1.2, refreshedEnemy.position.y],
          amount: 'SHIELDED',
          color: '#eab308',
          isCrit: false,
          timestamp: Date.now()
        }
      ];

      const updatedEntities = activeEntities.map((e: any) => {
        if (e.id === refreshedEnemy.id) {
          const currentConditions = e.stats.conditions || [];
          return {
            ...e,
            stats: {
              ...e.stats,
              ac: e.stats.ac + 4,
              stamina: Math.min(e.stats.maxStamina, e.stats.stamina + 2),
              conditions: [...currentConditions, 'SHIELDED']
            }
          };
        }
        return e;
      });

      return { battleEntities: updatedEntities, damagePopups: popups };
    }
  }

  // ------------------ RESOLVE ADJACENT MELEE ATTACK ------------------
  if (dist <= 1) {
    sfx.playAttack();

    // Aggressive beast and high-ground roll with advantage!
    const roll1 = rollD20();
    const roll2 = aiBehavior === AIBehavior.AGRESSIVE_BEAST ? rollD20() : roll1;
    const bestD20 = Math.max(roll1.result, roll2.result);
    const hasAdvantage = aiBehavior === AIBehavior.AGRESSIVE_BEAST;

    const hitMod = 2 + Math.floor((refreshedEnemy.stats.level || 1) / 3);
    const heightBonus = calculateHeightBonus(refreshedEnemy.position, target.position, store.battleMap);
    if (heightBonus > 0) {
      store.addLog(`⛰️ Ventaja de Altura! ${refreshedEnemy.name} ataca desde posición elevada (+2 Ataque).`, 'info');
    }
    const totalHit = bestD20 + hitMod + heightBonus;
    const isCrit = bestD20 === 20;
    const isCritFail = bestD20 === 1;
    const hits = isCrit || (!isCritFail && totalHit >= target.stats.ac);

    if (store.triggerDiceRoll) {
      store.triggerDiceRoll({
        id: generateId(),
        rollerName: refreshedEnemy.name,
        targetName: target.name,
        actionType: 'ATTACK',
        d20Roll: bestD20,
        modifier: hitMod + heightBonus,
        total: totalHit,
        targetAc: target.stats.ac,
        isHit: hits,
        isCrit,
        isCritFail,
        advantage: hasAdvantage ? 'ADVANTAGE' : 'NORMAL',
        formulaString: `${hasAdvantage ? 'Pounce (Ventaja)' : 'd20'}(${bestD20}) + ${hitMod}${heightBonus ? ' + 2(HighGround)' : ''} = ${totalHit} vs CA ${target.stats.ac}`,
        damagePreview: isCrit ? '2d6 + mod' : '1d6 + mod',
      });
    }

    if (hits) {
      set({
        activeSpellEffect: {
          id: generateId(),
          type: SpellType.BURST,
          startPos: [refreshedEnemy.position.x, 1.2, refreshedEnemy.position.y],
          endPos: [target.position.x, 1.2, target.position.y],
          color: isCrit ? '#f59e0b' : '#ef4444',
          duration: 600,
          timestamp: Date.now(),
          spriteSheetUrl: ASSETS.SPELL_FX.WEAPON_HIT
        }
      });
      setTimeout(() => set({ activeSpellEffect: null }), 650);
      const diceSides = aiBehavior === AIBehavior.AGRESSIVE_BEAST ? 8 : 6; // Beasts hit harder
      const diceCount = isCrit ? 2 : 1;
      const r1 = rollDice(diceSides, 1);
      const r2 = isCrit ? rollDice(diceSides, 1) : 0;
      const diceSum = r1 + r2;
      const dmgMod = Math.max(1, Math.floor((refreshedEnemy.stats.level || 1) / 2) + 2);
      const totalDmg = diceSum + dmgMod;

      const hitLog = isCrit
        ? `💥 CRITICAL HIT! ${refreshedEnemy.name} rolled [d20(${bestD20}) + ${hitMod} = ${totalHit} vs AC ${target.stats.ac}]`
        : `⚔️ ${refreshedEnemy.name} attacks ${target.name} [d20(${bestD20}) + ${hitMod} = ${totalHit} vs AC ${target.stats.ac}] -> HIT!`;
      const dmgLog = isCrit
        ? `🩸 Damage: [Crit 2d${diceSides}(${r1}, ${r2}) + ${dmgMod} = ${totalDmg} dmg]`
        : `🩸 Damage: [1d${diceSides}(${r1}) + ${dmgMod} = ${totalDmg} dmg]`;

      store.addLog(hitLog, 'combat');
      store.addLog(dmgLog, 'combat');
      
      if (isCrit) {
        sfx.playCrit('melee');
      } else {
        sfx.playHit();
      }

      // Defensive Shield Bash dazes the player (reduces speed & stamina next turn)
      if (aiBehavior === AIBehavior.DEFENSIVE && Math.random() < 0.4) {
        store.addLog(`💫 Shield Bash! ${target.name} queda aturdido y exhausto.`, 'combat');
        const updatedTargetEntities = activeEntities.map((e: any) => {
          if (e.id === target.id) {
            return {
              ...e,
              stats: {
                ...e.stats,
                stamina: Math.max(0, e.stats.stamina - 2),
                conditions: [...(e.stats.conditions || []), 'DAZED']
              }
            };
          }
          return e;
        });
        activeEntities = updatedTargetEntities;
      }

      const res = applyDamage({ ...store, battleEntities: activeEntities }, target.id, totalDmg, isCrit);
      if (res) newState = res;
    } else {
      if (isCritFail) {
        sfx.playCritFail();
      }
      const missReason = isCritFail
        ? 'NATURAL 1 CRITICAL MISS!'
        : `[d20(${bestD20}) + ${hitMod} = ${totalHit} vs AC ${target.stats.ac}] -> MISS!`;
      store.addLog(`🛡️ ${refreshedEnemy.name} attacks ${target.name} ${missReason}`, 'combat');
      const popups: DamagePopup[] = [
        ...store.damagePopups,
        {
          id: generateId(),
          position: [target.position.x, 0, target.position.y],
          amount: 'MISS',
          color: '#94a3b8',
          isCrit: false,
          timestamp: Date.now(),
        },
      ];
      newState = { ...newState, damagePopups: popups };
    }
  } else {
    // ------------------ CHASE / MOVE TOWARDS TARGET ------------------
    const path = findBattlePath(
      { x: refreshedEnemy.position.x, y: refreshedEnemy.position.y },
      { x: target.position.x, y: target.position.y },
      store.battleMap,
      store.battleHazards
    );
    if (path && path.length > 0) {
      const step = path[0];
      const targetCell = (store.battleMap || []).find((c: any) => c.x === step.x && c.z === step.z);
      sfx.playTacticalMove(targetCell?.terrain);
      const updatedEntities = activeEntities.map((e: any) =>
        e.id === refreshedEnemy.id ? { ...e, position: { x: step.x, y: step.z } } : e
      );
      newState = { battleEntities: updatedEntities };

      const hazardOnTile = (store.battleHazards || []).find(
        (h) => h.x === step.x && h.z === step.z
      );
      if (hazardOnTile) {
        const hazardRes = resolveHazardEntry(refreshedEnemy, hazardOnTile);
        if (hazardRes?.message)
          store.addLog(hazardRes.message, hazardRes.damage > 0 ? 'combat' : 'info');
        if (hazardRes && hazardRes.damage > 0) {
          const res = applyDamage(
            { ...store, battleEntities: updatedEntities },
            refreshedEnemy.id,
            hazardRes.damage
          );
          if (res) newState = res;
        } else if (hazardRes?.popupAmount) {
          const popups: DamagePopup[] = [
            ...store.damagePopups,
            {
              id: generateId(),
              position: [step.x, 0, step.z],
              amount: hazardRes.popupAmount,
              color: hazardRes.popupColor || '#ca8a04',
              isCrit: false,
              timestamp: Date.now(),
            },
          ];
          newState = { ...newState, damagePopups: popups };
        }
      }
    }
  }
  return newState;
};

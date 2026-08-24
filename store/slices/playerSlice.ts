
import { StateCreator } from 'zustand';
import { CharacterRace, CharacterClass, Attributes, Difficulty, EquipmentSlot, Item, Ability, Entity, CombatStatsComponent, VisualComponent, Dimension, GameState, PendingLevelUp, TerrainType } from '../../types';
import { calculateHp, getModifier, calculateVisionRange, getHitDieForClass, getCasterSpellSlots, calculateMaxStamina, calculateLevelHpGain, getProficiencyBonus, rollDice } from '../../services/dndRules';
import { BASE_STATS, RACE_BONUS, XP_TABLE, ITEMS, CLASS_EQUIPMENT_PACKAGES, getSprite, ASSETS, sanitizeAssetUrl } from '../../constants';
import { sfx } from '../../services/SoundSystem';
import { GameStore } from '../gameStore';
import { useContentStore } from '../contentStore';

export interface PlayerSlice {
  party: (Entity & { stats: CombatStatsComponent, visual: VisualComponent })[];
  pendingLevelUps: PendingLevelUp[];
  currentLevelUpIndex: number;
  createCharacter: (name: string, race: CharacterRace, cls: CharacterClass, stats: Attributes, difficulty: Difficulty, startingPackageId?: string) => void;
  recalculateStats: (entity: Entity & { stats: CombatStatsComponent }) => CombatStatsComponent;
  levelUpParty: () => void;
  initiatePostBattleLevelUp: (xpGained: number) => boolean;
  allocateStatPoint: (entityId: string, ability: Ability, delta: number) => void;
  rollHitDieForLevelUp: (entityId: string) => number;
  setHpChoiceForLevelUp: (entityId: string, choice: 'average' | 'rolled') => void;
  setCurrentLevelUpIndex: (index: number) => void;
  confirmLevelUp: (entityId: string) => void;
  confirmAllLevelUps: () => void;
  useHitDieForShortRest: (entityId: string) => void;
  performLongRest: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const generateCompanion = (name: string, race: CharacterRace, cls: CharacterClass, level: number): (Entity & { stats: CombatStatsComponent, visual: VisualComponent }) => {
    const dbItems = useContentStore.getState().items;
    const dbClassStats = useContentStore.getState().classStats;
    const getItem = (key: string) => dbItems[key] || ITEMS[key];

    const baseStats = { ...(dbClassStats[cls] || BASE_STATS[cls]) };
    const bonus = useContentStore.getState().raceBonus[race] || RACE_BONUS[race];
    (Object.keys(baseStats) as Ability[]).forEach(k => { if (bonus[k]) baseStats[k] += bonus[k]!; });
    const hitDie = getHitDieForClass(cls);
    const maxHp = calculateHp(level, baseStats.CON, hitDie);
    const maxStamina = calculateMaxStamina(baseStats.CON, level);
    
    const equipment: Partial<Record<EquipmentSlot, Item>> = {};
    if (cls === CharacterClass.FIGHTER || cls === CharacterClass.PALADIN) { 
        equipment[EquipmentSlot.MAIN_HAND] = getItem('LONGSWORD'); 
        equipment[EquipmentSlot.BODY] = getItem('CHAIN_MAIL'); 
        equipment[EquipmentSlot.OFF_HAND] = getItem('SHIELD'); 
    } 
    else if (cls === CharacterClass.BARBARIAN) { 
        equipment[EquipmentSlot.MAIN_HAND] = getItem('GREATAXE'); 
    } 
    else if (cls === CharacterClass.ROGUE) { 
        equipment[EquipmentSlot.MAIN_HAND] = getItem('DAGGER'); 
        equipment[EquipmentSlot.BODY] = getItem('LEATHER_ARMOR'); 
    } 
    else if (cls === CharacterClass.CLERIC) { 
        equipment[EquipmentSlot.MAIN_HAND] = getItem('MACE'); 
        equipment[EquipmentSlot.BODY] = getItem('CHAIN_SHIRT'); 
        equipment[EquipmentSlot.OFF_HAND] = getItem('SHIELD'); 
    } 
    else { 
        equipment[EquipmentSlot.MAIN_HAND] = getItem('QUARTERSTAFF'); 
    }

    return {
        id: `comp_${generateId()}`, name, type: 'PLAYER' as const, equipment,
        stats: { level, class: cls, race, xp: 0, xpToNextLevel: (useContentStore.getState().xpTable || XP_TABLE)[level] || 999999, hp: maxHp, maxHp, stamina: maxStamina, maxStamina, ac: 10, initiativeBonus: getModifier(baseStats.DEX), speed: 30, attributes: baseStats, baseAttributes: { ...baseStats }, spellSlots: getCasterSpellSlots(cls, level) },
        visual: { color: '#3b82f6', modelType: 'billboard' as const, spriteUrl: getSprite(race, cls) }
    };
};

export const createPlayerSlice: StateCreator<GameStore, [], [], PlayerSlice> = (set, get) => ({
  party: [],
  pendingLevelUps: [],
  currentLevelUpIndex: 0,

  createCharacter: (name, race, cls, stats, difficulty, startingPackageId) => {
    sfx.playVictory();
    const dbItems = useContentStore.getState().items;
    const getItem = (key: string) => dbItems[key] || ITEMS[key];

    const hitDie = getHitDieForClass(cls);
    const maxHp = calculateHp(1, stats.CON, hitDie);
    const maxStamina = calculateMaxStamina(stats.CON, 1);
    const startSlots = getCasterSpellSlots(cls, 1);
    let spriteUrl = getSprite(race, cls);
    let equipment: Partial<Record<EquipmentSlot, Item>> = {};
    const inventory = [{ item: getItem('POTION_HEALING'), quantity: 3 }, { item: getItem('RATION'), quantity: 5 }];

    // Check if custom starting equipment package was chosen
    const contentPackages = useContentStore.getState().classEquipmentPackages || {};
    const availablePackages = contentPackages[cls] || CLASS_EQUIPMENT_PACKAGES[cls] || [];
    const chosenPackage = availablePackages.find(p => p.id === startingPackageId) || availablePackages[0];

    if (chosenPackage) {
        // Equipment of chosen package
        Object.entries(chosenPackage.equipment).forEach(([slot, item]) => {
            if (item) {
                const dbItem = dbItems[(item as any).id.toUpperCase()] || item;
                equipment[slot as EquipmentSlot] = dbItem as Item;
            }
        });
        if (chosenPackage.bonusItems) {
            chosenPackage.bonusItems.forEach(b => {
                const dbItem = dbItems[b.item.id.toUpperCase()] || b.item;
                const existing = inventory.find(i => i.item.id === dbItem.id);
                if (existing) {
                    existing.quantity += b.quantity;
                } else {
                    inventory.push({ item: dbItem, quantity: b.quantity });
                }
            });
        }
    } else {
        switch (cls) {
            case CharacterClass.FIGHTER: case CharacterClass.PALADIN: 
                equipment[EquipmentSlot.MAIN_HAND] = getItem('LONGSWORD'); 
                equipment[EquipmentSlot.BODY] = getItem('CHAIN_MAIL'); 
                equipment[EquipmentSlot.OFF_HAND] = getItem('SHIELD'); 
                break;
            case CharacterClass.BARBARIAN: 
                equipment[EquipmentSlot.MAIN_HAND] = getItem('GREATAXE'); 
                break;
            case CharacterClass.RANGER: 
                equipment[EquipmentSlot.MAIN_HAND] = getItem('SHORTSWORD'); 
                equipment[EquipmentSlot.OFF_HAND] = getItem('DAGGER'); 
                equipment[EquipmentSlot.BODY] = getItem('LEATHER_ARMOR'); 
                break;
            case CharacterClass.ROGUE: 
                equipment[EquipmentSlot.MAIN_HAND] = getItem('DAGGER'); 
                equipment[EquipmentSlot.BODY] = getItem('LEATHER_ARMOR'); 
                break;
            case CharacterClass.CLERIC: 
                equipment[EquipmentSlot.MAIN_HAND] = getItem('MACE'); 
                equipment[EquipmentSlot.BODY] = getItem('CHAIN_SHIRT'); 
                equipment[EquipmentSlot.OFF_HAND] = getItem('SHIELD'); 
                inventory.push({ item: getItem('POTION_MANA'), quantity: 1 }); 
                break;
            default: 
                equipment[EquipmentSlot.MAIN_HAND] = getItem('QUARTERSTAFF'); 
                inventory.push({ item: getItem('POTION_MANA'), quantity: 2 });
        }
    }

    const leader = { id: 'player_leader', name, type: 'PLAYER' as const, equipment, stats: { level: 1, class: cls, race, xp: 0, xpToNextLevel: (useContentStore.getState().xpTable || XP_TABLE)[1] || 300, hp: maxHp, maxHp, stamina: maxStamina, maxStamina, ac: 10, initiativeBonus: Math.floor((stats.DEX - 10) / 2), speed: 30, attributes: stats, baseAttributes: { ...stats }, spellSlots: startSlots }, visual: { color: '#3b82f6', modelType: 'billboard' as const, spriteUrl } };
    const companions = [];
    const isTank = [CharacterClass.FIGHTER, CharacterClass.BARBARIAN, CharacterClass.PALADIN].includes(cls);
    const isHealer = [CharacterClass.CLERIC, CharacterClass.DRUID].includes(cls);
    if (isTank) { companions.push(generateCompanion("Elara", CharacterRace.HUMAN, CharacterClass.CLERIC, 1)); companions.push(generateCompanion("Zan", CharacterRace.ELF, CharacterClass.WIZARD, 1)); }
    else if (isHealer) { companions.push(generateCompanion("Thrumgar", CharacterRace.DWARF, CharacterClass.FIGHTER, 1)); companions.push(generateCompanion("Vex", CharacterRace.HUMAN, CharacterClass.ROGUE, 1)); }
    else { companions.push(generateCompanion("Kael", CharacterRace.HUMAN, CharacterClass.PALADIN, 1)); companions.push(generateCompanion("Lira", CharacterRace.ELF, CharacterClass.DRUID, 1)); }

    const party = [leader, ...companions].map(p => ({ ...p, stats: get().recalculateStats(p) }));
    
    // Initial Exploration and Vision
    const exploredNormal = new Set<string>();
    const startX = 0; 
    const startY = 0;
    const visionRadius = Math.max(1, calculateVisionRange(stats.WIS));
    
    for (let q = startX - visionRadius; q <= startX + visionRadius; q++) {
        for (let r = startY - visionRadius; r <= startY + visionRadius; r++) {
            const dist = (Math.abs(q - startX) + Math.abs(q + r - startX - startY) + Math.abs(r - startY)) / 2;
            if (dist <= visionRadius) {
                exploredNormal.add(`${q},${r}`);
            }
        }
    }
    exploredNormal.add(`${startX},${startY}`);

    const startQuests = [
        { id: 'q1', title: 'The Capital', description: 'Find the great castle at coordinates (0, 0).', completed: false, type: 'MAIN' as const },
        { id: 'q2', title: 'Explore the Wilds', description: 'Discover 50 unique locations in Arcadia.', completed: false, type: 'SIDE' as const }
    ];

    // Use smooth map loading transition to generate and enter the Overworld
    get().transitionToMap({
        targetState: GameState.OVERWORLD,
        targetLocationName: 'La Capital de Arcadia (0, 0)',
        targetBiome: TerrainType.CASTLE,
        durationMs: 750,
        action: () => {
            set({ 
                party, 
                difficulty, 
                inventory, 
                playerPos: { x: startX, y: startY }, 
                activeInventoryCharacterId: leader.id, 
                exploredTiles: { ...get().exploredTiles, [Dimension.NORMAL]: exploredNormal },
                quests: startQuests,
                pendingLevelUps: [],
                currentLevelUpIndex: 0
            });
            get().addLog(`The party assembles! ${name} leads ${companions[0].name} and ${companions[1].name}.`, 'narrative');
        }
    });
  },

  recalculateStats: (entity) => {
    // Sanitize any remote github raw paths back to local paths for robust local asset serving
    if (entity.visual && entity.visual.spriteUrl) {
        entity.visual.spriteUrl = sanitizeAssetUrl(entity.visual.spriteUrl);
    }
    // Sprite Migration/Repair logic for Clerics & Fighters (ensures saves use new high-quality sprites)
    if (entity.stats.class === CharacterClass.CLERIC && entity.visual && !entity.visual.spriteUrl.includes('spritesheetpriest.png')) {
        entity.visual.spriteUrl = ASSETS.UNITS.PLAYER_CLERIC;
    }
    if (entity.stats.class === CharacterClass.FIGHTER && entity.visual && !entity.visual.spriteUrl.includes('fighter')) {
        entity.visual.spriteUrl = ASSETS.UNITS.PLAYER_FIGHTER;
    }
    const effectiveAttributes = { ...entity.stats.baseAttributes };
    let armorBase = 10; let shieldBonus = 0;
    Object.values(entity.equipment).forEach((item: any) => {
        if (!item || !item.equipmentStats) return;
        const stats = item.equipmentStats;
        if (stats.modifiers) Object.entries(stats.modifiers).forEach(([key, val]) => { if (val) effectiveAttributes[key as keyof Attributes] += (val as number); });
        if (stats.slot === EquipmentSlot.BODY && stats.ac) armorBase = stats.ac;
        if (stats.slot === EquipmentSlot.OFF_HAND && stats.ac) shieldBonus = stats.ac;
    });
    let dexMod = getModifier(effectiveAttributes.DEX);
    if (armorBase >= 16) dexMod = 0; else if (armorBase >= 13) dexMod = Math.min(2, dexMod);
    
    const currentStamina = entity.stats.stamina !== undefined ? entity.stats.stamina : calculateMaxStamina(effectiveAttributes.CON, entity.stats.level);
    const hitDieSides = getHitDieForClass(entity.stats.class);
    const hitDice = entity.stats.hitDice || {
        current: entity.stats.level,
        max: entity.stats.level,
        dieSides: hitDieSides
    };
    const conditions = entity.stats.conditions || [];
    
    return { 
        ...entity.stats, 
        ac: armorBase + dexMod + shieldBonus, 
        attributes: effectiveAttributes, 
        initiativeBonus: getModifier(effectiveAttributes.DEX),
        stamina: currentStamina,
        maxStamina: calculateMaxStamina(effectiveAttributes.CON, entity.stats.level),
        hitDice,
        conditions
    };
  },

  levelUpParty: () => {
    const { party } = get();
    const upgradedParty = party.map(member => {
        const nextLevel = member.stats.level + 1;
        const hitDie = getHitDieForClass(member.stats.class);
        const conMod = getModifier(member.stats.baseAttributes.CON);
        const newMaxHp = member.stats.maxHp + Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
        const newMaxStamina = calculateMaxStamina(member.stats.baseAttributes.CON, nextLevel);
        const newSpellSlots = getCasterSpellSlots(member.stats.class, nextLevel);
        const newBaseAttributes = { ...member.stats.baseAttributes };
        
        if (nextLevel % 4 === 0) {
            let primaryStat = Ability.STR;
            if ([CharacterClass.WIZARD].includes(member.stats.class)) primaryStat = Ability.INT;
            else if ([CharacterClass.ROGUE, CharacterClass.RANGER, CharacterClass.BARD].includes(member.stats.class)) primaryStat = Ability.DEX;
            else if ([CharacterClass.CLERIC, CharacterClass.DRUID].includes(member.stats.class)) primaryStat = Ability.WIS;
            else if ([CharacterClass.SORCERER, CharacterClass.WARLOCK, CharacterClass.PALADIN].includes(member.stats.class)) primaryStat = Ability.CHA;
            
            newBaseAttributes[primaryStat] += 1;
        }

        const tempEntity = { ...member, stats: { ...member.stats, level: nextLevel, maxHp: newMaxHp, hp: newMaxHp, maxStamina: newMaxStamina, stamina: newMaxStamina, spellSlots: newSpellSlots, baseAttributes: newBaseAttributes, xpToNextLevel: (useContentStore.getState().xpTable || XP_TABLE)[nextLevel] || 999999 } };
        return { ...member, stats: get().recalculateStats(tempEntity) };
    });
    set({ party: upgradedParty }); 
    sfx.playVictory(); 
    get().addLog(`The party reached level ${upgradedParty[0].stats.level}!`, "levelup");
  },

  initiatePostBattleLevelUp: (xpGained: number) => {
    const { party } = get();
    const pendingList: PendingLevelUp[] = [];

    // Award XP and determine who levels up
    const updatedParty = party.map(member => {
      // If dead, doesn't gain XP
      if (member.stats.hp <= 0) return member;

      const currentXp = member.stats.xp + xpGained;
      const targetThreshold = member.stats.xpToNextLevel || (useContentStore.getState().xpTable || XP_TABLE)[member.stats.level] || 999999;
      
      if (currentXp >= targetThreshold) {
        const nextLevel = member.stats.level + 1;
        const hitDie = getHitDieForClass(member.stats.class);
        const avgGain = calculateLevelHpGain(hitDie, member.stats.baseAttributes.CON);
        const newSlots = getCasterSpellSlots(member.stats.class, nextLevel);
        const profBonus = getProficiencyBonus(nextLevel);

        pendingList.push({
          entityId: member.id,
          entityName: member.name,
          className: member.stats.class,
          race: member.stats.race,
          spriteUrl: member.visual?.spriteUrl,
          previousLevel: member.stats.level,
          newLevel: nextLevel,
          hitDie,
          availableStatPoints: 2, // Standard 5E Ability Score Improvement points
          averageHpGain: avgGain,
          rolledHpGain: undefined,
          hpChoice: 'average',
          isRollingDie: false,
          allocatedStats: {
            [Ability.STR]: 0,
            [Ability.DEX]: 0,
            [Ability.CON]: 0,
            [Ability.INT]: 0,
            [Ability.WIS]: 0,
            [Ability.CHA]: 0
          },
          previousAttributes: { ...member.stats.baseAttributes },
          previousMaxHp: member.stats.maxHp,
          previousMaxStamina: member.stats.maxStamina,
          previousSpellSlots: { ...member.stats.spellSlots },
          newSpellSlots: newSlots,
          proficiencyBonus: profBonus
        });
      }

      return {
        ...member,
        stats: {
          ...member.stats,
          xp: currentXp
        }
      };
    });

    set({ party: updatedParty });

    if (pendingList.length > 0) {
      set({ 
        pendingLevelUps: pendingList, 
        currentLevelUpIndex: 0 
      });
      sfx.playLevelUp();
      get().addLog(`🌟 ${pendingList.map(p => p.entityName).join(', ')} earned a LEVEL UP!`, 'levelup');
      return true;
    }
    return false;
  },

  allocateStatPoint: (entityId: string, ability: Ability, delta: number) => {
    const { pendingLevelUps } = get();
    const targetIdx = pendingLevelUps.findIndex(p => p.entityId === entityId);
    if (targetIdx === -1) return;

    const item = pendingLevelUps[targetIdx];
    const currentAllocated = item.allocatedStats[ability] || 0;
    const currentBase = item.previousAttributes[ability];

    // Increase point
    if (delta > 0) {
      if (item.availableStatPoints <= 0) return;
      if (currentBase + currentAllocated >= 20) return; // 5E hard cap 20

      const newAllocated = { ...item.allocatedStats, [ability]: currentAllocated + 1 };
      const updatedItem: PendingLevelUp = {
        ...item,
        availableStatPoints: item.availableStatPoints - 1,
        allocatedStats: newAllocated
      };

      const updatedList = [...pendingLevelUps];
      updatedList[targetIdx] = updatedItem;
      set({ pendingLevelUps: updatedList });
      sfx.playStatUp();
    } 
    // Decrease point
    else if (delta < 0) {
      if (currentAllocated <= 0) return;

      const newAllocated = { ...item.allocatedStats, [ability]: currentAllocated - 1 };
      const updatedItem: PendingLevelUp = {
        ...item,
        availableStatPoints: item.availableStatPoints + 1,
        allocatedStats: newAllocated
      };

      const updatedList = [...pendingLevelUps];
      updatedList[targetIdx] = updatedItem;
      set({ pendingLevelUps: updatedList });
      sfx.playStatDown();
    }
  },

  rollHitDieForLevelUp: (entityId: string) => {
    const { pendingLevelUps } = get();
    const targetIdx = pendingLevelUps.findIndex(p => p.entityId === entityId);
    if (targetIdx === -1) return 0;

    const item = pendingLevelUps[targetIdx];
    sfx.playDiceRoll();

    const rollResult = rollDice(item.hitDie, 1);
    const effectiveCon = item.previousAttributes.CON + (item.allocatedStats.CON || 0);
    const conMod = getModifier(effectiveCon);
    const totalGain = Math.max(1, rollResult + conMod);

    const updatedItem: PendingLevelUp = {
      ...item,
      rolledHpGain: totalGain,
      hpChoice: 'rolled',
      isRollingDie: false
    };

    const updatedList = [...pendingLevelUps];
    updatedList[targetIdx] = updatedItem;
    set({ pendingLevelUps: updatedList });

    get().addLog(`🎲 ${item.entityName} rolled d${item.hitDie} (${rollResult}) + CON (${conMod >= 0 ? `+${conMod}` : conMod}) = +${totalGain} HP!`, 'roll');
    return totalGain;
  },

  setHpChoiceForLevelUp: (entityId: string, choice: 'average' | 'rolled') => {
    const { pendingLevelUps } = get();
    const targetIdx = pendingLevelUps.findIndex(p => p.entityId === entityId);
    if (targetIdx === -1) return;

    sfx.playUiClick();
    const updatedList = [...pendingLevelUps];
    updatedList[targetIdx] = {
      ...updatedList[targetIdx],
      hpChoice: choice
    };
    set({ pendingLevelUps: updatedList });
  },

  setCurrentLevelUpIndex: (index: number) => {
    sfx.playUiClick();
    set({ currentLevelUpIndex: index });
  },

  confirmLevelUp: (entityId: string) => {
    const { pendingLevelUps, party, currentLevelUpIndex } = get();
    const pendingItem = pendingLevelUps.find(p => p.entityId === entityId);
    if (!pendingItem) return;

    sfx.playVictory();

    // 1. Calculate new attributes
    const finalBaseAttributes: Attributes = {
      STR: pendingItem.previousAttributes.STR + (pendingItem.allocatedStats.STR || 0),
      DEX: pendingItem.previousAttributes.DEX + (pendingItem.allocatedStats.DEX || 0),
      CON: pendingItem.previousAttributes.CON + (pendingItem.allocatedStats.CON || 0),
      INT: pendingItem.previousAttributes.INT + (pendingItem.allocatedStats.INT || 0),
      WIS: pendingItem.previousAttributes.WIS + (pendingItem.allocatedStats.WIS || 0),
      CHA: pendingItem.previousAttributes.CHA + (pendingItem.allocatedStats.CHA || 0),
    };

    // 2. Calculate HP gain with the final CON
    const finalConMod = getModifier(finalBaseAttributes.CON);
    const hpGain = pendingItem.hpChoice === 'rolled' && pendingItem.rolledHpGain !== undefined
      ? pendingItem.rolledHpGain
      : Math.max(1, Math.floor(pendingItem.hitDie / 2) + 1 + finalConMod);

    const newMaxHp = pendingItem.previousMaxHp + hpGain;
    const newMaxStamina = calculateMaxStamina(finalBaseAttributes.CON, pendingItem.newLevel);
    const nextXpThreshold = (useContentStore.getState().xpTable || XP_TABLE)[pendingItem.newLevel] || 999999;

    // 3. Update party member
    const updatedParty = party.map(m => {
      if (m.id !== entityId) return m;

      const tempEntity: Entity & { stats: CombatStatsComponent } = {
        ...m,
        stats: {
          ...m.stats,
          level: pendingItem.newLevel,
          baseAttributes: finalBaseAttributes,
          attributes: { ...finalBaseAttributes },
          maxHp: newMaxHp,
          hp: newMaxHp, // Fully restore HP on Level Up!
          maxStamina: newMaxStamina,
          stamina: newMaxStamina,
          spellSlots: typeof pendingItem.newSpellSlots === 'object' && pendingItem.newSpellSlots
            ? { current: (pendingItem.newSpellSlots as any).current ?? 0, max: (pendingItem.newSpellSlots as any).max ?? 0 }
            : { ...m.stats.spellSlots },
          xpToNextLevel: nextXpThreshold
        }
      };

      return {
        ...m,
        stats: get().recalculateStats(tempEntity)
      };
    });

    const remainingPending = pendingLevelUps.filter(p => p.entityId !== entityId);
    get().addLog(`🎉 ${pendingItem.entityName} ascended to Level ${pendingItem.newLevel}! (+${hpGain} HP, Stamina ${newMaxStamina})`, 'levelup');

    if (remainingPending.length > 0) {
      set({ 
        party: updatedParty, 
        pendingLevelUps: remainingPending, 
        currentLevelUpIndex: Math.min(currentLevelUpIndex, remainingPending.length - 1) 
      });
    } else {
      set({ 
        party: updatedParty, 
        pendingLevelUps: [], 
        currentLevelUpIndex: 0,
        gameState: GameState.OVERWORLD,
        damagePopups: [],
        gracePeriodEndTime: Date.now() + 3000,
        lootDrops: []
      });
      // Auto-save upon level-up completion
      get().autoSaveGame();
    }
  },

  confirmAllLevelUps: () => {
    const { pendingLevelUps } = get();
    pendingLevelUps.forEach(p => {
      get().confirmLevelUp(p.entityId);
    });
  },

  useHitDieForShortRest: (entityId: string) => {
    const { party } = get();
    const target = party.find(p => p.id === entityId);
    if (!target) return;

    const hitDie = getHitDieForClass(target.stats.class);
    const hitDiceState = target.stats.hitDice || { current: target.stats.level, max: target.stats.level, dieSides: hitDie };

    if (hitDiceState.current <= 0) {
      get().addLog(`⚠️ ${target.name} no tiene más Dados de Golpe disponibles.`, "info");
      return;
    }

    sfx.playDiceRoll();
    const rollResult = rollDice(hitDie, 1);
    const conMod = getModifier(target.stats.attributes.CON);
    const hpRestored = Math.max(1, rollResult + conMod);
    const staminaRestored = Math.max(2, conMod + 3);

    const newHp = Math.min(target.stats.maxHp, target.stats.hp + hpRestored);
    const newStamina = Math.min(target.stats.maxStamina, target.stats.stamina + staminaRestored);

    const updatedParty = party.map(p => {
      if (p.id !== entityId) return p;
      return {
        ...p,
        stats: {
          ...p.stats,
          hp: newHp,
          stamina: newStamina,
          hitDice: {
            ...hitDiceState,
            current: hitDiceState.current - 1
          }
        }
      };
    });

    set({ party: updatedParty });
    get().addLog(`🎲 ${target.name} gastó 1 Dado de Golpe (d${hitDie}: ${rollResult} + ${conMod >= 0 ? `+${conMod}` : conMod} CON) -> Recuperó +${hpRestored} HP y +${staminaRestored} Stamina.`, "info");
  },

  performLongRest: () => {
    const { party } = get();
    sfx.playMagic();

    const restoredParty = party.map(member => {
      const hitDie = getHitDieForClass(member.stats.class);
      return {
        ...member,
        stats: {
          ...member.stats,
          hp: member.stats.maxHp,
          stamina: member.stats.maxStamina,
          spellSlots: {
            current: member.stats.spellSlots.max,
            max: member.stats.spellSlots.max
          },
          hitDice: {
            current: member.stats.level,
            max: member.stats.level,
            dieSides: hitDie
          },
          conditions: []
        }
      };
    });

    set({ party: restoredParty, travelFatigue: 0 });
    get().addLog(`🌙 La fiesta toma un Descanso Largo en la posada. HP, Conjuros, Dados de Golpe, Estados y la Fatiga de Viaje han sido completamente restaurados.`, "narrative");
    get().autoSaveGame();
  }
});

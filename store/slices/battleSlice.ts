
import { StateCreator } from 'zustand';
import { GameState, TerrainType, WeatherType, BattleCell, VoxelBlock, BattleAction, Spell, Entity, CombatStatsComponent, PositionComponent, DamagePopup, SpellEffectData, SpellType, CharacterClass, VisualComponent, AIBehavior, LootDrop, ItemRarity, Item, EquipmentSlot, Dimension, InitiativeRollDetail, BattleHazard, BattleHazardType, isFriendly, AttackForecast } from '../../types';
import { findBattlePath } from '../../services/pathfinding';
import { rollD20, rollDice, checkLineOfSight, calculateCoverBonus, calculateHeightBonus, calculateAttackRoll, calculateDamage, calculateDetailedAttackRoll, calculateDetailedDamage, calculateEnemyStats, calculateInitiativeRolls, resolveHazardEntry, resolveHazardTurnTick, getAttackingModifierAndName, getModifier, getProficiencyBonus } from '../../services/dndRules';
import { sfx } from '../../services/SoundSystem';
import { ASSETS, BATTLE_MAP_SIZE, TERRAIN_COLORS, ITEMS } from '../../constants';
import { generateVoxelDioramaFeatures } from '../../services/VoxelDioramaGenerator';
import { generateBattleHazards } from '../../services/EnvironmentalHazardGenerator';
import { generateBattleGrid, getUnitHeight } from '../../services/BattleGridGenerator';
import { generate3RoomVoxelDungeon } from '../../services/DungeonGenerator';
import { applyDamage, performEnemyAction, getEnemyBehavior, generateId, STAT_COSTS } from '../../services/combatEngine';
import { useContentStore } from '../contentStore';
import { GameStore, useGameStore } from '../gameStore';

export interface BattleSlice {
  battleEntities: (Entity & { stats: CombatStatsComponent, position: PositionComponent, visual: VisualComponent })[];
  turnOrder: string[];
  currentTurnIndex: number;
  initiativeRolls: Record<string, InitiativeRollDetail>;
  battleRound: number;
  battleTerrain: TerrainType;
  battleWeather: WeatherType;
  isDragonDungeonBattle?: boolean;
  dragonDungeonEntrancePos?: { x: number; y: number; dimension: Dimension } | null;
  battleRewards: { xp: number, gold: number, items: any[] };
  battleMap: BattleCell[];
  battleHazards: BattleHazard[];
  voxelStructures: VoxelBlock[];
  lootDrops: LootDrop[];
  selectedAction: BattleAction | null;
  selectedSpell: Spell | null;
  hasMoved: boolean;
  hasActed: boolean;
  selectedTile: { x: number, z: number } | null;
  hoveredEntity: Entity | null;
  runAvailable: boolean;
  damagePopups: DamagePopup[];
  activeSpellEffect: SpellEffectData | null;
  isActionAnimating: boolean;
  isSkillSelectionMode: boolean;
  activeDiceRoll: any | null;
  screenShake: number;
  isRadialMenuOpen: boolean;
  hoveredActionPreview: BattleAction | null;
  fogOfWarEnabled: boolean;
  showDangerZone: boolean;
  battleSpeed: number;

  setBattleSpeed: (speed: number) => void;
  setRadialMenuOpen: (open: boolean) => void;
  setHoveredActionPreview: (action: BattleAction | null) => void;
  toggleFogOfWar: () => void;
  toggleDangerZone: () => void;
  triggerScreenShake: (intensity?: number) => void;
  triggerDiceRoll: (rollData: any) => void;
  clearDiceRoll: () => void;
  startBattle: (terrain: TerrainType, weather: WeatherType, enemyId?: string, customEnemyList?: string[], isBoss?: boolean) => void;
  startDragonDungeonBattle: () => void;
  selectAction: (action: BattleAction | null) => void;
  selectSpell: (spellId: string) => void;
  setSkillSelectionMode: (enabled: boolean) => void;
  handleTileHover: (x: number, z: number) => void;
  handleTileInteraction: (x: number, z: number) => void;
  spawnHazard: (hazard: Omit<BattleHazard, 'id'>) => void;
  removeHazard: (hazardId: string) => void;
  collectLoot: (dropId: string) => void;
  nextTurn: () => void;
  attemptRun: () => void;
  restartBattle: () => void;
  continueAfterVictory: () => void;
  hasLineOfSight: (source: PositionComponent, target: PositionComponent) => boolean;
  getAttackPrediction: (targetEntityOverride?: Entity | null) => any | null;
  destroyObstacle: (x: number, z: number) => void;
  removeDamagePopup: (id: string) => void;
  confirmMovement: () => void;
}

export const createBattleSlice: StateCreator<GameStore, [], [], BattleSlice> = (set, get) => ({
  battleEntities: [],
  turnOrder: [],
  currentTurnIndex: 0,
  initiativeRolls: {},
  battleRound: 1,
  battleTerrain: TerrainType.GRASS,
  battleWeather: WeatherType.NONE,
  battleRewards: { xp: 0, gold: 0, items: [] },
  battleMap: [],
  battleHazards: [],
  voxelStructures: [],
  lootDrops: [],
  selectedAction: null,
  selectedSpell: null,
  hasMoved: false,
  hasActed: false,
  selectedTile: null,
  hoveredEntity: null,
  runAvailable: false,
  damagePopups: [],
  activeSpellEffect: null,
  isActionAnimating: false,
  isSkillSelectionMode: false,
  isRadialMenuOpen: true,
  hoveredActionPreview: null,
  fogOfWarEnabled: true,
  showDangerZone: false,
  battleSpeed: 1.0,

  setBattleSpeed: (speed) => set({ battleSpeed: Math.max(0.5, Math.min(3.0, speed)) }),
  toggleFogOfWar: () => set(s => ({ fogOfWarEnabled: !s.fogOfWarEnabled })),
  toggleDangerZone: () => set(s => ({ showDangerZone: !s.showDangerZone })),
  setRadialMenuOpen: (open) => set({ isRadialMenuOpen: open }),
  setHoveredActionPreview: (action) => set({ hoveredActionPreview: action }),

  spawnHazard: (hazard) => {
    const id = `hazard_${hazard.type.toLowerCase()}_${hazard.x}_${hazard.z}_${generateId()}`;
    set(s => ({
      battleHazards: [...s.battleHazards.filter(h => !(h.x === hazard.x && h.z === hazard.z)), { ...hazard, id }]
    }));
  },

  removeHazard: (hazardId) => {
    set(s => ({ battleHazards: s.battleHazards.filter(h => h.id !== hazardId) }));
  },

  removeDamagePopup: (id) => {
    set(s => ({ damagePopups: s.damagePopups.filter(p => p.id !== id) }));
  },

  activeDiceRoll: null,
  screenShake: 0,

  triggerScreenShake: (intensity = 1.5) => {
    set({ screenShake: intensity });
    setTimeout(() => set({ screenShake: 0 }), 300);
  },
  triggerDiceRoll: (rollData) => {
    set({ activeDiceRoll: rollData });
  },
  clearDiceRoll: () => {
    set({ activeDiceRoll: null });
  },

      startBattle: (terrain, weather, enemyId, customEnemyList, isBoss) => {
          const { party, playerPos, dimension, difficulty, activeOverworldEnemies, clearedEncounters } = get(); if (party.length === 0) return; sfx.playUiClick(); 
          const isShadow = dimension === Dimension.UPSIDE_DOWN; 
          const { enemies, encounters } = useContentStore.getState();
          
          let finalEnemyList: string[] = [];
          if (enemyId) {
            const visibleEnemy = activeOverworldEnemies.find(e => e.id === enemyId);
            if (visibleEnemy) {
                finalEnemyList = [visibleEnemy.defId];
                const encounterKey = `${dimension}:${visibleEnemy.q},${visibleEnemy.r}`;
                const newCleared = new Set(clearedEncounters);
                newCleared.add(encounterKey);
                set({ clearedEncounters: newCleared, activeOverworldEnemies: activeOverworldEnemies.filter(e => e.id !== enemyId) });
            }
          } 
          if (finalEnemyList.length === 0) { const possibleEnemies = encounters[terrain] || encounters[TerrainType.GRASS] || Object.keys(enemies); finalEnemyList = possibleEnemies.length > 0 ? possibleEnemies : ['goblin_spearman']; }
          
          let spawnList = finalEnemyList;
          let enemyCount = isShadow ? 3 : Math.floor(Math.random() * 2) + 2;
          if (customEnemyList && customEnemyList.length > 0) {
              spawnList = customEnemyList;
              enemyCount = customEnemyList.length;
          }

          // Check if this is a Dungeon encounter (RUINS + isBoss or custom lists)
          const isDungeon = terrain === TerrainType.RUINS && isBoss;
          let battleMap: any[] = [];
          let voxelStructures: any[] = [];
          let playerSpawns: { x: number; y: number }[] = [];
          let enemySpawns: { x: number; y: number }[] = [];

          if (isDungeon) {
              const dRes = generate3RoomVoxelDungeon(BATTLE_MAP_SIZE, Math.floor(Math.random() * 100000), terrain);
              battleMap = dRes.battleMap;
              voxelStructures = dRes.voxelStructures;
              playerSpawns = dRes.playerSpawns;
              enemySpawns = dRes.enemySpawns;
          } else {
              const baseGrid = generateBattleGrid(terrain);
              const dioramaSeed = Math.floor(Math.random() * 100000);
              const dRes = generateVoxelDioramaFeatures(baseGrid, terrain, BATTLE_MAP_SIZE, dioramaSeed);
              battleMap = dRes.updatedGrid;
              voxelStructures = dRes.voxelBlocks;
          }

          const getEnemySpawn = (i: number) => {
              if (isDungeon && enemySpawns[i]) {
                  return enemySpawns[i];
              }
              return { x: Math.floor(Math.random() * (BATTLE_MAP_SIZE - 4)) + 2, y: Math.floor(Math.random() * 3) + 1 };
          };

          const getPlayerSpawn = (i: number) => {
              if (isDungeon && playerSpawns[i]) {
                  return playerSpawns[i];
              }
              const baseX = Math.floor(BATTLE_MAP_SIZE / 2); 
              const baseZ = BATTLE_MAP_SIZE - 3; 
              if (i === 0) return { x: baseX, y: baseZ }; 
              if (i === 1) return { x: baseX - 2, y: baseZ + 1 }; 
              if (i === 2) return { x: baseX + 2, y: baseZ + 1 }; 
              return { x: baseX, y: baseZ + 2 }; 
          };
          
          // Generate D&D 5E Environmental Hazards based on biome terrain
          const battleHazards = generateBattleHazards(battleMap, terrain, BATTLE_MAP_SIZE, isShadow);

          const battleEntities: any[] = [];
          
          // Players
          party.forEach((member, i) => { 
              const memberWithStats = get().recalculateStats(member); 
              if (memberWithStats.hp > 0) { 
                  battleEntities.push({ ...member, stats: memberWithStats, position: getPlayerSpawn(i) }); 
              } 
          });
          
          // Enemies with New Scaling Logic
          for(let i=0; i<enemyCount; i++) { 
              const enemyDefId = (customEnemyList && customEnemyList.length > 0) ? customEnemyList[i] : finalEnemyList[Math.floor(Math.random() * finalEnemyList.length)];
              const enemyDef = enemies[enemyDefId] || Object.values(enemies)[0];
              
              const isThisEnemyBoss = isBoss && (i === 0 || enemyDef.name.toLowerCase().includes('dragon') || enemyDef.name.toLowerCase().includes('troll') || enemyDef.name.toLowerCase().includes('ghost'));
              const enemyName = isThisEnemyBoss ? `⚠️ ${enemyDef.name} [JEFE]` : `${enemyDef.name} ${i+1}`;
              
              // Calculate Enemy Stats using regional zone difficulty and party level
              const avgPartyLevel = Math.max(1, Math.floor(party.reduce((sum, p) => sum + p.stats.level, 0) / party.length));
              const scaledStats = calculateEnemyStats(enemyDef, avgPartyLevel, difficulty, playerPos?.x || 0, playerPos?.y || 0, dimension, isThisEnemyBoss);

              let dungeonHp = scaledStats.hp;
              let dungeonAc = scaledStats.ac;
              let dungeonLvl = scaledStats.level;

              if (isDungeon) {
                  const factions = get().factions || { dragon: 0, jade: 0, mixed: 0 };
                  const isMagical = enemyDef.name.toLowerCase().includes('sorcerer') || enemyDef.name.toLowerCase().includes('specter') || enemyDef.name.toLowerCase().includes('wraith');
                  const standing = isMagical ? factions.jade : factions.dragon;
                  
                  if (standing > 10) {
                      const reduction = Math.min(0.3, standing / 300); // max 30% reduction
                      dungeonHp = Math.max(5, Math.round(dungeonHp * (1 - reduction)));
                      dungeonAc = Math.max(10, Math.round(dungeonAc * (1 - reduction * 0.5)));
                      get().addLog(`🛡️ [Facción] Tu reputación con ${isMagical ? 'la Orden de Jade' : 'la Alianza del Dragón'} (${standing > 0 ? '+' : ''}${standing}) ha intimidado a este guardián: HP -${Math.round(reduction * 100)}%`, 'info');
                  } else if (standing < -10) {
                      const buff = Math.min(0.4, Math.abs(standing) / 250); // max 40% buff
                      dungeonHp = Math.round(dungeonHp * (1 + buff));
                      dungeonAc = Math.round(dungeonAc * (1 + buff * 0.3));
                      dungeonLvl += 1;
                      get().addLog(`⚔️ [Facción] Tu reputación con ${isMagical ? 'la Orden de Jade' : 'la Alianza del Dragón'} (${standing}) ha enfurecido a este guardián: ¡HP +${Math.round(buff * 100)}%, Nivel +1!`, 'combat');
                  }
              }

          const aiBehavior = getEnemyBehavior(enemyDefId);
          const startSlots = aiBehavior === AIBehavior.SPELLCASTER ? { current: 2, max: 2 } : { current: 0, max: 0 };

          battleEntities.push({
            id: 'enemy_' + generateId(), 
            name: enemyName, 
            type: 'ENEMY', 
            equipment: {}, 
            aiBehavior: aiBehavior,
            stats: { 
                level: dungeonLvl, 
                xp: scaledStats.xpReward, 
                xpToNextLevel: 0, 
                hp: dungeonHp, 
                maxHp: dungeonHp, 
                stamina: 100, maxStamina: 100, 
                ac: dungeonAc, 
                initiativeBonus: enemyDef.initiativeBonus, 
                speed: 30, 
                attributes: useContentStore.getState().classStats[CharacterClass.FIGHTER], 
                baseAttributes: useContentStore.getState().classStats[CharacterClass.FIGHTER], 
                spellSlots: startSlots 
            },
            visual: { 
                color: isThisEnemyBoss ? '#e11d48' : (isShadow ? '#1e293b' : '#ef4444'), 
                modelType: 'billboard', 
                spriteUrl: enemyDef.sprite,
                scale: isThisEnemyBoss ? 1.8 : 1.0,
                spriteConfig: enemyDef.spriteConfig
            }, 
            position: getEnemySpawn(i) 
          });
      }
      
      // D&D 5E Initiative System Calculation
      const { turnOrder: initiativeOrder, rollDetails } = calculateInitiativeRolls(battleEntities);
      
      get().addLog(`Encounter! ${enemyCount} enemies. Initiative rolled!`, "combat");
      if (battleHazards.length > 0) {
          get().addLog(`Tactical Map: ${battleHazards.length} environmental hazard tiles detected!`, "info");
      }
      
      // Log top initiative roll
      const topRoller = battleEntities.find(e => e.id === initiativeOrder[0]);
      if (topRoller && rollDetails[topRoller.id]) {
          const r = rollDetails[topRoller.id];
          get().addLog(`${topRoller.name} takes the lead (Initiative ${r.total} = d20[${r.d20Roll}] + ${r.dexModifier}).`, "combat");
      }

      get().transitionToMap({
          targetState: GameState.BATTLE_TACTICAL,
          targetLocationName: 'Encuentro Táctico D&D 5E',
          targetBiome: terrain,
          durationMs: 700,
          action: () => {
              set({ 
                  battleTerrain: terrain, 
                  battleWeather: weather, 
                  battleEntities, 
                  turnOrder: initiativeOrder, 
                  currentTurnIndex: 0, 
                  initiativeRolls: rollDetails,
                  battleRound: 1,
                  hasMoved: false, 
                  hasActed: false, 
                  selectedAction: null, 
                  selectedSpell: null, 
                  selectedTile: null, 
                  damagePopups: [], 
                  activeSpellEffect: null, 
                  battleRewards: { xp: 0, gold: 0, items: [] }, 
                  battleMap, 
                  battleHazards,
                  voxelStructures,
                  runAvailable: true, 
                  lootDrops: [], 
                  isSkillSelectionMode: false 
              });
              
              const firstId = initiativeOrder[0];
              if (battleEntities.find(e => e.id === firstId)?.type === 'ENEMY') { 
                  setTimeout(() => { get().nextTurn(); }, 1000); 
              } else { 
                  set({ selectedAction: BattleAction.MOVE }); 
              }
          }
      });
  },

  startDragonDungeonBattle: () => {
    sfx.playUiClick();
    const { enemies } = useContentStore.getState();
    const { party, difficulty } = get();

    const { battleMap, voxelStructures, playerSpawns, enemySpawns } = generate3RoomVoxelDungeon(BATTLE_MAP_SIZE);

    const dungeonGuards = ['skeleton', 'necromancer', 'orc_warrior', 'goblin_shaman'];
    const battleEntities: any[] = [];

    // Place Party in Room 1 (Antechamber)
    party.forEach((member, i) => {
      const memberWithStats = get().recalculateStats(member);
      if (memberWithStats.hp > 0) {
        battleEntities.push({
          ...member,
          stats: memberWithStats,
          position: playerSpawns[i] || { x: 2, y: 11 }
        });
      }
    });

    // Place 4 Dungeon Guardians across the 3 rooms
    dungeonGuards.forEach((enemyDefId, i) => {
      const enemyDef = enemies[enemyDefId] || Object.values(enemies)[0];
      const avgPartyLevel = Math.max(1, Math.floor(party.reduce((sum, p) => sum + p.stats.level, 0) / party.length));
      const scaledStats = calculateEnemyStats(enemyDef, avgPartyLevel, difficulty);

      const isOverseer = (i === 3);
      const enemyName = isOverseer ? `⚠️ Guardián del Portal [Sanctum]` : (i === 0 ? `Centinela del Dungeon [Antecámara]` : `Guardián de la Cripta [Sala Central ${i}]`);
      if (isOverseer) {
        scaledStats.hp = Math.floor(scaledStats.hp * 1.6);
        scaledStats.ac += 1;
      }

      const aiBehavior = getEnemyBehavior(enemyDefId);
      const spawnPos = enemySpawns[i] || { x: 4 + i * 2, y: 7 };

      battleEntities.push({
        id: `dungeon-guardian-${i}-${Date.now()}`,
        name: enemyName,
        type: 'ENEMY',
        stats: {
          ...scaledStats,
          initiativeBonus: enemyDef.initiativeBonus || 1,
          speed: 30,
          spellSlots: { current: 3, max: 3 }
        },
        visual: {
          color: isOverseer ? '#a855f7' : '#ef4444',
          modelType: 'billboard',
          spriteUrl: enemyDef.sprite,
          scale: isOverseer ? 1.6 : 1.1,
          spriteConfig: enemyDef.spriteConfig
        },
        position: spawnPos,
        behavior: aiBehavior
      });
    });

    // Calculate D&D initiative
    const { turnOrder: initiativeOrder, rollDetails } = calculateInitiativeRolls(battleEntities);

    const entrancePos = {
      x: get().playerPos?.x ?? 0,
      y: get().playerPos?.y ?? 0,
      dimension: get().dimension ?? Dimension.NORMAL
    };

    get().addLog(`⚔️ ¡Has ingresado al Dungeon Voxel de 3 Salas! Derrota a los 4 guardianes para activar el Portal Arcano a la Guarida del Dragón.`, "combat");

    get().transitionToMap({
      targetState: GameState.BATTLE_TACTICAL,
      targetLocationName: 'Dungeon Subterráneo del Dragón',
      targetBiome: TerrainType.RUINS,
      durationMs: 700,
      action: () => {
        set({
          isDragonDungeonBattle: true,
          dragonDungeonEntrancePos: entrancePos,
          battleTerrain: TerrainType.RUINS,
          battleWeather: WeatherType.NONE,
          battleEntities,
          turnOrder: initiativeOrder,
          currentTurnIndex: 0,
          initiativeRolls: rollDetails,
          battleRound: 1,
          hasMoved: false,
          hasActed: false,
          selectedAction: null,
          selectedSpell: null,
          selectedTile: null,
          damagePopups: [],
          activeSpellEffect: null,
          battleRewards: { xp: 500, gold: 400, items: [] },
          battleMap,
          battleHazards: [],
          voxelStructures,
          runAvailable: false,
          lootDrops: [],
          isSkillSelectionMode: false
        });

        const firstId = initiativeOrder[0];
        if (battleEntities.find(e => e.id === firstId)?.type === 'ENEMY') {
          setTimeout(() => { get().nextTurn(); }, 1000);
        } else {
          set({ selectedAction: null });
        }
      }
    });
  },

  handleTileInteraction: (x, z) => {
      const state = get(); 
      const activeId = state.turnOrder[state.currentTurnIndex]; 
      const activeEntity = state.battleEntities.find(e => e.id === activeId);
      if (!activeEntity || activeEntity.type !== 'PLAYER') return;
      const targetEnt = state.battleEntities.find(e => e.position.x === x && e.position.y === z);
      
      if (state.selectedAction === BattleAction.MOVE) {
          if (state.hasMoved) return;
          if (targetEnt) {
              sfx.playUiHover();
              set({ selectedTile: { x, z } });
              return;
          }
          const speedInTiles = Math.floor((activeEntity.stats.speed || 30) / 5);
          const dist = Math.max(Math.abs(activeEntity.position.x - x), Math.abs(activeEntity.position.y - z));
          if (dist > speedInTiles || dist === 0) {
              sfx.playUiHover();
              set({ selectedTile: { x, z } });
              return;
          }
          const cell = state.battleMap.find(c => c.x === x && c.z === z);
          if (cell?.isObstacle) return;

          // 2-Step Confirmation: First click selects tile as preview (Ghost Path), second click on same tile confirms movement
          if (!state.selectedTile || state.selectedTile.x !== x || state.selectedTile.z !== z) {
              sfx.playUiHover();
              set({ selectedTile: { x, z } });
              state.addLog(`👣 Ruta seleccionada: (${x}, ${z}) [${dist} PM]. Pulsa 'Mover aquí' para confirmar.`, 'info');
              return;
          }

          // Confirm movement
          get().confirmMovement();
      } 
      else if (state.selectedAction === BattleAction.ATTACK || state.selectedAction === BattleAction.MAGIC) {
          if (state.hasActed) return;
          set({ selectedTile: { x, z } });
          if (!targetEnt) { 
              const clickedCell = state.battleMap.find(c => c.x === x && c.z === z);
              if (clickedCell?.isObstacle) {
                  get().destroyObstacle(x, z);
              } else {
                  sfx.playUiHover();
              }
              return; 
          }
          
          // LOS Check
          const hasLos = checkLineOfSight(activeEntity.position, targetEnt.position, state.battleMap);
          if (!hasLos) { state.addLog("Blocked by obstacle!", "info"); sfx.playUiHover(); return; }

          // Height Bonus
          const attackerH = getUnitHeight(activeEntity, state.battleMap);
          const targetH = getUnitHeight(targetEnt, state.battleMap);
          const heightBonus = attackerH > targetH + 0.5 ? 2 : 0;
          if (heightBonus) state.addLog("High Ground Advantage! (+2 Hit)", "info");

          // 1. MAGIC ATTACK
          if (state.selectedAction === BattleAction.MAGIC && state.selectedSpell) {
               const spell = state.selectedSpell;
               const isAlly = isFriendly(activeEntity, targetEnt); 
               if (spell.type === SpellType.HEAL || spell.type === SpellType.BUFF) { 
                   if (!isAlly) { state.addLog("¡Solo puedes curar o mejorar a un aliado!", "info"); return; } 
               } else if (spell.type === SpellType.DAMAGE) { 
                   if (isAlly) { state.addLog("¡No puedes dañar a un aliado!", "info"); return; } 
               }
               
               const cost = spell.manaCost !== undefined ? spell.manaCost : (spell.level > 0 ? 1 : 0);
               if (activeEntity.stats.spellSlots.current < cost) { state.addLog(`Not enough spell slots! (Needs ${cost})`, "combat"); return; }

               const newSpellSlots = { ...activeEntity.stats.spellSlots };
               newSpellSlots.current = Math.max(0, newSpellSlots.current - cost);
               
               sfx.playSpellCast(spell.name, spell.level);
               set({ isActionAnimating: true, isSkillSelectionMode: false });
               state.addLog(`${activeEntity.name} casts ${spell.name}.`, "combat");
               
               // Dynamic Hazard creation from elemental magic!
               if (spell.name.includes('Fire')) {
                   get().spawnHazard({
                       type: BattleHazardType.FIRE,
                       x: targetEnt.position.x,
                       z: targetEnt.position.y,
                       name: 'Spellfire Surface',
                       description: 'Lingering flames deal 1d6 Fire damage (DEX save DC 12).',
                       duration: 2
                   });
               } else if (spell.name.includes('Ice')) {
                   get().spawnHazard({
                       type: BattleHazardType.ICE_SHEET,
                       x: targetEnt.position.x,
                       z: targetEnt.position.y,
                       name: 'Glacial Ice Patch',
                       description: 'Difficult terrain; DC 10 DEX save or slip.',
                       duration: 2
                   });
               } else if (spell.type === SpellType.HEAL) {
                   get().spawnHazard({
                       type: BattleHazardType.HOLY_GROUND,
                       x: targetEnt.position.x,
                       z: targetEnt.position.y,
                       name: 'Sanctified Aura',
                       description: 'Divine grace restores 1d4 HP.',
                       duration: 2
                   });
               }

               // Visuals setup
               let effectType: SpellType = SpellType.PROJECTILE;
               let color = '#f97316'; 
               let projectileSprite = undefined; 
               let spriteSheetUrl: string | undefined = undefined;

               if (spell.type === SpellType.HEAL) { 
                   effectType = SpellType.BURST; 
                   color = '#4ade80'; 
                   spriteSheetUrl = ASSETS.SPELL_FX.MAGIC_BUBBLES; 
               } else if (spell.name.includes('Ice') || spell.name.includes('Frost') || spell.name.includes('Freezing')) { 
                   effectType = SpellType.BURST; 
                   color = '#60a5fa'; 
                   spriteSheetUrl = ASSETS.SPELL_FX.FREEZING; 
               } else if (spell.name.includes('Lightning') || spell.name.includes('Thunder')) { 
                   effectType = SpellType.BEAM; 
                   color = '#c084fc'; 
                   spriteSheetUrl = ASSETS.SPELL_FX.VORTEX; 
               } else if (spell.name.includes('Magic Missile')) { 
                   effectType = SpellType.PROJECTILE; 
                   color = '#38bdf8'; 
                   projectileSprite = ASSETS.PROJECTILES.MAGIC_MISSILE; 
                   spriteSheetUrl = ASSETS.SPELL_FX.MAGIC_SPELL; 
               } else if (spell.name.includes('Eldritch') || spell.name.includes('Fel') || spell.name.includes('Dark')) { 
                   effectType = SpellType.BEAM; 
                   color = '#a855f7'; 
                   spriteSheetUrl = ASSETS.SPELL_FX.FEL_SPELL; 
               } else if (spell.name.includes('Fire') || spell.name.includes('Flame')) { 
                   effectType = SpellType.PROJECTILE; 
                   color = '#f97316'; 
                   projectileSprite = ASSETS.PROJECTILES.FIREBALL; 
                   spriteSheetUrl = ASSETS.SPELL_FX.BRIGHT_FIRE; 
               } else {
                   effectType = SpellType.BURST;
                   color = '#f59e0b';
                   spriteSheetUrl = ASSETS.SPELL_FX.MAGIC_HIT;
               }

               set({ activeSpellEffect: { id: generateId(), type: effectType, startPos: [activeEntity.position.x, 1.5, activeEntity.position.y], endPos: [targetEnt.position.x, 1.0, targetEnt.position.y], color, duration: 1000, timestamp: Date.now(), projectileSprite, spriteSheetUrl } });
               setTimeout(() => set({ activeSpellEffect: null }), 1200);

               if (spell.type === SpellType.HEAL) {
                   setTimeout(() => {
                       const amount = rollDice(spell.diceSides, spell.diceCount);
                       const popups = [...get().damagePopups, { id: generateId(), position: [targetEnt.position.x, 0, targetEnt.position.y] as [number, number, number], amount: `+${amount}`, color: '#22c55e', isCrit: false, timestamp: Date.now() }];
                       set(s => ({
                           battleEntities: s.battleEntities.map(e => {
                               let ent = { ...e };
                               if (e.id === activeId) ent.stats = { ...ent.stats, spellSlots: newSpellSlots };
                               if (e.id === targetEnt.id) ent.stats = { ...ent.stats, hp: Math.min(ent.stats.maxHp, ent.stats.hp + amount) };
                               return ent;
                           }),
                           hasActed: true,
                           selectedAction: null,
                           damagePopups: popups,
                           selectedSpell: null,
                           isActionAnimating: false
                       }));
                   }, 600);
               } else {
                   // D&D 5E Spell Attack Roll
                   const spellAttr = activeEntity.stats.class === CharacterClass.CLERIC ? activeEntity.stats.attributes?.WIS : (activeEntity.stats.class === CharacterClass.WIZARD ? activeEntity.stats.attributes?.INT : activeEntity.stats.attributes?.CHA || 14);
                   const spellMod = Math.floor(((spellAttr || 10) - 10) / 2);
                   const profBonus = Math.floor(((activeEntity.stats.level || 1) - 1) / 4) + 2;
                   const d20 = rollD20().result;
                   const totalSpellRoll = d20 + spellMod + profBonus + heightBonus;
                   const isCrit = d20 === 20;
                   const isCritFail = d20 === 1;
                   // Apply Cover Rules (Half Cover = +2 AC bonus to target)
                   const coverBonus = calculateCoverBonus(activeEntity.position, targetEnt.position, state.battleMap);
                   const effectiveAc = targetEnt.stats.ac + (coverBonus === 99 ? 0 : coverBonus);
                   if (coverBonus === 2) {
                       state.addLog(`🛡️ Cobertura Parcial! El objetivo obtiene +2 CA contra conjuros.`, 'info');
                   }

                   const isHit = isCrit || (!isCritFail && totalSpellRoll >= effectiveAc);

                   get().triggerDiceRoll({
                       id: generateId(),
                       rollerName: activeEntity.name,
                       targetName: targetEnt.name,
                       actionType: 'SPELL',
                       d20Roll: d20,
                       modifier: spellMod + profBonus + heightBonus,
                       total: totalSpellRoll,
                       targetAc: effectiveAc,
                       isHit,
                       isCrit,
                       isCritFail,
                       formulaString: `d20(${d20}) + ${spellMod + profBonus}(Spell)${heightBonus ? ' + 2(HighGround)' : ''} = ${totalSpellRoll} vs CA ${effectiveAc}`,
                       damagePreview: `${spell.name} (${spell.diceCount}d${spell.diceSides})`
                   });

                   setTimeout(() => {
                       if (isHit) {
                           const diceCount = isCrit ? spell.diceCount * 2 : spell.diceCount;
                           const amount = rollDice(spell.diceSides, diceCount);
                           const res = applyDamage(get(), targetEnt.id, amount, isCrit);
                           if (res) {
                               const updatedEntities = res.battleEntities.map((e: any) => {
                                   if (e.id === activeId) return { ...e, stats: { ...e.stats, spellSlots: newSpellSlots } };
                                   return e;
                               });
                               set({ ...res, battleEntities: updatedEntities });
                           }
                           state.addLog(`✨ ${activeEntity.name} casts ${spell.name} -> ${isCrit ? 'CRITICAL HIT!' : 'HIT!'} dealing ${amount} damage.`, 'combat');
                       } else {
                           state.addLog(`🛡️ ${spell.name} missed ${targetEnt.name} (Roll ${totalSpellRoll} vs AC ${effectiveAc}).`, 'combat');
                           const popups = [...get().damagePopups, { id: generateId(), position: [targetEnt.position.x, 0, targetEnt.position.y] as [number, number, number], amount: "MISS", color: '#94a3b8', isCrit: false, timestamp: Date.now() }];
                           set(s => ({
                               damagePopups: popups,
                               battleEntities: s.battleEntities.map(e => e.id === activeId ? { ...e, stats: { ...e.stats, spellSlots: newSpellSlots } } : e)
                           }));
                       }
                       set({ hasActed: true, selectedAction: null, selectedSpell: null, isActionAnimating: false });
                   }, 1150);
               }

          // 2. PHYSICAL ATTACK (Updated with D&D Logic)
          } else {
               if (isFriendly(activeEntity, targetEnt)) {
                   state.addLog("¡No puedes atacar a un aliado!", "info");
                   sfx.playUiHover();
                   return;
               }
               if (activeEntity.stats.stamina < STAT_COSTS.ATTACK) { state.addLog("Not enough stamina!", "combat"); sfx.playUiHover(); return; }
               const newStamina = activeEntity.stats.stamina - STAT_COSTS.ATTACK;
               set(s => ({ battleEntities: s.battleEntities.map(e => e.id === activeId ? { ...e, stats: { ...e.stats, stamina: newStamina } } : e) }));

               sfx.playAttack();
               set({ isActionAnimating: true });
               
               // CALCULATE HIT WITH DETAILED D&D 5E BREAKDOWN
               const coverBonus = calculateCoverBonus(activeEntity.position, targetEnt.position, state.battleMap);
               const effectiveAc = targetEnt.stats.ac + (coverBonus === 99 ? 0 : coverBonus);
               if (coverBonus === 2) {
                   state.addLog(`🛡️ Cobertura Parcial! El objetivo obtiene +2 CA contra ataques físicos.`, 'info');
               }

               const attackRoll = calculateDetailedAttackRoll(activeEntity, effectiveAc, heightBonus, EquipmentSlot.MAIN_HAND);
               const hit = attackRoll.hit;

               get().triggerDiceRoll({
                   id: generateId(),
                   rollerName: activeEntity.name,
                   targetName: targetEnt.name,
                   actionType: 'ATTACK',
                   d20Roll: attackRoll.d20,
                   modifier: attackRoll.total - attackRoll.d20,
                   total: attackRoll.total,
                   targetAc: effectiveAc,
                   isHit: attackRoll.hit,
                   isCrit: attackRoll.isCrit,
                   isCritFail: attackRoll.isCritFail,
                   formulaString: attackRoll.formulaString
               });

               if ([CharacterClass.RANGER, CharacterClass.ROGUE].includes(activeEntity.stats.class)) {
                    set({ activeSpellEffect: { id: generateId(), type: SpellType.PROJECTILE, startPos: [activeEntity.position.x, 1.5, activeEntity.position.y], endPos: [targetEnt.position.x, 1.0, targetEnt.position.y], color: '#fff', duration: 400, timestamp: Date.now(), projectileSprite: ASSETS.PROJECTILES.ARROW, spriteSheetUrl: ASSETS.SPELL_FX.WEAPON_HIT } });
                    setTimeout(() => set({ activeSpellEffect: null }), 500);
               } else {
                    set({ activeSpellEffect: { id: generateId(), type: SpellType.BURST, startPos: [activeEntity.position.x, 1.5, activeEntity.position.y], endPos: [targetEnt.position.x, 1.0, targetEnt.position.y], color: attackRoll.isCrit ? '#f59e0b' : '#f87171', duration: 600, timestamp: Date.now(), spriteSheetUrl: ASSETS.SPELL_FX.WEAPON_HIT } });
                    setTimeout(() => set({ activeSpellEffect: null }), 650);
               }

               setTimeout(() => {
                   if (hit) { 
                      const damageRoll = calculateDetailedDamage(activeEntity, targetEnt, EquipmentSlot.MAIN_HAND, attackRoll.isCrit);
                      if (attackRoll.isCrit) {
                        sfx.playCrit('melee');
                      } else {
                        sfx.playHit();
                      }
                      
                      const attackLog = attackRoll.isCrit
                        ? `💥 CRITICAL HIT! ${activeEntity.name} attacks ${targetEnt.name} ${attackRoll.formulaString} -> CRITICAL HIT!`
                        : `⚔️ ${activeEntity.name} attacks ${targetEnt.name} ${attackRoll.formulaString} -> HIT!`;
                      
                      const damageLog = `🩸 Damage: ${damageRoll.formulaString}`;

                      state.addLog(attackLog, "combat");
                      state.addLog(damageLog, "combat");
                      
                      const res = applyDamage(get(), targetEnt.id, damageRoll.total, attackRoll.isCrit); 
                      if (res) set(res); 
                   } else { 
                      if (attackRoll.isCritFail) {
                        sfx.playCritFail();
                      }
                      const missLog = attackRoll.isCritFail
                        ? `🛡️ ${activeEntity.name} rolled [d20(1)] -> CRITICAL MISS!`
                        : `🛡️ ${activeEntity.name} attacks ${targetEnt.name} ${attackRoll.formulaString} -> MISS!`;
                      
                      state.addLog(missLog, "combat"); 
                      const popups = [...get().damagePopups, { id: generateId(), position: [targetEnt.position.x, 0, targetEnt.position.y] as [number, number, number], amount: "MISS", color: '#94a3b8', isCrit: false, timestamp: Date.now() }]; 
                      set({ damagePopups: popups }); 
                   }
                   set({ hasActed: true, selectedAction: null, isActionAnimating: false });
               }, 1150);
          }
          set({ selectedTile: null });
      }
  },

  selectAction: (action) => {
    sfx.playUiClick();
    if (action === BattleAction.WAIT) {
      get().nextTurn();
    } else if (action === BattleAction.ITEM) {
      get().toggleInventory();
    } else if (action === BattleAction.RUN) {
      get().attemptRun();
    } else {
      set({ selectedAction: action, selectedTile: null, selectedSpell: null });
    }
  },

  selectSpell: (spellId) => {
    sfx.playUiClick();
    const storeSpells = useContentStore.getState().spells;
    const resolvedSpell = storeSpells[spellId.toUpperCase()] || storeSpells[spellId] || null;
    set({ selectedSpell: resolvedSpell, selectedTile: null });
    get().addLog("Spell selected.", "info");
  },

  setSkillSelectionMode: (enabled) => {
    set({ isSkillSelectionMode: enabled });
  },

  handleTileHover: (x, z) => {
    const hovered = get().battleEntities.find(e => e.position.x === x && e.position.y === z) || null;
    set({ hoveredEntity: hovered });
  },

  collectLoot: (dropId) => {
    const state = get();
    const activeId = state.turnOrder[state.currentTurnIndex];
    const activeEntity = state.battleEntities.find(e => e.id === activeId);

    // Guard clauses for safe loot action
    if (!activeEntity || activeEntity.type !== 'PLAYER' || state.hasActed) return;

    if (activeEntity.stats.stamina < STAT_COSTS.LOOT) {
      state.addLog("Too tired.", "info");
      return;
    }

    const dropIndex = state.lootDrops.findIndex(d => d.id === dropId);
    if (dropIndex === -1) return;

    const drop = state.lootDrops[dropIndex];
    if (activeEntity.position.x !== drop.position.x || activeEntity.position.y !== drop.position.y) return;

    sfx.playUiClick();

    // Accumulate combat rewards
    const currentRewards = state.battleRewards;
    const newRewards = {
      ...currentRewards,
      gold: currentRewards.gold + drop.gold,
      items: [...currentRewards.items, ...drop.items]
    };

    // Update active player inventory
    const newInventory = [...state.inventory];
    drop.items.forEach(item => {
      const existingSlot = newInventory.find(s => s.item.id === item.id);
      if (existingSlot) {
        existingSlot.quantity++;
      } else {
        newInventory.push({ item, quantity: 1 });
      }
    });

    // Remove loot drop from map surface
    const newDrops = [...state.lootDrops];
    newDrops.splice(dropIndex, 1);

    // Consume stamina
    const newStamina = activeEntity.stats.stamina - STAT_COSTS.LOOT;
    const updatedEntities = state.battleEntities.map(e =>
      e.id === activeId ? { ...e, stats: { ...e.stats, stamina: newStamina } } : e
    );

    // Visual feedback popups
    const popups = [
      ...state.damagePopups,
      {
        id: generateId(),
        position: [drop.position.x, 0, drop.position.y] as [number, number, number],
        amount: `+${drop.gold}G`,
        color: '#facc15',
        isCrit: false,
        timestamp: Date.now()
      }
    ];

    set({
      lootDrops: newDrops,
      battleRewards: newRewards,
      inventory: newInventory,
      battleEntities: updatedEntities,
      hasActed: true,
      damagePopups: popups
    });

    state.addLog(`${activeEntity.name} looted ${drop.gold}g.`, "loot");
  },

  destroyObstacle: (x, z) => {
    const state = get();
    const activeId = state.turnOrder[state.currentTurnIndex];
    const activeEntity = state.battleEntities.find(e => e.id === activeId);
    if (!activeEntity || activeEntity.type !== 'PLAYER') return;
    if (state.hasActed) return;

    const cell = state.battleMap.find(c => c.x === x && c.z === z);
    if (!cell || !cell.isObstacle) return;

    // Find voxel blocks occupying this cell (at any y level >= 0)
    const blocksOnCell = state.voxelStructures.filter(b => b.x === x && b.z === z && b.y >= 0);
    if (blocksOnCell.length === 0) return;

    // Check if it is a TNT block
    const isTnt = blocksOnCell.some(b => b.textureUrl.toLowerCase().includes('tnt'));
    
    // Spend resource
    if (state.selectedAction === BattleAction.MAGIC) {
        const spell = state.selectedSpell;
        if (!spell) return;
        const cost = spell.manaCost !== undefined ? spell.manaCost : (spell.level > 0 ? 1 : 0);
        if (activeEntity.stats.spellSlots.current < cost) { state.addLog("Not enough spell slots!", "combat"); return; }
        
        const newSpellSlots = { ...activeEntity.stats.spellSlots };
        newSpellSlots.current = Math.max(0, newSpellSlots.current - cost);
        
        set(s => ({
            battleEntities: s.battleEntities.map(e => e.id === activeId ? { ...e, stats: { ...e.stats, spellSlots: newSpellSlots } } : e)
        }));
        sfx.playSpellCast(spell.name, spell.level);
    } else {
        if (activeEntity.stats.stamina < STAT_COSTS.ATTACK) { state.addLog("Not enough stamina!", "combat"); return; }
        const newStamina = activeEntity.stats.stamina - STAT_COSTS.ATTACK;
        set(s => ({
            battleEntities: s.battleEntities.map(e => e.id === activeId ? { ...e, stats: { ...e.stats, stamina: newStamina } } : e)
        }));
        sfx.playAttack();
    }

    set({ isActionAnimating: true });

    setTimeout(() => {
        // Flatten tile and remove obstacle flag
        const updatedMap = state.battleMap.map(c => {
            if (c.x === x && c.z === z) {
                return { ...c, isObstacle: false, height: 1, textureUrl: ASSETS.BLOCK_TEXTURES[state.battleTerrain] || c.textureUrl };
            }
            return c;
        });

        // Remove non-surface voxel blocks from this cell
        const updatedVoxels = state.voxelStructures.filter(b => !(b.x === x && b.z === z && b.y >= 0));

        if (isTnt) {
            sfx.playCrit('heavy');
            state.addLog("💥 ¡BUM! La dinamita ha detonado de forma destructiva.", "combat");

            // Spawn explosion spell effect
            set({ activeSpellEffect: { id: generateId(), type: SpellType.BURST, startPos: [x, 1.5, z], endPos: [x, 1.0, z], color: '#ef4444', duration: 1000, timestamp: Date.now(), animationKey: 'EXPLOSION' } });
            setTimeout(() => set({ activeSpellEffect: null }), 1200);

            // Deal 3d6 fire damage to all entities in adjacent radius (including diagonals)
            let damagePopupsList = [...state.damagePopups];
            let currentEntities = [...state.battleEntities];

            // Find targets in radius 1
            currentEntities = currentEntities.map(ent => {
                const dist = Math.max(Math.abs(ent.position.x - x), Math.abs(ent.position.y - z));
                if (dist <= 1) {
                    const damage = rollDice(6, 3); // 3d6
                    damagePopupsList.push({
                        id: generateId(),
                        position: [ent.position.x, 0, ent.position.y],
                        amount: `-${damage}`,
                        color: '#ef4444',
                        isCrit: true,
                        timestamp: Date.now()
                    });
                    state.addLog(`💥 Explosión daña a ${ent.name} por ${damage} de daño de fuego!`, "combat");
                    
                    // Subtract HP
                    const res = applyDamage({ ...state, battleEntities: currentEntities }, ent.id, damage, true);
                    if (res) {
                        return res.battleEntities.find(e => e.id === ent.id) || ent;
                    }
                }
                return ent;
            });

            set({
                battleMap: updatedMap,
                voxelStructures: updatedVoxels,
                battleEntities: currentEntities,
                damagePopups: damagePopupsList,
                hasActed: true,
                selectedAction: null,
                selectedSpell: null,
                isActionAnimating: false
            });
        } else {
            sfx.playHit('bludgeoning');
            state.addLog(`🪓 Cobertura destruida en (${x}, ${z}).`, "info");

            // Loot drop chance!
            let lootMessage = "";
            const lootDropChance = Math.random();
            if (lootDropChance > 0.5) {
                const healingPotion = { ...ITEMS.POTION_HEALING, id: generateId() };
                const rewards = { ...state.battleRewards };
                rewards.items = [...rewards.items, healingPotion];
                lootMessage = " ¡Encontraste una Poción de Curación entre los restos!";
                
                // Add to player inventory
                const newInventory = [...state.inventory];
                const existingSlot = newInventory.find(s => s.item.id === healingPotion.id);
                if (existingSlot) {
                    existingSlot.quantity++;
                } else {
                    newInventory.push({ item: healingPotion, quantity: 1 });
                }

                set({ battleRewards: rewards, inventory: newInventory });
            }

            state.addLog(`📦 Cobertura eliminada.${lootMessage}`, "info");

            set({
                battleMap: updatedMap,
                voxelStructures: updatedVoxels,
                hasActed: true,
                selectedAction: null,
                selectedSpell: null,
                isActionAnimating: false
            });
        }
    }, 800);
  },
  
  nextTurn: () => { 
    const state = get(); 
    if (state.gameState !== GameState.BATTLE_TACTICAL) return; 
    let nextIdx = (state.currentTurnIndex + 1) % state.turnOrder.length; 
    const isNewRound = nextIdx <= state.currentTurnIndex;
    const nextRound = isNewRound ? (state.battleRound || 1) + 1 : (state.battleRound || 1);

    // Hazard duration decay on new round
    let currentHazards = state.battleHazards || [];
    if (isNewRound && currentHazards.length > 0) {
      currentHazards = currentHazards
        .map(h => h.duration !== undefined ? { ...h, duration: h.duration - 1 } : h)
        .filter(h => h.duration === undefined || h.duration > 0);
    }

    let nextEntity = state.battleEntities.find(e => e.id === state.turnOrder[nextIdx]); 
    if (!nextEntity || nextEntity.stats.hp <= 0) { 
      for(let i=0; i<10; i++) { 
        nextIdx = (nextIdx + 1) % state.turnOrder.length; 
        nextEntity = state.battleEntities.find(e => e.id === state.turnOrder[nextIdx]); 
        if (nextEntity && nextEntity.stats.hp > 0) break; 
      } 
    } 
    if (!nextEntity) return; 

    // Stamina Regeneration
    const REGEN_FLAT = 2; 
    const maxStamina = nextEntity.stats.maxStamina || 10; 
    const currentStamina = nextEntity.stats.stamina || 0; 
    const regenAmount = Math.floor(maxStamina * 0.1) + REGEN_FLAT; 
    const newStamina = Math.min(maxStamina, currentStamina + regenAmount); 
    let newPopups = [...state.damagePopups]; 
    if (nextEntity.type === 'PLAYER' && newStamina > currentStamina) { 
      const recovered = newStamina - currentStamina; 
      newPopups.push({ id: generateId(), position: [nextEntity.position.x, 0, nextEntity.position.y] as [number, number, number], amount: `+${recovered} ⚡`, color: '#facc15', isCrit: false, timestamp: Date.now() }); 
    } 

    let updatedEntities = state.battleEntities.map(e => e.id === nextEntity!.id ? { ...e, stats: { ...e.stats, stamina: newStamina } } : e); 

    // Turn Tick Hazard Check for starting position
    const hazardOnTile = currentHazards.find(h => h.x === nextEntity!.position.x && h.z === nextEntity!.position.y);
    if (hazardOnTile) {
      const tickRes = resolveHazardTurnTick(nextEntity, hazardOnTile);
      if (tickRes?.message) state.addLog(tickRes.message, tickRes.damage > 0 ? "combat" : "info");
      if (tickRes && tickRes.damage > 0) {
        const dmgRes = applyDamage({ ...state, battleEntities: updatedEntities, damagePopups: [] }, nextEntity.id, tickRes.damage);
        if (dmgRes) {
          updatedEntities = dmgRes.battleEntities;
          if (dmgRes.damagePopups) newPopups = [...newPopups, ...dmgRes.damagePopups];
        }
      } else if (tickRes && tickRes.healing > 0) {
        updatedEntities = updatedEntities.map(e => e.id === nextEntity!.id ? { ...e, stats: { ...e.stats, hp: Math.min(e.stats.maxHp, e.stats.hp + tickRes.healing) } } : e);
        newPopups.push({ id: generateId(), position: [nextEntity.position.x, 0, nextEntity.position.y] as [number, number, number], amount: `+${tickRes.healing} HP`, color: '#22c55e', isCrit: false, timestamp: Date.now() });
      } else if (tickRes?.popupAmount) {
        newPopups.push({ id: generateId(), position: [nextEntity.position.x, 0, nextEntity.position.y] as [number, number, number], amount: tickRes.popupAmount, color: tickRes.popupColor || '#ca8a04', isCrit: false, timestamp: Date.now() });
      }
    }

    set({ 
      battleEntities: updatedEntities, 
      turnOrder: state.turnOrder,
      currentTurnIndex: nextIdx, 
      battleRound: nextRound,
      battleHazards: currentHazards,
      selectedTile: null, 
      hasMoved: false, 
      hasActed: false, 
      selectedAction: null, 
      selectedSpell: null, 
      hoveredEntity: null, 
      activeSpellEffect: null, 
      damagePopups: newPopups 
    }); 

    sfx.playTurnStart(nextEntity.type === 'PLAYER');
    if (nextEntity.type === 'PLAYER') { 
      get().addLog(`${nextEntity.name}'s turn.`, "info"); 
    } else { 
      const currentSpeed = get().battleSpeed || 1.0;
      const invSpeed = 1 / currentSpeed;

      // Phase 1: Camera focus & pacing breath
      setTimeout(() => { 
        const currentState = get(); 
        if (currentState.gameState !== GameState.BATTLE_TACTICAL) return; 
        const me = currentState.battleEntities.find(e => e.id === nextEntity!.id); 
        const targets = currentState.battleEntities.filter(e => e.type === 'PLAYER' && e.stats.hp > 0); 
        if (!me || me.stats.hp <= 0 || targets.length === 0) { 
          currentState.nextTurn(); 
          return; 
        } 

        set({ isActionAnimating: true });
        const updates = performEnemyAction(currentState, me, targets, set); 
        if (updates) set(updates); 

        const hadDiceRoll = !!get().activeDiceRoll;
        const hadSpell = !!get().activeSpellEffect;
        const actionDuration = (hadDiceRoll ? 1150 : (hadSpell ? 900 : 550)) * invSpeed;

        // Phase 2: Action animation and resolution duration
        setTimeout(() => {
          set({ isActionAnimating: false });

          // Phase 3: Post-action grace period so results/popups are clear
          setTimeout(() => {
            get().clearDiceRoll();
            get().nextTurn();
          }, 350 * invSpeed);
        }, actionDuration);

      }, 400 * invSpeed); 
    } 
  },
  attemptRun: () => { const state = get(); const activeId = state.turnOrder[state.currentTurnIndex]; const activeEntity = state.battleEntities.find(e => e.id === activeId); if (activeEntity && activeEntity.stats.stamina < STAT_COSTS.RUN) { state.addLog("Too exhausted!", "combat"); return; } if (activeEntity) { const newStamina = activeEntity.stats.stamina - STAT_COSTS.RUN; set(s => ({ battleEntities: s.battleEntities.map(e => e.id === activeId ? { ...e, stats: { ...e.stats, stamina: newStamina } } : e) })); } const hpFactor = (activeEntity?.stats.hp || 1) / (activeEntity?.stats.maxHp || 1); const escapeChance = Math.min(0.95, Math.max(0.2, 0.5 + (hpFactor * 0.2))); if (Math.random() < escapeChance) { get().addLog("Escaped!", "narrative"); set({ gameState: GameState.OVERWORLD, damagePopups: [], gracePeriodEndTime: Date.now() + 5000 }); } else { get().addLog("Failed escape!", "combat"); get().nextTurn(); } },
  restartBattle: () => { sfx.playUiClick(); get().startBattle(get().battleTerrain, get().battleWeather); },
  confirmMovement: () => {
      const state = get();
      const activeId = state.turnOrder[state.currentTurnIndex];
      const activeEntity = state.battleEntities.find(e => e.id === activeId);
      const selTile = state.selectedTile;
      if (!activeEntity || activeEntity.type !== 'PLAYER' || !selTile) return;

      const x = selTile.x;
      const z = selTile.z;
      const speedInTiles = Math.floor((activeEntity.stats.speed || 30) / 5);
      const dist = Math.max(Math.abs(activeEntity.position.x - x), Math.abs(activeEntity.position.y - z));
      const cell = state.battleMap.find(c => c.x === x && c.z === z);
      if (cell?.isObstacle || dist > speedInTiles || dist === 0) return;

      sfx.playTacticalMove(cell?.terrain, dist > 3);

      const hazardOnTile = (state.battleHazards || []).find(h => h.x === x && h.z === z);
      let finalPopups = [...state.damagePopups];
      let updatedEntities = state.battleEntities.map(e => e.id === activeId ? { ...e, position: { x, y: z } } : e);

      if (hazardOnTile) {
          const hazardRes = resolveHazardEntry(activeEntity, hazardOnTile);
          if (hazardRes.message) state.addLog(hazardRes.message, hazardRes.damage > 0 ? "combat" : "info");
          
          if (hazardRes.damage > 0) {
              const dmgRes = applyDamage({ ...state, battleEntities: updatedEntities, damagePopups: [] }, activeEntity.id, hazardRes.damage);
              if (dmgRes) {
                  updatedEntities = dmgRes.battleEntities;
                  if (dmgRes.damagePopups) finalPopups = [...finalPopups, ...dmgRes.damagePopups];
              }
          } else if (hazardRes.healing > 0) {
              updatedEntities = updatedEntities.map(e => e.id === activeId ? { ...e, stats: { ...e.stats, hp: Math.min(e.stats.maxHp, e.stats.hp + hazardRes.healing) } } : e);
              finalPopups.push({ id: generateId(), position: [x, 0, z] as [number, number, number], amount: `+${hazardRes.healing} HP`, color: '#22c55e', isCrit: false, timestamp: Date.now() });
          } else if (hazardRes.popupAmount) {
              finalPopups.push({ id: generateId(), position: [x, 0, z] as [number, number, number], amount: hazardRes.popupAmount, color: hazardRes.popupColor, isCrit: false, timestamp: Date.now() });
          }
      }

      set({ 
          battleEntities: updatedEntities, 
          hasMoved: true, 
          selectedAction: null, 
          selectedTile: null,
          damagePopups: finalPopups
      });
      state.addLog(`👟 ${activeEntity.name} se desplazó a (${x}, ${z}).`, 'info');
  },
  continueAfterVictory: () => { 
    sfx.playUiClick(); 
    const { battleRewards, inventory, battleTerrain, progressQuestObjective } = get(); 
    const newInventory = [...inventory]; 
    battleRewards.items.forEach(item => { 
      const existingSlot = newInventory.find(s => s.item.id === item.id); 
      if (existingSlot) existingSlot.quantity++; 
      else newInventory.push({ item, quantity: 1 }); 
    }); 
    set({ inventory: newInventory, lootDrops: [] }); 

    // Quest logic: Exploring Ruins or Caves grants Dragon Clues if the quest is active
    if (progressQuestObjective && (battleTerrain === TerrainType.RUINS || battleTerrain === TerrainType.CAVE_FLOOR)) {
        progressQuestObjective('DRAGON_HUNT', 'OBJ_CLUES', 1);
    }

    // Quest logic: Defeating the Goblin Boss in the Lair
    if (progressQuestObjective && (battleTerrain === TerrainType.CAVE_FLOOR || get().quests.some(q => q.id === 'GOBIN_TUTORIAL' && q.objectives?.some(o => o.id === 'OBJ_FIND_GOBLIN_LAIR' && o.completed)))) {
        progressQuestObjective('GOBIN_TUTORIAL', 'OBJ_DEFEAT_GOBLIN_BOSS', 1);
    }

    if (get().isDragonDungeonBattle) {
      if (progressQuestObjective) {
        progressQuestObjective('DRAGON_HUNT', 'OBJ_DUNGEON_ENEMIES', 4);
      }
      set({ isDragonDungeonBattle: false, damagePopups: [] });
      get().addLog('🌀 ¡Los 4 Guardianes del Dungeon han sido aniquilados! El Portal Arcano en el Sanctum se enciende y te absorbe hacia la Guarida Volcánica del Dragón...', 'loot');
      get().startHuntMode('Guarida Volcánica del Dragón');
      return;
    }

    const hasLevelUps = get().initiatePostBattleLevelUp(battleRewards.xp); 
    if (!hasLevelUps) {
      set({ 
        gameState: GameState.OVERWORLD, 
        damagePopups: [], 
        gracePeriodEndTime: Date.now() + 3000 
      }); 
      // Auto-save post-battle victory
      get().autoSaveGame();
    }
  },
  hasLineOfSight: (source, target) => checkLineOfSight(source, target, get().battleMap),
  getAttackPrediction: (targetEntityOverride?: Entity | null) => {
    const state = get();
    const activeId = state.turnOrder[state.currentTurnIndex];
    const activeEntity = state.battleEntities.find(e => e.id === activeId);

    if (!activeEntity || activeEntity.type !== 'PLAYER') return null;

    const targetEntity = targetEntityOverride || state.hoveredEntity || (state.selectedTile ? state.battleEntities.find(e => e.position.x === state.selectedTile!.x && e.position.y === state.selectedTile!.z) : null);

    if (!targetEntity || targetEntity.id === activeEntity.id || targetEntity.stats.hp <= 0) {
      return null;
    }

    // Only generate prediction when an offensive or spell action is actively selected
    if (state.selectedAction !== BattleAction.ATTACK && state.selectedAction !== BattleAction.MAGIC) {
      return null;
    }

    const isFriendlyTarget = isFriendly(activeEntity, targetEntity);
    const selectedSpell = state.selectedSpell;
    const isMagicMode = state.selectedAction === BattleAction.MAGIC || !!selectedSpell;

    // Friendly units cannot be physically attacked or targeted by damaging spells
    if (isFriendlyTarget) {
      const isHealingSpell = isMagicMode && selectedSpell && (
        selectedSpell.type === SpellType.HEAL || 
        selectedSpell.name.toLowerCase().includes('curar') || 
        selectedSpell.name.toLowerCase().includes('heal')
      );
      if (!isHealingSpell) {
        return null;
      }
    }

    const start = activeEntity.position;
    const target = targetEntity.position;

    const startCell = state.battleMap.find(c => c.x === start.x && c.z === start.y);
    const targetCell = state.battleMap.find(c => c.x === target.x && c.z === target.y);

    const startY = startCell ? (startCell.offsetY || 0) + startCell.height : 0.5;
    const targetY = targetCell ? (targetCell.offsetY || 0) + targetCell.height : 0.5;

    const hasHighGround = startY > targetY + 0.5;
    const heightBonus = hasHighGround ? 2 : 0;

    const coverBonus = calculateCoverBonus(start, target, state.battleMap);
    const isFullCover = coverBonus === 99;
    const isHalfCover = coverBonus === 2;

    if (isMagicMode && selectedSpell) {
      const isHealing = selectedSpell.type === SpellType.HEAL || selectedSpell.name.toLowerCase().includes('curar') || selectedSpell.name.toLowerCase().includes('heal');
      
      const attrKey = [CharacterClass.WIZARD].includes(activeEntity.stats.class) ? 'INT' :
                      [CharacterClass.CLERIC, CharacterClass.DRUID, CharacterClass.RANGER].includes(activeEntity.stats.class) ? 'WIS' : 'CHA';
      const spellAttrMod = getModifier(activeEntity.stats.attributes[attrKey] || 10);
      const profBonus = getProficiencyBonus(activeEntity.stats.level);
      const spellModTotal = spellAttrMod + profBonus;

      if (isHealing) {
        const minDmg = selectedSpell.diceCount + spellAttrMod;
        const maxDmg = (selectedSpell.diceCount * selectedSpell.diceSides) + spellAttrMod;
        const avgDmg = Math.round((selectedSpell.diceCount * (selectedSpell.diceSides + 1) / 2) + spellAttrMod);
        const projectedHp = Math.min(targetEntity.stats.maxHp, targetEntity.stats.hp + avgDmg);

        return {
          attacker: activeEntity,
          target: targetEntity,
          actionName: selectedSpell.name,
          actionIcon: '✨',
          actionType: 'HEAL',
          hitChance: 100,
          minDamage: minDmg,
          maxDamage: maxDmg,
          avgDamage: avgDmg,
          diceFormula: `${selectedSpell.diceCount}d${selectedSpell.diceSides}+${spellAttrMod}`,
          currentHp: targetEntity.stats.hp,
          maxHp: targetEntity.stats.maxHp,
          projectedHp,
          isHealing: true,
          isFriendlyTarget
        } as AttackForecast;
      }

      const effectiveAC = targetEntity.stats.ac + (isFullCover ? 0 : coverBonus);
      const totalSpellMod = spellModTotal + heightBonus;
      const neededD20 = effectiveAC - totalSpellMod;
      const hitChance = isFullCover ? 0 : Math.max(5, Math.min(95, Math.round(((21 - neededD20) / 20) * 100)));

      const diceCount = selectedSpell.diceCount;
      const diceSides = selectedSpell.diceSides;
      const minDmg = diceCount;
      const maxDmg = diceCount * diceSides;
      const avgDmg = Math.round(diceCount * (diceSides + 1) / 2);
      const projectedHp = Math.max(0, targetEntity.stats.hp - avgDmg);

      return {
        attacker: activeEntity,
        target: targetEntity,
        actionName: selectedSpell.name,
        actionIcon: '🔮',
        actionType: 'SPELL',
        hitChance,
        minDamage: minDmg,
        maxDamage: maxDmg,
        avgDamage: avgDmg,
        diceFormula: `${diceCount}d${diceSides}`,
        currentHp: targetEntity.stats.hp,
        maxHp: targetEntity.stats.maxHp,
        projectedHp,
        isHealing: false,
        isFullCover,
        isHalfCover,
        hasHighGround,
        isFriendlyTarget,
        effectiveAC
      } as AttackForecast;
    }

    const weapon = activeEntity.equipment[EquipmentSlot.MAIN_HAND];
    const { mod } = getAttackingModifierAndName(activeEntity, weapon);
    const profBonus = getProficiencyBonus(activeEntity.stats.level);

    const effectiveAC = targetEntity.stats.ac + (isFullCover ? 0 : coverBonus);
    const totalAttackMod = mod + profBonus + heightBonus;
    const neededD20 = effectiveAC - totalAttackMod;
    const hitChance = isFullCover ? 0 : Math.max(5, Math.min(95, Math.round(((21 - neededD20) / 20) * 100)));

    const diceCount = weapon?.equipmentStats?.diceCount || 1;
    const diceSides = weapon?.equipmentStats?.diceSides || (weapon ? 4 : 1);
    const attrBonus = mod;

    const minDmg = Math.max(1, diceCount * 1 + attrBonus);
    const maxDmg = Math.max(1, diceCount * diceSides + attrBonus);
    const avgDmg = Math.max(1, Math.round((diceCount * (diceSides + 1) / 2) + attrBonus));
    const projectedHp = Math.max(0, targetEntity.stats.hp - avgDmg);

    const isRanged = weapon?.equipmentStats?.properties?.includes('Range');

    return {
      attacker: activeEntity,
      target: targetEntity,
      actionName: weapon?.name || 'Ataque Físico',
      actionIcon: isRanged ? '🏹' : '⚔️',
      actionType: isRanged ? 'RANGED' : 'MELEE',
      hitChance,
      minDamage: minDmg,
      maxDamage: maxDmg,
      avgDamage: avgDmg,
      diceFormula: `${diceCount}d${diceSides}${attrBonus > 0 ? `+${attrBonus}` : attrBonus < 0 ? `${attrBonus}` : ''}`,
      currentHp: targetEntity.stats.hp,
      maxHp: targetEntity.stats.maxHp,
      projectedHp,
      isHealing: false,
      isFullCover,
      isHalfCover,
      hasHighGround,
      isFriendlyTarget,
      effectiveAC
    } as AttackForecast;
  }
});

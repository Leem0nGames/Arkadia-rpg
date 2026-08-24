
import { StateCreator } from 'zustand';
import { GameState, Dimension, Difficulty, HexCell, PositionComponent, WeatherType, OverworldEntity, Quest, GameStateData, TerrainType, SaveSlotId, EventChoice, NarrativeEvent } from '../../types';
import { WorldGenerator } from '../../services/WorldGenerator';
import { findPath } from '../../services/pathfinding';
import { calculateVisionRange } from '../../services/dndRules';
import { sfx } from '../../services/SoundSystem';
import { useContentStore } from '../contentStore';
import { GameStore } from '../gameStore';
import { DEFAULT_MAP_WIDTH, DEFAULT_MAP_HEIGHT, TERRAIN_MOVEMENT_COST } from '../../constants';
import { writeSaveToSlot, readSaveFromSlot, deleteSaveSlot, deserializeGameState } from '../../services/saveManager';
import { ANCIENT_SITES, getAncientSiteAt } from '../../data/ancientSites';
import { calculateReachableTiles } from '../../services/movementArea';

const generateId = () => Math.random().toString(36).substr(2, 9);

export interface OverworldSlice {
  gameState: GameState;
  dimension: Dimension;
  difficulty: Difficulty;
  exploredTiles: Record<Dimension, Set<string>>;
  visitedTowns: Record<string, boolean>;
  clearedEncounters: Set<string>;
  townMapData: HexCell[] | null;
  activeOverworldEnemies: OverworldEntity[];
  playerPos: PositionComponent;
  isPlayerMoving: boolean;
  lastOverworldPos: PositionComponent | null;
  mapDimensions: { width: number; height: number };
  quests: Quest[];
  standingOnPortal: boolean;
  standingOnSettlement: boolean;
  isMapOpen: boolean;
  gracePeriodEndTime: number;
  searchedSites: string[];
  travelDistanceMeters: number;
  travelHours: number;
  travelMinutes: number;
  travelDays: number;
  travelFatigue: number;
  reachableTiles: Set<string> | null;

  setGameState: (state: GameState) => void;
  initializeWorld: () => void;
  movePlayerOverworld: (q: number, r: number) => Promise<void>;
  advanceTime: (minutes: number) => void;
  usePortal: () => void;
  enterSettlement: () => void;
  exitSettlement: () => void;
  toggleMap: () => void;
  saveGame: (slotId?: SaveSlotId) => void;
  autoSaveGame: () => void;
  loadGame: (slotId?: SaveSlotId) => void;
  deleteSave: (slotId: SaveSlotId) => void;
  quitToMenu: () => void;
  triggerEventChoice: (choice: EventChoice) => void;
  closeNarrativeEvent: () => void;
  acceptQuest: (quest: Quest) => void;
  progressQuestObjective: (questId: string, objectiveId: string, amount: number) => void;
  investigateAncientSite: (siteId?: string) => void;
  resetTravelFatigue: () => void;
  setReachableTiles: (unitId: string | null, maxMovePoints?: number) => void;
}

const generateTownMap = (q: number = 0, r: number = 0, poiType: HexCell['poiType'] = 'PLAZA'): HexCell[] => {
    return WorldGenerator.generateSettlement(12345, q, r, poiType, 14, 14);
};

const updateExploration = (center: PositionComponent, dimension: Dimension, radius: number, currentSet: Set<string>): Set<string> => {
    const newSet = new Set(currentSet);
    for (let q = center.x - radius; q <= center.x + radius; q++) {
        for (let r = center.y - radius; r <= center.y + radius; r++) {
            const dist = (Math.abs(q - center.x) + Math.abs(q + r - center.x - center.y) + Math.abs(r - center.y)) / 2;
            if (dist <= radius) {
                newSet.add(`${q},${r}`);
            }
        }
    }
    return newSet;
};

export const createOverworldSlice: StateCreator<GameStore, [], [], OverworldSlice> = (set, get) => ({
  gameState: GameState.CHARACTER_CREATION,
  dimension: Dimension.NORMAL,
  difficulty: Difficulty.NORMAL,
  exploredTiles: { [Dimension.NORMAL]: new Set(), [Dimension.UPSIDE_DOWN]: new Set() },
  visitedTowns: {},
  clearedEncounters: new Set(),
  townMapData: null,
  activeOverworldEnemies: [],
  playerPos: { x: 0, y: 0 },
  isPlayerMoving: false,
  lastOverworldPos: null,
  mapDimensions: { width: DEFAULT_MAP_WIDTH, height: DEFAULT_MAP_HEIGHT },
  quests: [],
  standingOnPortal: false,
  standingOnSettlement: false,
  isMapOpen: false,
  gracePeriodEndTime: 0,
  searchedSites: [],
  travelDistanceMeters: 0,
  travelHours: 8, // Start at 8:00 AM (Daylight)
  travelMinutes: 0,
  travelDays: 1,
  travelFatigue: 0,
  reachableTiles: null,

  setGameState: (state) => set({ gameState: state }),
  
  initializeWorld: () => {
       // Generator init happens in gameStore/init or implicitly via WorldGenerator class static
       WorldGenerator.init(12345);
  },

  advanceTime: (minutes) => {
    const { travelMinutes, travelHours, travelDays } = get();
    const totalMinutes = travelMinutes + minutes;
    const extraHours = Math.floor(totalMinutes / 60);
    const nextMinutes = totalMinutes % 60;
    
    const totalHours = travelHours + extraHours;
    const nextHours = totalHours % 24;
    const nextDays = travelDays + Math.floor(totalHours / 24);
    
    set({
      travelMinutes: nextMinutes,
      travelHours: nextHours,
      travelDays: nextDays
    });
  },

  resetTravelFatigue: () => {
    set({ travelFatigue: 0 });
  },

  toggleMap: () => { 
      sfx.playUiClick(); 
      set(state => ({ isMapOpen: !state.isMapOpen, isInventoryOpen: false })); 
  },

  movePlayerOverworld: async (q, r) => {
        const { isPlayerMoving, playerPos, dimension, gameState, townMapData, activeOverworldEnemies, party, clearedEncounters, exploredTiles, gracePeriodEndTime } = get();
        
        // Check if movement is redundant BUT allow if not explored
        const currentKey = `${q},${r}`;
        const isAlreadyThere = playerPos.x === q && playerPos.y === r;
        const isTileExplored = exploredTiles[dimension].has(currentKey);
        
        // Grace Period Logic
        const isGracePeriod = Date.now() < gracePeriodEndTime;

        if (isPlayerMoving) return;
        
        if (isAlreadyThere && isTileExplored) return;

        let path: any[] | null = [];
        
        if (gameState === GameState.TOWN_EXPLORATION && townMapData) {
            path = findPath({q: playerPos.x, r: playerPos.y}, {q, r}, townMapData);
        } else {
            path = findPath({q: playerPos.x, r: playerPos.y}, {q, r}, undefined, (q, r) => WorldGenerator.getTile(q, r, dimension));
        }

        if (!path || path.length === 0) {
             if (isAlreadyThere) path = [{ q, r, terrain: WorldGenerator.getTile(q, r, dimension).terrain }];
             else return;
        }
        
        // Disable Chase interruption if in Grace Period
        if (!isGracePeriod) {
            const isChaseMode = activeOverworldEnemies.some(e => {
                if (e.dimension !== dimension) return false;
                const dist = (Math.abs(e.q - playerPos.x) + Math.abs(e.q + e.r - playerPos.x - playerPos.y) + Math.abs(e.r - playerPos.y)) / 2;
                return dist <= e.visionRange;
            });

            if (isChaseMode && path.length > 1) {
                path = [path[0]]; 
            }
        }

        set({ isPlayerMoving: true }); 
        if (!isAlreadyThere) sfx.playUiClick();
        
        for (const stepCell of path) {
            if (get().gameState !== GameState.OVERWORLD && get().gameState !== GameState.TOWN_EXPLORATION) break;
            
            // Check Collision with Enemies (Only if not in grace period)
            if (!isGracePeriod) {
                const enemyOnTile = get().activeOverworldEnemies.find(e => e.q === stepCell.q && e.r === stepCell.r && e.dimension === dimension);
                if (enemyOnTile) {
                    get().startBattle(stepCell.terrain, stepCell.weather, enemyOnTile.id);
                    break;
                }
            }

            if (!isAlreadyThere) sfx.playStep();
            
            const { dimension: currentDim, exploredTiles: currentExplored } = get();
            
            if (get().gameState === GameState.TOWN_EXPLORATION && stepCell.poiType === 'EXIT') {
                 get().exitSettlement();
                 break;
            }

            let newExploredSet = currentExplored[currentDim];
            let newEnemies = [...get().activeOverworldEnemies];

            if (get().gameState === GameState.OVERWORLD) {
                const leader = party[0];
                const visionRadius = calculateVisionRange(leader.stats.attributes.WIS);
                
                // Exploration Logic
                for (let vq = stepCell.q - visionRadius; vq <= stepCell.q + visionRadius; vq++) {
                    for (let vr = stepCell.r - visionRadius; vr <= stepCell.r + visionRadius; vr++) {
                        const dist = (Math.abs(vq - stepCell.q) + Math.abs(vq + vr - stepCell.q - stepCell.r) + Math.abs(vr - stepCell.r)) / 2;
                        if (dist <= visionRadius) {
                            const key = `${vq},${vr}`;
                            if (!newExploredSet.has(key)) {
                                newExploredSet.add(key);
                                const tile = WorldGenerator.getTile(vq, vr, currentDim);
                                const encounterKey = `${currentDim}:${vq},${vr}`;
                                
                                // Spawn Logic - DISABLED DURING GRACE PERIOD for cleaner escape
                                if (!isGracePeriod && tile.hasEncounter && !clearedEncounters.has(encounterKey)) {
                                    if (!newEnemies.some(e => e.q === vq && e.r === vr && e.dimension === currentDim)) {
                                        const distToPlayer = (Math.abs(vq - stepCell.q) + Math.abs(vq + vr - stepCell.q - stepCell.r) + Math.abs(vr - stepCell.r)) / 2;
                                        if (distToPlayer >= 2) {
                                            const nearbyEnemiesCount = newEnemies.filter(e => {
                                                if (e.dimension !== currentDim) return false;
                                                return (Math.abs(e.q - vq) < 8 && Math.abs(e.r - vr) < 8);
                                            }).length;

                                            if (nearbyEnemiesCount < 2) {
                                                const { enemies, encounters } = useContentStore.getState();
                                                const possibleEnemies = encounters[tile.terrain] || Object.keys(enemies);
                                                const enemyDefId = possibleEnemies[Math.floor(Math.random() * possibleEnemies.length)];
                                                const enemyDef = enemies[enemyDefId] || Object.values(enemies)[0];
                                                newEnemies.push({
                                                    id: generateId(),
                                                    defId: enemyDefId,
                                                    name: enemyDef.name,
                                                    sprite: enemyDef.sprite,
                                                    dimension: currentDim,
                                                    q: vq,
                                                    r: vr,
                                                    visionRange: 4
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                const { travelDistanceMeters, travelHours, travelDays, travelFatigue } = get();
                const terrain = stepCell.terrain;
                let stepMeters = 500;
                let stepHours = 1;
                let stepFatigue = 2;
                let terrainName = "Llanura";

                switch (terrain) {
                    case TerrainType.GRASS:
                    case TerrainType.PLAINS:
                    case TerrainType.DIRT_ROAD:
                    case TerrainType.COBBLESTONE:
                    case TerrainType.VILLAGE:
                    case TerrainType.CASTLE:
                        stepMeters = 500;
                        stepHours = 1;
                        stepFatigue = 2;
                        terrainName = "Llanura / Camino";
                        break;
                    case TerrainType.FOREST:
                    case TerrainType.TAIGA:
                    case TerrainType.JUNGLE:
                        stepMeters = 750;
                        stepHours = 1.5;
                        stepFatigue = 4;
                        terrainName = "Bosque / Selva";
                        break;
                    case TerrainType.DESERT:
                    case TerrainType.TUNDRA:
                        stepMeters = 1000;
                        stepHours = 2.5;
                        stepFatigue = 10;
                        terrainName = "Desierto / Tundra";
                        break;
                    case TerrainType.SWAMP:
                        stepMeters = 1500;
                        stepHours = 3.5;
                        stepFatigue = 15;
                        terrainName = "Pantano Cenagoso";
                        break;
                    case TerrainType.MOUNTAIN:
                    case TerrainType.RUINS:
                        stepMeters = 2000;
                        stepHours = 4.0;
                        stepFatigue = 20;
                        terrainName = "Montaña / Ruinas";
                        break;
                    case TerrainType.WATER:
                        stepMeters = 1200;
                        stepHours = 3.0;
                        stepFatigue = 9;
                        terrainName = "Aguas Profundas";
                        break;
                    case TerrainType.LAVA:
                    case TerrainType.CHASM:
                    case TerrainType.FUNGUS:
                    case TerrainType.CAVE_FLOOR:
                        stepMeters = 2500;
                        stepHours = 5.0;
                        stepFatigue = 25;
                        terrainName = "Terreno Abisal";
                        break;
                    default:
                        stepMeters = 500;
                        stepHours = 1;
                        stepFatigue = 3;
                        terrainName = "Terreno Inexplorado";
                }

                const stepMinutes = Math.round(stepHours * 60);
                const { travelMinutes } = get();
                const nextMeters = travelDistanceMeters + stepMeters;
                const totalMinutesAccumulated = travelMinutes + stepMinutes;
                
                const extraHours = Math.floor(totalMinutesAccumulated / 60);
                const nextMinutes = totalMinutesAccumulated % 60;
                
                const totalHoursAccumulated = travelHours + extraHours;
                const nextHours = totalHoursAccumulated % 24;
                const nextDays = travelDays + Math.floor(totalHoursAccumulated / 24);
                const nextFatigue = Math.min(100, travelFatigue + stepFatigue);

                // Add immersive logs showing heavy travel
                const kmTotal = (nextMeters / 1000).toFixed(1);
                get().addLog(`🥾 Marcha por ${terrainName}: +${stepMeters}m, +${stepHours}h de viaje (+${stepFatigue}% Fatiga). Acumulado: ${kmTotal} km.`, 'info');

                if (nextFatigue >= 100) {
                    get().addLog(`⚠️ ¡Extenuación extrema! El grupo está exhausto y su moral ha caído al mínimo. Descansa pronto en un campamento o posada.`, 'combat');
                } else if (nextFatigue > 75 && travelFatigue <= 75) {
                    get().addLog(`💤 El cansancio de la larga marcha agobia al grupo de héroes.`, 'info');
                }

                set({ 
                    playerPos: { x: stepCell.q, y: stepCell.r },
                    exploredTiles: { ...currentExplored, [currentDim]: newExploredSet },
                    activeOverworldEnemies: newEnemies,
                    standingOnPortal: !!stepCell.hasPortal,
                    standingOnSettlement: (stepCell.terrain === TerrainType.VILLAGE || stepCell.terrain === TerrainType.CASTLE),
                    travelDistanceMeters: nextMeters,
                    travelHours: nextHours,
                    travelMinutes: nextMinutes,
                    travelDays: nextDays,
                    travelFatigue: nextFatigue
                });

                // --- GOBLIN LAIR POI EVENT TRIGGER ---
                if (stepCell.poiType === 'GOBLIN_LAIR' && currentDim === Dimension.NORMAL) {
                    get().progressQuestObjective('GOBIN_TUTORIAL', 'OBJ_FIND_GOBLIN_LAIR', 1);
                    sfx.playVictory();
                    get().addLog(`🏰 ¡Has descubierto la Guarida de Grommash el Destripador en las colinas (q: 2, r: -3)!`, "narrative");
                    get().addLog(`⚔️ ¡El Gran Jefe Goblin y su guardia de élite cargan furiosos contra tu grupo!`, "combat");
                    set({ isPlayerMoving: false });
                    setTimeout(() => {
                        get().startBattle(
                            TerrainType.CAVE_FLOOR, 
                            WeatherType.NONE, 
                            undefined, 
                            ['goblin_shaman', 'orc_warrior', 'goblin_spearman', 'goblin_spearman'], 
                            true
                        );
                    }, 400);
                    break;
                }

                // --- ADVANCED NARRATIVE EVENT TRIGGER ---
                const { narrativeEvents } = useContentStore.getState();
                const triggers = get().triggeredEvents || [];
                
                const matchedEvent = Object.values(narrativeEvents).find(ev => {
                    if (triggers.includes(ev.id)) return false;
                    
                    if (ev.triggerType === 'COORDINATES') {
                        return ev.coordinateQ === stepCell.q && ev.coordinateR === stepCell.r;
                    } else if (ev.triggerType === 'TERRAIN') {
                        return ev.terrainType === stepCell.terrain;
                    }
                    return false;
                });

                if (matchedEvent) {
                    set({ 
                        activeNarrativeEvent: matchedEvent, 
                        activeNarrativeOutcome: null,
                        isPlayerMoving: false 
                    });
                    sfx.playVictory();
                    get().addLog(`[Evento] Encontrado: ${matchedEvent.title}`, "narrative");
                    break;
                }

                // --- ENEMY AI ---
                let updatedEnemies = [...get().activeOverworldEnemies];
                let combatTriggered = false;
                let triggeringEnemyId: string | undefined;

                updatedEnemies = updatedEnemies.map(e => {
                    if (e.dimension !== currentDim) return e;
                    
                    // IF GRACE PERIOD IS ACTIVE, ENEMIES DO NOT MOVE/CHASE
                    if (isGracePeriod) return e;

                    const dist = (Math.abs(e.q - stepCell.q) + Math.abs(e.q + e.r - stepCell.q - stepCell.r) + Math.abs(e.r - stepCell.r)) / 2;
                    
                    if (dist <= e.visionRange && dist > 0) {
                        const neighbors = [
                            { dq: 1, dr: 0 }, { dq: 1, dr: -1 }, { dq: 0, dr: -1 },
                            { dq: -1, dr: 0 }, { dq: -1, dr: 1 }, { dq: 0, dr: 1 }
                        ];

                        let bestMove = { q: e.q, r: e.r };
                        let minDistanceToPlayer = dist;
                        let willAttack = false;

                        for (const n of neighbors) {
                            const targetQ = e.q + n.dq;
                            const targetR = e.r + n.dr;
                            if (targetQ === stepCell.q && targetR === stepCell.r) { willAttack = true; break; }

                            const targetTile = WorldGenerator.getTile(targetQ, targetR, currentDim);
                            const movementCost = TERRAIN_MOVEMENT_COST[targetTile.terrain] || 1;
                            if (movementCost >= 99) continue;

                            const isOccupied = get().activeOverworldEnemies.some(other => other.id !== e.id && other.q === targetQ && other.r === targetR && other.dimension === currentDim);
                            if (isOccupied) continue;

                            const distFromNeighbor = (Math.abs(targetQ - stepCell.q) + Math.abs(targetQ + targetR - stepCell.q - stepCell.r) + Math.abs(targetR - stepCell.r)) / 2;
                            if (distFromNeighbor < minDistanceToPlayer) {
                                minDistanceToPlayer = distFromNeighbor;
                                bestMove = { q: targetQ, r: targetR };
                            }
                        }

                        if (willAttack) {
                            combatTriggered = true;
                            triggeringEnemyId = e.id;
                            return e;
                        }
                        
                        return { ...e, q: bestMove.q, r: bestMove.r };
                    }
                    return e;
                });

                set({ activeOverworldEnemies: updatedEnemies });
                if (combatTriggered) {
                    get().startBattle(stepCell.terrain, stepCell.weather, triggeringEnemyId);
                    break;
                }

            } else {
                set({ 
                    playerPos: { x: stepCell.q, y: stepCell.r },
                    standingOnPortal: false,
                    standingOnSettlement: false
                });
            }

            if (stepCell.hasPortal && get().gameState === GameState.OVERWORLD) { sfx.playMagic(); break; }
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        set({ isPlayerMoving: false });
  },

  enterSettlement: () => {
        const { playerPos, dimension } = get();
        const currentTile = WorldGenerator.getTile(playerPos.x, playerPos.y, dimension);
        const settlementName = currentTile.poiName || 'Asentamiento Fortificado';
        sfx.playUiClick();
        
        get().transitionToMap({
            targetState: GameState.TOWN_EXPLORATION,
            targetLocationName: settlementName,
            targetBiome: TerrainType.VILLAGE,
            durationMs: 500,
            action: () => {
                const townMap = generateTownMap(playerPos.x, playerPos.y, currentTile.poiType || 'PLAZA');
                set({ 
                    lastOverworldPos: playerPos,
                    townMapData: townMap,
                    playerPos: { x: 0, y: 7 }, 
                    standingOnSettlement: false,
                    mapDimensions: { width: 14, height: 14 }
                });
                get().addLog(`Entrando a ${settlementName}.`, "narrative");
                get().autoSaveGame();
            }
        });
  },

  exitSettlement: () => {
        const { lastOverworldPos } = get();
        if (!lastOverworldPos) return;
        sfx.playUiClick();

        get().transitionToMap({
            targetState: GameState.OVERWORLD,
            targetLocationName: 'Tierras Salvajes de Arcadia',
            targetBiome: TerrainType.PLAINS,
            durationMs: 500,
            action: () => {
                set({ 
                    townMapData: null,
                    playerPos: lastOverworldPos,
                    lastOverworldPos: null,
                    mapDimensions: { width: DEFAULT_MAP_WIDTH, height: DEFAULT_MAP_HEIGHT }
                });
                get().addLog("Returned to the wild.", "narrative");
            }
        });
  },

  usePortal: () => {
        const { dimension, playerPos, exploredTiles, party } = get();
        const targetDimension = dimension === Dimension.NORMAL ? Dimension.UPSIDE_DOWN : Dimension.NORMAL;
        sfx.playMagic(); get().addLog("Dimension Hop!", "narrative");
        
        const vision = calculateVisionRange(party[0].stats.attributes.WIS);
        const newExploredSet = updateExploration(playerPos, targetDimension, vision, exploredTiles[targetDimension]);
        
        set({ 
            dimension: targetDimension, 
            exploredTiles: { ...exploredTiles, [targetDimension]: newExploredSet }
        });

        // Trigger auto-save on dimension hop
        get().autoSaveGame();
  },

  saveGame: (slotId: SaveSlotId = 'slot_1') => { 
        try { 
            const state = get();
            const success = writeSaveToSlot(slotId, state);
            if (success) {
              const label = slotId === 'auto_save' ? 'Auto-Save' : slotId.replace('_', ' ').toUpperCase();
              get().addLog(`Game Saved (${label})`, "info"); 
            } else {
              get().addLog("Failed to save game.", "combat");
            }
        } catch (e) {
            console.error("Save Failed:", e);
            get().addLog("Failed to save game.", "combat");
        } 
  },

  autoSaveGame: () => {
        try {
          const state = get();
          if (state.gameState === GameState.CHARACTER_CREATION) return;
          writeSaveToSlot('auto_save', state);
        } catch (e) {
          console.error("AutoSave Failed:", e);
        }
  },

  loadGame: (slotId: SaveSlotId = 'slot_1') => { 
        try { 
            const saveFile = readSaveFromSlot(slotId);
            if (!saveFile) {
                get().addLog("No save game found in this slot.", "info");
                return;
            }

            const sanitizedData = deserializeGameState(saveFile);

            set(sanitizedData as GameStateData);
            sfx.playVictory();
            get().addLog(`Game Loaded (${slotId.replace('_', ' ').toUpperCase()})`, "info");

        } catch(e) {
            console.error("Load Failed:", e);
            get().addLog("Save file corrupted.", "combat");
        } 
  },

  deleteSave: (slotId: SaveSlotId) => {
        try {
          deleteSaveSlot(slotId);
          get().addLog(`Deleted ${slotId.replace('_', ' ').toUpperCase()}`, "info");
        } catch (e) {
          console.error("Delete Failed:", e);
        }
  },

  quitToMenu: () => { sfx.playUiClick(); set({ gameState: GameState.CHARACTER_CREATION, logs: [], party: [] }); },

  triggerEventChoice: (choice) => {
    const outcome = choice.outcome;
    sfx.playUiClick();
    
    // Apply Gold changes (persisted in battleRewards)
    if (outcome.goldChange !== 0) {
        const currentRewards = get().battleRewards || { xp: 0, gold: 0, items: [] };
        const newGold = Math.max(0, currentRewards.gold + outcome.goldChange);
        set({ battleRewards: { ...currentRewards, gold: newGold } });
        get().addLog(`Ganas/Pierdes oro: ${outcome.goldChange > 0 ? '+' : ''}${outcome.goldChange}G (Total: ${newGold}G)`, "loot");
    }

    // Apply Party HP changes
    if (outcome.hpChange !== 0) {
        const newParty = get().party.map(member => {
            const newHp = Math.max(1, Math.min(member.stats.maxHp, member.stats.hp + outcome.hpChange));
            return {
                ...member,
                stats: { ...member.stats, hp: newHp }
            };
        });
        set({ party: newParty });
        get().addLog(`Salud del grupo afectada: ${outcome.hpChange > 0 ? '+' : ''}${outcome.hpChange} HP`, "info");
    }

    // Apply XP reward
    if (outcome.xpReward > 0) {
        const currentRewards = get().battleRewards || { xp: 0, gold: 0, items: [] };
        set({ battleRewards: { ...currentRewards, xp: currentRewards.xp + outcome.xpReward } });
        get().addLog(`Ganas experiencia: +${outcome.xpReward} XP`, "roll");
    }

    // Give Item if any
    if (outcome.gainItem) {
        const { items } = useContentStore.getState();
        const dbItem = items[outcome.gainItem.toUpperCase()] || Object.values(items).find(i => i.id === outcome.gainItem);
        if (dbItem) {
            const newInventory = [...get().inventory];
            const existingSlot = newInventory.find(s => s.item.id === dbItem.id);
            if (existingSlot) {
                existingSlot.quantity++;
            } else {
                newInventory.push({ item: dbItem, quantity: 1 });
            }
            set({ inventory: newInventory });
            get().addLog(`Obtienes objeto: ${dbItem.name}`, "loot");
        }
    }

    set({ activeNarrativeOutcome: outcome.text });
  },

  closeNarrativeEvent: () => {
    sfx.playUiClick();
    const event = get().activeNarrativeEvent;
    const outcome = event?.choices.find(c => c.outcome.text === get().activeNarrativeOutcome)?.outcome;
    
    if (event) {
        const triggers = get().triggeredEvents || [];
        set({ triggeredEvents: [...triggers, event.id] });
    }

    set({ activeNarrativeEvent: null, activeNarrativeOutcome: null });

    if (outcome && outcome.startBattle) {
        const battleEnemies = outcome.battleEnemies || [];
        get().startBattle(get().battleTerrain, get().battleWeather, undefined, battleEnemies, outcome.isBoss);
    }
  },

  acceptQuest: (quest: Quest) => {
    const existing = get().quests.find(q => q.id === quest.id);
    if (!existing) {
      set(state => ({ quests: [...state.quests, quest] }));
      get().addLog(`Nueva misión aceptada: ${quest.title}`, "info");
    }
  },

  progressQuestObjective: (questId: string, objectiveId: string, amount: number) => {
    set(state => {
      const newQuests = state.quests.map(q => {
        if (q.id === questId && !q.completed && q.objectives) {
          const newObj = q.objectives.map(obj => {
            if (obj.id === objectiveId && !obj.completed) {
              const newProgress = Math.min(obj.requiredProgress, obj.currentProgress + amount);
              const completed = newProgress >= obj.requiredProgress;
              if (completed) get().addLog(`🎯 Objetivo completado: ${obj.description}`, "info");
              return { ...obj, currentProgress: newProgress, completed };
            }
            return obj;
          });
          
          const allCompleted = newObj.every(o => o.completed);
          if (allCompleted) {
            sfx.playVictory();
            get().addLog(`🏆 ¡CAMPAÑA COMPLETADA: ${q.title}!`, "loot");
            
            // Deliver Quest Rewards if defined
            if (q.reward) {
              const { xp = 0, gold = 0, items: rewardItemIds = [] } = q.reward;
              const dbItems = useContentStore.getState().items;

              // Distribute massive reward XP to party to reach level 7
              if (xp > 0) {
                get().addLog(`✨ Recompensa de Campaña: ¡+${xp.toLocaleString()} EXP otorgada a todo el grupo!`, "levelup");
                const hasLevelUps = get().initiatePostBattleLevelUp(xp);
                if (!hasLevelUps) {
                  // Direct fallback XP addition
                  set(st => ({
                    party: st.party.map(h => ({
                      ...h,
                      stats: { ...h.stats, xp: (h.stats.xp || 0) + xp }
                    }))
                  }));
                }
              }

              // Deliver Equipment Rewards to inventory
              if (rewardItemIds && rewardItemIds.length > 0) {
                const newInv = [...state.inventory];
                rewardItemIds.forEach(itemId => {
                  const itemData = dbItems[itemId] || dbItems[itemId.toUpperCase()] || Object.values(dbItems).find(i => i.id === itemId);
                  if (itemData) {
                    const existing = newInv.find(slot => slot.item.id === itemData.id);
                    if (existing) {
                      existing.quantity += 1;
                    } else {
                      newInv.push({ item: itemData, quantity: 1 });
                    }
                    get().addLog(`🎁 Equipamiento desbloqueado: [${itemData.rarity}] ${itemData.name}`, "loot");
                  }
                });
                set({ inventory: newInv });
              }

              if (gold > 0) {
                get().addLog(`🪙 Botín de la Campaña: +${gold} Monedas de Oro.`, "loot");
              }
            }
          }
          return { ...q, objectives: newObj, completed: allCompleted };
        }
        return q;
      });
      return { quests: newQuests };
    });
  },

  investigateAncientSite: (siteId?: string) => {
    const { playerPos, party, searchedSites, progressQuestObjective, addLog, triggerDiceRoll, quests, dimension } = get();
    let site = siteId ? ANCIENT_SITES.find(s => s.id === siteId) : getAncientSiteAt(playerPos.x, playerPos.y);
    
    if (!site) {
      const currentCell = WorldGenerator.getTile(playerPos.x, playerPos.y, dimension);
      const isCave = currentCell.poiType === 'MYSTIC_CAVE' || currentCell.terrain === TerrainType.CAVE_FLOOR;
      const isRuins = currentCell.poiType === 'ANCIENT_RUINS' || currentCell.terrain === TerrainType.RUINS;
      const isSanctuary = currentCell.poiType === 'SANCTUARY';
      const isWatchtower = currentCell.poiType === 'WATCHTOWER';
      const isDungeon = currentCell.poiType === 'DUNGEON';

      if (isCave || isRuins || isSanctuary || isWatchtower || isDungeon) {
        site = {
          id: `SITE_PROC_${playerPos.x}_${playerPos.y}`,
          name: currentCell.poiName || (isCave ? 'Cueva Misteriosa de Arcadia' : isRuins ? 'Ruinas Antiguas Olvidadas' : isSanctuary ? 'Santuario Arcano' : isWatchtower ? 'Atalaya de Observación' : 'Mazmorra Ancestral'),
          type: isSanctuary ? 'SANCTUARY' : isWatchtower ? 'WATCHTOWER' : isDungeon ? 'DUNGEON' : isCave ? 'CAVE' : 'RUINS',
          q: playerPos.x,
          r: playerPos.y,
          biomeName: currentCell.kingdomName || 'Arcadia',
          description: currentCell.poiDescription || 'Una formación ancestral cargada de misterios y energía primigenia.',
          clueLore: 'Examinas las profundidades y recolectas antiguos testimonios sobre las criaturas legendarias de la región.',
          d20Difficulty: 10,
          rewardXp: 180,
          rewardGold: 120
        };
      }
    }

    if (!site) {
      addLog("No hay ruinas o cuevas ancestrales en esta ubicación para investigar.", "info");
      return;
    }

    const siteKey = `${site.id}`;
    if (searchedSites.includes(siteKey)) {
      addLog(`Ya has investigado a fondo ${site.name}. Todos sus secretos han sido recopilados.`, "info");
      sfx.playUiClick();
      return;
    }

    // Party Leader or Best Investigator
    const leader = party[0];
    const leaderInt = leader?.stats?.attributes?.INT || 10;
    const intMod = Math.floor((leaderInt - 10) / 2);
    const d20Roll = Math.floor(Math.random() * 20) + 1;
    const totalCheck = d20Roll + intMod;
    
    // D&D Dice Roll UI
    if (triggerDiceRoll) {
      triggerDiceRoll({
        rollType: 'INVESTIGATION',
        diceResult: d20Roll,
        modifier: intMod,
        total: totalCheck,
        dc: site.d20Difficulty,
        characterName: leader?.name || 'Líder',
        actionLabel: `Investigando ${site.name}`
      });
    }

    sfx.playLevelUp();
    
    // Add to searchedSites
    set(state => ({
      searchedSites: [...state.searchedSites, siteKey]
    }));

    // Grant XP and Gold
    const goldBonus = site.rewardGold || 120;
    const xpBonus = site.rewardXp || 180;
    
    // Distribute XP to party
    set(state => ({
      party: state.party.map(hero => ({
        ...hero,
        stats: hero.stats ? {
          ...hero.stats,
          xp: (hero.stats.xp || 0) + xpBonus
        } : hero.stats
      }))
    }));

    // Specific POI effects
    if (site.type === 'SANCTUARY') {
      // Heal entire party to full HP & Spell Slots
      set(state => ({
        party: state.party.map(hero => ({
          ...hero,
          stats: hero.stats ? {
            ...hero.stats,
            hp: hero.stats.maxHp,
            stamina: hero.stats.maxStamina,
            spellSlots: hero.stats.spellSlots ? {
              ...hero.stats.spellSlots,
              current: hero.stats.spellSlots.max
            } : hero.stats.spellSlots
          } : hero.stats
        }))
      }));
      addLog(`✨ ¡Bendición del Santuario! El grupo ha sido completamente sanado y bendecido con gracia sagrada.`, 'loot');
    } else if (site.type === 'WATCHTOWER') {
      // Dispel fog of war in large radius (radius 10)
      const { exploredTiles: curExp, dimension: curDim } = get();
      const towerSet = new Set(curExp[curDim]);
      const towerRadius = 10;
      for (let tq = playerPos.x - towerRadius; tq <= playerPos.x + towerRadius; tq++) {
        for (let tr = playerPos.y - towerRadius; tr <= playerPos.y + towerRadius; tr++) {
          const dist = (Math.abs(tq - playerPos.x) + Math.abs(tq + tr - playerPos.x - playerPos.y) + Math.abs(tr - playerPos.y)) / 2;
          if (dist <= towerRadius) {
            towerSet.add(`${tq},${tr}`);
          }
        }
      }
      set({ exploredTiles: { ...curExp, [curDim]: towerSet } });
      addLog(`🗼 ¡Visión Panorámica de la Atalaya! La niebla de guerra ha sido disipada en un radio de 10 hexágonos.`, 'loot');
    } else if (site.type === 'DUNGEON') {
      addLog(`🗝️ ¡Has penetrado en las profundidades de la Mazmorra! Se aproxima una batalla con guardianes de élite.`, 'combat');
      // Trigger dungeon guardian battle
      setTimeout(() => {
        get().startBattle(
          TerrainType.RUINS,
          WeatherType.NONE,
          undefined,
          ['undead_knight', 'wraith_specter', 'skeleton_archer', 'dark_sorcerer'],
          true
        );
      }, 700);
    }

    addLog(`🔍 [${site.name}] ${site.clueLore}`, 'loot');
    addLog(`✨ Recompensa de exploración: +${xpBonus} XP y hallazgos antiguos (+${goldBonus}G en valor).`, 'info');

    // Progress Dragon Clues Objective
    progressQuestObjective('DRAGON_HUNT', 'OBJ_CLUES', 1);

    // Check if 3 clues reached
    const huntQuest = quests.find(q => q.id === 'DRAGON_HUNT');
    const clueObj = huntQuest?.objectives?.find(o => o.id === 'OBJ_CLUES');
    const currentClues = (clueObj?.currentProgress || 0) + 1;

    if (currentClues >= 3) {
      addLog('🔥 ¡Las 3 Pistas del Dragón han sido reunidas! Las 5 entradas secretas al Dungeon Subterráneo han sido desveladas en el mapa.', 'loot');
      sfx.playVictory();
    } else {
      addLog(`📜 Pistas del Dragón recolectadas: ${Math.min(3, currentClues)}/3. Busca en otras Ruinas o Cuevas del mapa.`, 'info');
    }
  },

  setReachableTiles: (unitId: string | null, maxMovePoints = 5) => {
    if (!unitId) {
      set({ reachableTiles: null });
      return;
    }
    const { playerPos, townMapData, gameState, dimension, activeOverworldEnemies } = get();
    let startQ = playerPos.x;
    let startR = playerPos.y;

    if (unitId !== 'player') {
      const enemy = activeOverworldEnemies.find(e => e.id === unitId);
      if (enemy) {
        startQ = enemy.q;
        startR = enemy.r;
      }
    }

    let map: any = null;
    if (gameState === GameState.TOWN_EXPLORATION && townMapData) {
      map = townMapData;
    } else {
      const nearbyTiles: HexCell[] = [];
      const radius = 8;
      for (let dq = -radius; dq <= radius; dq++) {
        for (let dr = Math.max(-radius, -dq - radius); dr <= Math.min(radius, -dq + radius); dr++) {
          const tile = WorldGenerator.getTile(startQ + dq, startR + dr, dimension);
          if (tile) {
            nearbyTiles.push(tile);
          }
        }
      }
      map = nearbyTiles;
    }

    const reachable = calculateReachableTiles(map, startQ, startR, maxMovePoints);
    set({ reachableTiles: reachable });
  }
});

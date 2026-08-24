import { Dimension } from '../types';

export enum GameState {
  LOGIN,
  CHARACTER_CREATION,
  LOADING_MAP,
  OVERWORLD,
  TOWN_EXPLORATION,
  BATTLE_INIT,
  BATTLE_TACTICAL,
  BATTLE_RESOLUTION,
  BATTLE_VICTORY,
  BATTLE_DEFEAT,
  LOCAL_MAP,
  HUNT_MODE
}

export enum TerrainType {
  GRASS = 'grass',
  FOREST = 'forest',
  MOUNTAIN = 'mountain',
  WATER = 'water',
  CASTLE = 'castle',
  VILLAGE = 'village',
  DESERT = 'desert',
  SWAMP = 'swamp',
  PLAINS = 'plains',
  TAIGA = 'taiga',
  JUNGLE = 'jungle',
  TUNDRA = 'tundra',
  RUINS = 'ruins',
  CAVE_FLOOR = 'cave_floor',
  FUNGUS = 'fungus',
  LAVA = 'lava',
  CHASM = 'chasm',
  COBBLESTONE = 'cobblestone',
  DIRT_ROAD = 'dirt_road',
  WOOD_FLOOR = 'wood_floor',
  STONE_FLOOR = 'stone_floor',
  WALL_HOUSE = 'wall_house'
}

export enum WeatherType {
  NONE = 'NONE',
  RAIN = 'RAIN',
  SNOW = 'SNOW',
  FOG = 'FOG',
  ASH = 'ASH'
}

export interface MapLoadingState {
  targetState: GameState;
  targetLocationName: string;
  targetBiome?: TerrainType | string;
  progress: number;
  tip: string;
  statusText: string;
}

export interface Tile {
  terrainId: string;
  layer: number;
  decorations?: { id: string; layer: number; spriteKey: string }[];
  q: number;
  r: number;
  terrain: TerrainType;
}

export interface HexCell extends Tile {
  isExplored: boolean;
  isVisible: boolean;
  hasEncounter?: boolean;
  hasPortal?: boolean;
  weather: WeatherType;
  elevation?: number;
  moisture?: number;
  temperature?: number;
  isRiver?: boolean;
  riverFlowDir?: number;
  kingdomId?: string;
  kingdomName?: string;
  propType?: 'PINE_TREE' | 'SUMMER_TREE' | 'SNOW_TREE' | 'JUNGLE_TREE' | 'MUSHROOM' | 'ROCK_SPIRE' | 'RUINS_OBELISK' | 'CAMP_TENT' | 'VILLAGE_HOUSE' | 'WATCHTOWER_PROP' | 'SANCTUARY_SHRINE' | 'DUNGEON_ENTRANCE';
  poiType?: 'SHOP' | 'INN' | 'PLAZA' | 'EXIT' | 'DRAGON_LAIR' | 'ANCIENT_RUINS' | 'MYSTIC_CAVE' | 'GOBLIN_LAIR' | 'GUILD' | 'ARMORY' | 'SANCTUARY' | 'WATCHTOWER' | 'DUNGEON';
  poiName?: string;
  poiDescription?: string;
}

export interface OverworldEntity {
  id: string;
  defId: string;
  q: number;
  r: number;
  dimension: Dimension;
  sprite: string;
  name: string;
  visionRange: number;
}

export interface PositionComponent {
  x: number;
  y: number;
  z?: number;
}

export interface QuestObjective {
  id: string;
  description: string;
  type: 'COLLECT' | 'KILL' | 'EXPLORE' | 'INTERACT';
  targetId?: string; // e.g. item ID to collect, enemy ID to kill
  currentProgress: number;
  requiredProgress: number;
  completed: boolean;
}

export interface QuestReward {
  xp?: number;
  gold?: number;
  items?: string[];
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  type: 'MAIN' | 'SIDE' | 'CAMPAIGN';
  currentStageId?: string;
  objectives?: QuestObjective[];
  nextStageId?: string;
  reward?: QuestReward;
}

export interface EventChoiceOutcome {
  text: string;
  goldChange: number;
  hpChange: number;
  xpReward: number;
  gainItem?: string;
  startBattle: boolean;
  battleEnemies?: string[];
  isBoss?: boolean;
}

export interface EventChoice {
  text: string;
  outcome: EventChoiceOutcome;
}

export interface NarrativeEvent {
  id: string;
  title: string;
  description: string;
  triggerType: 'TERRAIN' | 'COORDINATES';
  terrainType?: TerrainType;
  coordinateQ?: number;
  coordinateR?: number;
  choices: EventChoice[];
}

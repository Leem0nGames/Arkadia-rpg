export * from './types/items';
export * from './types/combat';
export * from './types/world';
export * from './types/camera';

import { 
  Item, 
  EquipmentSlot, 
  ItemRarity, 
  InventorySlot,
  StartingEquipmentPackage,
  LootDrop 
} from './types/items';

import { 
  BattleAction, 
  SpellType, 
  Spell, 
  AIBehavior, 
  CombatStatsComponent, 
  BattleHazard, 
  BattleCell, 
  VoxelBlock, 
  DamagePopup, 
  DiceRollOverlayData, 
  SpellEffectData, 
  InitiativeRollDetail, 
  PendingLevelUp,
  AttackForecast
} from './types/combat';

import { 
  GameState, 
  TerrainType, 
  WeatherType, 
  MapLoadingState, 
  HexCell, 
  OverworldEntity, 
  PositionComponent, 
  Quest, 
  NarrativeEvent 
} from './types/world';

export enum Dimension {
  NORMAL = 'NORMAL',
  UPSIDE_DOWN = 'UPSIDE_DOWN'
}

export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD'
}

export enum Ability {
  STR = 'STR',
  DEX = 'DEX',
  CON = 'CON',
  INT = 'INT',
  WIS = 'WIS',
  CHA = 'CHA'
}

export interface Attributes {
  [Ability.STR]: number;
  [Ability.DEX]: number;
  [Ability.CON]: number;
  [Ability.INT]: number;
  [Ability.WIS]: number;
  [Ability.CHA]: number;
}

export enum CharacterClass {
  FIGHTER = 'Fighter',
  WIZARD = 'Wizard',
  ROGUE = 'Rogue',
  CLERIC = 'Cleric',
  BARBARIAN = 'Barbarian',
  BARD = 'Bard',
  DRUID = 'Druid',
  PALADIN = 'Paladin',
  RANGER = 'Ranger',
  SORCERER = 'Sorcerer',
  WARLOCK = 'Warlock'
}

export enum CharacterRace {
  HUMAN = 'Human',
  ELF = 'Elf',
  DWARF = 'Dwarf',
  HALFLING = 'Halfling',
  DRAGONBORN = 'Dragonborn',
  GNOME = 'Gnome',
  TIEFLING = 'Tiefling',
  HALF_ORC = 'Half-Orc'
}

export enum StatGenerationMethod {
  POINT_BUY = 'POINT_BUY',
  STANDARD_ARRAY = 'STANDARD_ARRAY',
  ROLLED_4D6 = 'ROLLED_4D6',
  CLASSIC_BASE = 'CLASSIC_BASE'
}

export interface VisualComponent {
  spriteUrl?: string;
  color: string;
  modelType: 'billboard' | 'voxel';
  spriteConfig?: any;
}

// INSTANCE SCHEMA: Runtime Objects
export interface Entity {
  id: string;
  name: string;
  type: 'PLAYER' | 'ENEMY' | 'NPC';
  team?: string;
  equipment: Partial<Record<EquipmentSlot, Item>>; 
  aiBehavior?: AIBehavior;
  defId?: string;
  stats?: CombatStatsComponent;
  position?: PositionComponent;
  visual?: VisualComponent;
}

export const isFriendly = (a: Entity | CombatEntity | null | undefined, b: Entity | CombatEntity | null | undefined): boolean => {
  if (!a || !b) return false;
  if (a.id === b.id) return true;
  if (a.team && b.team) return a.team === b.team;
  return a.type === b.type;
};

export type CombatEntity = Entity & {
  stats: CombatStatsComponent;
  position: PositionComponent;
  visual: VisualComponent;
};

export type UITheme = 'dark_stone' | 'parchment' | 'arcane_wood';

export type SaveSlotId = 'slot_1' | 'slot_2' | 'slot_3' | 'auto_save';

export interface SaveSlotMeta {
  slotId: SaveSlotId;
  label: string;
  isAutoSave: boolean;
  timestamp: number;
  heroName: string;
  heroRace: string;
  heroClass: string;
  level: number;
  currentHp: number;
  maxHp: number;
  dimension: Dimension;
  gold: number;
  locationName: string;
}

export interface SaveFile {
  version: number;
  timestamp: number;
  slotId?: SaveSlotId;
  meta?: SaveSlotMeta;
  data: any;
}

export interface GameStateData {
    gameState: GameState;
    mapLoading?: MapLoadingState | null;
    dimension: Dimension;
    difficulty: Difficulty;
    uiTheme: UITheme;
    dofEnabled: boolean;
    toggleDof: () => void;
    showGridLines: boolean;
    toggleGridLines: () => void;
    isSettingsOpen: boolean;
    exploredTiles: Record<Dimension, Set<string>>;
    visitedTowns: Record<string, boolean>; 
    clearedEncounters: Set<string>;
    activeOverworldEnemies: OverworldEntity[];
    townMapData: HexCell[] | null;
    playerPos: PositionComponent;
    isPlayerMoving: boolean;
    lastOverworldPos: PositionComponent | null;
    mapDimensions: { width: number; height: number };
    gracePeriodEndTime: number;
    party: (Entity & { stats: CombatStatsComponent, visual: VisualComponent })[];
    reachableTiles?: Set<string> | null;
    inventory: InventorySlot[];
    isInventoryOpen: boolean;
    isMapOpen: boolean;
    activeInventoryCharacterId: string | null; 
    pendingLevelUps: PendingLevelUp[];
    currentLevelUpIndex: number; 
    battleEntities: (Entity & { stats: CombatStatsComponent, position: PositionComponent, visual: VisualComponent })[];
    turnOrder: string[];
    currentTurnIndex: number;
    initiativeRolls: Record<string, InitiativeRollDetail>;
    battleRound: number;
    battleTerrain: TerrainType;
    battleWeather: WeatherType;
    battleRewards: { xp: number, gold: number, items: Item[] };
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
    standingOnPortal: boolean;
    standingOnSettlement: boolean;
    runAvailable: boolean;
    logs: GameLogEntry[];
    damagePopups: DamagePopup[];
    activeSpellEffect: SpellEffectData | null;
    isActionAnimating: boolean;
    isSkillSelectionMode: boolean; 
    quests: Quest[];
    activeNarrativeEvent: NarrativeEvent | null;
    activeNarrativeOutcome: string | null;
    triggeredEvents: string[];
    factions?: {
        dragon: number; // -100 to 100
        jade: number;   // -100 to 100
        mixed: number;  // -100 to 100
    };
}

export interface GameLogEntry {
  id: string;
  message: string;
  type: 'info' | 'combat' | 'narrative' | 'roll' | 'levelup' | 'loot';
  timestamp: number;
}

export interface HuntPreyPart {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  isBroken: boolean;
  effectDescription: string;
}

export interface HuntPrey {
    id: string;
    name: string;
    type: 'dragon' | 'golem' | 'wyvern' | 'beast' | 'shadow_lord';
    level: number;
    hp: number;
    maxHp: number;
    x: number;
    y: number;
    z: number;
    color: string;
    icon: string;
    isDefeated: boolean;
    rewardXp: number;
    rewardGold: number;
    trophyName: string;
    alertLevel?: 'CALM' | 'ALERT' | 'FLEEING' | 'ENRAGED';
    weakness?: 'FIRE' | 'ICE' | 'LIGHTNING' | 'PHYSICAL';
    parts?: HuntPreyPart[];
    isTrapped?: boolean;
    isMarked?: boolean;
    trapDuration?: number;
    facingAngle?: number; // In radians (0 to 2*PI)
}

export interface HuntClue {
    id: string;
    x: number;
    y: number;
    z: number;
    type: 'TRACKS' | 'RUNE' | 'CLAW_MARK';
    isInvestigated: boolean;
    description: string;
}

export interface HuntTrap {
    id: string;
    x: number;
    y: number;
    z: number;
    type: 'FREEZE' | 'STUN' | 'EXPLOSIVE';
    active: boolean;
}

export interface HuntAttackEvent {
    preyId: string;
    preyName: string;
    damage: number;
    isHit: boolean;
    isCrit: boolean;
    d20Roll: number;
    modifier: number;
    totalRoll: number;
    targetPos: { x: number; y: number; z: number };
    timestamp: number;
    partHitName?: string;
    comboSynergyApplied?: string;
    flankType?: 'BACKSTAB' | 'FLANK' | 'FRONT';
}

export interface HuntSession {
    schematicTitle: string;
    playerPos: { x: number; y: number; z: number; facingAngle?: number };
    preys: HuntPrey[];
    trophiesCollected: string[];
    preysDefeatedCount: number;
    totalPreysCount: number;
    lastAttackEvent?: HuntAttackEvent;
    clues?: HuntClue[];
    trapsPlaced?: HuntTrap[];
    stealthActive?: boolean;
    insightLevel?: number;
    harvestedMaterials?: { name: string; count: number; rarity: 'RARE' | 'EPIC' | 'LEGENDARY' }[];
    comboMultiplier?: number;
    returnPortal?: {
      x: number;
      y: number;
      z: number;
      active: boolean;
    };
    isCompleted?: boolean;
    claimedRewards?: boolean;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [key: string]: any;
    }
  }
}

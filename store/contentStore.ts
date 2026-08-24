
import { create } from 'zustand';
import spellsConfig from '../spells_config.json';
import { ITEMS, BASE_STATS, ASSETS, RACE_BONUS, XP_TABLE, DIFFICULTY_SETTINGS, SPELLS, CLASS_SPELLS, CLASS_EQUIPMENT_PACKAGES, WESNOTH_BASE_URL } from '../constants';
import { Item, CharacterClass, TerrainType, CharacterRace, Attributes, Difficulty, Spell, SpellType, StartingEquipmentPackage, NarrativeEvent, Quest } from '../types';
import { CAMPAIGNS } from '../data/campaigns';
import { STARTER_TUTORIAL_REWARDS } from '../data/starterGear';

interface GameConfig {
    mapScale: number;
    moistureOffset: number;
    tempOffset: number;
}

export interface EnemyDefinition {
    id: string;
    name: string;
    sprite: string; // URL
    hp: number;
    ac: number;
    xpReward: number;
    damage: number; // Base damage (e.g. 4 = 1d4 approx)
    initiativeBonus: number;
    spriteConfig?: {
        rows: number;
        cols: number;
        charWidth?: number;
        charHeight?: number;
        scaleX?: number;
        scaleY?: number;
        yOffset?: number;
    };
}

interface ContentState {
    items: Record<string, Item>;
    classStats: Record<CharacterClass, any>;
    gameConfig: GameConfig;
    
    // Dynamic settings
    raceBonus: Record<CharacterRace, Partial<Attributes>>;
    xpTable: number[];
    difficultySettings: Record<string, { enemyStatMod: number, xpMod: number, goldMod: number }>;

    // Spells & Abilities
    spells: Record<string, Spell>;
    classSpells: Record<CharacterClass, string[]>;

    // Starting Equipment Packages
    classEquipmentPackages: Record<CharacterClass, StartingEquipmentPackage[]>;

    // New: Dynamic Enemy Data
    enemies: Record<string, EnemyDefinition>;
    encounters: Partial<Record<TerrainType, string[]>>; // Terrain -> List of Enemy IDs

    // Advanced Narrative Events
    narrativeEvents: Record<string, NarrativeEvent>;

    // Dynamic Campaigns System
    campaigns: Record<string, Quest>;

    // Actions
    updateItem: (id: string, data: Item) => void;
    createItem: (item: Item) => void;
    deleteItem: (id: string) => void;
    
    updateEnemy: (id: string, data: EnemyDefinition) => void;
    createEnemy: (enemy: EnemyDefinition) => void;
    deleteEnemy: (id: string) => void;
    
    updateEncounterTable: (terrain: TerrainType, enemyIds: string[]) => void;

    updateClassStats: (cls: CharacterClass, stats: any) => void;
    updateConfig: (config: Partial<GameConfig>) => void;
    updateRaceBonus: (race: CharacterRace, bonus: Partial<Attributes>) => void;
    updateDifficultySettings: (difficulty: string, settings: { enemyStatMod: number, xpMod: number, goldMod: number }) => void;
    updateXpTable: (table: number[]) => void;

    // Spell Actions
    updateSpell: (id: string, data: Spell) => void;
    createSpell: (spell: Spell) => void;
    deleteSpell: (id: string) => void;
    updateClassSpells: (cls: CharacterClass, spellIds: string[]) => void;
    updateClassEquipmentPackages: (cls: CharacterClass, packages: StartingEquipmentPackage[]) => void;

    // Narrative Event Actions
    updateNarrativeEvent: (id: string, data: NarrativeEvent) => void;
    createNarrativeEvent: (event: NarrativeEvent) => void;
    deleteNarrativeEvent: (id: string) => void;

    // Campaign Actions
    updateCampaign: (id: string, data: Quest) => void;
    createCampaign: (campaign: Quest) => void;
    deleteCampaign: (id: string) => void;

    exportData: () => string;
    resetToDefaults: () => void;
}

// Default Enemies (Bootstrapping the DB)
const DEFAULT_ENEMIES: Record<string, EnemyDefinition> = {
    'goblin_spearman': { id: 'goblin_spearman', name: 'Goblin Spearman', sprite: ASSETS.UNITS.GOBLIN, hp: 7, ac: 12, xpReward: 25, damage: 4, initiativeBonus: 2 },
    'goblin_boss': { id: 'goblin_boss', name: 'Grommash el Destripador (Jefe Goblin)', sprite: ASSETS.UNITS.ORC, hp: 55, ac: 14, xpReward: 400, damage: 9, initiativeBonus: 2 },
    'orc_grunt': { id: 'orc_grunt', name: 'Orc Grunt', sprite: ASSETS.UNITS.ORC, hp: 15, ac: 13, xpReward: 50, damage: 6, initiativeBonus: 1 },
    'skeleton_warrior': { id: 'skeleton_warrior', name: 'Skeleton', sprite: ASSETS.UNITS.SKELETON, hp: 13, ac: 12, xpReward: 35, damage: 5, initiativeBonus: 0 },
    'necromancer': { id: 'necromancer', name: 'Dark Adept', sprite: ASSETS.UNITS.NECROMANCER, hp: 22, ac: 11, xpReward: 100, damage: 8, initiativeBonus: 3 },
    'wolf': { id: 'wolf', name: 'Dire Wolf', sprite: ASSETS.UNITS.WOLF, hp: 11, ac: 13, xpReward: 30, damage: 5, initiativeBonus: 3 },
    'cave_troll': { id: 'cave_troll', name: 'Cave Troll (Boss)', sprite: `${WESNOTH_BASE_URL}/units/orcs/warrior.png`, hp: 45, ac: 14, xpReward: 250, damage: 10, initiativeBonus: 1 },
    'red_dragon': { id: 'red_dragon', name: 'Ignis El Dragón Rojo (Super Boss)', sprite: `${WESNOTH_BASE_URL}/units/drakes/fighter.png`, hp: 120, ac: 16, xpReward: 600, damage: 15, initiativeBonus: 4 },
    'ghost': { id: 'ghost', name: 'Spectral Guardian', sprite: `${WESNOTH_BASE_URL}/units/undead-necromancers/dark-sorcerer.png`, hp: 20, ac: 15, xpReward: 100, damage: 6, initiativeBonus: 3 }
};

// Default Narrative Events (With moral choices and specific boss battle targets)
const DEFAULT_NARRATIVE_EVENTS: Record<string, NarrativeEvent> = {
    'mysterious_shrine': {
        id: 'mysterious_shrine',
        title: 'El Altar Profanado',
        description: 'Encuentras un antiguo altar grabado con runas divinas olvidadas en medio de las ruinas. Brilla con una energía mágica palpitante. ¿Qué decides hacer?',
        triggerType: 'TERRAIN',
        terrainType: TerrainType.RUINS,
        choices: [
            {
                text: 'Rezar devotamente en el altar (Decisión Virtuosa)',
                outcome: {
                    text: 'Una calidez divina envuelve a tu grupo, curando sus heridas y otorgándoles la bendición de los dioses antiguos.',
                    goldChange: 0,
                    hpChange: 20,
                    xpReward: 50,
                    startBattle: false
                }
            },
            {
                text: 'Saquear las gemas de las runas (Decisión Codiciosa)',
                outcome: {
                    text: '¡Las runas brillan con un destello carmesí de ira! Ganas 150 monedas de oro, pero dos espíritus guardianes despiertan para vengar la profanación.',
                    goldChange: 150,
                    hpChange: 0,
                    xpReward: 100,
                    startBattle: true,
                    battleEnemies: ['ghost', 'ghost']
                }
            }
        ]
    },
    'bridge_troll': {
        id: 'bridge_troll',
        title: 'El Troll del Puente de Piedra',
        description: 'Un enorme Troll de Piedra custodia el puente que cruza la ciénaga. Exige un tributo exorbitante para permitirte el paso o de lo contrario aplastará tus huesos.',
        triggerType: 'TERRAIN',
        terrainType: TerrainType.SWAMP,
        choices: [
            {
                text: 'Pagar el costoso peaje (100 de Oro) (Decisión Pacífica)',
                outcome: {
                    text: 'El Troll muerde las monedas, ríe complacido y te permite cruzar el puente sin violencia.',
                    goldChange: -100,
                    hpChange: 0,
                    xpReward: 30,
                    startBattle: false
                }
            },
            {
                text: 'Negarte a pagar y desenvainar tu espada (Decisión Bélica - Combate contra Jefe)',
                outcome: {
                    text: '¡"¡Nadie pasa gratis!" ruge el Troll, levantando una colosal porra de piedra de pantano. ¡Enfréntate al temible Troll!',
                    goldChange: 0,
                    hpChange: 0,
                    xpReward: 300,
                    startBattle: true,
                    battleEnemies: ['cave_troll'],
                    isBoss: true
                }
            }
        ]
    },
    'red_dragon_nest': {
        id: 'red_dragon_nest',
        title: 'La Guarida de Ignis el Devastador',
        description: 'Entras en un valle calcinado cubierto de ceniza. Ante ti yace el nido de Ignis, un colosal Dragón Rojo rodeado de tesoros derretidos. Su mirada abrasadora juzga vuestras vidas.',
        triggerType: 'COORDINATES',
        coordinateQ: 4,
        coordinateR: -4,
        choices: [
            {
                text: 'Arrodillarte y ofrecer tributo (200 de Oro) (Decisión Cobarde)',
                outcome: {
                    text: 'Ignis ríe con burla volcánica y devora tu oro. Salva tu vida, pero el abrasador calor del nido quema la piel de tu grupo (-15 HP).',
                    goldChange: -200,
                    hpChange: -15,
                    xpReward: 50,
                    startBattle: false
                }
            },
            {
                text: '¡Desafiar al dragón por el destino de Arcadia! (Decisión Heroica - Combate contra Súper Jefe)',
                outcome: {
                    text: '¡"Míseros mortales, arderán hasta los huesos!" El aire estalla en azufre y fuego divino cuando Ignis despliega sus alas de ceniza. ¡La batalla de Arcadia comienza!',
                    goldChange: 0,
                    hpChange: 0,
                    xpReward: 750,
                    startBattle: true,
                    battleEnemies: ['red_dragon'],
                    isBoss: true
                }
            }
        ]
    }
};

// Default Encounters
const DEFAULT_ENCOUNTERS: Partial<Record<TerrainType, string[]>> = {
    [TerrainType.GRASS]: ['goblin_spearman', 'wolf'],
    [TerrainType.FOREST]: ['goblin_spearman', 'orc_grunt', 'wolf'],
    [TerrainType.MOUNTAIN]: ['orc_grunt', 'wolf'],
    [TerrainType.RUINS]: ['skeleton_warrior', 'necromancer'],
    [TerrainType.SWAMP]: ['skeleton_warrior', 'goblin_spearman'],
    [TerrainType.CAVE_FLOOR]: ['skeleton_warrior', 'orc_grunt'], // Upside Down defaults
};

// Load from LocalStorage or Fallback to Constants / Centralized JSON Configuration
const loadInitialState = () => {
    const saved = localStorage.getItem('arcadia_admin_data');
    const defaultSpells = spellsConfig.spells as unknown as Record<string, Spell>;
    const defaultClassSpells = spellsConfig.classSpells as unknown as Record<CharacterClass, string[]>;

    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return {
                items: { ...ITEMS, ...STARTER_TUTORIAL_REWARDS, ...parsed.items },
                classStats: parsed.classStats || { ...BASE_STATS },
                gameConfig: parsed.gameConfig || { mapScale: 0.12, moistureOffset: 150, tempOffset: 300 },
                enemies: parsed.enemies || DEFAULT_ENEMIES,
                encounters: parsed.encounters || DEFAULT_ENCOUNTERS,
                raceBonus: parsed.raceBonus || { ...RACE_BONUS },
                xpTable: parsed.xpTable || [ ...XP_TABLE ],
                difficultySettings: parsed.difficultySettings || { ...DIFFICULTY_SETTINGS },
                spells: parsed.spells || { ...defaultSpells },
                classSpells: parsed.classSpells || { ...defaultClassSpells },
                classEquipmentPackages: parsed.classEquipmentPackages || { ...CLASS_EQUIPMENT_PACKAGES },
                narrativeEvents: parsed.narrativeEvents || { ...DEFAULT_NARRATIVE_EVENTS },
                campaigns: parsed.campaigns || { ...CAMPAIGNS }
            };
        } catch (e) {
            console.error("Failed to load admin data", e);
        }
    }
    return {
        items: { ...ITEMS, ...STARTER_TUTORIAL_REWARDS },
        classStats: { ...BASE_STATS },
        gameConfig: { mapScale: 0.12, moistureOffset: 150, tempOffset: 300 },
        enemies: DEFAULT_ENEMIES,
        encounters: DEFAULT_ENCOUNTERS,
        raceBonus: { ...RACE_BONUS },
        xpTable: [ ...XP_TABLE ],
        difficultySettings: { ...DIFFICULTY_SETTINGS },
        spells: { ...defaultSpells },
        classSpells: { ...defaultClassSpells },
        classEquipmentPackages: { ...CLASS_EQUIPMENT_PACKAGES },
        narrativeEvents: { ...DEFAULT_NARRATIVE_EVENTS },
        campaigns: { ...CAMPAIGNS }
    };
};

export const useContentStore = create<ContentState>((set, get) => ({
    ...loadInitialState(),

    // --- ITEMS ---
    updateItem: (id, data) => {
        set(state => {
            const newItems = { ...state.items, [id]: data };
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, items: newItems }));
            return { items: newItems };
        });
    },
    createItem: (item) => {
        set(state => {
            const newItems = { ...state.items, [item.id]: item };
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, items: newItems }));
            return { items: newItems };
        });
    },
    deleteItem: (id) => {
        set(state => {
            const newItems = { ...state.items };
            delete newItems[id];
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, items: newItems }));
            return { items: newItems };
        });
    },

    // --- ENEMIES ---
    updateEnemy: (id, data) => {
        set(state => {
            const newEnemies = { ...state.enemies, [id]: data };
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, enemies: newEnemies }));
            return { enemies: newEnemies };
        });
    },
    createEnemy: (enemy) => {
        set(state => {
            const newEnemies = { ...state.enemies, [enemy.id]: enemy };
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, enemies: newEnemies }));
            return { enemies: newEnemies };
        });
    },
    deleteEnemy: (id) => {
        set(state => {
            const newEnemies = { ...state.enemies };
            delete newEnemies[id];
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, enemies: newEnemies }));
            return { enemies: newEnemies };
        });
    },

    // --- ENCOUNTERS ---
    updateEncounterTable: (terrain, enemyIds) => {
        set(state => {
            const newEncounters = { ...state.encounters, [terrain]: enemyIds };
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, encounters: newEncounters }));
            return { encounters: newEncounters };
        });
    },

    // --- CONFIG & CLASSES ---
    updateClassStats: (cls, stats) => {
        set(state => {
            const newStats = { ...state.classStats, [cls]: stats };
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, classStats: newStats }));
            return { classStats: newStats };
        });
    },
    updateConfig: (config) => {
        set(state => {
            const newConfig = { ...state.gameConfig, ...config };
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, gameConfig: newConfig }));
            return { gameConfig: newConfig };
        });
    },
    updateRaceBonus: (race, bonus) => {
        set(state => {
            const newRaceBonus = { ...state.raceBonus, [race]: bonus };
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, raceBonus: newRaceBonus }));
            return { raceBonus: newRaceBonus };
        });
    },
    updateDifficultySettings: (difficulty, settings) => {
        set(state => {
            const newSettings = { ...state.difficultySettings, [difficulty]: settings };
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, difficultySettings: newSettings }));
            return { difficultySettings: newSettings };
        });
    },
    updateXpTable: (table) => {
        set(state => {
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, xpTable: table }));
            return { xpTable: table };
        });
    },

    // --- SPELLS & ABILITIES ---
    updateSpell: (id, data) => {
        set(state => {
            const newSpells = { ...state.spells, [id]: data };
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, spells: newSpells }));
            return { spells: newSpells };
        });
    },
    createSpell: (spell) => {
        set(state => {
            const newSpells = { ...state.spells, [spell.id.toUpperCase()]: spell };
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, spells: newSpells }));
            return { spells: newSpells };
        });
    },
    deleteSpell: (id) => {
        set(state => {
            const newSpells = { ...state.spells };
            delete newSpells[id.toUpperCase()];
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, spells: newSpells }));
            return { spells: newSpells };
        });
    },
    updateClassSpells: (cls, spellIds) => {
        set(state => {
            const newClassSpells = { ...state.classSpells, [cls]: spellIds };
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, classSpells: newClassSpells }));
            return { classSpells: newClassSpells };
        });
    },
    updateClassEquipmentPackages: (cls, packages) => {
        set(state => {
            const newPackages = { ...state.classEquipmentPackages, [cls]: packages };
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, classEquipmentPackages: newPackages }));
            return { classEquipmentPackages: newPackages };
        });
    },

    updateNarrativeEvent: (id, data) => {
        set(state => {
            const newEvents = { ...state.narrativeEvents, [id]: data };
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, narrativeEvents: newEvents }));
            return { narrativeEvents: newEvents };
        });
    },
    createNarrativeEvent: (event) => {
        set(state => {
            const newEvents = { ...state.narrativeEvents, [event.id]: event };
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, narrativeEvents: newEvents }));
            return { narrativeEvents: newEvents };
        });
    },
    deleteNarrativeEvent: (id) => {
        set(state => {
            const newEvents = { ...state.narrativeEvents };
            delete newEvents[id];
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, narrativeEvents: newEvents }));
            return { narrativeEvents: newEvents };
        });
    },

    // --- CAMPAIGNS ---
    updateCampaign: (id, data) => {
        set(state => {
            const newCampaigns = { ...state.campaigns, [id]: data };
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, campaigns: newCampaigns }));
            return { campaigns: newCampaigns };
        });
    },
    createCampaign: (campaign) => {
        set(state => {
            const newCampaigns = { ...state.campaigns, [campaign.id]: campaign };
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, campaigns: newCampaigns }));
            return { campaigns: newCampaigns };
        });
    },
    deleteCampaign: (id) => {
        set(state => {
            const newCampaigns = { ...state.campaigns };
            delete newCampaigns[id];
            localStorage.setItem('arcadia_admin_data', JSON.stringify({ ...state, campaigns: newCampaigns }));
            return { campaigns: newCampaigns };
        });
    },

    exportData: () => {
        const state = get();
        return JSON.stringify({
            ITEMS: state.items,
            BASE_STATS: state.classStats,
            CONFIG: state.gameConfig,
            ENEMIES: state.enemies,
            ENCOUNTERS: state.encounters,
            RACE_BONUS: state.raceBonus,
            XP_TABLE: state.xpTable,
            DIFFICULTY_SETTINGS: state.difficultySettings,
            SPELLS: state.spells,
            CLASS_SPELLS: state.classSpells,
            CLASS_EQUIPMENT_PACKAGES: state.classEquipmentPackages,
            NARRATIVE_EVENTS: state.narrativeEvents,
            CAMPAIGNS: state.campaigns
        }, null, 2);
    },

    resetToDefaults: () => {
        const defaultSpells = spellsConfig.spells as unknown as Record<string, Spell>;
        const defaultClassSpells = spellsConfig.classSpells as unknown as Record<CharacterClass, string[]>;
        const defaults = {
            items: { ...ITEMS, ...STARTER_TUTORIAL_REWARDS },
            classStats: { ...BASE_STATS },
            gameConfig: { mapScale: 0.12, moistureOffset: 150, tempOffset: 300 },
            enemies: DEFAULT_ENEMIES,
            encounters: DEFAULT_ENCOUNTERS,
            raceBonus: { ...RACE_BONUS },
            xpTable: [ ...XP_TABLE ],
            difficultySettings: { ...DIFFICULTY_SETTINGS },
            spells: { ...defaultSpells },
            classSpells: { ...defaultClassSpells },
            classEquipmentPackages: { ...CLASS_EQUIPMENT_PACKAGES },
            narrativeEvents: { ...DEFAULT_NARRATIVE_EVENTS },
            campaigns: { ...CAMPAIGNS }
        };
        set(defaults);
        localStorage.removeItem('arcadia_admin_data');
    }
}));


import { create } from 'zustand';
import { 
    GameState, Dimension, TerrainType, Entity, GameStateData, 
    BattleCell, Attributes, CharacterClass, CharacterRace, Difficulty, EquipmentSlot, UITheme, MapLoadingState 
} from '../types';
import { BATTLE_MAP_SIZE, LOADING_TIPS, ASSETS } from '../constants';
import { createPlayerSlice, PlayerSlice } from './slices/playerSlice';
import { createInventorySlice, InventorySlice } from './slices/inventorySlice';
import { createOverworldSlice, OverworldSlice } from './slices/overworldSlice';
import { createBattleSlice, BattleSlice } from './slices/battleSlice';
import { createHuntSlice, HuntSlice } from './slices/huntSlice';
import { createCameraSlice, CameraSlice } from './slices/cameraSlice';
import { sfx } from '../services/SoundSystem';
import { textureManager } from '../services/textureLoader';

type GameActions = {
    addLog: (message: string, type?: 'info' | 'combat' | 'loot' | 'narrative' | 'levelup' | 'roll') => void;
    setUITheme: (theme: UITheme) => void;
    toggleSettings: () => void;
    setMapLoading: (loading: MapLoadingState | null) => void;
    transitionToMap: (params: {
        targetState: GameState;
        targetLocationName: string;
        targetBiome?: TerrainType | string;
        action: () => void | Promise<void>;
        durationMs?: number;
    }) => Promise<void>;
};

export type GameStore = GameStateData & PlayerSlice & InventorySlice & OverworldSlice & BattleSlice & HuntSlice & CameraSlice & GameActions;

// Load saved theme if any
const getInitialTheme = (): UITheme => {
    try {
        const saved = localStorage.getItem('arcadia_ui_theme');
        if (saved === 'dark_stone' || saved === 'parchment' || saved === 'arcane_wood') {
            return saved as UITheme;
        }
    } catch {
        // Ignore localStorage error in sandbox
    }
    return 'dark_stone';
};

export const useGameStore = create<GameStore>((set, get, api) => ({
    // Initial Data State
    gameState: GameState.CHARACTER_CREATION,
    mapLoading: null,
    difficulty: Difficulty.NORMAL,
    dimension: Dimension.NORMAL,
    uiTheme: getInitialTheme(),
    dofEnabled: true,
    showGridLines: true,
    isSettingsOpen: false,
    playerPos: { x: 0, y: 0 },
    exploredTiles: { [Dimension.NORMAL]: new Set(), [Dimension.UPSIDE_DOWN]: new Set() },
    battleMap: [],
    voxelStructures: [],
    turnOrder: [],
    currentTurnIndex: 0,
    party: [],
    inventory: [],
    logs: [],
    activeNarrativeEvent: null,
    activeNarrativeOutcome: null,
    triggeredEvents: [],
    factions: {
        dragon: 0,
        jade: 0,
        mixed: 0
    },
    
    // Slice Merging
    ...createPlayerSlice(set, get, api),
    ...createInventorySlice(set, get, api),
    ...createOverworldSlice(set, get, api),
    ...createBattleSlice(set, get, api),
    ...createHuntSlice(set, get, api),
    ...createCameraSlice(set, get, api),

    // Common Actions
    setMapLoading: (loading) => {
        set({ mapLoading: loading });
    },

    transitionToMap: async ({ targetState, targetLocationName, targetBiome, action, durationMs = 600 }) => {
        const randomTip = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)] || 'Explora con precaución.';
        
        // 1. Enter LOADING_MAP state with initial progress
        set({
            gameState: GameState.LOADING_MAP,
            mapLoading: {
                targetState,
                targetLocationName,
                targetBiome,
                progress: 25,
                tip: randomTip,
                statusText: 'Generando mallas geométricas y colisiones...'
            }
        });

        // 2. Perform background generation action
        await new Promise(r => setTimeout(r, Math.max(80, durationMs * 0.2)));
        
        try {
            await action();
        } catch (err) {
            console.error('Error during map transition action:', err);
        }

        // 3. Collect and strictly preload all necessary assets for the target state
        set(state => ({
            mapLoading: state.mapLoading ? {
                ...state.mapLoading,
                progress: 60,
                statusText: 'Precargando texturas de unidades y bioma en memoria GPU...'
            } : null
        }));

        try {
            const texturesToPreload: string[] = [];
            const currentState = get();

            if (targetState === GameState.BATTLE_TACTICAL) {
                // Battle units (players and enemies)
                (currentState.battleEntities || []).forEach(e => {
                    if (e.visual?.spriteUrl) texturesToPreload.push(e.visual.spriteUrl);
                });
                // Party members as backup
                (currentState.party || []).forEach(p => {
                    if (p.visual?.spriteUrl) texturesToPreload.push(p.visual.spriteUrl);
                });
                // Biome terrain textures
                if (currentState.battleTerrain && ASSETS.BLOCK_TEXTURES[currentState.battleTerrain]) {
                    texturesToPreload.push(ASSETS.BLOCK_TEXTURES[currentState.battleTerrain]);
                }
                // Voxel structure blocks
                (currentState.voxelStructures || []).forEach(v => {
                    if (v.textureUrl) texturesToPreload.push(v.textureUrl);
                });
                // Generic voxel and decoration fallbacks
                Object.values(ASSETS.DECORATIONS).forEach(u => texturesToPreload.push(u));
                Object.values(ASSETS.VOXEL_STRUCTURE_TEXTURES).forEach(u => texturesToPreload.push(u));
                Object.values(ASSETS.BLOCK_TEXTURES).forEach(u => texturesToPreload.push(u));
            } else if (targetState === GameState.OVERWORLD || targetState === GameState.TOWN_EXPLORATION) {
                (currentState.party || []).forEach(p => {
                    if (p.visual?.spriteUrl) texturesToPreload.push(p.visual.spriteUrl);
                });
                Object.values(ASSETS.TERRAIN).forEach(u => texturesToPreload.push(u));
                Object.values(ASSETS.BLOCK_TEXTURES).forEach(u => texturesToPreload.push(u));
            } else {
                Object.values(ASSETS.UNITS).forEach(u => texturesToPreload.push(u));
                Object.values(ASSETS.BLOCK_TEXTURES).forEach(u => texturesToPreload.push(u));
            }

            // Guarantee textures are decoded and loaded in texture cache before continuing!
            await textureManager.preloadAssets(texturesToPreload);
        } catch (preloadErr) {
            console.warn('Notice: Background asset preload finished with minor fallbacks:', preloadErr);
        }

        // 4. Finalize transition into target state
        set(state => ({
            mapLoading: state.mapLoading ? {
                ...state.mapLoading,
                progress: 100,
                statusText: '¡Todo listo!'
            } : null
        }));

        await new Promise(r => setTimeout(r, Math.max(60, durationMs * 0.15)));

        set({
            gameState: targetState,
            mapLoading: null
        });
    },

    addLog: (message, type = 'info') => {
        set(state => ({ logs: [...(state.logs || []), { id: `log-${Date.now()}-${Math.random()}`, message, type, timestamp: Date.now() }] }));
    },

    setUITheme: (theme: UITheme) => {
        sfx.playUiClick();
        try {
            localStorage.setItem('arcadia_ui_theme', theme);
        } catch {
            // Ignore
        }
        set({ uiTheme: theme });
        get().addLog(`UI Theme changed to ${theme.replace('_', ' ').toUpperCase()}`, 'info');
    },

    toggleDof: () => {
        sfx.playUiClick();
        set(state => {
            const next = !state.dofEnabled;
            get().addLog(`Depth of Field (Tilt-Shift Bokeh) ${next ? 'Activado' : 'Desactivado'}`, 'info');
            return { dofEnabled: next };
        });
    },

    toggleGridLines: () => {
        sfx.playUiClick();
        set(state => {
            const next = !state.showGridLines;
            get().addLog(`Tactical Grid Lines Overlay ${next ? 'Activados' : 'Desactivados'}`, 'info');
            return { showGridLines: next };
        });
    },

    toggleSettings: () => {
        sfx.playUiClick();
        set(state => ({ isSettingsOpen: !state.isSettingsOpen }));
    }
}));


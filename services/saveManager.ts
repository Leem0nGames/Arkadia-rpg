import { Dimension, Difficulty, GameState, GameStateData, SaveFile, SaveSlotId, SaveSlotMeta } from '../types';
import { DEFAULT_MAP_HEIGHT, DEFAULT_MAP_WIDTH, sanitizeAssetUrl } from '../constants';

export type { SaveSlotMeta };

export const CURRENT_SAVE_VERSION = 3;

export const SLOT_KEYS: Record<SaveSlotId, string> = {
  'slot_1': 'arcadia_save_slot_1',
  'slot_2': 'arcadia_save_slot_2',
  'slot_3': 'arcadia_save_slot_3',
  'auto_save': 'arcadia_save_auto_save'
};

export const LEGACY_SAVE_KEY = 'arcadia_tactics_save_v2';

export const SLOT_DEFINITIONS: { slotId: SaveSlotId; label: string; isAutoSave: boolean }[] = [
  { slotId: 'auto_save', label: 'Auto-Save', isAutoSave: true },
  { slotId: 'slot_1', label: 'Slot 1 (Manual)', isAutoSave: false },
  { slotId: 'slot_2', label: 'Slot 2 (Manual)', isAutoSave: false },
  { slotId: 'slot_3', label: 'Slot 3 (Manual)', isAutoSave: false },
];

/**
 * Extracts compact metadata from the active game state for slot display.
 */
export function extractSaveMeta(slotId: SaveSlotId, state: any): SaveSlotMeta {
  const leader = state.party?.[0];
  const isAuto = slotId === 'auto_save';
  const label = isAuto ? 'Auto-Save' : slotId.replace('_', ' ').toUpperCase();
  
  let locationName = 'Wilderness';
  if (state.gameState === GameState.TOWN_EXPLORATION) {
    locationName = 'Settlement / Town';
  } else if (state.standingOnSettlement) {
    locationName = 'Settlement Gates';
  } else if (state.dimension === Dimension.UPSIDE_DOWN) {
    locationName = 'Shadow Realm';
  } else {
    locationName = `Overworld (${state.playerPos?.x ?? 0}, ${state.playerPos?.y ?? 0})`;
  }

  return {
    slotId,
    label,
    isAutoSave: isAuto,
    timestamp: Date.now(),
    heroName: leader?.name || 'Unknown Hero',
    heroRace: leader?.stats?.race || 'Human',
    heroClass: leader?.stats?.class || 'Adventurer',
    level: leader?.stats?.level || 1,
    currentHp: leader?.stats?.hp || 10,
    maxHp: leader?.stats?.maxHp || 10,
    dimension: state.dimension || Dimension.NORMAL,
    gold: state.battleRewards?.gold || 0,
    locationName
  };
}

/**
 * Serializes the Zustand state into a clean JSON-friendly object.
 */
export function serializeGameState(state: any, slotId: SaveSlotId): SaveFile {
  const exploredNormal = Array.from(state.exploredTiles?.[Dimension.NORMAL] || []);
  const exploredUpsideDown = Array.from(state.exploredTiles?.[Dimension.UPSIDE_DOWN] || []);
  const clearedEncountersArray = Array.from(state.clearedEncounters || []);

  const meta = extractSaveMeta(slotId, state);

  const saveData: any = {
    ...state,
    exploredTiles: {
      [Dimension.NORMAL]: exploredNormal,
      [Dimension.UPSIDE_DOWN]: exploredUpsideDown
    },
    clearedEncounters: clearedEncountersArray,
    // ensure logs and volatile animations are trimmed
    logs: (state.logs || []).slice(-30),
    damagePopups: [],
    activeSpellEffect: null,
    isActionAnimating: false
  };

  return {
    version: CURRENT_SAVE_VERSION,
    timestamp: Date.now(),
    slotId,
    meta,
    data: saveData
  };
}

/**
 * Deserializes and sanitizes state back into game structures (e.g. Sets).
 */
export function deserializeGameState(saveFile: SaveFile): Partial<GameStateData> {
  let { data, version = 0 } = saveFile;
  
  if (!data) data = saveFile; // legacy fallback

  if (version < 1) { data.difficulty = data.difficulty || Difficulty.NORMAL; version = 1; }
  if (version < 2) { if (!data.inventory) data.inventory = []; version = 2; }
  if (version < 3) { if (!data.mapDimensions) data.mapDimensions = { width: DEFAULT_MAP_WIDTH, height: DEFAULT_MAP_HEIGHT }; version = 3; }

  const exploredTiles = {
    [Dimension.NORMAL]: new Set<string>(data.exploredTiles?.[Dimension.NORMAL] || []),
    [Dimension.UPSIDE_DOWN]: new Set<string>(data.exploredTiles?.[Dimension.UPSIDE_DOWN] || [])
  };
  const clearedEncounters = new Set<string>(data.clearedEncounters || []);

  const sanitizedParty = (data.party || []).map((p: any) => {
    if (p && p.visual && p.visual.spriteUrl) {
      return {
        ...p,
        visual: {
          ...p.visual,
          spriteUrl: sanitizeAssetUrl(p.visual.spriteUrl)
        }
      };
    }
    return p;
  });

  return {
    ...data,
    exploredTiles,
    clearedEncounters,
    party: sanitizedParty,
    inventory: data.inventory || [],
    visitedTowns: data.visitedTowns || {},
    mapDimensions: data.mapDimensions || { width: DEFAULT_MAP_WIDTH, height: DEFAULT_MAP_HEIGHT },
    activeOverworldEnemies: data.activeOverworldEnemies || [],
    logs: [],
    damagePopups: [],
    activeSpellEffect: null,
    isActionAnimating: false,
    gameState: GameState.OVERWORLD,
    quests: data.quests || [],
    gracePeriodEndTime: 0
  };
}

/**
 * Saves game state into a specified slot.
 */
export function writeSaveToSlot(slotId: SaveSlotId, state: any): boolean {
  try {
    const saveFile = serializeGameState(state, slotId);
    const key = SLOT_KEYS[slotId];
    localStorage.setItem(key, JSON.stringify(saveFile));
    // also maintain legacy key for backwards compatibility if slot_1 or auto_save
    if (slotId === 'slot_1' || slotId === 'auto_save') {
      localStorage.setItem(LEGACY_SAVE_KEY, JSON.stringify(saveFile));
    }
    return true;
  } catch (err) {
    console.error(`Failed to write save to ${slotId}:`, err);
    return false;
  }
}

/**
 * Reads a save from a specified slot.
 */
export function readSaveFromSlot(slotId: SaveSlotId): SaveFile | null {
  try {
    const key = SLOT_KEYS[slotId];
    const raw = localStorage.getItem(key);
    if (!raw) {
      // If checking slot_1 and empty, try legacy
      if (slotId === 'slot_1') {
        const legacy = localStorage.getItem(LEGACY_SAVE_KEY);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          return parsed.data ? parsed : { version: 0, timestamp: Date.now(), data: parsed };
        }
      }
      return null;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read save from ${slotId}:`, err);
    return null;
  }
}

/**
 * Deletes a save slot.
 */
export function deleteSaveSlot(slotId: SaveSlotId): boolean {
  try {
    const key = SLOT_KEYS[slotId];
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error(`Failed to delete save ${slotId}:`, err);
    return false;
  }
}

/**
 * Lists metadata for all available slots.
 */
export function listAllSaveSlots(): { slotId: SaveSlotId; label: string; isAutoSave: boolean; meta: SaveSlotMeta | null }[] {
  return SLOT_DEFINITIONS.map(def => {
    const save = readSaveFromSlot(def.slotId);
    if (!save) {
      return { ...def, meta: null };
    }
    const meta = save.meta || (save.data ? extractSaveMeta(def.slotId, save.data) : null);
    return {
      ...def,
      meta: meta ? { ...meta, timestamp: save.timestamp || meta.timestamp } : null
    };
  });
}

/**
 * Gets the most recent save across all slots (for quick continue).
 */
export function getMostRecentSave(): { slotId: SaveSlotId; saveFile: SaveFile; meta: SaveSlotMeta } | null {
  const all = listAllSaveSlots().filter(s => s.meta !== null);
  if (all.length === 0) return null;
  
  all.sort((a, b) => (b.meta!.timestamp || 0) - (a.meta!.timestamp || 0));
  const latest = all[0];
  const saveFile = readSaveFromSlot(latest.slotId);
  if (!saveFile) return null;
  
  return {
    slotId: latest.slotId,
    saveFile,
    meta: latest.meta!
  };
}

/**
 * Exports all slots into a downloadable JSON string.
 */
export function exportAllSaves(): string {
  const payload: Record<string, any> = {
    exportedAt: Date.now(),
    app: 'ArcadiaTactics',
    version: CURRENT_SAVE_VERSION,
    slots: {}
  };

  SLOT_DEFINITIONS.forEach(def => {
    const s = readSaveFromSlot(def.slotId);
    if (s) {
      payload.slots[def.slotId] = s;
    }
  });

  return JSON.stringify(payload, null, 2);
}

/**
 * Imports slots from a JSON backup string.
 */
export function importSavesFromJson(jsonString: string): { success: boolean; importedCount: number; message: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed) return { success: false, importedCount: 0, message: 'Invalid JSON format' };

    let count = 0;

    // Format 1: Multi-slot bundle
    if (parsed.slots && typeof parsed.slots === 'object') {
      Object.keys(parsed.slots).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(SLOT_KEYS, key)) {
          localStorage.setItem(SLOT_KEYS[key as SaveSlotId], JSON.stringify(parsed.slots[key]));
          count++;
        }
      });
    } 
    // Format 2: Single SaveFile
    else if (parsed.data || parsed.party) {
      const slotId: SaveSlotId = parsed.slotId || 'slot_1';
      const key = SLOT_KEYS[slotId] || SLOT_KEYS['slot_1'];
      localStorage.setItem(key, JSON.stringify(parsed));
      count++;
    }

    if (count === 0) {
      return { success: false, importedCount: 0, message: 'No valid Arcadia save data found in file.' };
    }

    return { success: true, importedCount: count, message: `Successfully restored ${count} save slot(s)!` };
  } catch (err) {
    return { success: false, importedCount: 0, message: `Import error: ${(err as Error).message}` };
  }
}

import { TerrainType } from '../types';

export interface Decoration {
  id: string;
  layer: number; // 0 for flat ground decor, >0 for standing scenery elements
  spriteKey: string; // The sprite asset URL or key
}

/**
 * Procedurally generates decorations for a given terrain biome and hex coordinate,
 * using coordinates as a deterministic random seed.
 * STRICTLY uses authentic Battle for Wesnoth embellishment sprite keys.
 */
export function generateDecorationsForBiome(
  terrainId: string,
  q: number,
  r: number
): Decoration[] {
  const decorations: Decoration[] = [];
  
  // Deterministic pseudo-random number generator
  const pseudoRand = (seed: number) => {
    const s = Math.sin(q * 12.9898 + r * 78.233 + seed) * 43758.5453;
    return s - Math.floor(s);
  };

  const rand = pseudoRand(42);

  // Generate appropriate decorations based on the active terrain id
  if (terrainId === TerrainType.GRASS || terrainId === 'grass' || terrainId === TerrainType.PLAINS || terrainId === 'plains') {
    if (rand < 0.12) {
      // Purple flowers
      decorations.push({
        id: 'flower_purple',
        layer: -100,
        spriteKey: 'embellishments/flower-purple'
      });
    } else if (rand < 0.24) {
      // Mixed flowers
      decorations.push({
        id: 'flowers_mixed',
        layer: -100,
        spriteKey: 'embellishments/flowers-mixed'
      });
    } else if (rand < 0.35) {
      // Small flowers
      decorations.push({
        id: 'flowers_small',
        layer: -100,
        spriteKey: 'embellishments/flowers-mixed-small'
      });
    }
  } else if (terrainId === TerrainType.FUNGUS || terrainId === 'fungus') {
    if (rand < 0.4) {
      decorations.push({
        id: 'fungus_shroom',
        layer: -100,
        spriteKey: 'forest/mushrooms'
      });
    }
  } else if (terrainId === TerrainType.SWAMP || terrainId === 'swamp') {
    if (rand < 0.35) {
      decorations.push({
        id: 'swamp_reed',
        layer: -100,
        spriteKey: 'swamp/reed-small2'
      });
    }
  } else if (terrainId === TerrainType.DESERT || terrainId === 'desert') {
    if (rand < 0.25) {
      decorations.push({
        id: 'desert_plant',
        layer: -100,
        spriteKey: 'embellishments/desert-plant'
      });
    }
  } else if (terrainId === TerrainType.MOUNTAIN || terrainId === 'mountain' || terrainId === TerrainType.RUINS || terrainId === 'ruins') {
    if (rand < 0.2) {
      decorations.push({
        id: 'rubble_accent',
        layer: -100,
        spriteKey: 'misc/rubble'
      });
    }
  }

  return decorations;
}


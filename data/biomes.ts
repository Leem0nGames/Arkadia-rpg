import { TerrainType } from '../types';

export interface BiomeRule {
  id: string;
  name: string;
  minElevation: number;
  maxElevation: number;
  minMoisture: number;
  maxMoisture: number;
  defaultTerrain: TerrainType;
  terrainWeights: { terrain: TerrainType; weight: number }[];
}

export const BIOME_RULES: BiomeRule[] = [
  {
    id: 'MOUNTAIN',
    name: 'Montaña Escarpada',
    minElevation: 0.7,
    maxElevation: 1.0,
    minMoisture: 0.0,
    maxMoisture: 1.0,
    defaultTerrain: TerrainType.MOUNTAIN,
    terrainWeights: [
      { terrain: TerrainType.MOUNTAIN, weight: 0.8 },
      { terrain: TerrainType.RUINS, weight: 0.1 },
      { terrain: TerrainType.GRASS, weight: 0.1 }
    ]
  },
  {
    id: 'DESERT',
    name: 'Desierto Ardiente',
    minElevation: 0.0,
    maxElevation: 0.7,
    minMoisture: 0.0,
    maxMoisture: 0.25,
    defaultTerrain: TerrainType.DESERT,
    terrainWeights: [
      { terrain: TerrainType.DESERT, weight: 0.85 },
      { terrain: TerrainType.DIRT_ROAD, weight: 0.1 },
      { terrain: TerrainType.PLAINS, weight: 0.05 }
    ]
  },
  {
    id: 'FOREST',
    name: 'Bosque Antiguo',
    minElevation: 0.0,
    maxElevation: 0.7,
    minMoisture: 0.5,
    maxMoisture: 1.0,
    defaultTerrain: TerrainType.FOREST,
    terrainWeights: [
      { terrain: TerrainType.FOREST, weight: 0.55 },
      { terrain: TerrainType.JUNGLE, weight: 0.2 },
      { terrain: TerrainType.SWAMP, weight: 0.15 },
      { terrain: TerrainType.GRASS, weight: 0.1 }
    ]
  },
  {
    id: 'PLAINS',
    name: 'Praderas Templadas',
    minElevation: 0.0,
    maxElevation: 0.7,
    minMoisture: 0.25,
    maxMoisture: 0.5,
    defaultTerrain: TerrainType.GRASS,
    terrainWeights: [
      { terrain: TerrainType.GRASS, weight: 0.6 },
      { terrain: TerrainType.PLAINS, weight: 0.35 },
      { terrain: TerrainType.DIRT_ROAD, weight: 0.05 }
    ]
  }
];

/**
 * Determines the matching biome rule given normalized elevation and moisture (each 0.0 - 1.0).
 */
export function determineBiome(elevation: number, moisture: number): BiomeRule {
  // Ensure inputs are clamped
  const clampedElevation = Math.max(0, Math.min(1, elevation));
  const clampedMoisture = Math.max(0, Math.min(1, moisture));

  for (const rule of BIOME_RULES) {
    if (
      clampedElevation >= rule.minElevation &&
      clampedElevation <= rule.maxElevation &&
      clampedMoisture >= rule.minMoisture &&
      clampedMoisture <= rule.maxMoisture
    ) {
      return rule;
    }
  }
  
  // Fallback to plains
  return BIOME_RULES[3];
}

import { TerrainType, BattleCell } from '../types';
import { ASSETS, BATTLE_MAP_SIZE, TERRAIN_COLORS } from '../constants';

/**
 * Generates the 3D tactical battle grid based on terrain type and noise functions.
 */
export const generateBattleGrid = (terrainType: TerrainType): BattleCell[] => {
  const size = BATTLE_MAP_SIZE;
  const grid: BattleCell[] = [];
  const color = TERRAIN_COLORS[terrainType] || '#15803d';

  let floorTex = ASSETS.BLOCK_TEXTURES[terrainType] || ASSETS.BLOCK_TEXTURES[TerrainType.GRASS]!;
  let wallTex = ASSETS.BLOCK_TEXTURES[TerrainType.MOUNTAIN]!;
  let fluidTex = ASSETS.BLOCK_TEXTURES[TerrainType.WATER]!;

  if (terrainType === TerrainType.DESERT) {
    wallTex = ASSETS.BLOCK_TEXTURES[TerrainType.DESERT]!;
  }
  if (terrainType === TerrainType.CASTLE || terrainType === TerrainType.RUINS) {
    floorTex = ASSETS.BLOCK_TEXTURES[TerrainType.STONE_FLOOR]!;
    wallTex = ASSETS.BLOCK_TEXTURES[TerrainType.CASTLE]!;
  }
  if (terrainType === TerrainType.LAVA || terrainType === TerrainType.CHASM) {
    fluidTex = ASSETS.BLOCK_TEXTURES[TerrainType.LAVA]!;
  }
  if (terrainType === TerrainType.SWAMP) {
    wallTex = ASSETS.BLOCK_TEXTURES[TerrainType.SWAMP]!;
  }
  if (terrainType === TerrainType.VILLAGE) {
    floorTex = ASSETS.BLOCK_TEXTURES[TerrainType.GRASS]!;
    wallTex = ASSETS.BLOCK_TEXTURES[TerrainType.VILLAGE]!;
  }
  if (terrainType === TerrainType.COBBLESTONE) {
    floorTex = ASSETS.BLOCK_TEXTURES[TerrainType.COBBLESTONE]!;
  }

  const noise = (x: number, z: number, freq = 0.5) =>
    Math.sin(x * freq) + Math.cos(z * freq) + Math.sin((x + z) * freq * 0.5);

  const random = (x: number, z: number) =>
    (Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1);

  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      let height = 1;
      const offsetY = 0;
      let textureUrl = floorTex;
      let isObstacle = false;

      const distToEdge = Math.min(x, z, size - 1 - x, size - 1 - z);
      const isSpawnZone = z < 2 || z > size - 3;

      if ([TerrainType.MOUNTAIN, TerrainType.DESERT, TerrainType.TAIGA].includes(terrainType)) {
        const n = noise(x, z, 0.4);
        if (n > 0.2) height = 2;
        if (n > 1.0 && !isSpawnZone) {
          height = 3;
          if (terrainType === TerrainType.MOUNTAIN || n > 1.5) {
            isObstacle = true;
            textureUrl = wallTex;
          }
        }
        if (!isSpawnZone && random(x, z) > 0.95) {
          height = 2;
          textureUrl = wallTex;
          isObstacle = true;
        }
      } else if ([TerrainType.FOREST, TerrainType.JUNGLE, TerrainType.SWAMP].includes(terrainType)) {
        const riverCenter = size / 2 + Math.sin(x * 0.3) * 3 + Math.cos(x * 0.8);
        const width = terrainType === TerrainType.SWAMP ? 4.5 : 2.5;
        const distRiver = Math.abs(z - riverCenter);

        if (distRiver < width / 2) {
          height = 0.8;
          textureUrl = fluidTex;
          isObstacle = true;
          if (terrainType === TerrainType.SWAMP && random(x, z) > 0.7) {
            height = 1;
            textureUrl = floorTex;
            isObstacle = false;
          }
        } else {
          if (!isSpawnZone && random(x, z) > 0.85) {
            height = 2;
            textureUrl = wallTex;
            isObstacle = true;
          }
        }
      } else if (terrainType === TerrainType.CASTLE || terrainType === TerrainType.RUINS) {
        const isInRoom1 = (x >= 2 && x <= 5 && z >= 2 && z <= 6);
        const isInRoom2 = (x >= 8 && x <= 11 && z >= 7 && z <= 11);
        const isInCorridorH = (z === 4 && x >= 5 && x <= 8);
        const isInCorridorV = (x === 8 && z >= 4 && z <= 7);

        if (isInRoom1 || isInRoom2 || isInCorridorH || isInCorridorV || isSpawnZone) {
          height = 1;
          if (terrainType === TerrainType.RUINS && random(x, z) > 0.8) {
            textureUrl = wallTex;
          } else {
            textureUrl = floorTex;
          }
          isObstacle = false;
        } else {
          height = 3;
          textureUrl = wallTex;
          isObstacle = true;

          if (terrainType === TerrainType.RUINS && random(x, z) > 0.65) {
            height = 2;
          }
        }
      } else if (terrainType === TerrainType.CHASM) {
        const n = noise(x, z, 0.6);
        if ((x % 2 === 0 || z % 2 === 0) && n > 0.2 && !isSpawnZone) {
          if (random(x, z) > 0.4) {
            height = 2;
            textureUrl = wallTex;
            isObstacle = true;
          } else {
            height = 1;
          }
        }
        if (random(x, z) > 0.97 && !isSpawnZone) {
          height = 3;
          textureUrl = wallTex;
          isObstacle = true;
        }
      } else if ([TerrainType.VILLAGE, TerrainType.COBBLESTONE, TerrainType.DIRT_ROAD].includes(terrainType)) {
        const roadX = Math.floor(size / 2);
        const roadZ = Math.floor(size / 2);
        if (Math.abs(x - roadX) <= 1 || Math.abs(z - roadZ) <= 1) {
          textureUrl = ASSETS.BLOCK_TEXTURES[TerrainType.DIRT_ROAD] || floorTex;
        } else {
          if (x % 4 === 0 && z % 4 === 0 && !isSpawnZone) {
            height = 2;
            isObstacle = true;
            textureUrl = wallTex;
          } else if (random(x, z) > 0.95 && !isSpawnZone) {
            height = 2;
            textureUrl = wallTex;
            isObstacle = true;
          }
        }
      } else if ([TerrainType.CAVE_FLOOR, TerrainType.FUNGUS, TerrainType.LAVA].includes(terrainType)) {
        const n = noise(x, z, 0.5);
        if (n > 1.2 && !isSpawnZone) {
          height = 3;
          isObstacle = true;
          textureUrl = wallTex;
        }
        if (terrainType === TerrainType.LAVA && n < -0.8 && !isSpawnZone) {
          height = 0.8;
          textureUrl = fluidTex;
          isObstacle = true;
        }
      } else {
        if (!isSpawnZone && random(x, z) > 0.96) {
          height = 2;
          isObstacle = true;
          textureUrl = wallTex;
        }
      }

      if (distToEdge === 0) {
        height = 4;
        isObstacle = true;
        textureUrl = wallTex;
      }

      if (isSpawnZone) {
        isObstacle = false;
        if (height > 1.5) height = 1;
        if (textureUrl === fluidTex) {
          height = 1;
          textureUrl = floorTex;
        }
      }

      grid.push({ x, z, height, offsetY, color, textureUrl, isObstacle });
    }
  }

  return grid;
};

/**
 * Calculates height of a unit on the battle map.
 */
export const getUnitHeight = (
  entity: { position: { x: number; y: number } },
  map: BattleCell[]
): number => {
  const cell = map.find((c) => c.x === entity.position.x && c.z === entity.position.y);
  return cell ? (cell.offsetY || 0) + cell.height : 1;
};

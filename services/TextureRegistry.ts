import { TerrainType } from '../types';
import { ASSETS, WESNOTH_BASE_URL, MC_BASE_URL } from '../constants';

/**
 * Strict TextureRegistry class
 * Enforces strict domain isolation:
 * - Overworld Map: Wesnoth isometric sprites exclusively (wesnoth folder / WESNOTH_BASE_URL).
 * - 3D Tactical & Hunt Maps: Minecraft-style cube block textures exclusively (minecraft folder / MC_BASE_URL).
 * Prevents any cross-contamination between engines.
 */
export class TextureRegistry {
  private static instance: TextureRegistry;

  private constructor() {}

  public static getInstance(): TextureRegistry {
    if (!TextureRegistry.instance) {
      TextureRegistry.instance = new TextureRegistry();
    }
    return TextureRegistry.instance;
  }

  /**
   * Enforces and returns exclusively Wesnoth isometric sprite URL for Overworld map.
   * Warns if a Minecraft texture is requested for Overworld and falls back to Wesnoth.
   */
  public getOverworldTexture(terrain: TerrainType | string): string {
    const key = typeof terrain === 'string' ? terrain.toUpperCase() as TerrainType : terrain;
    const terrainMap = ASSETS.TERRAIN as Record<TerrainType, string>;

    if (terrainMap[key]) {
      const url = terrainMap[key];
      if (url && (url.includes('minecraft') || url.includes('MC_BASE_URL'))) {
        console.warn(`[TextureRegistry] Cross-contamination prevented: Minecraft texture requested for Overworld terrain ${key}. Falling back to Wesnoth.`);
        return `${WESNOTH_BASE_URL}/terrain/grass/green.png`;
      }
      return url || `${WESNOTH_BASE_URL}/terrain/grass/green.png`;
    }

    // Default fallback Wesnoth grass
    return `${WESNOTH_BASE_URL}/terrain/grass/green.png`;
  }

  /**
   * Enforces and returns exclusively Wesnoth overlay/prop URL for Overworld map.
   */
  public getOverworldOverlayTexture(terrain: TerrainType | string, index: number = 0): string {
    const key = typeof terrain === 'string' ? terrain.toUpperCase() as TerrainType : terrain;
    const overlayMap = ASSETS.OVERLAYS as Record<string, string[]>;
    if (overlayMap[key] && overlayMap[key].length > 0) {
      const list = overlayMap[key];
      const url = list[index % list.length];
      if (url && !url.includes('minecraft')) {
        return url;
      }
    }
    return this.getOverworldTexture(key);
  }

  /**
   * Enforces and returns exclusively Minecraft-style cube block texture URL for 3D Tactical & Hunt maps.
   * Warns if a Wesnoth sprite is requested for Tactical/Hunt and falls back to Minecraft dirt.
   */
  public getTacticalTexture(terrainOrBlock: string): string {
    if (!terrainOrBlock) return `${MC_BASE_URL}/dirt.png`;

    const clean = terrainOrBlock.trim().toUpperCase();

    // Check if someone passed a Wesnoth path or asset directly
    if (clean.includes('WESNOTH') || clean.includes('/assets/wesnoth') || clean.includes('wesnoth')) {
      console.warn(`[TextureRegistry] Cross-contamination prevented: Wesnoth isometric sprite requested for 3D tactical block ${terrainOrBlock}. Falling back to Minecraft dirt.`);
      return `${MC_BASE_URL}/dirt.png`;
    }

    const blockMap = ASSETS.BLOCK_TEXTURES as Record<string, string>;
    if (blockMap[clean]) {
      return blockMap[clean];
    }

    const voxelMap = ASSETS.VOXEL_STRUCTURE_TEXTURES as Record<string, string>;
    if (voxelMap[clean]) {
      return voxelMap[clean];
    }

    // Smart Minecraft block mapping fallbacks
    const lower = terrainOrBlock.toLowerCase();
    if (lower.includes('water') || lower.includes('river')) return `${MC_BASE_URL}/blue_concrete.png`;
    if (lower.includes('lava') || lower.includes('magma')) return `${MC_BASE_URL}/lava_still.png`;
    if (lower.includes('stone') || lower.includes('mountain')) return `${MC_BASE_URL}/stone.png`;
    if (lower.includes('sand') || lower.includes('desert')) return `${MC_BASE_URL}/sand.png`;
    if (lower.includes('snow') || lower.includes('tundra')) return `${MC_BASE_URL}/snow.png`;
    if (lower.includes('wood') || lower.includes('plank')) return `${MC_BASE_URL}/oak_planks.png`;
    if (lower.includes('brick') || lower.includes('castle')) return `${MC_BASE_URL}/stone_bricks.png`;

    return `${MC_BASE_URL}/dirt.png`;
  }

  /**
   * Validates whether a given texture URL strictly belongs to the requested domain.
   */
  public validateDomain(url: string, domain: 'OVERWORLD' | 'TACTICAL'): boolean {
    if (!url) return false;
    const isMinecraft = url.includes('minecraft') || url.includes('minecraft-assets') || url.includes(MC_BASE_URL);
    const isWesnoth = url.includes('wesnoth') || url.includes(WESNOTH_BASE_URL);

    if (domain === 'OVERWORLD') {
      return isWesnoth && !isMinecraft;
    } else {
      return isMinecraft && !isWesnoth;
    }
  }
}

export const textureRegistry = TextureRegistry.getInstance();

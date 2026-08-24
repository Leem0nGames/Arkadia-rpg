import { TerrainType } from '../types';
import { ASSETS } from '../constants';
import { textureRegistry } from './TextureRegistry';

/**
 * Unified Asset Mapping System
 * Strictly decouples Overworld (Wesnoth isometric hex sprite assets) 
 * from Tactical/Hunt (Minecraft cube-based voxel block textures) 
 * via TextureRegistry to prevent any texture leaking between engines.
 */
export class AssetMappingSystem {
  private static instance: AssetMappingSystem;

  private constructor() {}

  public static getInstance(): AssetMappingSystem {
    if (!AssetMappingSystem.instance) {
      AssetMappingSystem.instance = new AssetMappingSystem();
    }
    return AssetMappingSystem.instance;
  }

  /**
   * Strictly loads Wesnoth-themed sprite assets (isometric hex style) for Overworld map.
   */
  public getOverworldAsset(terrain: TerrainType | string): string {
    return textureRegistry.getOverworldTexture(terrain);
  }

  /**
   * Retrieves Overworld overlay/prop assets strictly from Wesnoth sprite library.
   */
  public getOverworldOverlayAsset(terrain: TerrainType | string, index: number = 0): string {
    return textureRegistry.getOverworldOverlayTexture(terrain, index);
  }

  /**
   * Strictly uses cube-based Minecraft-style block textures for Tactical and Hunt 3D engines.
   */
  public getTacticalOrHuntAsset(terrainOrBlock: string): string {
    return textureRegistry.getTacticalTexture(terrainOrBlock);
  }

  /**
   * Unit sprite resolver.
   */
  public getUnitAsset(unitKey: string): string {
    if (!unitKey) return ASSETS.UNITS.PLAYER;
    const unitsMap = ASSETS.UNITS as Record<string, string>;
    const cleanKey = unitKey.trim().toUpperCase();
    if (unitsMap[cleanKey]) {
      return unitsMap[cleanKey];
    }
    return ASSETS.UNITS.PLAYER;
  }
}

export const assetMapper = AssetMappingSystem.getInstance();

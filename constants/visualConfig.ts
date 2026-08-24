/**
 * Visual Configuration & Asset Normalization Standards
 * Defines pixel-per-unit ratios, texture filtering, and scaling factors for Wesnoth 2D sprites vs Voxel 3D blocks.
 */

export interface VisualConfig {
    PIXELS_PER_UNIT_VOXEL: number;
    PIXELS_PER_UNIT_SPRITE: number;
    DEFAULT_TEXTURE_SIZE: number;
    TEXTURE_FILTERING: 'nearest' | 'linear';
    SPRITE_SCALE_RATIO: number;
    VOXEL_SCALE_RATIO: number;
}

export const VISUAL_CONFIG: VisualConfig = {
    PIXELS_PER_UNIT_VOXEL: 64,
    PIXELS_PER_UNIT_SPRITE: 32,
    DEFAULT_TEXTURE_SIZE: 64,
    TEXTURE_FILTERING: 'nearest', // Ensures crisp retro pixel art style
    SPRITE_SCALE_RATIO: 1.0,
    VOXEL_SCALE_RATIO: 1.0,
};

export const getScaledTextureSize = (isVoxel: boolean): number => {
    return isVoxel ? VISUAL_CONFIG.PIXELS_PER_UNIT_VOXEL : VISUAL_CONFIG.PIXELS_PER_UNIT_SPRITE;
};

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { SchematicBlock } from '../../../services/SchematicParser';
import { textureManager } from '../../../services/TextureManager';
import { assetMapper } from '../../../services/AssetMappingSystem';
import { VoxelChunkData } from '../../../services/VoxelEngine';
import { InstancedBlockGroup } from './InstancedBlockGroup';
import { removeMaterialFromCache, getCacheKey } from '../materials/toonMaterialCache';

export const ChunkClusterMesh: React.FC<{ chunk: VoxelChunkData }> = ({ chunk }) => {
  const { groupedBlocks, texturesMap, fallbackColorsMap } = useMemo(() => {
    const groups: Record<string, SchematicBlock[]> = {};
    const textures: Record<string, THREE.Texture> = {};
    const colors: Record<string, string> = {};

    chunk.blocks.forEach((b) => {
      if (!b || !Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.z)) return;

      const safeColor = (b.color && b.color.startsWith('#')) ? b.color : '#64748b';
      const resolvedPath = assetMapper.getTacticalOrHuntAsset(b.textureUrl || b.name || safeColor);
      const key = resolvedPath || safeColor;

      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
      colors[key] = safeColor;

      if (!textures[key]) {
        textures[key] = textureManager.get3DTexture(resolvedPath, safeColor);
      }
    });

    return { groupedBlocks: groups, texturesMap: textures, fallbackColorsMap: colors };
  }, [chunk]);

  const cacheKeys = useMemo(() => {
    return Object.entries(groupedBlocks).map(([key]) => {
      const tex = texturesMap[key];
      const color = fallbackColorsMap[key] || '#64748b';
      return getCacheKey(tex, color);
    });
  }, [groupedBlocks, texturesMap, fallbackColorsMap]);

  useEffect(() => {
    return () => {
      cacheKeys.forEach((key) => {
        if (key) {
          removeMaterialFromCache(key);
        }
      });
    };
  }, [cacheKeys]);


  return (
    <group name={`voxel-chunk-${chunk.key}`}>
      {Object.entries(groupedBlocks).map(([key, groupBlocks]) => {
        const tex = texturesMap[key];
        const color = fallbackColorsMap[key] || '#64748b';
        return (
          <InstancedBlockGroup
            key={key}
            blocks={groupBlocks}
            texture={tex}
            fallbackColor={color}
          />
        );
      })}
    </group>
  );
};

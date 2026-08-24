import React, { ReactNode, useMemo, useEffect } from 'react';
import { SchematicBlock } from '../../../services/SchematicParser';
import {
  cullHiddenBlocks,
  partitionChunks,
  buildColumnHeightMap,
  getActiveChunks,
  CHUNK_SIZE
} from '../../../services/VoxelEngine';
import { ChunkClusterMesh } from './ChunkClusterMesh';
import { clearMaterialCache } from '../materials/toonMaterialCache';


export interface BaseVoxelRendererProps {
  blocks: SchematicBlock[];
  dimensions: { width: number; height: number; length: number };
  focusPos: { x: number; y: number; z: number };
  onGroundClick?: (targetPos: { x: number; y: number; z: number }) => void;
  children?: ReactNode;
  enableOcclusionCulling?: boolean;
  hRenderDistance?: number;
  vRenderDistance?: number;
}

export const BaseVoxelRenderer: React.FC<BaseVoxelRendererProps> = ({
  blocks,
  dimensions,
  focusPos,
  onGroundClick,
  children,
  enableOcclusionCulling = true,
  hRenderDistance = 2,
  vRenderDistance = 2
}) => {
  useEffect(() => {
    return () => {
      clearMaterialCache();
    };
  }, []);

  const visibleBlocks = useMemo(() => {
    return enableOcclusionCulling ? cullHiddenBlocks(blocks) : blocks;
  }, [blocks, enableOcclusionCulling]);

  const chunksMap = useMemo(() => {
    return partitionChunks(visibleBlocks, CHUNK_SIZE);
  }, [visibleBlocks]);

  const colHeightMap = useMemo(() => {
    return buildColumnHeightMap(blocks);
  }, [blocks]);

  const activeChunks = useMemo(() => {
    return getActiveChunks(chunksMap, focusPos, hRenderDistance, vRenderDistance, CHUNK_SIZE);
  }, [chunksMap, focusPos, hRenderDistance, vRenderDistance]);

  const handlePointerDown = (e: any) => {
    if (!onGroundClick || !e || !e.point) return;
    e.stopPropagation();

    const targetX = Math.max(0, Math.min(dimensions.width - 1, Math.round(e.point.x)));
    const targetZ = Math.max(0, Math.min(dimensions.length - 1, Math.round(e.point.z)));
    const targetY = colHeightMap.get(`${targetX},${targetZ}`) ?? 1;

    if (Number.isFinite(targetX) && Number.isFinite(targetY) && Number.isFinite(targetZ)) {
      onGroundClick({ x: targetX, y: targetY, z: targetZ });
    }
  };

  return (
    <group name="base-voxel-renderer-root">
      <group onClick={handlePointerDown}>
        {activeChunks.map((chunk) => (
          <ChunkClusterMesh key={chunk.key} chunk={chunk} />
        ))}
      </group>
      {children}
    </group>
  );
};

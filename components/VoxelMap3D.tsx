import React from 'react';
import { BaseVoxelRenderer, BaseVoxelRendererProps } from './Base3DRenderer';

export type VoxelMap3DProps = BaseVoxelRendererProps;

/**
 * VoxelMap3D wrapper delegating to the centralized BaseVoxelRenderer service in Base3DRenderer.
 */
export const VoxelMap3D: React.FC<VoxelMap3DProps> = (props) => {
  return <BaseVoxelRenderer {...props} />;
};

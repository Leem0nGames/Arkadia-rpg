import React, { useLayoutEffect } from 'react';
import * as THREE from 'three';
import { normalize3DObject, AssetNormalizationOptions } from './normalize3DObject';

export function useNormalized3DAsset(
  ref: React.RefObject<THREE.Object3D>,
  options: AssetNormalizationOptions = {},
  deps: any[] = []
) {
  useLayoutEffect(() => {
    if (ref.current) {
      normalize3DObject(ref.current, options);
    }
  }, [ref, options.targetHeight, options.targetMaxDimension, options.floorOffset, ...deps]);
}

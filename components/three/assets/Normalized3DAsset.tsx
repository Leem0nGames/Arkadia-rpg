import React, { ReactNode, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { normalize3DObject, AssetNormalizationOptions } from './normalize3DObject';
import { STANDARD_3D_SCALES } from '../constants/standard3DScales';

export const Normalized3DAsset: React.FC<{
  children: ReactNode;
  targetHeight?: number;
  targetMaxDimension?: number;
  alignFloor?: boolean;
  centerXZ?: boolean;
  floorOffset?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}> = ({
  children,
  targetHeight = STANDARD_3D_SCALES.CHARACTER_HEIGHT,
  targetMaxDimension,
  alignFloor = true,
  centerXZ = true,
  floorOffset = STANDARD_3D_SCALES.FLOOR_Y_OFFSET,
  position = [0, 0, 0],
  rotation = [0, 0, 0]
}) => {
  const containerRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    if (innerRef.current) {
      normalize3DObject(innerRef.current, {
        targetHeight,
        targetMaxDimension,
        alignFloor,
        centerXZ,
        floorOffset
      });
    }
  }, [targetHeight, targetMaxDimension, alignFloor, centerXZ, floorOffset, children]);

  return (
    <group ref={containerRef} position={position} rotation={rotation}>
      <group ref={innerRef}>
        {children}
      </group>
    </group>
  );
};

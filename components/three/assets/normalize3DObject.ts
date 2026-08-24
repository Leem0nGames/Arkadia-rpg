import * as THREE from 'three';
import { STANDARD_3D_SCALES } from '../constants/standard3DScales';

export interface AssetNormalizationOptions {
  targetHeight?: number;
  targetMaxDimension?: number;
  targetWidth?: number;
  alignFloor?: boolean;          
  centerXZ?: boolean;            
  floorOffset?: number;          
  preserveAspectRatio?: boolean; 
}

export function normalize3DObject(
  object: THREE.Object3D,
  options: AssetNormalizationOptions = {}
): { scale: number; offsetY: number } {
  const {
    targetHeight = STANDARD_3D_SCALES.CHARACTER_HEIGHT,
    targetMaxDimension,
    alignFloor = true,
    centerXZ = true,
    floorOffset = STANDARD_3D_SCALES.FLOOR_Y_OFFSET
  } = options;

  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);

  if (box.isEmpty()) {
    return { scale: 1, offsetY: floorOffset };
  }

  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  let scale = 1.0;
  if (targetMaxDimension) {
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    scale = targetMaxDimension / maxDim;
  } else if (targetHeight) {
    scale = targetHeight / Math.max(size.y, 0.001);
  }

  object.scale.set(scale, scale, scale);

  let offsetY = floorOffset;
  if (alignFloor) {
    offsetY = -box.min.y * scale + floorOffset;
    object.position.y = offsetY;
  }

  if (centerXZ) {
    object.position.x = -center.x * scale;
    object.position.z = -center.z * scale;
  }

  object.updateMatrixWorld(true);
  return { scale, offsetY };
}

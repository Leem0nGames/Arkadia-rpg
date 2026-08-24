import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { SchematicBlock } from '../../../services/SchematicParser';
import { getCachedToonMaterial, getCacheKey } from '../materials/toonMaterialCache';
import { useMaterialCleanup } from '../materials/useMaterialCleanup';

const SHARED_BOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const _dummyObj = new THREE.Object3D();

export const InstancedBlockGroup: React.FC<{
  blocks: SchematicBlock[];
  texture?: THREE.Texture;
  fallbackColor: string;
}> = ({ blocks, texture, fallbackColor }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const cacheKey = useMemo(() => getCacheKey(texture, fallbackColor), [texture, fallbackColor]);
  useMaterialCleanup(cacheKey);

  React.useEffect(() => {
    if (!meshRef.current) return;
    let count = 0;

    blocks.forEach((b) => {
      if (Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.z)) {
        _dummyObj.position.set(b.x, b.y, b.z);
        _dummyObj.updateMatrix();
        meshRef.current!.setMatrixAt(count++, _dummyObj.matrix);
      }
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.computeBoundingSphere();
  }, [blocks]);

  const mat = useMemo(() => {
    return getCachedToonMaterial(texture, fallbackColor);
  }, [texture, fallbackColor]);

  return (
    <instancedMesh 
      ref={meshRef} 
      geometry={SHARED_BOX_GEOMETRY} 
      material={mat} 
      args={[undefined, undefined, blocks.length]}
    />
  );
};

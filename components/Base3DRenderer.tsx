import React, { ReactNode, useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Refactored modules
import { STANDARD_3D_SCALES } from './three/constants/standard3DScales';
import { normalize3DObject } from './three/assets/normalize3DObject';
import { Base3DContext, Base3DContextValue } from './three/core/Base3DContext';
import { ThreeErrorBoundary } from './three/core/ThreeErrorBoundary';
import { clearMaterialCache } from './three/materials/toonMaterialCache';

// Re-exports to maintain API compatibility
import { CHIBI_SCALES, getChibiProportions, applyChibiTransform, ChibiCategory, ChibiProportions } from '../services/chibiScaling';
import { DEFAULT_COZY_GRADIENT_MAP, injectCozyCelShader } from '../services/toonShader';
export { CHIBI_SCALES, getChibiProportions, applyChibiTransform, DEFAULT_COZY_GRADIENT_MAP, injectCozyCelShader };
export type { ChibiCategory, ChibiProportions };

export { STANDARD_3D_SCALES } from './three/constants/standard3DScales';
export { normalize3DObject } from './three/assets/normalize3DObject';
export { Normalized3DAsset } from './three/assets/Normalized3DAsset';
export { BaseVoxelRenderer } from './three/voxel/BaseVoxelRenderer';
export type { BaseVoxelRendererProps } from './three/voxel/BaseVoxelRenderer';

import { gpuManager, GPUPerformanceProfile } from '../services/GPUPerformanceManager';

export interface Base3DRendererProps {
  camera?: {
    position?: [number, number, number];
    fov?: number;
    near?: number;
    far?: number;
  };
  orbitControlsProps?: {
    target?: [number, number, number];
    enablePan?: boolean;
    enableZoom?: boolean;
    maxDistance?: number;
    minDistance?: number;
    minAzimuthAngle?: number;
    maxAzimuthAngle?: number;
    maxPolarAngle?: number;
    minPolarAngle?: number;
  };
  lighting?: {
    isShadowRealm?: boolean;
    ambientIntensity?: number;
    directionalIntensity?: number;
    directionalPosition?: [number, number, number];
    skyLightColor?: string;
    groundLightColor?: string;
  };
  containerClassName?: string;
  onReset?: () => void;
  children?: ReactNode;
}

export const Base3DRenderer: React.FC<Base3DRendererProps> = ({
  camera = { position: [10, 20, 30], fov: 45, near: 0.1, far: 1000 },
  orbitControlsProps,
  lighting = {},
  containerClassName = 'w-full h-full relative bg-slate-950 overflow-hidden',
  onReset,
  children
}) => {
  const [perfProfile, setPerfProfile] = useState<GPUPerformanceProfile>(() => gpuManager.getProfile());

  useEffect(() => {
    return gpuManager.subscribe(() => {
      setPerfProfile(gpuManager.getProfile());
    });
  }, []);

  const isShadowRealm = lighting.isShadowRealm ?? false;
  const skyColor = lighting.skyLightColor || (isShadowRealm ? '#4c1d95' : '#ffffff');
  const groundColor = lighting.groundLightColor || (isShadowRealm ? '#000000' : '#1e293b');
  const ambientIntensity = lighting.ambientIntensity ?? (isShadowRealm ? 0.2 : 0.55);
  const directionalIntensity = lighting.directionalIntensity ?? (isShadowRealm ? 0.5 : 1.3);
  const directionalPos = lighting.directionalPosition || [10, 20, 5];

  const handleReset = () => {
    clearMaterialCache();
    if (onReset) onReset();
  };

  const contextValue = useMemo<Base3DContextValue>(() => ({
    scales: STANDARD_3D_SCALES,
    normalizeObject: normalize3DObject,
    perfProfile
  }), [perfProfile]);

  return (
    <ThreeErrorBoundary onReset={handleReset}>
      <div className={containerClassName}>
        <Canvas
          shadows={perfProfile.enableShadows}
          dpr={perfProfile.dpr}
          camera={{
            position: camera.position || [10, 20, 30],
            fov: camera.fov || 45,
            near: camera.near || 0.1,
            far: camera.far || 1000
          }}
          gl={{ powerPreference: 'high-performance', antialias: false, stencil: false, depth: true, preserveDrawingBuffer: false }}
          onCreated={({ gl, scene }) => {
            scene.background = new THREE.Color('#050505');
            scene.fog = new THREE.Fog('#050505', 10, 60);
            
            gl.domElement.addEventListener('webglcontextlost', (event) => {
              event.preventDefault();
              console.warn('WebGL context lost in 3D Scene. Handled gracefully by Base3DRenderer.');
            });
          }}
        >
          <Base3DContext.Provider value={contextValue}>
            {/* Base Lighting Setup: Single Directional Light with stylized high-contrast shadow settings for cube geometry */}
            <hemisphereLight color={skyColor} groundColor={groundColor} intensity={isShadowRealm ? 0.3 : 0.5} />
            <ambientLight intensity={ambientIntensity * 0.8} color={isShadowRealm ? '#3b0764' : '#fff7ed'} />
            <directionalLight
              position={directionalPos}
              intensity={directionalIntensity * 1.35}
              color={isShadowRealm ? '#e9d5ff' : '#fffbeb'}
              castShadow={perfProfile.enableShadows}
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-bias={-0.0002}
              shadow-normalBias={0.03}
              shadow-radius={0.05}
            />

            {/* Orbit Controls (if provided) */}
            {orbitControlsProps && (
              <OrbitControls
                makeDefault
                enablePan={orbitControlsProps.enablePan ?? true}
                enableZoom={orbitControlsProps.enableZoom ?? true}
                target={orbitControlsProps.target || [0, 0, 0]}
                maxDistance={orbitControlsProps.maxDistance ?? 100}
                minDistance={orbitControlsProps.minDistance ?? 5}
                minAzimuthAngle={orbitControlsProps.minAzimuthAngle}
                maxAzimuthAngle={orbitControlsProps.maxAzimuthAngle}
                maxPolarAngle={orbitControlsProps.maxPolarAngle ?? Math.PI / 2.1}
                minPolarAngle={orbitControlsProps.minPolarAngle}
              />
            )}

            {/* Custom Scene Content & Layers */}
            {children}
          </Base3DContext.Provider>
        </Canvas>
      </div>
    </ThreeErrorBoundary>
  );
};

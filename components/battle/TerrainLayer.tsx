
import React, { useRef, useMemo, useLayoutEffect, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BATTLE_MAP_SIZE } from '../../constants';
import { BattleCell as BattleCellType, VoxelBlock } from '../../types';
import { getSafeTexture, textureManager } from '../../services/textureLoader';
import { wesnothAtlas } from '../../services/WesnothAtlasManager';
import { assetMapper } from '../../services/AssetMappingSystem';
import { DEFAULT_COZY_GRADIENT_MAP, injectCozyCelShader } from '../../services/toonShader';

interface RenderBlock {
    x: number;
    y: number;
    z: number;
    height: number;
    color: string;
}

const _tempObj = new THREE.Object3D();
const _tempColor = new THREE.Color();

// Shared static geometries to avoid per-cluster VRAM and heap duplication
const SHARED_BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
const SHARED_FOLIAGE_GEO = new THREE.BoxGeometry(0.98, 0.98, 0.98);
const SHARED_HORIZON_GEO = new THREE.PlaneGeometry(600, 600);

const isWaterTexture = (url: string) => url.includes('blue_concrete') || url.includes('water');
const isLavaTexture = (url: string) => url.includes('lava');
const isFoliageTexture = (url: string) => 
    url.includes('leaves') || 
    url.includes('leaf') || 
    url.includes('mushroom_block') || 
    url.includes('cactus') || 
    url.includes('vine') || 
    url.includes('azalea');

const InstancedVoxelCluster = React.memo(({ data, textureUrl, isShadowRealm, isMoveMode }: { data: RenderBlock[], textureUrl: string, isShadowRealm?: boolean, isMoveMode?: boolean }) => {
    const [texVersion, setTexVersion] = useState(0);

    useEffect(() => {
        const unsubscribe = textureManager.subscribe(() => {
            setTexVersion(v => v + 1);
        });
        return unsubscribe;
    }, []);

    const mainTexture = useMemo(() => {
        return getSafeTexture(textureUrl, data[0]?.color || '#64748b');
    }, [textureUrl, data, texVersion]);

    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = data ? data.length : 0;
    const isWater = isWaterTexture(textureUrl);
    const isLava = isLavaTexture(textureUrl);
    const isFoliage = isFoliageTexture(textureUrl);

    // Subtle undulating wave effect for fluid voxels
    useFrame(({ clock }) => {
        if (!isWater && !isLava) return;
        if (!meshRef.current || count === 0) return;
        const time = clock.getElapsedTime();
        for (let i = 0; i < count; i++) {
            const block = data[i];
            const wave = Math.sin(time * 2.2 + block.x * 0.8 + block.z * 0.8) * 0.035;
            _tempObj.position.set(block.x, block.y + wave, block.z);
            _tempObj.scale.set(0.98, block.height, 0.98);
            _tempObj.updateMatrix();
            meshRef.current.setMatrixAt(i, _tempObj.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return;
        for (let i = 0; i < count; i++) {
            const block = data[i];
            _tempObj.position.set(block.x, block.y, block.z);
            _tempObj.scale.set(isWater || isLava ? 0.98 : 1, block.height, isWater || isLava ? 0.98 : 1);
            _tempObj.updateMatrix();
            meshRef.current.setMatrixAt(i, _tempObj.matrix);
            _tempColor.set(block.color || 'white');
            meshRef.current.setColorAt(i, _tempColor);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
        meshRef.current.computeBoundingSphere();
    }, [data, count, isWater, isLava]);

    if (count === 0 || !textureUrl) return null;

    if (isWater) {
        return (
            <instancedMesh 
                ref={meshRef} 
                geometry={SHARED_BOX_GEO}
                args={[undefined, undefined, count]} 
                castShadow={false} 
                receiveShadow={!isShadowRealm} 
            >
                <meshToonMaterial 
                    map={mainTexture} 
                    gradientMap={DEFAULT_COZY_GRADIENT_MAP}
                    color="white"
                    transparent={true}
                    opacity={0.85}
                    emissive={isShadowRealm ? '#1d4ed8' : '#1e3a8a'}
                    emissiveIntensity={isShadowRealm ? 0.4 : 0.18}
                    onUpdate={(mat) => injectCozyCelShader(mat, { 
                        isShadowRealm, 
                        rimColor: isShadowRealm ? '#60a5fa' : '#93c5fd', 
                        rimIntensity: 0.45 
                    })}
                />
            </instancedMesh>
        );
    }

    if (isLava) {
        return (
            <instancedMesh 
                ref={meshRef} 
                geometry={SHARED_BOX_GEO}
                args={[undefined, undefined, count]} 
                castShadow={true} 
                receiveShadow={false} 
            >
                <meshToonMaterial 
                    map={mainTexture} 
                    gradientMap={DEFAULT_COZY_GRADIENT_MAP}
                    color="#ff6b35"
                    emissive="#ea580c"
                    emissiveIntensity={0.85}
                    onUpdate={(mat) => injectCozyCelShader(mat, { 
                        isShadowRealm, 
                        rimColor: '#fef08a', 
                        rimIntensity: 0.55 
                    })}
                />
            </instancedMesh>
        );
    }

    if (isFoliage) {
        return (
            <instancedMesh 
                ref={meshRef} 
                geometry={SHARED_FOLIAGE_GEO}
                args={[undefined, undefined, count]} 
                castShadow={true} 
                receiveShadow={!isShadowRealm} 
            >
                <meshToonMaterial 
                    map={mainTexture} 
                    gradientMap={DEFAULT_COZY_GRADIENT_MAP}
                    color="white"
                    transparent={true}
                    opacity={isMoveMode ? 0.2 : 0.82}
                    alphaTest={isMoveMode ? 0 : 0.15}
                    emissive={isShadowRealm ? '#6b21a8' : '#052e16'}
                    emissiveIntensity={isShadowRealm ? 0.2 : 0.08}
                    onUpdate={(mat) => injectCozyCelShader(mat, { 
                        isShadowRealm, 
                        rimColor: isShadowRealm ? '#c084fc' : '#86efac', 
                        rimIntensity: 0.35 
                    })}
                />
            </instancedMesh>
        );
    }

    return (
        <instancedMesh 
            ref={meshRef} 
            geometry={SHARED_BOX_GEO}
            args={[undefined, undefined, count]} 
            castShadow={!isShadowRealm} 
            receiveShadow={!isShadowRealm} 
        >
            <meshToonMaterial 
                map={mainTexture} 
                gradientMap={DEFAULT_COZY_GRADIENT_MAP}
                color="white" 
                transparent={isMoveMode ? true : false}
                opacity={isMoveMode ? 0.25 : 1.0}
                alphaTest={isMoveMode ? 0 : 0.1}
                emissive={isShadowRealm ? '#7c3aed' : '#000000'} 
                emissiveIntensity={isShadowRealm ? 0.25 : 0} 
                onUpdate={(mat) => injectCozyCelShader(mat, { 
                    isShadowRealm, 
                    rimIntensity: 0.32,
                    rimPower: 3.5
                })}
            />
        </instancedMesh>
    );
});

export const TerrainLayer = React.memo(({ mapData, voxelStructures = [], isShadowRealm, isMoveMode }: { mapData: BattleCellType[], voxelStructures?: VoxelBlock[], isShadowRealm?: boolean, isMoveMode?: boolean }) => {
    // Determine dominant ground texture to extend seamless continuous terrain
    const dominantTextureUrl = useMemo(() => {
        if (!mapData || mapData.length === 0) return '';
        const counts: Record<string, number> = {};
        for (const c of mapData) {
            const url = c.textureUrl || '';
            if (url && !isWaterTexture(url) && !isLavaTexture(url)) {
                counts[url] = (counts[url] || 0) + 1;
            }
        }
        let max = 0;
        let best = mapData[0]?.textureUrl || '';
        for (const [url, count] of Object.entries(counts)) {
            if (count > max) {
                max = count;
                best = url;
            }
        }
        return best;
    }, [mapData]);

    const dominantGroundColor = useMemo(() => {
        if (dominantTextureUrl.includes('sand')) return '#c2b280';
        if (dominantTextureUrl.includes('snow')) return '#e2e8f0';
        if (dominantTextureUrl.includes('stone') || dominantTextureUrl.includes('cobble')) return '#475569';
        if (dominantTextureUrl.includes('mycelium')) return '#584d5f';
        if (dominantTextureUrl.includes('podzol')) return '#453229';
        return '#234a21'; // Natural forest / grass tone
    }, [dominantTextureUrl]);

    const { ground, structures } = useMemo(() => {
        const gGround: Record<string, RenderBlock[]> = {};
        const gStruct: Record<string, RenderBlock[]> = {};
        
        // 1. Add Ground Grid Cells (Top Surface Voxel)
        if (mapData) {
            mapData.forEach((b: BattleCellType) => {
                // Strictly use Minecraft block textures for Tactical 3D engine, decoupled from Wesnoth
                let k = assetMapper.getTacticalOrHuntAsset(b.terrain || b.textureUrl || 'GRASS');

                if (!gGround[k]) gGround[k] = [];
                const isFluid = isWaterTexture(k) || isLavaTexture(k);
                const height = isFluid ? 0.85 : 1;
                const y = (b.offsetY || 0) + (isFluid ? 0.425 : b.height - 0.5);
                gGround[k].push({
                    x: b.x,
                    y,
                    z: b.z,
                    height,
                    color: b.color || 'white'
                });
            });
        }

        // 2. Add 3D Voxel Strata, Sub-crust & Structures (Trees, Ruins, Boulders, Props)
        if (voxelStructures) {
            voxelStructures.forEach((v: VoxelBlock) => {
                const k = v.textureUrl && v.textureUrl.length > 3 ? v.textureUrl : (v.color || '#64748b');
                if (!gStruct[k]) gStruct[k] = [];
                gStruct[k].push({
                    x: v.x,
                    y: v.y + 0.5,
                    z: v.z,
                    height: 1,
                    color: v.color || 'white'
                });
            });
        }

        // 3. Add Continuous Surrounding Terrain Skirt (Prevents Floating Island aesthetic)
        if (dominantTextureUrl) {
            if (!gGround[dominantTextureUrl]) gGround[dominantTextureUrl] = [];
            const minExt = -8;
            const maxExt = BATTLE_MAP_SIZE + 7;
            for (let x = minExt; x <= maxExt; x++) {
                for (let z = minExt; z <= maxExt; z++) {
                    // Only generate skirt blocks outside the 16x16 playable grid
                    if (x < 0 || x >= BATTLE_MAP_SIZE || z < 0 || z >= BATTLE_MAP_SIZE) {
                        const edgeNoise = Math.sin(x * 0.4) * Math.cos(z * 0.4);
                        const y = 0.5 + (edgeNoise > 0.65 ? 1.0 : 0);
                        gGround[dominantTextureUrl].push({
                            x,
                            y,
                            z,
                            height: 1,
                            color: 'white'
                        });
                    }
                }
            }
        }

        return { ground: gGround, structures: gStruct };
    }, [mapData, voxelStructures, dominantTextureUrl]);

    if (!mapData || mapData.length === 0) return null;
    const center = BATTLE_MAP_SIZE / 2;

    return (
        <group>
            {Object.entries(ground).map(([url, blocks]) => (
                <InstancedVoxelCluster key={`g_${url}`} textureUrl={url} data={blocks} isShadowRealm={isShadowRealm} />
            ))}
            {Object.entries(structures).map(([url, blocks]) => (
                <InstancedVoxelCluster key={`s_${url}`} textureUrl={url} data={blocks} isShadowRealm={isShadowRealm} isMoveMode={isMoveMode} />
            ))}
            {/* Seamless extended terrain horizon plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center, 0.01, center]} receiveShadow={!isShadowRealm}>
                <planeGeometry args={[600, 600]} />
                <meshToonMaterial 
                    gradientMap={DEFAULT_COZY_GRADIENT_MAP}
                    color={isShadowRealm ? "#1e1b4b" : dominantGroundColor} 
                />
            </mesh>
        </group>
    );
});

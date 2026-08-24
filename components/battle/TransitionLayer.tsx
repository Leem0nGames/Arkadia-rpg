import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BattleCell } from '../../types';
import { wesnothAtlas } from '../../services/WesnothAtlasManager';
import { getSafeTexture } from '../../services/textureLoader';
import * as THREE from 'three';

interface StaticTransitionItem {
    id: string;
    x: number;
    y: number;
    z: number;
    textureKey: string;
}

interface AnimatedWaterItem {
    id: string;
    x: number;
    y: number;
    z: number;
    isCoastal: boolean;
    direction?: string;
    waterType: 'tropical' | 'ocean';
}

/**
 * High-performance animated water mesh that cycles Wesnoth animated water frames
 * directly in the Three.js render loop without causing React re-renders.
 */
const AnimatedWaterTile = React.memo(({ item }: { item: AnimatedWaterItem }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const lastFrameRef = useRef<number>(-1);

    useFrame((state) => {
        if (!meshRef.current) return;
        // 7 FPS animation cycle (approx 142ms per frame)
        const frameIndex = Math.floor(state.clock.getElapsedTime() * 7) % 15;
        if (frameIndex !== lastFrameRef.current) {
            lastFrameRef.current = frameIndex;
            let key = '';
            if (item.isCoastal && item.direction) {
                key = wesnothAtlas.getAnimatedCoastBlendKey(item.direction, frameIndex);
            } else {
                key = wesnothAtlas.getAnimatedWaterKey(frameIndex, item.waterType);
            }

            const tex = wesnothAtlas.getTexture(key);
            if (tex && meshRef.current.material) {
                const mat = meshRef.current.material as THREE.MeshBasicMaterial;
                mat.map = tex;
                mat.needsUpdate = true;
            }
        }
    });

    const initialKey = item.isCoastal && item.direction
        ? wesnothAtlas.getAnimatedCoastBlendKey(item.direction, 1)
        : wesnothAtlas.getAnimatedWaterKey(1, item.waterType);
    const initialTexture = wesnothAtlas.getTexture(initialKey) || getSafeTexture(initialKey, '#0284c7');

    return (
        <mesh ref={meshRef} position={[item.x, item.y, item.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.02, 1.02]} />
            <meshBasicMaterial 
                map={initialTexture}
                transparent={true} 
                opacity={item.isCoastal ? 0.9 : 0.75}
                depthWrite={false}
                polygonOffset={true}
                polygonOffsetFactor={-1.5}
            />
        </mesh>
    );
});

export const TransitionLayer = React.memo(({ mapData }: { mapData: BattleCell[] }) => {
    const [atlasVersion, setAtlasVersion] = useState(0);

    useEffect(() => {
        const unsubscribe = wesnothAtlas.subscribe(() => {
            setAtlasVersion(v => v + 1);
        });
        return unsubscribe;
    }, []);

    // Fast lookup map for (x, z) coordinates
    const cellMap = useMemo(() => {
        const map = new Map<string, BattleCell>();
        if (mapData) {
            for (const cell of mapData) {
                map.set(`${cell.x},${cell.z}`, cell);
            }
        }
        return map;
    }, [mapData]);

    const { staticTransitions, animatedWater } = useMemo(() => {
        if (!mapData || mapData.length === 0) return { staticTransitions: [], animatedWater: [] };
        
        const statics: StaticTransitionItem[] = [];
        const anims: AnimatedWaterItem[] = [];

        const getTerrainName = (c?: BattleCell): string => {
            if (!c) return '';
            const tUrl = (c.textureUrl || '').toLowerCase();
            if (tUrl.includes('water')) return 'water';
            if (tUrl.includes('sand') || tUrl.includes('desert')) return 'sand';
            if (tUrl.includes('snow') || tUrl.includes('ice')) return 'frozen';
            if (tUrl.includes('forest') || tUrl.includes('leaves')) return 'forest';
            if (tUrl.includes('mountain') || tUrl.includes('stone') || tUrl.includes('cobble')) return 'mountains';
            if (tUrl.includes('swamp')) return 'swamp';
            if (c.terrain) return String(c.terrain).toLowerCase();
            return 'grass';
        };

        for (const cell of mapData) {
            const centerTerrain = getTerrainName(cell);
            const isCenterWater = centerTerrain === 'water';
            const yPos = (cell.offsetY || 0) + (cell.height || 1) - 0.49;

            // 1. If center is water, add surface wave animation
            if (isCenterWater) {
                anims.push({
                    id: `water_surf_${cell.x}_${cell.z}`,
                    x: cell.x,
                    y: yPos + 0.005,
                    z: cell.z,
                    isCoastal: false,
                    waterType: 'tropical'
                });
            }

            // 2. Check 4 cardinal & diagonal directions for transitions
            const northCell = cellMap.get(`${cell.x},${cell.z - 1}`);
            const southCell = cellMap.get(`${cell.x},${cell.z + 1}`);
            const eastCell = cellMap.get(`${cell.x + 1},${cell.z}`);
            const westCell = cellMap.get(`${cell.x - 1},${cell.z}`);

            const neighborDirections = {
                n: getTerrainName(northCell),
                s: getTerrainName(southCell),
                ne: getTerrainName(eastCell),
                sw: getTerrainName(westCell)
            };

            const dirs: ('n' | 's' | 'ne' | 'sw')[] = ['n', 's', 'ne', 'sw'];
            for (const dir of dirs) {
                const neighbor = neighborDirections[dir];
                if (!neighbor || neighbor === centerTerrain) continue;

                // Coastal animated water overlay
                if (neighbor === 'water' && !isCenterWater) {
                    anims.push({
                        id: `coast_${cell.x}_${cell.z}_${dir}`,
                        x: cell.x,
                        y: yPos + 0.003,
                        z: cell.z,
                        isCoastal: true,
                        direction: dir,
                        waterType: 'tropical'
                    });
                }
            }

            // Non-water static transitions (grass blends, mountain foot blends, desert borders)
            const overlayFrames = wesnothAtlas.getDirectionalTransitionFrames(centerTerrain, neighborDirections);
            for (let i = 0; i < overlayFrames.length; i++) {
                const overlay = overlayFrames[i];
                if (!overlay.frameKey.includes('water')) {
                    statics.push({
                        id: `${cell.x}_${cell.z}_${overlay.direction}_${i}`,
                        x: cell.x,
                        y: yPos + (i * 0.002),
                        z: cell.z,
                        textureKey: overlay.frameKey
                    });
                }
            }
        }

        return { staticTransitions: statics, animatedWater: anims };
    }, [mapData, cellMap, atlasVersion]);

    if (staticTransitions.length === 0 && animatedWater.length === 0) return null;

    return (
        <group>
            {/* Static Terrains Blend Overlays */}
            {staticTransitions.map((t) => {
                const texture = wesnothAtlas.getTexture(t.textureKey) || getSafeTexture(t.textureKey, 'transparent');
                return (
                    <mesh key={t.id} position={[t.x, t.y, t.z]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[1, 1]} />
                        <meshBasicMaterial 
                            map={texture}
                            transparent={true} 
                            opacity={0.85}
                            alphaTest={0.05}
                            depthWrite={false}
                            polygonOffset={true}
                            polygonOffsetFactor={-1}
                        />
                    </mesh>
                );
            })}

            {/* Living Animated Water & Coastlines */}
            {animatedWater.map((item) => (
                <AnimatedWaterTile key={item.id} item={item} />
            ))}
        </group>
    );
});

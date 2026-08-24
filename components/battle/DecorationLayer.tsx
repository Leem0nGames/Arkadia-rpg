import React, { useRef, useMemo, useLayoutEffect, useState, useEffect } from 'react';
import { ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { BATTLE_MAP_SIZE, ASSETS } from '../../constants';
import { BattleCell, TerrainType } from '../../types';
import { getSafeTexture } from '../../services/textureLoader';
import { wesnothAtlas } from '../../services/WesnothAtlasManager';
import { STANDARD_3D_SCALES } from '../Base3DRenderer';
import { DEFAULT_COZY_GRADIENT_MAP } from '../../services/toonShader';

// Pseudo-random generator for reproducible deterministic placements
function pseudoRandom(seed: number) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

const dummy = new THREE.Object3D();

// Render a single type of decoration in batch
const InstancedDecoration = React.memo(({ type, positions, scaleRange = [0.8, 1.2], isMoveMode }: { type: string, positions: THREE.Vector3[], scaleRange?: [number, number], isMoveMode?: boolean }) => {
    const texture = useMemo(() => {
        const atlasTex = wesnothAtlas.getTexture(type);
        if (atlasTex) return atlasTex;
        return getSafeTexture(type, '#166534');
    }, [type]);
    const meshRef = useRef<THREE.InstancedMesh>(null);

    useMemo(() => {
        if (texture) {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.needsUpdate = true;
        }
    }, [texture]);

    useLayoutEffect(() => {
        if (!meshRef.current || positions.length === 0) return;

        positions.forEach((pos, i) => {
            dummy.position.copy(pos);
            
            // Random variation based on index
            const rng = pseudoRandom(i * 997 + 13);
            const scale = scaleRange[0] + rng() * (scaleRange[1] - scaleRange[0]);
            dummy.scale.set(scale, scale, scale);
            
            // Very slight tilt and rotation for natural look
            dummy.rotation.y = rng() * Math.PI * 2;
            dummy.rotation.x = (rng() - 0.5) * 0.1;
            dummy.rotation.z = (rng() - 0.5) * 0.1;
            
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [positions, scaleRange]);

    if (positions.length === 0) return null;

    const propHeight = STANDARD_3D_SCALES.PROP_DECORATION_HEIGHT;
    const propWidth = propHeight;

    return (
        <group>
            {/* Cross-billboard 1 */}
            <instancedMesh ref={meshRef} 
                            args={[undefined, undefined, positions.length]} 
                            castShadow={!isMoveMode}
                            receiveShadow={!isMoveMode}>
                <planeGeometry args={[propWidth, propHeight]} />
                <meshToonMaterial 
                    map={texture} 
                    gradientMap={DEFAULT_COZY_GRADIENT_MAP}
                    transparent 
                    opacity={isMoveMode ? 0.15 : 1.0}
                    alphaTest={isMoveMode ? 0 : 0.15} 
                    side={THREE.DoubleSide} 
                />
            </instancedMesh>
            {/* Cross-billboard 2 (perpendicular for 3D fullness) */}
            <instancedMesh geometry={meshRef.current?.geometry} 
                            args={[undefined, undefined, positions.length]} 
                            instanceMatrix={meshRef.current?.instanceMatrix} 
                            rotation={[0, Math.PI/2, 0]}>
                <meshToonMaterial 
                    map={texture} 
                    gradientMap={DEFAULT_COZY_GRADIENT_MAP}
                    transparent 
                    opacity={isMoveMode ? 0.15 : 1.0}
                    alphaTest={isMoveMode ? 0 : 0.15} 
                    side={THREE.DoubleSide} 
                />
            </instancedMesh>
        </group>
    );
});

interface VillageBuildingItem {
    id: string;
    x: number;
    y: number;
    z: number;
    textureKey: string;
}

const VillageBuildingsLayer = React.memo(({ buildings, isMoveMode }: { buildings: VillageBuildingItem[], isMoveMode?: boolean }) => {
    if (!buildings || buildings.length === 0) return null;

    return (
        <group>
            {buildings.map((b) => {
                const texture = wesnothAtlas.getTexture(b.textureKey) || getSafeTexture(b.textureKey, '#854d0e');
                return (
                    <group key={b.id} position={[b.x, b.y, b.z]}>
                        {/* Upright Facing Billboard 1 */}
                        <mesh position={[0, 0.45, 0]}>
                            <planeGeometry args={[1.35, 1.35]} />
                            <meshToonMaterial 
                                map={texture}
                                gradientMap={DEFAULT_COZY_GRADIENT_MAP}
                                transparent
                                opacity={isMoveMode ? 0.2 : 1.0}
                                alphaTest={0.1}
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                        {/* Perpendicular Billboard 2 */}
                        <mesh position={[0, 0.45, 0]} rotation={[0, Math.PI / 2, 0]}>
                            <planeGeometry args={[1.35, 1.35]} />
                            <meshToonMaterial 
                                map={texture}
                                gradientMap={DEFAULT_COZY_GRADIENT_MAP}
                                transparent
                                opacity={isMoveMode ? 0.2 : 1.0}
                                alphaTest={0.1}
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );
});

export const DecorationLayer = React.memo(({ mapData, isMoveMode }: { mapData: BattleCell[], isMoveMode?: boolean }) => {
    const [atlasVer, setAtlasVer] = useState(0);

    useEffect(() => {
        return wesnothAtlas.subscribe(() => setAtlasVer(v => v + 1));
    }, []);

    const { decorationGroups, villageBuildings } = useMemo(() => {
        const groups: Record<string, THREE.Vector3[]> = {
            GRASS: [],
            FLOWER: [],
            ROCK: [],
            MUSHROOM: [],
            REEDS: [],
            DESERT_PLANT: [],
            TREE_SMALL: []
        };
        const villages: VillageBuildingItem[] = [];

        const propHeight = STANDARD_3D_SCALES.PROP_DECORATION_HEIGHT;
        const floorOffset = STANDARD_3D_SCALES.FLOOR_Y_OFFSET;

        mapData.forEach(cell => {
            // Simple hash for determinism
            const rng = pseudoRandom(cell.x * 73856093 ^ cell.z * 19349663);
            const y = cell.offsetY + cell.height + floorOffset + (propHeight / 2);
            const tUrl = (cell.textureUrl || '').toLowerCase();
            const terrainStr = String(cell.terrain || '').toLowerCase();

            // Check if this cell is a Village / Castle / Outpost structure
            const isVillageTile = terrainStr === 'village' || tUrl.includes('village') || terrainStr === 'castle' || tUrl.includes('castle') || terrainStr === 'ruins' || tUrl.includes('ruin');

            if (isVillageTile && !cell.isObstacle) {
                // Place authentic Wesnoth village / dwarven / elven / human building
                const frameKey = wesnothAtlas.getVillageBuildingForTerrain(terrainStr || tUrl, cell.x, cell.z);
                villages.push({
                    id: `village_${cell.x}_${cell.z}`,
                    x: cell.x,
                    y: cell.offsetY + cell.height + floorOffset,
                    z: cell.z,
                    textureKey: frameKey
                });
                return;
            }

            // Don't decorate lava directly or blocked obstacle voxels
            if (tUrl.includes('lava') || cell.isObstacle) return;

            // Water: reeds on edges or shallow spots
            if (tUrl.includes('water')) {
                if (rng() > 0.85) {
                    groups.REEDS.push(new THREE.Vector3(cell.x, y, cell.z));
                }
                return;
            }

            // Desert: desert plants / shrubs
            if (tUrl.includes('sand') || tUrl.includes('desert')) {
                if (rng() > 0.75) {
                    groups.DESERT_PLANT.push(new THREE.Vector3(cell.x, y, cell.z));
                }
                return;
            }

            // Swamp: reeds or mushrooms
            if (tUrl.includes('swamp') || tUrl.includes('mycelium') || tUrl.includes('podzol')) {
                if (rng() > 0.65) {
                    const type = rng() > 0.5 ? 'MUSHROOM' : 'REEDS';
                    groups[type].push(new THREE.Vector3(cell.x, y, cell.z));
                }
                return;
            }

            // Forest: small trees & foliage
            if (tUrl.includes('forest') || tUrl.includes('tree') || tUrl.includes('leaves')) {
                if (rng() > 0.6) {
                    groups.TREE_SMALL.push(new THREE.Vector3(cell.x, y, cell.z));
                }
                return;
            }

            // Grass on GRASS, PLAINS
            if (tUrl.includes('grass')) {
                // 40% chance of detail
                if (rng() > 0.6) {
                    const type = rng() > 0.85 ? 'FLOWER' : 'GRASS';
                    const ox = (rng() - 0.5) * 0.5;
                    const oz = (rng() - 0.5) * 0.5;
                    groups[type].push(new THREE.Vector3(cell.x + ox, y, cell.z + oz));
                }
            }
            
            // Rocks on MOUNTAIN, CAVE, STONE
            if (tUrl.includes('stone') || tUrl.includes('cobble') || tUrl.includes('mountain')) {
                 if (rng() > 0.85) {
                     groups.ROCK.push(new THREE.Vector3(cell.x, y, cell.z));
                 }
            }
        });

        return { decorationGroups: groups, villageBuildings: villages };
    }, [mapData, atlasVer]);

    return (
        <group>
            {/* Themed Village and Castle Buildings */}
            <VillageBuildingsLayer buildings={villageBuildings} isMoveMode={isMoveMode} />

            {/* Instanced Nature Props for 3D Voxel Scene */}
            {decorationGroups.GRASS.length > 0 && (
                <InstancedDecoration type={ASSETS.DECORATIONS.GRASS_1} positions={decorationGroups.GRASS} isMoveMode={isMoveMode} />
            )}
            {decorationGroups.FLOWER.length > 0 && (
                <InstancedDecoration type={ASSETS.DECORATIONS.FLOWER_1} positions={decorationGroups.FLOWER} isMoveMode={isMoveMode} />
            )}
            {decorationGroups.ROCK.length > 0 && (
                <InstancedDecoration type={ASSETS.DECORATIONS.ROCK_1} positions={decorationGroups.ROCK} isMoveMode={isMoveMode} />
            )}
            {decorationGroups.MUSHROOM.length > 0 && (
                <InstancedDecoration type={ASSETS.DECORATIONS.MUSHROOM} positions={decorationGroups.MUSHROOM} isMoveMode={isMoveMode} />
            )}
            {decorationGroups.REEDS.length > 0 && (
                <InstancedDecoration type={ASSETS.DECORATIONS.GRASS_1} positions={decorationGroups.REEDS} isMoveMode={isMoveMode} />
            )}
            {decorationGroups.DESERT_PLANT.length > 0 && (
                <InstancedDecoration type={ASSETS.DECORATIONS.GRASS_1} positions={decorationGroups.DESERT_PLANT} isMoveMode={isMoveMode} />
            )}
            {decorationGroups.TREE_SMALL.length > 0 && (
                <InstancedDecoration type={ASSETS.DECORATIONS.GRASS_1} positions={decorationGroups.TREE_SMALL} scaleRange={[1.2, 1.6]} isMoveMode={isMoveMode} />
            )}
        </group>
    );
});

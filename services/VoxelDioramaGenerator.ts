import { BattleCell, TerrainType, VoxelBlock } from '../types';
import { ASSETS } from '../constants';
import * as THREE from 'three';

// Deterministic PRNG for procedural generation
export const createPRNG = (seed: number) => {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
};

export interface VoxelDioramaResult {
    updatedGrid: BattleCell[];
    voxelBlocks: VoxelBlock[];
}

/**
 * Procedurally generates 3D voxel micro-structures (trees, boulders, ruins, giant mushrooms, cacti, props)
 * for battle map dioramas, maintaining full synchronization with grid movement, obstacles, and line-of-sight.
 */
export const generateVoxelDioramaFeatures = (
    grid: BattleCell[],
    terrainType: TerrainType,
    mapSize: number,
    seed: number = 42
): VoxelDioramaResult => {
    const rng = createPRNG(seed + 1337);
    const voxelBlocks: VoxelBlock[] = [];
    const cellMap = new Map<string, BattleCell>();

    grid.forEach(c => cellMap.set(`${c.x},${c.z}`, { ...c }));

    const isFluid = (tex: string) => tex.includes('blue_concrete') || tex.includes('lava') || tex.includes('water');
    const isSpawnZone = (z: number) => z < 2 || z > mapSize - 3;
    const isValidForFeature = (x: number, z: number, margin = 1) => {
        if (x < margin || x >= mapSize - margin || z < margin || z >= mapSize - margin) return false;
        if (isSpawnZone(z)) return false;
        const cell = cellMap.get(`${x},${z}`);
        if (!cell) return false;
        if (isFluid(cell.textureUrl)) return false;
        if (cell.isObstacle) return false;
        return true;
    };

    const occupiedCells = new Set<string>();

    const markObstacle = (x: number, z: number) => {
        const key = `${x},${z}`;
        const cell = cellMap.get(key);
        if (cell) {
            cell.isObstacle = true;
        }
        occupiedCells.add(key);
    };

    const addBlock = (x: number, y: number, z: number, textureUrl: string, color = 'white', isObstacle = false) => {
        voxelBlocks.push({
            x,
            y,
            z,
            textureUrl,
            color,
            isObstacle
        });
    };

    const T = ASSETS.VOXEL_STRUCTURE_TEXTURES;

    // --- 1. GEOLOGICAL STRATA GENERATION (Sub-surface fill for height > 1) ---
    const getSubsurfaceTexture = (tType: TerrainType, yLvl: number) => {
        const r = rng();
        switch (tType) {
            case TerrainType.DESERT:
                return r > 0.5 ? T.SANDSTONE : T.CHISELED_SANDSTONE;
            case TerrainType.RUINS:
            case TerrainType.CASTLE:
                return r > 0.6 ? T.MOSSY_COBBLESTONE : (r > 0.3 ? T.CRACKED_STONE_BRICKS : T.COBBLESTONE);
            case TerrainType.MOUNTAIN:
            case TerrainType.CAVE_FLOOR:
                return r > 0.5 ? T.STONE : T.COBBLESTONE;
            case TerrainType.TAIGA:
                return r > 0.3 ? T.COARSE_DIRT : T.DIRT;
            case TerrainType.TUNDRA:
                return yLvl >= 1 ? T.COARSE_DIRT : T.STONE;
            case TerrainType.LAVA:
            case TerrainType.CHASM:
                return T.DEEPSLATE;
            case TerrainType.VILLAGE:
            case TerrainType.COBBLESTONE:
            case TerrainType.DIRT_ROAD:
                return r > 0.5 ? T.COARSE_DIRT : T.DIRT;
            default:
                return r > 0.35 ? T.DIRT : T.COARSE_DIRT;
        }
    };

    // Fill intermediate column voxels from y = 0 up to y = height - 2
    grid.forEach(cell => {
        const totalHeight = cell.height;
        if (totalHeight > 1) {
            for (let dy = 0; dy <= totalHeight - 2; dy++) {
                const subTex = getSubsurfaceTexture(terrainType, dy);
                addBlock(cell.x, dy, cell.z, subTex, '#ffffff', cell.isObstacle);
            }
        }
    });

    // --- 2. FLOATING DIORAMA FOUNDATION & BEDROCK BASE (y < 0) ---
    const center = (mapSize - 1) / 2;

    for (let x = 0; x < mapSize; x++) {
        for (let z = 0; z < mapSize; z++) {
            const distFromCenter = Math.max(Math.abs(x - center), Math.abs(z - center));
            const isEdge = x === 0 || x === mapSize - 1 || z === 0 || z === mapSize - 1;

            // Layer y = -1 (Sub-crust stone layer)
            let l1Tex = T.STONE;
            if (terrainType === TerrainType.DESERT) l1Tex = T.SANDSTONE;
            else if (terrainType === TerrainType.RUINS || terrainType === TerrainType.CASTLE) l1Tex = T.COBBLESTONE;
            else if (terrainType === TerrainType.LAVA || terrainType === TerrainType.CHASM) l1Tex = T.DEEPSLATE;
            else if (rng() > 0.6) l1Tex = T.COBBLESTONE;
            addBlock(x, -1, z, l1Tex, '#eaeaea');

            // Layer y = -2 (Deepslate transition layer with organic eroded edges)
            if (!isEdge || rng() > 0.25) {
                const l2Tex = rng() > 0.4 ? T.DEEPSLATE : T.STONE;
                addBlock(x, -2, z, l2Tex, '#dedede');
            }

            // Layer y = -3 (Deep crust taper)
            if (distFromCenter <= (mapSize / 2 - 1.0) + (rng() * 0.8 - 0.4)) {
                const l3Tex = rng() > 0.3 ? T.DEEPSLATE : T.BEDROCK;
                addBlock(x, -3, z, l3Tex, '#d4d4d4');
            }

            // Layer y = -4 (Bedrock core taper)
            if (distFromCenter <= (mapSize / 2 - 2.5) + (rng() * 0.8 - 0.4)) {
                const l4Tex = rng() > 0.3 ? T.BEDROCK : T.DEEPSLATE;
                addBlock(x, -4, z, l4Tex, '#c8c8c8');
            }

            // Layer y = -5 (Keel / stalactite root point)
            if (distFromCenter <= (mapSize / 2 - 4.0) + (rng() * 0.6 - 0.3)) {
                addBlock(x, -5, z, T.BEDROCK, '#bcbcbc');
            }
        }
    }

    // --- BIOME SPECIFIC GENERATORS ---

    // Procedural multi-block Chest assembly
    const buildDioramaChest = (rootX: number, rootZ: number, groundY: number) => {
        markObstacle(rootX, rootZ);
        // Base structure
        addBlock(rootX, groundY, rootZ, T.BARREL, '#78350f', true);
        // Lid
        addBlock(rootX, groundY + 1, rootZ, T.OAK_LOG, '#a16207', true);
        // Golden lock clasp
        addBlock(rootX, groundY + 1, rootZ - 1, T.CHISELED_SANDSTONE, '#f59e0b', false);
    };

    // Procedural multi-block Pillar assembly
    const buildDioramaPillar = (rootX: number, rootZ: number, groundY: number, height = 3) => {
        markObstacle(rootX, rootZ);
        // Base plinth
        addBlock(rootX, groundY, rootZ, T.CHISELED_SANDSTONE, '#334155', true);
        // Columns shaft
        for (let dy = 1; dy < height - 1; dy++) {
            addBlock(rootX, groundY + dy, rootZ, T.SANDSTONE, '#475569', true);
        }
        // Capital topping
        addBlock(rootX, groundY + height - 1, rootZ, T.CHISELED_SANDSTONE, '#64748b', true);
        // Floating lantern/torch
        addBlock(rootX, groundY + height, rootZ, T.LANTERN, '#f59e0b', false);
    };

    // 1. Oak & Birch Trees
    const buildOakTree = (rootX: number, rootZ: number, groundY: number, isBirch = false) => {
        const trunkTex = isBirch ? T.BIRCH_LOG : T.OAK_LOG;
        const leafTex = isBirch ? T.BIRCH_LEAVES : (rng() > 0.3 ? T.OAK_LEAVES : T.AZALEA_LEAVES);
        const trunkHeight = isBirch ? 4 : (rng() > 0.5 ? 3 : 4);

        markObstacle(rootX, rootZ);

        // Trunk logs
        for (let dy = 0; dy < trunkHeight; dy++) {
            addBlock(rootX, groundY + dy, rootZ, trunkTex, 'white', true);
        }

        // Canopy Layer 1 (Wide with clipped corners)
        const canopyBaseY = groundY + trunkHeight - 1;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                if (dx === 0 && dz === 0) continue; // Trunk is in center
                if (Math.abs(dx) === 1 && Math.abs(dz) === 1 && rng() > 0.6) continue; // Organic corner clipping
                addBlock(rootX + dx, canopyBaseY, rootZ + dz, leafTex, '#ffffff', false);
            }
        }

        // Canopy Layer 2
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                if (dx === 0 && dz === 0) {
                    addBlock(rootX, canopyBaseY + 1, rootZ, leafTex, '#ffffff', false);
                    continue;
                }
                if (Math.abs(dx) === 1 && Math.abs(dz) === 1 && rng() > 0.4) continue;
                addBlock(rootX + dx, canopyBaseY + 1, rootZ + dz, leafTex, '#ffffff', false);
            }
        }

        // Canopy Crown (Plus shape)
        const crownOffsets = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
        crownOffsets.forEach(([dx, dz]) => {
            if (dx === 0 && dz === 0 || rng() > 0.2) {
                addBlock(rootX + dx, canopyBaseY + 2, rootZ + dz, leafTex, '#ffffff', false);
            }
        });
    };

    // 2. Spruce / Pine Conical Trees (Taiga / Tundra / Mountains)
    const buildSpruceTree = (rootX: number, rootZ: number, groundY: number, hasSnow = false) => {
        const trunkTex = T.SPRUCE_LOG;
        const leafTex = T.SPRUCE_LEAVES;
        const trunkHeight = 5 + Math.floor(rng() * 2);

        markObstacle(rootX, rootZ);

        for (let dy = 0; dy < trunkHeight; dy++) {
            addBlock(rootX, groundY + dy, rootZ, trunkTex, 'white', true);
        }

        // Tier 1 - Wide cross at y=2
        const wideOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0], [0, -2], [0, 2]];
        wideOffsets.forEach(([dx, dz]) => {
            addBlock(rootX + dx, groundY + 2, rootZ + dz, leafTex, '#ffffff', false);
        });

        // Tier 2 - 3x3 ring at y=3
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                if (dx === 0 && dz === 0) continue;
                addBlock(rootX + dx, groundY + 3, rootZ + dz, leafTex, '#ffffff', false);
            }
        }

        // Tier 3 - Cross at y=4
        const midOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        midOffsets.forEach(([dx, dz]) => {
            addBlock(rootX + dx, groundY + 4, rootZ + dz, leafTex, '#ffffff', false);
        });

        // Tier 4 - 3x3 tight at y=5
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                if (Math.abs(dx) === 1 && Math.abs(dz) === 1) continue;
                addBlock(rootX + dx, groundY + 5, rootZ + dz, leafTex, '#ffffff', false);
            }
        }

        // Top spire
        addBlock(rootX, groundY + trunkHeight, rootZ, leafTex, '#ffffff', false);
        if (hasSnow) {
            addBlock(rootX, groundY + trunkHeight + 1, rootZ, T.SNOW, '#ffffff', false);
        }
    };

    // 3. Giant Jungle Trees
    const buildJungleTree = (rootX: number, rootZ: number, groundY: number) => {
        const trunkTex = T.JUNGLE_LOG;
        const leafTex = T.JUNGLE_LEAVES;
        const trunkHeight = 5;

        markObstacle(rootX, rootZ);

        for (let dy = 0; dy < trunkHeight; dy++) {
            addBlock(rootX, groundY + dy, rootZ, trunkTex, 'white', true);
        }

        // Wide umbrella canopy at y=4 and y=5
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && rng() > 0.5) continue;
                addBlock(rootX + dx, groundY + trunkHeight - 1, rootZ + dz, leafTex, '#ffffff', false);
            }
        }
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                addBlock(rootX + dx, groundY + trunkHeight, rootZ + dz, leafTex, '#ffffff', false);
            }
        }
    };

    // 4. Saguaro Cacti & Desert Pillars
    const buildCactus = (rootX: number, rootZ: number, groundY: number) => {
        markObstacle(rootX, rootZ);
        const height = 3 + Math.floor(rng() * 2);
        for (let dy = 0; dy < height; dy++) {
            addBlock(rootX, groundY + dy, rootZ, T.CACTUS, '#ffffff', true);
        }

        // Arm 1 (Left or Right)
        const armDir1 = rng() > 0.5 ? 1 : -1;
        addBlock(rootX + armDir1, groundY + 1, rootZ, T.CACTUS, '#ffffff', false);
        addBlock(rootX + armDir1, groundY + 2, rootZ, T.CACTUS, '#ffffff', false);

        // Arm 2 (Front or Back)
        if (height >= 4 && rng() > 0.3) {
            const armDir2 = rng() > 0.5 ? 1 : -1;
            addBlock(rootX, groundY + 2, rootZ + armDir2, T.CACTUS, '#ffffff', false);
            addBlock(rootX, groundY + 3, rootZ + armDir2, T.CACTUS, '#ffffff', false);
        }
    };

    const buildDesertObelisk = (rootX: number, rootZ: number, groundY: number) => {
        markObstacle(rootX, rootZ);
        addBlock(rootX, groundY, rootZ, T.CHISELED_SANDSTONE, '#ffffff', true);
        addBlock(rootX, groundY + 1, rootZ, T.SANDSTONE, '#ffffff', true);
        addBlock(rootX, groundY + 2, rootZ, T.CHISELED_SANDSTONE, '#ffffff', true);
    };

    // 5. Ancient Pillars & Castle Ruins
    const buildRuinPillar = (rootX: number, rootZ: number, groundY: number) => {
        markObstacle(rootX, rootZ);
        const pillarHeight = 2 + Math.floor(rng() * 3);
        for (let dy = 0; dy < pillarHeight; dy++) {
            const pick = rng();
            const tex = pick > 0.6 ? T.MOSSY_STONE_BRICKS : (pick > 0.3 ? T.CRACKED_STONE_BRICKS : T.STONE_BRICKS);
            addBlock(rootX, groundY + dy, rootZ, tex, '#ffffff', true);
        }

        // Scattered fallen rubble
        const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        neighbors.forEach(([dx, dz]) => {
            const nx = rootX + dx;
            const nz = rootZ + dz;
            if (isValidForFeature(nx, nz, 0) && rng() > 0.6) {
                addBlock(nx, groundY, nz, T.MOSSY_COBBLESTONE, '#ffffff', false);
            }
        });
    };

    // 6. Natural Boulders & Rock Outcrops
    const buildBoulder = (rootX: number, rootZ: number, groundY: number) => {
        markObstacle(rootX, rootZ);
        const rockTex = rng() > 0.5 ? T.STONE : T.COBBLESTONE;
        const mossTex = T.MOSSY_COBBLESTONE;

        // Base 2x2 or 1x2
        addBlock(rootX, groundY, rootZ, rockTex, '#ffffff', true);
        if (rng() > 0.4) {
            addBlock(rootX, groundY + 1, rootZ, rng() > 0.5 ? rockTex : mossTex, '#ffffff', true);
        }

        const sideX = rootX + (rng() > 0.5 ? 1 : -1);
        if (isValidForFeature(sideX, rootZ, 0) && rng() > 0.4) {
            markObstacle(sideX, rootZ);
            addBlock(sideX, groundY, rootZ, rockTex, '#ffffff', true);
        }
    };

    // 7. Giant Mushrooms (Fungus / Swamp / Caves)
    const buildGiantMushroom = (rootX: number, rootZ: number, groundY: number, isRed = true) => {
        markObstacle(rootX, rootZ);
        const stemHeight = 3;
        for (let dy = 0; dy < stemHeight; dy++) {
            addBlock(rootX, groundY + dy, rootZ, T.MUSHROOM_STEM, '#ffffff', true);
        }

        const capTex = isRed ? T.RED_MUSHROOM_BLOCK : T.BROWN_MUSHROOM_BLOCK;
        const capY = groundY + stemHeight;

        if (isRed) {
            // Umbrella dome shape
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    addBlock(rootX + dx, capY, rootZ + dz, capTex, '#ffffff', false);
                }
            }
            // Drooping corners
            const droop = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            droop.forEach(([dx, dz]) => {
                addBlock(rootX + dx, capY - 1, rootZ + dz, capTex, '#ffffff', false);
            });
        } else {
            // Flat wide shelf shape
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    addBlock(rootX + dx, capY, rootZ + dz, capTex, '#ffffff', false);
                }
            }
        }
    };

    // 8. Interactive Biome Props (Barrels, Hay, TNT, Enchanting Tables, Lanterns)
    const buildInteractiveProp = (rootX: number, rootZ: number, groundY: number, tType: TerrainType) => {
        markObstacle(rootX, rootZ);
        const pick = rng();
        if (tType === TerrainType.RUINS || tType === TerrainType.CASTLE) {
            if (pick > 0.6) {
                // Enchanting Table
                addBlock(rootX, groundY, rootZ, T.ENCHANTING_TABLE, '#ffffff', true);
            } else if (pick > 0.3) {
                // Bookshelf stack
                addBlock(rootX, groundY, rootZ, T.BOOKSHELF, '#ffffff', true);
                if (rng() > 0.5) addBlock(rootX, groundY + 1, rootZ, T.BOOKSHELF, '#ffffff', true);
            } else {
                // TNT Barrels
                addBlock(rootX, groundY, rootZ, T.TNT_SIDE, '#ffffff', true);
            }
        } else if (tType === TerrainType.MOUNTAIN || tType === TerrainType.CAVE_FLOOR || tType === TerrainType.CHASM || tType === TerrainType.LAVA) {
            if (pick > 0.5) {
                // Explosive TNT Depot
                addBlock(rootX, groundY, rootZ, T.TNT_SIDE, '#ffffff', true);
            } else {
                // Storage Barrels
                addBlock(rootX, groundY, rootZ, T.BARREL, '#ffffff', true);
            }
        } else {
            // Village & Plains settlement props
            if (pick > 0.6) {
                addBlock(rootX, groundY, rootZ, T.BARREL, '#ffffff', true);
                if (rng() > 0.7) addBlock(rootX, groundY + 1, rootZ, T.BARREL, '#ffffff', true);
            } else if (pick > 0.3) {
                addBlock(rootX, groundY, rootZ, T.HAY_BLOCK, '#ffffff', true);
                if (rng() > 0.5) addBlock(rootX, groundY + 1, rootZ, T.HAY_BLOCK, '#ffffff', true);
            } else {
                addBlock(rootX, groundY, rootZ, T.BOOKSHELF, '#ffffff', true);
            }
        }
    };

    // --- PROCEDURAL DISTRIBUTION PER BIOME ---
    const candidateSpots: { x: number, z: number, cell: BattleCell }[] = [];
    cellMap.forEach(cell => {
        if (isValidForFeature(cell.x, cell.z, 2)) {
            candidateSpots.push({ x: cell.x, z: cell.z, cell });
        }
    });

    // Shuffle candidate spots deterministically
    for (let i = candidateSpots.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [candidateSpots[i], candidateSpots[j]] = [candidateSpots[j], candidateSpots[i]];
    }

    let structuresPlaced = 0;
    const maxStructures = [TerrainType.FOREST, TerrainType.TAIGA, TerrainType.JUNGLE].includes(terrainType) ? 5 : 4;

    for (const spot of candidateSpots) {
        if (structuresPlaced >= maxStructures) break;
        if (occupiedCells.has(`${spot.x},${spot.z}`)) continue;

        // Ensure minimum distance of 2 between structures
        let tooClose = false;
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                if (occupiedCells.has(`${spot.x + dx},${spot.z + dz}`)) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) break;
        }
        if (tooClose) continue;

        const groundY = spot.cell.offsetY + spot.cell.height;

        switch (terrainType) {
            case TerrainType.FOREST:
            case TerrainType.PLAINS:
                if (rng() > 0.3) {
                    buildOakTree(spot.x, spot.z, groundY, rng() > 0.7);
                } else {
                    if (rng() > 0.8) {
                        buildDioramaChest(spot.x, spot.z, groundY);
                    } else {
                        buildBoulder(spot.x, spot.z, groundY);
                    }
                }
                structuresPlaced++;
                break;

            case TerrainType.TAIGA:
            case TerrainType.TUNDRA:
                if (rng() > 0.25) {
                    buildSpruceTree(spot.x, spot.z, groundY, terrainType === TerrainType.TUNDRA || rng() > 0.5);
                } else {
                    buildBoulder(spot.x, spot.z, groundY);
                }
                structuresPlaced++;
                break;

            case TerrainType.JUNGLE:
                if (rng() > 0.3) {
                    buildJungleTree(spot.x, spot.z, groundY);
                } else {
                    buildOakTree(spot.x, spot.z, groundY, false);
                }
                structuresPlaced++;
                break;

            case TerrainType.DESERT:
                if (rng() > 0.4) {
                    buildCactus(spot.x, spot.z, groundY);
                } else {
                    buildDesertObelisk(spot.x, spot.z, groundY);
                }
                structuresPlaced++;
                break;

            case TerrainType.RUINS:
            case TerrainType.CASTLE:
                if (rng() > 0.2) {
                    if (rng() > 0.5) {
                        buildDioramaPillar(spot.x, spot.z, groundY, 3 + Math.floor(rng() * 2));
                    } else {
                        buildRuinPillar(spot.x, spot.z, groundY);
                    }
                } else {
                    buildBoulder(spot.x, spot.z, groundY);
                }
                structuresPlaced++;
                break;

            case TerrainType.MOUNTAIN:
            case TerrainType.CAVE_FLOOR:
            case TerrainType.CHASM:
            case TerrainType.LAVA:
                if (rng() > 0.4) {
                    buildBoulder(spot.x, spot.z, groundY);
                } else {
                    buildInteractiveProp(spot.x, spot.z, groundY, terrainType);
                }
                structuresPlaced++;
                break;

            case TerrainType.FUNGUS:
            case TerrainType.SWAMP:
                if (rng() > 0.35) {
                    buildGiantMushroom(spot.x, spot.z, groundY, rng() > 0.5);
                } else {
                    buildOakTree(spot.x, spot.z, groundY, false);
                }
                structuresPlaced++;
                break;

            case TerrainType.VILLAGE:
            case TerrainType.COBBLESTONE:
            case TerrainType.DIRT_ROAD:
                if (rng() > 0.5) {
                    buildInteractiveProp(spot.x, spot.z, groundY, terrainType);
                } else {
                    buildOakTree(spot.x, spot.z, groundY, true);
                }
                structuresPlaced++;
                break;

            default:
                if (rng() > 0.5) {
                    buildOakTree(spot.x, spot.z, groundY);
                    structuresPlaced++;
                }
                break;
        }
    }

    // --- 3. BIOME COLORMAP TINTING & AMBIENT OCCLUSION GENERATION ---
    const getBiomeGrassFoliageTint = (tType: TerrainType, x: number, z: number) => {
        // Subtle micro-variation using deterministic sine coordinates
        const noise = (Math.sin(x * 1.7 + z * 2.3) * 0.5 + 0.5) * 0.08;
        switch (tType) {
            case TerrainType.FOREST:
                return new THREE.Color(0.35 + noise, 0.65 + noise, 0.25); // Rich forest green
            case TerrainType.PLAINS:
                return new THREE.Color(0.48 + noise, 0.74 + noise, 0.28); // Vibrant meadow green
            case TerrainType.TAIGA:
                return new THREE.Color(0.28 + noise, 0.48 + noise, 0.35); // Cold conifer green
            case TerrainType.JUNGLE:
                return new THREE.Color(0.20 + noise, 0.80 + noise, 0.20); // Lush tropical green
            case TerrainType.SWAMP:
                return new THREE.Color(0.38 + noise, 0.45 + noise, 0.22); // Murky olive green
            case TerrainType.FUNGUS:
                return new THREE.Color(0.55 + noise, 0.42 + noise, 0.62); // Spore-tinted purplish hue
            case TerrainType.TUNDRA:
                return new THREE.Color(0.60 + noise, 0.70 + noise, 0.65); // Frost-tinted pale green
            case TerrainType.DESERT:
                return new THREE.Color(0.85 + noise, 0.75 + noise, 0.45); // Sun-bleached dry tint
            default:
                return new THREE.Color(0.45 + noise, 0.70 + noise, 0.30);
        }
    };

    // Build a 3D spatial occupancy grid to compute ambient occlusion and light exposure
    const solidBlockSet = new Set<string>();
    
    // Add grid cells to occupancy map
    grid.forEach(cell => {
        const topY = (cell.offsetY || 0) + cell.height - 1;
        for (let y = 0; y <= topY; y++) {
            solidBlockSet.add(`${cell.x},${y},${cell.z}`);
        }
    });

    // Add voxel blocks to occupancy map
    voxelBlocks.forEach(b => {
        solidBlockSet.add(`${b.x},${b.y},${b.z}`);
    });

    // Compute Smooth Minecraft-style Ambient Occlusion factor
    const computeAO = (x: number, y: number, z: number): number => {
        let occludedNeighbors = 0;
        
        // Check 4 horizontal neighbors
        if (solidBlockSet.has(`${x + 1},${y},${z}`)) occludedNeighbors += 1;
        if (solidBlockSet.has(`${x - 1},${y},${z}`)) occludedNeighbors += 1;
        if (solidBlockSet.has(`${x},${y},${z + 1}`)) occludedNeighbors += 1;
        if (solidBlockSet.has(`${x},${y},${z - 1}`)) occludedNeighbors += 1;

        // Check if there is a block directly above or diagonal corner
        if (solidBlockSet.has(`${x},${y + 1},${z}`)) occludedNeighbors += 2;
        if (solidBlockSet.has(`${x + 1},${y + 1},${z}`)) occludedNeighbors += 1;
        if (solidBlockSet.has(`${x - 1},${y + 1},${z}`)) occludedNeighbors += 1;
        if (solidBlockSet.has(`${x},${y + 1},${z + 1}`)) occludedNeighbors += 1;
        if (solidBlockSet.has(`${x},${y + 1},${z - 1}`)) occludedNeighbors += 1;

        // Depth decay below surface
        if (y < 0) {
            occludedNeighbors += Math.min(3, Math.abs(y));
        }

        // Return a brightness multiplier between 0.45 (heavy shadow) and 1.0 (fully open)
        const shadowFactor = Math.max(0.45, 1.0 - (occludedNeighbors * 0.08));
        return shadowFactor;
    };

    // Apply Biome Colormaps and Ambient Occlusion to grid cells
    const updatedGridWithShading = Array.from(cellMap.values()).map(cell => {
        const topY = (cell.offsetY || 0) + cell.height - 1;
        const ao = computeAO(cell.x, topY, cell.z);
        let baseColor = new THREE.Color(cell.color || '#ffffff');

        // Apply Biome tinting to organic / grass / leaf terrain
        const tex = cell.textureUrl.toLowerCase();
        if (tex.includes('grass') || tex.includes('leaves') || tex.includes('moss') || tex.includes('mycelium')) {
            const biomeTint = getBiomeGrassFoliageTint(terrainType, cell.x, cell.z);
            baseColor.multiply(biomeTint);
        }

        baseColor.multiplyScalar(ao);
        return {
            ...cell,
            color: `#${baseColor.getHexString()}`
        };
    });

    // Apply Biome Colormaps and Ambient Occlusion to 3D voxel blocks
    const shadedVoxelBlocks = voxelBlocks.map(block => {
        const ao = computeAO(block.x, block.y, block.z);
        let baseColor = new THREE.Color(block.color || '#ffffff');

        const tex = block.textureUrl.toLowerCase();
        if (tex.includes('leaves') || tex.includes('grass') || tex.includes('azalea')) {
            const biomeTint = getBiomeGrassFoliageTint(terrainType, block.x, block.z);
            baseColor.multiply(biomeTint);
        }

        baseColor.multiplyScalar(ao);
        return {
            ...block,
            color: `#${baseColor.getHexString()}`
        };
    });

    return {
        updatedGrid: updatedGridWithShading,
        voxelBlocks: shadedVoxelBlocks
    };
};

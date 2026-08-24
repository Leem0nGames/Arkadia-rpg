import { BattleCell, TerrainType, VoxelBlock } from '../types';
import { ASSETS, BATTLE_MAP_SIZE } from '../constants';

export interface VoxelDungeonResult {
    battleMap: BattleCell[];
    voxelStructures: VoxelBlock[];
    playerSpawns: { x: number; y: number }[];
    enemySpawns: { x: number; y: number }[];
}

interface BSPNode {
    x: number;
    z: number;
    w: number;
    h: number;
    leftChild?: BSPNode;
    rightChild?: BSPNode;
    room?: { x: number; z: number; w: number; h: number };
}

/**
 * Creates a mulberry32 seedable pseudo-random number generator (PRNG).
 */
const createRandom = (seed: number) => {
    let t = seed + 0x6D2B79F5;
    return () => {
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

/**
 * Splits a BSP node either horizontally or vertically, ensuring child nodes are at least minSize.
 */
const splitNode = (node: BSPNode, rng: () => number, minSize: number = 5): boolean => {
    if (node.leftChild || node.rightChild) return false;

    // Determine split direction
    let splitH = rng() > 0.5;
    if (node.w > node.h && node.w / node.h >= 1.25) {
        splitH = false; // Force vertical split
    } else if (node.h > node.w && node.h / node.w >= 1.25) {
        splitH = true;  // Force horizontal split
    }

    if (splitH) {
        // Horizontal split
        if (node.h < minSize * 2) return false;
        const splitZ = node.z + minSize + Math.floor(rng() * (node.h - minSize * 2));
        node.leftChild = { x: node.x, z: node.z, w: node.w, h: splitZ - node.z };
        node.rightChild = { x: node.x, z: splitZ, w: node.w, h: node.z + node.h - splitZ };
    } else {
        // Vertical split
        if (node.w < minSize * 2) return false;
        const splitX = node.x + minSize + Math.floor(rng() * (node.w - minSize * 2));
        node.leftChild = { x: node.x, z: node.z, w: splitX - node.x, h: node.h };
        node.rightChild = { x: splitX, z: node.z, w: node.x + node.w - splitX, h: node.h };
    }
    return true;
};

/**
 * Recursively retrieves all leaf nodes from a BSP tree.
 */
const getLeaves = (node: BSPNode): BSPNode[] => {
    const leaves: BSPNode[] = [];
    const traverse = (n: BSPNode) => {
        if (!n.leftChild && !n.rightChild) {
            leaves.push(n);
        } else {
            if (n.leftChild) traverse(n.leftChild);
            if (n.rightChild) traverse(n.rightChild);
        }
    };
    traverse(node);
    return leaves;
};

/**
 * Carves a corridor between two rooms using a direct and organic Random Walk carver.
 */
const carveCorridor = (
    x1: number, 
    z1: number, 
    x2: number, 
    z2: number, 
    rng: () => number, 
    mapWidth: number, 
    mapHeight: number
): { x: number; z: number }[] => {
    const path: { x: number; z: number }[] = [];
    let curX = x1;
    let curZ = z1;
    path.push({ x: curX, z: curZ });

    const maxSteps = 150;
    let steps = 0;

    while ((curX !== x2 || curZ !== z2) && steps < maxSteps) {
        steps++;
        const diffX = x2 - curX;
        const diffZ = z2 - curZ;

        const dirX = diffX !== 0 ? Math.sign(diffX) : 0;
        const dirZ = diffZ !== 0 ? Math.sign(diffZ) : 0;

        // Introduce random wandering (20% chance) to create winding paths
        if (rng() < 0.20) {
            const rand = rng();
            if (rand < 0.25) curX = Math.max(1, curX - 1);
            else if (rand < 0.50) curX = Math.min(mapWidth - 2, curX + 1);
            else if (rand < 0.75) curZ = Math.max(1, curZ - 1);
            else curZ = Math.min(mapHeight - 2, curZ + 1);
        } else {
            // Move toward destination
            if (diffX !== 0 && diffZ !== 0) {
                if (rng() < 0.5) {
                    curX += dirX;
                } else {
                    curZ += dirZ;
                }
            } else if (diffX !== 0) {
                curX += dirX;
            } else {
                curZ += dirZ;
            }
        }

        // Clamp to ensure we preserve at least a 1-tile solid outer border
        curX = Math.max(1, Math.min(mapWidth - 2, curX));
        curZ = Math.max(1, Math.min(mapHeight - 2, curZ));

        path.push({ x: curX, z: curZ });
    }

    return path;
};

/**
 * Procedurally generates a fully connected BSP Dungeon with Random Walk corridors
 * and immersive 3D thematic layers:
 * - Room 1: Antechamber (Cozy, containing supply crates/barrels)
 * - Room 2: Guardian Crypt (Mossy stone pillars with lanterns)
 * - Room 3: Portal Sanctum (Obsidian deepslate floor with custom Altar & glowing obelisks)
 */
export const generate3RoomVoxelDungeon = (
    mapSize: number = BATTLE_MAP_SIZE, 
    seed?: number,
    biome: TerrainType = TerrainType.RUINS
): VoxelDungeonResult => {
    // Generate a deterministically hashed seed if not provided
    const actualSeed = seed !== undefined ? seed : Math.floor(Math.random() * 1000000);
    const rng = createRandom(actualSeed);

    const battleMap: BattleCell[] = [];
    const voxelStructures: VoxelBlock[] = [];
    const T = ASSETS.VOXEL_STRUCTURE_TEXTURES;
    const B = ASSETS.BLOCK_TEXTURES;

    // Define biome-specific look & feel
    let wallBaseTex = T.COBBLESTONE;
    let wallCrackTex = T.CRACKED_STONE_BRICKS;
    let wallBrickTex = T.STONE_BRICKS;
    let groundBaseColor = '#475569';
    let room1Color = '#475569';
    let room2Color = '#1e3a1e';
    let room3Color = '#581c87';
    let portalAltColor = '#a855f7';
    let dungeonNamePrefix = 'Mazmorra';

    switch (biome) {
        case TerrainType.DESERT:
            wallBaseTex = T.SANDSTONE;
            wallCrackTex = T.CHISELED_SANDSTONE;
            wallBrickTex = T.SANDSTONE;
            groundBaseColor = '#d97706'; // desert warm gold
            room1Color = '#b45309';
            room2Color = '#78350f';
            room3Color = '#451a03';
            portalAltColor = '#fbbf24';
            dungeonNamePrefix = 'Cripta de Arena';
            break;
        case TerrainType.TUNDRA:
        case TerrainType.TAIGA:
            wallBaseTex = T.STONE_BRICKS;
            wallCrackTex = T.STONE;
            wallBrickTex = T.SNOW || T.COBBLESTONE;
            groundBaseColor = '#0284c7'; // icy blue
            room1Color = '#0369a1';
            room2Color = '#075985';
            room3Color = '#0c4a6e';
            portalAltColor = '#38bdf8';
            dungeonNamePrefix = 'Catarata Gélida';
            break;
        case TerrainType.SWAMP:
        case TerrainType.JUNGLE:
            wallBaseTex = T.MOSSY_COBBLESTONE;
            wallCrackTex = T.MOSSY_STONE_BRICKS;
            wallBrickTex = T.OAK_LOG;
            groundBaseColor = '#15803d'; // mossy green
            room1Color = '#166534';
            room2Color = '#14532d';
            room3Color = '#052e16';
            portalAltColor = '#10b981';
            dungeonNamePrefix = 'Grumo Cenagoso';
            break;
        case TerrainType.FUNGUS:
            wallBaseTex = T.RED_MUSHROOM_BLOCK;
            wallCrackTex = T.BROWN_MUSHROOM_BLOCK;
            wallBrickTex = T.MUSHROOM_STEM;
            groundBaseColor = '#db2777'; // magenta fungus
            room1Color = '#be185d';
            room2Color = '#9d174d';
            room3Color = '#831843';
            portalAltColor = '#f472b6';
            dungeonNamePrefix = 'Colonia Fúngica';
            break;
        default: // RUINS / CASTLE / GRASS / etc.
            wallBaseTex = T.COBBLESTONE;
            wallCrackTex = T.CRACKED_STONE_BRICKS;
            wallBrickTex = T.STONE_BRICKS;
            groundBaseColor = '#475569';
            room1Color = '#475569';
            room2Color = '#1e3a1e';
            room3Color = '#581c87';
            portalAltColor = '#a855f7';
            dungeonNamePrefix = 'Ruinas Olvidadas';
            break;
    }

    // 1. Initialize BSP Tree for Room Subdivision
    const root: BSPNode = {
        x: 1,
        z: 1,
        w: mapSize - 2,
        h: mapSize - 2
    };

    // First split
    splitNode(root, rng, 5);

    // Second split on the larger leaf node
    if (root.leftChild && root.rightChild) {
        const areaL = root.leftChild.w * root.leftChild.h;
        const areaR = root.rightChild.w * root.rightChild.h;
        const targetToSplit = areaL >= areaR ? root.leftChild : root.rightChild;
        splitNode(targetToSplit, rng, 5);
    }

    // Retrieve leaf nodes
    const leaves = getLeaves(root);

    // 2. Carve a room inside each leaf node
    leaves.forEach(leaf => {
        const minW = 3;
        const minH = 3;
        
        // Add padding to ensure separation of rooms by solid wall grids
        const padX = leaf.w > 5 ? 1 : 0;
        const padZ = leaf.h > 5 ? 1 : 0;
        
        const maxW = leaf.w - padX * 2;
        const maxH = leaf.h - padZ * 2;
        
        const rw = minW + Math.floor(rng() * (maxW - minW + 1));
        const rh = minH + Math.floor(rng() * (maxH - minH + 1));
        
        const rx = leaf.x + padX + Math.floor(rng() * (maxW - rw + 1));
        const rz = leaf.z + padZ + Math.floor(rng() * (maxH - rh + 1));
        
        leaf.room = { x: rx, z: rz, w: rw, h: rh };
    });

    // 3. Sort Rooms chronologically from Bottom-Left (Spawn) to Top-Right (Sanctum Boss)
    const sortedLeaves = [...leaves].sort((a, b) => {
        const rA = a.room!;
        const rB = b.room!;
        const centerA = (rA.x + rA.w / 2) + (rA.z + rA.h / 2);
        const centerB = (rB.x + rB.w / 2) + (rB.z + rB.h / 2);
        return centerA - centerB;
    });

    // Fallbacks if BSP partition yields less than 3 leaves
    const room1 = sortedLeaves[0]?.room || { x: 2, z: 10, w: 4, h: 4 };
    const room2 = sortedLeaves[1]?.room || { x: 8, z: 8, w: 4, h: 4 };
    const room3 = sortedLeaves[sortedLeaves.length - 1]?.room || { x: 12, z: 2, w: 4, h: 4 };

    // 4. Determine Room Centers
    const c1X = Math.floor(room1.x + room1.w / 2);
    const c1Z = Math.floor(room1.z + room1.h / 2);
    const c2X = Math.floor(room2.x + room2.w / 2);
    const c2Z = Math.floor(room2.z + room2.h / 2);
    const c3X = Math.floor(room3.x + room3.w / 2);
    const c3Z = Math.floor(room3.z + room3.h / 2);

    // 5. Connect rooms organically using Random Walk corridors
    const corridor1 = carveCorridor(c1X, c1Z, c2X, c2Z, rng, mapSize, mapSize);
    const corridor2 = carveCorridor(c2X, c2Z, c3X, c3Z, rng, mapSize, mapSize);

    // Build immediate matrix lookup for walkable space
    const walkableMatrix = Array.from({ length: mapSize }, () => Array(mapSize).fill(false));

    const inRoom = (x: number, z: number, r: { x: number; z: number; w: number; h: number }) => {
        return x >= r.x && x < r.x + r.w && z >= r.z && z < r.z + r.h;
    };

    // Register room cells
    for (let x = 0; x < mapSize; x++) {
        for (let z = 0; z < mapSize; z++) {
            if (inRoom(x, z, room1) || inRoom(x, z, room2) || inRoom(x, z, room3)) {
                walkableMatrix[x][z] = true;
            }
        }
    }

    // Register corridors
    corridor1.forEach(p => { walkableMatrix[p.x][p.z] = true; });
    corridor2.forEach(p => { walkableMatrix[p.x][p.z] = true; });

    // 15% Chance to carve a hidden loop/shortcut corridor to create tactical flank routes!
    if (rng() < 0.15) {
        const secretShortcut = carveCorridor(c1X, c1Z, c3X, c3Z, rng, mapSize, mapSize);
        secretShortcut.forEach(p => { walkableMatrix[p.x][p.z] = true; });
    }

    // The magical Arcane Portal Altar will be placed at the center of Room 3
    const portalX = c3X;
    const portalZ = c3Z;
    walkableMatrix[portalX][portalZ] = true;

    // 6. Generate Battle Map Cells and 3D Voxel Meshes
    for (let x = 0; x < mapSize; x++) {
        for (let z = 0; z < mapSize; z++) {
            const walkable = walkableMatrix[x][z];
            const isPortal = (x === portalX && z === portalZ);

            let cellTerrain = walkable ? TerrainType.STONE_FLOOR : TerrainType.RUINS;
            let cellColor = walkable ? groundBaseColor : '#1e293b';
            let floorTexture = walkable ? wallBrickTex : wallBaseTex;

            if (walkable) {
                if (inRoom(x, z, room3)) {
                    floorTexture = isPortal ? T.DEEPSLATE : wallBrickTex;
                    cellColor = room3Color; // Mystic Room Tint
                } else if (inRoom(x, z, room2)) {
                    floorTexture = ((x + z) % 2 === 0) ? T.MOSSY_STONE_BRICKS : T.CRACKED_STONE_BRICKS;
                    cellColor = room2Color; // Mossy Crypt Tint
                } else if (inRoom(x, z, room1)) {
                    floorTexture = wallCrackTex;
                    cellColor = room1Color; // Antechamber Tint
                } else {
                    // Corridor Floor
                    floorTexture = wallBaseTex;
                    cellColor = '#334155';
                }
            } else {
                floorTexture = B[TerrainType.CASTLE] || T.STONE_BRICKS;
            }

            // Register standard battlefield cell
            battleMap.push({
                x,
                z,
                terrain: cellTerrain,
                height: 1,
                offsetY: 0,
                color: cellColor,
                textureUrl: floorTexture,
                isObstacle: !walkable
            });

            // Populate Voxel Geometry
            if (!walkable) {
                // Build robust, visually striking 3-level solid castle stone walls
                for (let y = 1; y <= 3; y++) {
                    const wallTexture = (y === 3) ? wallBrickTex : (y === 2 ? wallCrackTex : wallBaseTex);
                    voxelStructures.push({
                        x,
                        y,
                        z,
                        textureUrl: wallTexture,
                        color: groundBaseColor,
                        isObstacle: true
                    });
                }
            } else {
                // Ground Floor voxel tile
                voxelStructures.push({
                    x,
                    y: 0,
                    z,
                    textureUrl: floorTexture,
                    color: cellColor,
                    isObstacle: false
                });

                // Populate Thematic Decorative Props
                if (isPortal) {
                    // Arcane Altar structure in Room 3: Place a procedural chest!
                    buildProceduralChest(voxelStructures, x, 1, z, '#4a148c');
                } else if (inRoom(x, z, room3)) {
                    // Floating mystical lanterns framing the ritual sanctum corners
                    const rx = x - room3.x;
                    const rz = z - room3.z;
                    const isCorner = (rx === 0 || rx === room3.w - 1) && (rz === 0 || rz === room3.h - 1);
                    if (isCorner) {
                        buildProceduralPillar(voxelStructures, x, 1, z, 4, T.DEEPSLATE, T.DEEPSLATE, portalAltColor);
                    }
                } else if (inRoom(x, z, room2)) {
                    // Mossy Crypt Stone pillars topped with glowing orange lanterns
                    const rx = x - room2.x;
                    const rz = z - room2.z;
                    const isCorner = (rx === 0 || rx === room2.w - 1) && (rz === 0 || rz === room2.h - 1);
                    // Place pillars on 2 diagonal corners to ensure high playability without blocking movement
                    if (isCorner && (rx + rz) % 2 === 0) {
                        buildProceduralPillar(voxelStructures, x, 1, z, 3, wallBrickTex, wallBaseTex, '#f59e0b');
                    }
                } else if (inRoom(x, z, room1)) {
                    // Storage crates and barrels inside Antechamber
                    const rx = x - room1.x;
                    const rz = z - room1.z;
                    if (rx === 0 && rz === 0) {
                        buildProceduralChest(voxelStructures, x, 1, z, '#78350f');
                    } else if (rx === room1.w - 1 && rz === 0) {
                        voxelStructures.push({ x, y: 1, z, textureUrl: T.BOOKSHELF, color: '#a16207', isObstacle: true });
                    }
                } else {
                    // Corridors decoration: Place an occasional torch/lantern along the passage walls
                    if ((x + z) % 5 === 0) {
                        voxelStructures.push({ x, y: 1, z, textureUrl: T.LANTERN, color: '#f59e0b', isObstacle: false });
                    }
                }
            }
        }
    }

    // 7. Establish Safe Spawn Coordinates
    const playerSpawns: { x: number; y: number }[] = [];
    for (let x = room1.x; x < room1.x + room1.w; x++) {
        for (let z = room1.z; z < room1.z + room1.h; z++) {
            if (walkableMatrix[x][z] && playerSpawns.length < 4) {
                playerSpawns.push({ x, y: z });
            }
        }
    }
    // Fallbacks
    while (playerSpawns.length < 4) {
        playerSpawns.push({ x: room1.x, y: room1.z });
    }

    const enemySpawns: { x: number; y: number }[] = [];

    // Enemy 0: Corridor Patrol Guard (Placed halfway along corridor 1)
    const guard1Index = Math.floor(corridor1.length / 2);
    const guard1Pos = corridor1[guard1Index] || { x: c2X, z: c2Z };
    enemySpawns.push({ x: guard1Pos.x, y: guard1Pos.z });

    // Enemy 1 & 2: Crypt Guardians (Placed inside Room 2)
    const room2Walkable: { x: number; z: number }[] = [];
    for (let x = room2.x; x < room2.x + room2.w; x++) {
        for (let z = room2.z; z < room2.z + room2.h; z++) {
            if (walkableMatrix[x][z]) {
                room2Walkable.push({ x, z });
            }
        }
    }

    if (room2Walkable.length > 0) {
        enemySpawns.push({ x: room2Walkable[0].x, y: room2Walkable[0].z });
    } else {
        enemySpawns.push({ x: c2X, y: c2Z });
    }

    if (room2Walkable.length > 1) {
        enemySpawns.push({ x: room2Walkable[room2Walkable.length - 1].x, y: room2Walkable[room2Walkable.length - 1].z });
    } else {
        enemySpawns.push({ x: c2X + 1, y: c2Z });
    }

    // Enemy 3: Portal Champion Boss (Spawns right next to the ritual altar in Room 3)
    let bossX = portalX;
    let bossZ = portalZ + 1;
    if (bossZ >= mapSize - 1 || !walkableMatrix[bossX][bossZ]) {
        bossZ = portalZ - 1;
    }
    if (bossZ < 0 || !walkableMatrix[bossX][bossZ]) {
        bossX = portalX - 1;
        bossZ = portalZ;
    }
    enemySpawns.push({ x: bossX, y: bossZ });

    return {
        battleMap,
        voxelStructures,
        playerSpawns,
        enemySpawns
    };
};

/**
 * Procedural Asset Assembly: Build a procedural chest block-by-block.
 * Base (y=1) + Lid (y=2) + Clasp (gold accent block)
 */
export const buildProceduralChest = (
    structures: VoxelBlock[], 
    x: number, 
    y: number, 
    z: number, 
    color: string = '#78350f'
) => {
    const T = ASSETS.VOXEL_STRUCTURE_TEXTURES;
    // Chest Body/Base (dark wood/metal)
    structures.push({ x, y: y, z, textureUrl: T.BARREL, color, isObstacle: true });
    // Chest Lid (slightly lighter wood block, placed on top)
    structures.push({ x, y: y + 1, z, textureUrl: T.OAK_LOG, color: '#a16207', isObstacle: true });
    // Procedural Clasp/Lock: Add a small floating block in front as the lock clasp
    structures.push({ x: x, y: y + 1, z: z - 1, textureUrl: T.CHISELED_SANDSTONE, color: '#f59e0b', isObstacle: false });
};

/**
 * Procedural Asset Assembly: Build a multi-tier architectural column/pillar block-by-block.
 * Plinth base + Shaft columns + Capstone capital.
 */
export const buildProceduralPillar = (
    structures: VoxelBlock[], 
    x: number, 
    y: number, 
    z: number, 
    height: number = 3, 
    baseTex: string = ASSETS.VOXEL_STRUCTURE_TEXTURES.STONE_BRICKS, 
    shaftTex: string = ASSETS.VOXEL_STRUCTURE_TEXTURES.STONE, 
    capColor: string = '#f59e0b'
) => {
    const T = ASSETS.VOXEL_STRUCTURE_TEXTURES;
    // 1. Plinth Base (wider base/carved stone)
    structures.push({ x, y: y, z, textureUrl: baseTex, color: '#334155', isObstacle: true });
    
    // 2. Shaft sections
    for (let dy = 1; dy < height - 1; dy++) {
        structures.push({ x, y: y + dy, z, textureUrl: shaftTex, color: '#475569', isObstacle: true });
    }
    
    // 3. Capital Top/Capstone
    const topY = y + height - 1;
    structures.push({ x, y: topY, z, textureUrl: baseTex, color: '#64748b', isObstacle: true });
    
    // 4. Procedural topping: place a glowing runic lantern on top of the capital
    structures.push({ x, y: topY + 1, z, textureUrl: T.LANTERN, color: capColor, isObstacle: false });
};

/**
 * Procedural Asset Assembly: Build a procedural tree with a log trunk and a custom leafy canopy.
 */
export const buildProceduralTree = (
    structures: VoxelBlock[],
    x: number,
    y: number,
    z: number,
    trunkTex: string = ASSETS.VOXEL_STRUCTURE_TEXTURES.OAK_LOG,
    leafTex: string = ASSETS.VOXEL_STRUCTURE_TEXTURES.OAK_LEAVES,
    trunkHeight: number = 3
) => {
    // Trunk Logs
    for (let dy = 0; dy < trunkHeight; dy++) {
        structures.push({ x, y: y + dy, z, textureUrl: trunkTex, color: '#78350f', isObstacle: true });
    }
    
    // Leafy canopy (spherical layers on top)
    const capY = y + trunkHeight;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
            // Level 1: dense ring
            structures.push({ x: x + dx, y: capY, z: z + dz, textureUrl: leafTex, color: '#15803d', isObstacle: false });
            // Level 2: smaller top cap
            if (Math.abs(dx) + Math.abs(dz) <= 1) {
                structures.push({ x: x + dx, y: capY + 1, z: z + dz, textureUrl: leafTex, color: '#16a34a', isObstacle: false });
            }
        }
    }
    // Crown Spire
    structures.push({ x, y: capY + 2, z, textureUrl: leafTex, color: '#22c55e', isObstacle: false });
};

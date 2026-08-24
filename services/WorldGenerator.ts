import { HexCell, TerrainType, WeatherType, Dimension } from '../types';
import { getAncientSiteAt } from '../data/ancientSites';
import { TERRAIN_DATA } from '../constants';
import { generateDecorationsForBiome } from './decoratorService';
import { determineBiome } from '../data/biomes';

// Deterministic PRNG using Mulberry32
export class Mulberry32 {
    private a: number;
    constructor(seed: number) {
        this.a = seed;
    }
    next(): number {
        let t = this.a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

// 2D Simplex Noise for smooth procedural geography
const PERM = new Uint8Array(512);
const GRAD3 = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
];

const seedNoise = (seed: number) => {
    const rng = new Mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 0; i < 256; i++) {
        const r = Math.floor(rng.next() * 256);
        const temp = p[i];
        p[i] = p[r];
        p[r] = temp;
    }
    for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
};

const dot = (g: number[], x: number, y: number) => g[0] * x + g[1] * y;

export const noise2D = (xin: number, yin: number): number => {
    let n0, n1, n2;
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = PERM[ii + PERM[jj]] % 12;
    const gi1 = PERM[ii + i1 + PERM[jj + j1]] % 12;
    const gi2 = PERM[ii + 1 + PERM[jj + 1]] % 12;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0.0; else { t0 *= t0; n0 = t0 * t0 * dot(GRAD3[gi0], x0, y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0.0; else { t1 *= t1; n1 = t1 * t1 * dot(GRAD3[gi1], x1, y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0.0; else { t2 *= t2; n2 = t2 * t2 * dot(GRAD3[gi2], x2, y2); }
    return 70.0 * (n0 + n1 + n2);
};

// Multi-octave Fractional Brownian Motion (fBm) with Domain Warping
export const fbmNoise = (x: number, y: number, octaves: number = 4, lacunarity: number = 2.0, gain: number = 0.5): number => {
    let total = 0;
    let amplitude = 1.0;
    let frequency = 1.0;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
        total += noise2D(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= gain;
        frequency *= lacunarity;
    }
    return total / maxValue;
};

export interface KingdomInfo {
    id: string;
    name: string;
    centerQ: number;
    centerR: number;
    primaryTerrain: TerrainType;
    capitalPoiType: HexCell['poiType'];
    capitalName: string;
    culture: string;
    color: string;
}

export const KINGDOMS: KingdomInfo[] = [
    {
        id: 'ARCADIA_CENTRAL',
        name: 'Reino Central de Arcadia',
        centerQ: 0,
        centerR: 0,
        primaryTerrain: TerrainType.GRASS,
        capitalPoiType: 'PLAZA',
        capitalName: 'Gran Ciudadela de Arcadia',
        culture: 'Caballeros y Eruditos',
        color: '#fbbf24'
    },
    {
        id: 'SYLVANDELL_ELVES',
        name: 'Dominio Feérico de Sylvandell',
        centerQ: -20,
        centerR: -10,
        primaryTerrain: TerrainType.FOREST,
        capitalPoiType: 'PLAZA',
        capitalName: 'Santuario del Gran Roble',
        culture: 'Elfos Silvanos y Druidas',
        color: '#22c55e'
    },
    {
        id: 'KAER_DURN_DWARVES',
        name: 'Bastión de Kaer-Durn',
        centerQ: 22,
        centerR: 6,
        primaryTerrain: TerrainType.MOUNTAIN,
        capitalPoiType: 'PLAZA',
        capitalName: 'Forja del Corazón de Piedra',
        culture: 'Enanos Herreros y Guardianes',
        color: '#94a3b8'
    },
    {
        id: 'ZUN_SANDS',
        name: 'Arenas del Sol de Zun',
        centerQ: 10,
        centerR: 26,
        primaryTerrain: TerrainType.DESERT,
        capitalPoiType: 'PLAZA',
        capitalName: 'Ciudadela del Sol Ardiente',
        culture: 'Nómadas del Desierto y Alquimistas',
        color: '#f59e0b'
    },
    {
        id: 'FROSTHOLM_NORTH',
        name: 'Yermos Glaciales de Frostholm',
        centerQ: -10,
        centerR: -28,
        primaryTerrain: TerrainType.TUNDRA,
        capitalPoiType: 'PLAZA',
        capitalName: 'Bastión del Viento Helado',
        culture: 'Bárbaros del Norte y Cazadores',
        color: '#38bdf8'
    },
    {
        id: 'MORTH_SWAMPS',
        name: 'Ciénaga Prohibida de Morth',
        centerQ: 12,
        centerR: 12,
        primaryTerrain: TerrainType.SWAMP,
        capitalPoiType: 'MYSTIC_CAVE',
        capitalName: 'Altar de los Lamentos',
        culture: 'Brujas del Fango y Nigromantes',
        color: '#84cc16'
    }
];

export class WorldGenerator {
    private static isInitialized = false;
    private static seed = 12345;
    
    // Hydraulic Erosion Simulation Cache & Poisson Disk Grid
    private static erosionMap: Map<string, number> = new Map();
    private static riverMap: Map<string, { isRiver: boolean; flowDir: number }> = new Map();
    private static poissonCache: Map<string, string> = new Map();
    private static tileCache: Map<string, HexCell> = new Map();

    static init(seed: number = 12345) {
        this.seed = seed;
        seedNoise(seed);
        this.erosionMap.clear();
        this.riverMap.clear();
        this.poissonCache.clear();
        this.tileCache.clear();
        
        // Execute the 4 generation layers
        this.simulateHydraulicErosion(seed);
        this.generateRiverLSystems(seed);
        this.generatePoissonProps(seed);
        this.isInitialized = true;
    }

    // =========================================================================
    // 1. CONTINENTE Y ALTURA: Fractal Noise fBm + Erosión Hidráulica por Agentes
    // =========================================================================
    public static generateHeightmap(q: number, r: number, seed: number = this.seed): number {
        // Domain warping for organic coastline contours and mountain ridges
        const warpX = noise2D(q * 0.05 + 12.3, r * 0.05 + 45.6) * 6;
        const warpY = noise2D(q * 0.05 + 78.9, r * 0.05 + 98.1) * 6;
        const wq = q + warpX;
        const wr = r + warpY;

        // Radial continental mask: Main continent radius ~48, Archipelago ~58-75
        const dist = Math.sqrt(wq * wq + wr * wr);
        let continentFalloff = 1.0;
        if (dist < 46) {
            continentFalloff = 1.0 - Math.pow(dist / 48, 2.5);
        } else if (dist >= 46 && dist <= 54) {
            continentFalloff = 0.0; // Continental shelf sea channel
        } else if (dist > 54 && dist <= 75) {
            // Outer archipelago ring islands
            const islandMask = (noise2D(q * 0.12, r * 0.12) + 1) * 0.5;
            continentFalloff = islandMask > 0.48 ? (islandMask - 0.48) * 1.8 : 0.0;
        } else {
            continentFalloff = 0.0;
        }

        // Multi-octave fBm elevation
        const baseElevation = (fbmNoise(wq * 0.04, wr * 0.04, 4, 2.0, 0.5) + 1) * 0.5;
        const ridgeElevation = 1.0 - Math.abs(noise2D(wq * 0.08, wr * 0.08));
        
        let height = (baseElevation * 0.65 + Math.pow(ridgeElevation, 2) * 0.35) * continentFalloff;

        // Hydraulic Erosion adjustment from agent simulation
        const erosionKey = `${q},${r}`;
        if (this.erosionMap.has(erosionKey)) {
            const deltaErosion = this.erosionMap.get(erosionKey)!;
            height = Math.max(0, Math.min(1.0, height + deltaErosion));
        }

        return height;
    }

    private static simulateHydraulicErosion(seed: number) {
        const rng = new Mulberry32(seed + 999);
        const radius = 50;
        const numDroplets = 400; // Efficient droplet agents
        
        for (let i = 0; i < numDroplets; i++) {
            // Spawn droplets randomly on land
            let q = Math.floor((rng.next() - 0.5) * (radius * 2));
            let r = Math.floor((rng.next() - 0.5) * (radius * 2));
            
            let water = 1.0;
            let speed = 1.0;
            let sediment = 0.0;
            const carryCapacity = 0.3;
            const erosionRate = 0.05;
            const depositionRate = 0.04;

            for (let step = 0; step < 12; step++) {
                const key = `${q},${r}`;
                const currH = this.generateRawHeight(q, r);
                if (currH <= 0.15) break; // Reached water

                // Find lowest neighbor (steepest descent)
                const neighbors = [
                    { dq: 1, dr: 0 }, { dq: 1, dr: -1 }, { dq: 0, dr: -1 },
                    { dq: -1, dr: 0 }, { dq: -1, dr: 1 }, { dq: 0, dr: 1 }
                ];
                let lowestH = currH;
                let bestN = null;

                for (const n of neighbors) {
                    const nH = this.generateRawHeight(q + n.dq, r + n.dr);
                    if (nH < lowestH) {
                        lowestH = nH;
                        bestN = n;
                    }
                }

                if (!bestN || lowestH >= currH) {
                    // Deposition in depression/basin
                    const prevE = this.erosionMap.get(key) || 0;
                    this.erosionMap.set(key, prevE + sediment * 0.5);
                    break;
                }

                const slope = currH - lowestH;
                const capacity = Math.max(0.01, slope * speed * water * carryCapacity);

                if (sediment > capacity) {
                    const deposit = (sediment - capacity) * depositionRate;
                    sediment -= deposit;
                    const prevE = this.erosionMap.get(key) || 0;
                    this.erosionMap.set(key, prevE + deposit);
                } else {
                    const erode = Math.min((capacity - sediment) * erosionRate, slope * 0.5);
                    sediment += erode;
                    const prevE = this.erosionMap.get(key) || 0;
                    this.erosionMap.set(key, prevE - erode);
                }

                speed = Math.sqrt(speed * speed + slope * 9.8);
                water *= 0.92;
                q += bestN.dq;
                r += bestN.dr;
            }
        }
    }

    private static generateRawHeight(q: number, r: number): number {
        const warpX = noise2D(q * 0.05 + 12.3, r * 0.05 + 45.6) * 6;
        const warpY = noise2D(q * 0.05 + 78.9, r * 0.05 + 98.1) * 6;
        const wq = q + warpX;
        const wr = r + warpY;
        const dist = Math.sqrt(wq * wq + wr * wr);
        if (dist > 48) return 0;
        const falloff = 1.0 - Math.pow(dist / 48, 2.5);
        const baseElevation = (fbmNoise(wq * 0.04, wr * 0.04, 4, 2.0, 0.5) + 1) * 0.5;
        return baseElevation * falloff;
    }

    // =========================================================================
    // 2. RÍOS, LAGOS Y BIOMAS: Gramática L-System + Voronoi Kingdoms
    // =========================================================================
    private static generateRiverLSystems(seed: number) {
        const rng = new Mulberry32(seed + 404);
        
        // Mountain River Springs / Sources
        const riverSources = [
            { q: 18, r: -5 },
            { q: -15, r: -18 },
            { q: 15, r: 16 },
            { q: -18, r: 8 },
            { q: 2, r: -22 }
        ];

        riverSources.forEach((src, idx) => {
            let currQ = src.q;
            let currR = src.r;
            let length = 0;
            const visited = new Set<string>();

            while (length < 35) {
                const key = `${currQ},${currR}`;
                if (visited.has(key)) break;
                visited.add(key);

                this.riverMap.set(key, { isRiver: true, flowDir: length });

                // L-System branching probability
                if (rng.next() < 0.25 && length > 5 && length < 25) {
                    // Branch tributary
                    let branchQ = currQ + (rng.next() > 0.5 ? 1 : -1);
                    let branchR = currR + (rng.next() > 0.5 ? 1 : -1);
                    this.riverMap.set(`${branchQ},${branchR}`, { isRiver: true, flowDir: length + 1 });
                }

                // Descend toward lowest neighbor
                const neighbors = [
                    { dq: 1, dr: 0 }, { dq: 1, dr: -1 }, { dq: 0, dr: -1 },
                    { dq: -1, dr: 0 }, { dq: -1, dr: 1 }, { dq: 0, dr: 1 }
                ];
                let lowestH = 999;
                let nextStep = null;

                for (const n of neighbors) {
                    const nKey = `${currQ + n.dq},${currR + n.dr}`;
                    if (visited.has(nKey)) continue;
                    const h = this.generateHeightmap(currQ + n.dq, currR + n.dr);
                    if (h < lowestH) {
                        lowestH = h;
                        nextStep = n;
                    }
                }

                if (!nextStep || lowestH <= 0.12) {
                    // River reaches the ocean or creates an estuary/lake
                    break;
                }

                currQ += nextStep.dq;
                currR += nextStep.dr;
                length++;
            }
        });
    }

    public static placeKingdoms(q: number, r: number): KingdomInfo {
        let nearest = KINGDOMS[0];
        let minDist = 999999;
        
        for (const k of KINGDOMS) {
            // Hex distance calculation
            const dist = (Math.abs(q - k.centerQ) + Math.abs(q + r - k.centerQ - k.centerR) + Math.abs(r - k.centerR)) / 2;
            // Add slight Voronoi border noise for natural frontiers
            const borderNoise = noise2D((q + k.centerQ) * 0.1, (r + k.centerR) * 0.1) * 3;
            const effectiveDist = dist + borderNoise;
            
            if (effectiveDist < minDist) {
                minDist = effectiveDist;
                nearest = k;
            }
        }
        return nearest;
    }

    public static deriveBiomes(q: number, r: number, height: number): { terrain: TerrainType; weather: WeatherType; moisture: number; temperature: number } {
        // Temperature: Equator in middle, colder north (-r), warmer south (+r), with altitude lapse
        const latitude = r / 50; // -1 (North, cold) to +1 (South, hot)
        const altitudeLapse = height * 0.45;
        const tempNoise = noise2D(q * 0.06 + 33, r * 0.06 + 44) * 0.15;
        const temperature = Math.max(0, Math.min(1.0, 0.5 + (latitude * 0.45) - altitudeLapse + tempNoise));

        // Moisture: Proximity to rivers + ocean winds + regional noise
        const riverData = this.riverMap.get(`${q},${r}`);
        const isRiver = !!riverData?.isRiver;
        const oceanDist = Math.sqrt(q * q + r * r);
        const coastalHumidity = oceanDist > 35 && oceanDist < 50 ? 0.3 : 0.0;
        const moistNoise = (fbmNoise(q * 0.05 + 99, r * 0.05 + 11, 3) + 1) * 0.5;
        const moisture = Math.max(0, Math.min(1.0, (isRiver ? 0.55 : 0.25) + coastalHumidity + moistNoise * 0.4));

        let terrain = TerrainType.GRASS;
        let weather = WeatherType.NONE;

        // Sea level cutoff
        if (height <= 0.14) {
            return { terrain: TerrainType.WATER, weather: WeatherType.NONE, moisture: 1.0, temperature };
        }

        // River channel in non-mountainous land
        if (isRiver && height < 0.65) {
            return { terrain: TerrainType.WATER, weather: WeatherType.NONE, moisture: 1.0, temperature };
        }

        // Determine biome based on structured rules in data/biomes.ts
        const biomeRule = determineBiome(height, moisture);
        terrain = biomeRule.defaultTerrain;

        // Pick terrain based on weight distribution
        if (biomeRule.terrainWeights && biomeRule.terrainWeights.length > 0) {
            const rng = new Mulberry32(q * 73856093 ^ r * 19349663 ^ this.seed);
            const randWeight = rng.next();
            let cumulativeWeight = 0;
            for (const wt of biomeRule.terrainWeights) {
                cumulativeWeight += wt.weight;
                if (randWeight <= cumulativeWeight) {
                    terrain = wt.terrain;
                    break;
                }
            }
        }

        // Set weather based on temperature and moisture
        if (terrain === TerrainType.MOUNTAIN && temperature < 0.3) {
            weather = WeatherType.SNOW;
        } else if (terrain === TerrainType.SWAMP) {
            weather = WeatherType.RAIN;
        } else if (terrain === TerrainType.TUNDRA || terrain === TerrainType.TAIGA) {
            if (moisture > 0.4) weather = WeatherType.SNOW;
        }

        return { terrain, weather, moisture, temperature };
    }

    // =========================================================================
    // 3. POBLACIÓN DEL TERRENO: Poisson Disk Sampling
    // =========================================================================
    private static generatePoissonProps(seed: number) {
        const rng = new Mulberry32(seed + 777);
        const radius = 60;
        const minDist = 2.4; // Blue-noise minimum spacing
        
        const placedPoints: { q: number; r: number }[] = [];

        for (let q = -radius; q <= radius; q++) {
            for (let r = -radius; r <= radius; r++) {
                const distToOrigin = Math.sqrt(q * q + r * r);
                if (distToOrigin > radius) continue;

                // Test if this point satisfies Poisson disk minimum distance to all neighbors
                let tooClose = false;
                for (const p of placedPoints) {
                    const d = (Math.abs(q - p.q) + Math.abs(q + r - p.q - p.r) + Math.abs(r - p.r)) / 2;
                    if (d < minDist) {
                        tooClose = true;
                        break;
                    }
                }

                if (!tooClose && rng.next() < 0.45) {
                    placedPoints.push({ q, r });
                    
                    // Assign prop based on biome
                    const height = this.generateHeightmap(q, r);
                    const { terrain } = this.deriveBiomes(q, r, height);

                    let prop: string | undefined;
                    if (terrain === TerrainType.FOREST) {
                        prop = rng.next() > 0.5 ? 'PINE_TREE' : 'SUMMER_TREE';
                    } else if (terrain === TerrainType.TAIGA || terrain === TerrainType.TUNDRA) {
                        prop = 'SNOW_TREE';
                    } else if (terrain === TerrainType.JUNGLE) {
                        prop = 'JUNGLE_TREE';
                    } else if (terrain === TerrainType.SWAMP) {
                        prop = rng.next() > 0.6 ? 'MUSHROOM' : 'SUMMER_TREE';
                    } else if (terrain === TerrainType.MOUNTAIN) {
                        prop = 'ROCK_SPIRE';
                    } else if (terrain === TerrainType.RUINS) {
                        prop = 'RUINS_OBELISK';
                    }

                    if (prop) {
                        this.poissonCache.set(`${q},${r}`, prop);
                    }
                }
            }
        }
    }

    public static populateRegion(q: number, r: number, terrain: TerrainType): HexCell['propType'] {
        const key = `${q},${r}`;
        const prop = this.poissonCache.get(key);
        return prop as HexCell['propType'];
    }

    // =========================================================================
    // 4. CIUDADES Y PUEBLOS: Shape Grammar + Wave Function Collapse (WFC)
    // =========================================================================
    public static generateSettlement(
        seed: number = 12345,
        settlementQ: number = 0,
        settlementR: number = 0,
        poiType: HexCell['poiType'] = 'PLAZA',
        customWidth: number = 14,
        customHeight: number = 14
    ): HexCell[] {
        const rng = new Mulberry32(seed ^ (settlementQ * 73856093) ^ (settlementR * 19349663));
        const width = customWidth;
        const height = customHeight;
        const centerQ = Math.floor(width / 2);
        const centerR = Math.floor(height / 2);

        // Step 1: Shape Grammar Layout Rings
        // Ring 0: Grand Keep / Central Plaza
        // Ring 1: Civic & Artisan Sector (Shop, Inn, Guild, Armory)
        // Ring 2: Residential Districts (Cottages, Wood floors, Cobblestone streets)
        // Ring 3: Fortified Outer Ring (Castle walls & Gates leading to exterior)
        
        type WFCTileState = {
            terrain: TerrainType;
            poiType?: HexCell['poiType'];
            poiName?: string;
            poiDescription?: string;
            propType?: HexCell['propType'];
        };

        const grid: WFCTileState[][] = [];
        for (let r = 0; r < height; r++) {
            grid[r] = [];
            for (let q = 0; q < width; q++) {
                grid[r][q] = { terrain: TerrainType.GRASS };
            }
        }

        // Shape Grammar: Radial Distance & Cardinal Roads
        for (let r = 0; r < height; r++) {
            for (let q = 0; q < width; q++) {
                const dq = q - centerQ;
                const dr = r - centerR;
                const ringDist = Math.max(Math.abs(dq), Math.abs(dr));
                const isCardinalRoad = q === centerQ || r === centerR || (q === centerQ - 1 && r === centerR);

                if (ringDist === 0) {
                    // Ring 0: Core Plaza
                    grid[r][q] = {
                        terrain: TerrainType.COBBLESTONE,
                        poiType: poiType || 'PLAZA',
                        poiName: 'Plaza Mayor y Sede de Gobierno',
                        poiDescription: 'El bullicioso corazón cívico del asentamiento con estatuas, tablones de misiones y mercaderes.'
                    };
                } else if (ringDist === 1) {
                    // Ring 1: Civic / Artisan Ring
                    if (isCardinalRoad) {
                        grid[r][q] = { terrain: TerrainType.COBBLESTONE };
                    } else {
                        // Place Shops, Inns, Guilds, Armories
                        const slotChoice = rng.next();
                        if (slotChoice < 0.25) {
                            grid[r][q] = {
                                terrain: TerrainType.COBBLESTONE,
                                poiType: 'SHOP',
                                poiName: 'Mercado de Armas y Provisiones',
                                poiDescription: 'Un surtido bazar de pociones, armas forjadas y equipo de expedición.'
                            };
                        } else if (slotChoice < 0.5) {
                            grid[r][q] = {
                                terrain: TerrainType.COBBLESTONE,
                                poiType: 'INN',
                                poiName: 'Posada del Dragón Descansado',
                                poiDescription: 'Cálido fuego de leña, camas limpias y rumores de taberna.'
                            };
                        } else if (slotChoice < 0.75) {
                            grid[r][q] = {
                                terrain: TerrainType.COBBLESTONE,
                                poiType: 'GUILD',
                                poiName: 'Gremio de Aventureros',
                                poiDescription: 'Contratos de caza, recompensas oficiales y tablón de misiones del reino.'
                            };
                        } else {
                            grid[r][q] = {
                                terrain: TerrainType.STONE_FLOOR,
                                poiType: 'ARMORY',
                                poiName: 'Forja y Armería Real',
                                poiDescription: 'El yunque resuena con martilleos de acero reforzado y escudos pesados.'
                            };
                        }
                    }
                } else if (ringDist === 2) {
                    // Ring 2: Residential Cottages & Garden Courtyards
                    if (isCardinalRoad) {
                        grid[r][q] = { terrain: TerrainType.DIRT_ROAD };
                    } else if (rng.next() > 0.4) {
                        grid[r][q] = {
                            terrain: TerrainType.WOOD_FLOOR,
                            propType: 'VILLAGE_HOUSE'
                        };
                    } else {
                        grid[r][q] = {
                            terrain: TerrainType.GRASS,
                            propType: 'SUMMER_TREE'
                        };
                    }
                } else if (ringDist === 3) {
                    // Ring 3: Outer Walls and Gate Exits
                    if (isCardinalRoad) {
                        grid[r][q] = {
                            terrain: TerrainType.DIRT_ROAD,
                            poiType: 'EXIT',
                            poiName: 'Puerta Fortificada de Salida',
                            poiDescription: 'Paso de guardia que conduce al mapa del mundo exterior.'
                        };
                    } else {
                        grid[r][q] = {
                            terrain: TerrainType.WALL_HOUSE
                        };
                    }
                } else {
                    // Outer Boundary / Forest periphery
                    if (q === 0 || q === width - 1 || r === 0 || r === height - 1) {
                        grid[r][q] = {
                            terrain: TerrainType.DIRT_ROAD,
                            poiType: 'EXIT',
                            poiName: 'Salida al Mundo Abierto'
                        };
                    } else {
                        grid[r][q] = {
                            terrain: TerrainType.GRASS,
                            propType: 'SUMMER_TREE'
                        };
                    }
                }
            }
        }

        // Step 2: Wave Function Collapse (WFC) pass for road connectivity & aesthetic smoothing
        for (let r = 1; r < height - 1; r++) {
            for (let q = 1; q < width - 1; q++) {
                const cell = grid[r][q];
                if (cell.terrain === TerrainType.DIRT_ROAD || cell.terrain === TerrainType.COBBLESTONE) {
                    // Ensure adjoining residential units are properly aligned
                    const neighbors = [
                        grid[r-1][q], grid[r+1][q], grid[r][q-1], grid[r][q+1]
                    ];
                    const roadNeighborCount = neighbors.filter(n => n.terrain === TerrainType.DIRT_ROAD || n.terrain === TerrainType.COBBLESTONE).length;
                    if (roadNeighborCount >= 3 && !cell.poiType) {
                        cell.terrain = TerrainType.COBBLESTONE; // Major crossroads
                    }
                }
            }
        }

        // Format to HexCell array
        const cells: HexCell[] = [];
        for (let r = 0; r < height; r++) {
            for (let q = 0; q < width; q++) {
                const state = grid[r][q];
                const terrainId = state.terrain;
                const layer = TERRAIN_DATA[terrainId]?.layer || -500;
                cells.push({
                    terrainId,
                    layer,
                    decorations: [],
                    q,
                    r,
                    terrain: state.terrain,
                    isExplored: true,
                    isVisible: true,
                    weather: WeatherType.NONE,
                    poiType: state.poiType,
                    poiName: state.poiName,
                    poiDescription: state.poiDescription,
                    propType: state.propType
                });
            }
        }

        return cells;
    }

    // =========================================================================
    // Core Tile Evaluator with Upside Down Mirroring
    // =========================================================================
    public static getTile(q: number, r: number, dimension: Dimension): HexCell {
        if (!this.isInitialized) {
            this.init(12345);
        }

        const cacheKey = `${dimension}:${q},${r}`;
        if (this.tileCache.has(cacheKey)) {
            return this.tileCache.get(cacheKey)!;
        }

        const rng = new Mulberry32(q * 73856093 ^ r * 19349663 ^ this.seed);

        // 1. Continent & Elevation
        const elevation = this.generateHeightmap(q, r);

        // 2. Kingdom Partition
        const kingdom = this.placeKingdoms(q, r);

        // 3. Biome Derivation
        const { terrain: normalTerrain, weather: normalWeather, moisture, temperature } = this.deriveBiomes(q, r, elevation);

        // 4. Props (Poisson Disk Sampling)
        let propType = this.populateRegion(q, r, normalTerrain);

        // 5. River & POI Data
        const isRiver = !!this.riverMap.get(`${q},${r}`)?.isRiver;
        let poiType: HexCell['poiType'] = undefined;
        let poiName: string | undefined = undefined;
        let poiDescription: string | undefined = undefined;
        let hasPortal = false;
        let hasEncounter = false;

        let terrain = normalTerrain;
        let weather = normalWeather;
        
        // --- Upside Down (Sombra/Abismo) Dimensional Reflection ---
        let udTerrain = TerrainType.CHASM;
        let udWeather = WeatherType.ASH;

        if (normalTerrain === TerrainType.WATER) {
            udTerrain = TerrainType.CHASM; // Abyssal Void
        } else if (normalTerrain === TerrainType.MOUNTAIN) {
            udTerrain = rng.next() > 0.6 ? TerrainType.LAVA : TerrainType.MOUNTAIN;
            udWeather = WeatherType.FOG;
        } else if (normalTerrain === TerrainType.FOREST || normalTerrain === TerrainType.JUNGLE) {
            udTerrain = TerrainType.FUNGUS; // Bioluminescent Arcane Spores
            udWeather = WeatherType.FOG;
        } else if (normalTerrain === TerrainType.DESERT) {
            udTerrain = TerrainType.CAVE_FLOOR; // Ash Dunes
        } else if (normalTerrain === TerrainType.SWAMP) {
            udTerrain = TerrainType.SWAMP;
            udWeather = WeatherType.FOG;
        } else {
            udTerrain = TerrainType.CAVE_FLOOR;
        }

        // Ancient Sites, Sanctuaries, Watchtowers & Dungeons
        const ancientSite = getAncientSiteAt(q, r);
        if (ancientSite) {
            if (ancientSite.type === 'SANCTUARY') {
                terrain = TerrainType.GRASS;
                udTerrain = TerrainType.FUNGUS;
                poiType = 'SANCTUARY';
                propType = 'SANCTUARY_SHRINE';
            } else if (ancientSite.type === 'WATCHTOWER') {
                terrain = TerrainType.COBBLESTONE;
                udTerrain = TerrainType.RUINS;
                poiType = 'WATCHTOWER';
                propType = 'WATCHTOWER_PROP';
            } else if (ancientSite.type === 'DUNGEON') {
                terrain = TerrainType.RUINS;
                udTerrain = TerrainType.CHASM;
                poiType = 'DUNGEON';
                propType = 'DUNGEON_ENTRANCE';
            } else if (ancientSite.type === 'RUINS') {
                terrain = TerrainType.RUINS;
                udTerrain = TerrainType.RUINS;
                poiType = 'ANCIENT_RUINS';
            } else {
                terrain = TerrainType.CAVE_FLOOR;
                udTerrain = TerrainType.CAVE_FLOOR;
                poiType = 'MYSTIC_CAVE';
            }
            poiName = ancientSite.name;
            poiDescription = ancientSite.description;
        } else if (terrain !== TerrainType.WATER && terrain !== TerrainType.MOUNTAIN) {
            // Capital City & Kingdom Seats
            if (q === 0 && r === 0) {
                terrain = TerrainType.CASTLE;
                udTerrain = TerrainType.RUINS;
                poiType = 'PLAZA';
                poiName = 'Gran Ciudadela de Arcadia';
                poiDescription = 'La capital del continente. Residencia del Rey y centro del comercio libre.';
            } else if (q === 2 && r === -3) {
                terrain = TerrainType.FOREST;
                udTerrain = TerrainType.FUNGUS;
                poiType = 'GOBLIN_LAIR';
                poiName = 'Guarida Oculta de Grommash';
                poiDescription = 'Un campamento de asalto y caverna fortificada con empalizadas de madera oscura.';
            } else if (q === -20 && r === -10) {
                terrain = TerrainType.VILLAGE;
                udTerrain = TerrainType.RUINS;
                poiType = 'PLAZA';
                poiName = 'Aldea Silvana de Sylvandell';
                poiDescription = 'Refugio de los elfos arqueros construido sobre las ramas de árboles milenarios.';
            } else if (q === 22 && r === 6) {
                terrain = TerrainType.CASTLE;
                udTerrain = TerrainType.RUINS;
                poiType = 'PLAZA';
                poiName = 'Bastión Enano de Kaer-Durn';
                poiDescription = 'Fortaleza excavada en la piedra viva con forjas gigantescas.';
            } else if (
                (q === 15 && r === -20) ||
                (q === -25 && r === 5) ||
                (q === 10 && r === 30) ||
                (q === -30 && r === -25) ||
                (q === 40 && r === 0)
            ) {
                terrain = TerrainType.RUINS;
                udTerrain = TerrainType.RUINS;
                poiType = 'DRAGON_LAIR';
                poiName = 'Guarida de Dragón Ancestral';
                poiDescription = 'Cúmulo de huesos carbonizados y tesoros custodiados por una bestia dracónica.';
            } else if (rng.next() > 0.982) {
                // Secondary procedural villages
                terrain = rng.next() > 0.5 ? TerrainType.VILLAGE : TerrainType.RUINS;
                udTerrain = TerrainType.RUINS;
                poiType = terrain === TerrainType.VILLAGE ? 'PLAZA' : undefined;
            }

            // Dimensional Portals
            if (rng.next() < 0.009) {
                hasPortal = true;
            }

            // Encounter Spawns (Safe zone radius 4 around origin)
            const distFromOrigin = Math.sqrt(q * q + r * r);
            if (distFromOrigin > 4) {
                if (dimension === Dimension.NORMAL) {
                    if (terrain !== TerrainType.VILLAGE && terrain !== TerrainType.CASTLE && rng.next() > 0.88) {
                        hasEncounter = true;
                    }
                } else {
                    if (rng.next() > 0.82) {
                        hasEncounter = true;
                    }
                }
            }
        }

        const finalTerrain = dimension === Dimension.NORMAL ? terrain : udTerrain;
        const finalWeather = dimension === Dimension.NORMAL ? weather : udWeather;

        const terrainEntry = TERRAIN_DATA[finalTerrain];
        const cellLayer = terrainEntry ? terrainEntry.layer : -500;
        const cellDecorations = generateDecorationsForBiome(finalTerrain, q, r);

        const cell: HexCell = {
            terrainId: finalTerrain,
            layer: cellLayer,
            decorations: cellDecorations,
            q,
            r,
            terrain: finalTerrain,
            weather: finalWeather,
            isExplored: false,
            isVisible: false,
            elevation,
            moisture,
            temperature,
            isRiver,
            kingdomId: kingdom.id,
            kingdomName: kingdom.name,
            propType,
            hasPortal,
            hasEncounter,
            poiType,
            poiName,
            poiDescription
        };

        this.tileCache.set(cacheKey, cell);
        return cell;
    }
}

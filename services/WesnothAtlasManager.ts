import * as THREE from 'three';

export interface AtlasFrame {
    filename: string;
    frame: { x: number; y: number; w: number; h: number };
    rotated: boolean;
    trimmed: boolean;
    spriteSourceSize: { x: number; y: number; w: number; h: number };
    sourceSize: { w: number; h: number };
    pivot?: { x: number; y: number };
}

export interface AtlasData {
    frames: AtlasFrame[];
    meta: {
        image: string;
        size: { w: number; h: number };
    };
}

export interface IndexedFrame {
    atlasIndex: number;
    frame: { x: number; y: number; w: number; h: number };
    pivot: { x: number; y: number };
    sourceSize: { w: number; h: number };
}

class WesnothAtlasManager {
    private static instance: WesnothAtlasManager;

    private isInitialized = false;
    private initPromise: Promise<void> | null = null;

    private frames = new Map<string, IndexedFrame>();
    private atlasImages: (HTMLImageElement | null)[] = [null, null];
    private atlasCanvases: (HTMLCanvasElement | null)[] = [null, null];
    private atlasCtxs: (CanvasRenderingContext2D | null)[] = [null, null];

    // Texture cache for sliced textures
    private textureCache = new Map<string, THREE.CanvasTexture>();
    private canvasCache = new Map<string, HTMLCanvasElement>();
    private imageCache = new Map<string, HTMLImageElement>();

    // Cached category lists
    private categoryVariants = new Map<string, string[]>();

    private listeners = new Set<() => void>();

    private constructor() {
        this.init();
    }

    public static getInstance(): WesnothAtlasManager {
        if (!WesnothAtlasManager.instance) {
            WesnothAtlasManager.instance = new WesnothAtlasManager();
        }
        return WesnothAtlasManager.instance;
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        this.listeners.forEach(l => {
            try { l(); } catch (e) { console.error('Atlas listener error:', e); }
        });
    }

    private readonly CDN_BASE_URL = 'https://raw.githubusercontent.com/kichooo/wesnoth-tiles/master/tiles';

    public async init(): Promise<void> {
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                // 1. Fetch JSON definitions prioritizing CDN
                const [res0, res1] = await Promise.all([
                    this.fetchJsonWithFallback(`${this.CDN_BASE_URL}/hexes_0.json`, '/assets/wesnoth/atlas/hexes_0.json'),
                    this.fetchJsonWithFallback(`${this.CDN_BASE_URL}/hexes_1.json`, '/assets/wesnoth/atlas/hexes_1.json')
                ]);

                if (res0) this.indexAtlas(0, res0);
                if (res1) this.indexAtlas(1, res1);

                // 2. Load PNG images prioritizing CDN
                await Promise.all([
                    this.loadAtlasImage(0, `${this.CDN_BASE_URL}/hexes_0.png`, '/assets/wesnoth/atlas/hexes_0.png'),
                    this.loadAtlasImage(1, `${this.CDN_BASE_URL}/hexes_1.png`, '/assets/wesnoth/atlas/hexes_1.png')
                ]);

                this.buildVariantCategories();
                this.isInitialized = true;
                this.notify();
            } catch (err) {
                console.warn('WesnothAtlasManager init fallback/warning:', err);
            }
        })();

        return this.initPromise;
    }

    private async fetchJsonWithFallback(localUrl: string, cdnUrl: string): Promise<AtlasData | null> {
        try {
            const res = await fetch(localUrl);
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.warn(`Local atlas JSON fetch failed for ${localUrl}, attempting CDN fallback...`);
        }
        try {
            const resCdn = await fetch(cdnUrl);
            if (resCdn.ok) {
                return await resCdn.json();
            }
        } catch (e) {
            console.error(`Failed to fetch atlas JSON from both local (${localUrl}) and CDN (${cdnUrl})`, e);
        }
        return null;
    }

    private indexAtlas(atlasIndex: number, data: AtlasData): void {
        if (!data || !data.frames) return;
        for (const item of data.frames) {
            const rawKey = item.filename;
            const entry: IndexedFrame = {
                atlasIndex,
                frame: item.frame,
                pivot: item.pivot || { x: 0.5, y: 0.5 },
                sourceSize: item.sourceSize || { w: item.frame.w, h: item.frame.h }
            };

            this.frames.set(rawKey, entry);
            // Also index with .png extension and alternative forms for easy resolution
            if (!rawKey.endsWith('.png')) {
                this.frames.set(`${rawKey}.png`, entry);
            }
            // Index short key
            const shortName = rawKey.split('/').pop();
            if (shortName && !this.frames.has(shortName)) {
                this.frames.set(shortName, entry);
                this.frames.set(`${shortName}.png`, entry);
            }
        }
    }

    private loadAtlasImage(atlasIndex: number, primarySrc: string, fallbackSrc?: string): Promise<void> {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            const setupCanvas = (loadedImg: HTMLImageElement) => {
                this.atlasImages[atlasIndex] = loadedImg;
                const canvas = document.createElement('canvas');
                canvas.width = loadedImg.width || 2048;
                canvas.height = loadedImg.height || 2048;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                    ctx.drawImage(loadedImg, 0, 0);
                    this.atlasCanvases[atlasIndex] = canvas;
                    this.atlasCtxs[atlasIndex] = ctx;
                }
                resolve();
            };

            img.onload = () => setupCanvas(img);

            img.onerror = () => {
                if (fallbackSrc) {
                    console.warn(`Local atlas image ${primarySrc} failed to load. Attempting CDN fallback: ${fallbackSrc}`);
                    const fallbackImg = new Image();
                    fallbackImg.crossOrigin = 'anonymous';
                    fallbackImg.onload = () => setupCanvas(fallbackImg);
                    fallbackImg.onerror = () => {
                        console.error(`Both local (${primarySrc}) and CDN fallback (${fallbackSrc}) failed for atlas image`);
                        resolve();
                    };
                    fallbackImg.src = fallbackSrc;
                } else {
                    console.warn(`Failed to load atlas image ${primarySrc}`);
                    resolve();
                }
            };

            img.src = primarySrc;
        });
    }

    private buildVariantCategories(): void {
        const categories: Record<string, string[]> = {
            grass: [],
            water: [],
            forest: [],
            mountains: [],
            hills: [],
            sand: [],
            frozen: [],
            swamp: [],
            village: [],
            chasm: [],
            flat: [],
            misc: [],
            embellishments: []
        };

        const directionalSuffixes = ['-n', '-s', '-ne', '-se', '-nw', '-sw', '-l', '-r', '-bl', '-br', '-tl', '-tr', '-convex', '-concave'];

        for (const [key, _val] of this.frames.entries()) {
            if (key.endsWith('.png')) continue; // Skip duplicates
            const prefix = key.split('/')[0];
            if (categories[prefix]) {
                const isDirectional = directionalSuffixes.some(s => key.includes(s));
                if (!isDirectional) {
                    categories[prefix].push(key);
                }
            }
        }

        for (const [cat, list] of Object.entries(categories)) {
            this.categoryVariants.set(cat, list);
        }
    }

    public getFrame(key: string): IndexedFrame | undefined {
        if (!key) return undefined;
        const cleanKey = key
            .replace(/^\/assets\/wesnoth\//, '')
            .replace(/^terrain\//, '')
            .replace(/\.png$/, '')
            .replace(/-tile$/, '')
            .trim();

        if (this.frames.has(cleanKey)) return this.frames.get(cleanKey);
        if (this.frames.has(key)) return this.frames.get(key);

        // Alias matching for standard paths
        if (cleanKey.includes('grass/green') || cleanKey === 'grass') {
            return this.frames.get('grass/green') || this.frames.get('grass/dry');
        }
        if (cleanKey.includes('grass/dry') || cleanKey.includes('grass/semi-dry') || cleanKey === 'plains') {
            return this.frames.get('grass/dry') || this.frames.get('grass/green');
        }
        if (cleanKey.includes('forest/deciduous') || cleanKey.includes('forest/summer')) {
            return this.frames.get('forest/deciduous-summer-small') || this.frames.get('forest/deciduous-fall');
        }
        if (cleanKey.includes('forest/pine') || cleanKey.includes('pine-tile')) {
            return this.frames.get('forest/pine-sparse') || this.frames.get('forest/deciduous-summer-small');
        }
        if (cleanKey.includes('forest') || cleanKey.includes('jungle')) {
            return this.frames.get('forest/deciduous-summer-small') || this.frames.get('grass/green');
        }
        if (cleanKey.includes('mountains') || cleanKey.includes('mountain') || cleanKey.includes('rock')) {
            return this.frames.get('mountains/basic') || this.frames.get('mountains/basic2') || this.frames.get('hills/regular');
        }
        if (cleanKey.includes('water') || cleanKey.includes('coast') || cleanKey.includes('ocean')) {
            return this.frames.get('water/coast-tropical-A01') || this.frames.get('water/ocean-A01');
        }
        if (cleanKey.includes('sand') || cleanKey.includes('desert')) {
            return this.frames.get('sand/beach') || this.frames.get('sand/beach2') || this.frames.get('hills/desert');
        }
        if (cleanKey.includes('frozen') || cleanKey.includes('snow') || cleanKey.includes('ice') || cleanKey.includes('tundra')) {
            return this.frames.get('frozen/snow') || this.frames.get('frozen/ice');
        }
        if (cleanKey.includes('swamp') || cleanKey.includes('mud')) {
            return this.frames.get('swamp/reed-small2') || this.frames.get('village/swampwater');
        }
        if (cleanKey.includes('village') || cleanKey.includes('human-city') || cleanKey.includes('camp')) {
            return this.frames.get('village/human') || this.frames.get('village/human-city') || this.frames.get('village/camp');
        }
        if (cleanKey.includes('castle') || cleanKey.includes('ruin') || cleanKey.includes('keep')) {
            return this.frames.get('village/human-city-ruin') || this.frames.get('village/human-city') || this.frames.get('village/camp');
        }
        if (cleanKey.includes('chasm') || cleanKey.includes('cave') || cleanKey.includes('abyss')) {
            return this.frames.get('chasm/abyss') || this.frames.get('village/cave');
        }

        return undefined;
    }

    public hasFrame(key: string): boolean {
        return !!this.getFrame(key);
    }

    /**
     * Slices an exact 2D HTMLCanvasElement for any Wesnoth frame key.
     * Perfect for 2D Canvas OverworldMap, minimap, and icon rendering.
     */
    public getCanvas(key: string): HTMLCanvasElement | null {
        if (!key) return null;
        if (this.canvasCache.has(key)) {
            return this.canvasCache.get(key)!;
        }

        const frameData = this.getFrame(key);
        if (!frameData) return null;

        const { atlasIndex, frame } = frameData;
        const img = this.atlasImages[atlasIndex];
        if (!img) return null;

        const canvas = document.createElement('canvas');
        canvas.width = frame.w;
        canvas.height = frame.h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);

        this.canvasCache.set(key, canvas);
        return canvas;
    }

    /**
     * Slices an exact HTMLImageElement for any Wesnoth frame key.
     */
    public getImage(key: string): HTMLImageElement | null {
        if (!key) return null;
        if (this.imageCache.has(key)) {
            return this.imageCache.get(key)!;
        }

        const canvas = this.getCanvas(key);
        if (!canvas) return null;

        const img = new Image();
        img.src = canvas.toDataURL();
        this.imageCache.set(key, img);
        return img;
    }

    /**
     * Gets or creates a crisp THREE.CanvasTexture sliced from the atlas for a specific frame key.
     */
    public getTexture(key: string): THREE.CanvasTexture | null {
        const frameData = this.getFrame(key);
        if (!frameData) return null;

        if (this.textureCache.has(key)) {
            return this.textureCache.get(key)!;
        }

        const canvas = this.getCanvas(key);
        if (!canvas) return null;

        const tex = new THREE.CanvasTexture(canvas);
        tex.generateMipmaps = false;
        tex.minFilter = THREE.NearestFilter;
        tex.magFilter = THREE.NearestFilter;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;

        this.textureCache.set(key, tex);
        return tex;
    }

    /**
     * Deterministic Wesnoth frame for all 22 terrain types on 2D hex coords (q, r).
     */
    public getTerrainFrameKey(terrain: string, q: number = 0, r: number = 0): string {
        const t = (terrain || '').toLowerCase();
        const hash = Math.abs(Math.floor(Math.sin(q * 12.9898 + r * 78.233) * 43758.5453));

        if (t === 'grass') {
            const list = ['grass/green', 'grass/green2', 'grass/green3', 'grass/green4', 'grass/green5', 'grass/green6', 'grass/green7', 'grass/green8'];
            return list[hash % list.length];
        }
        if (t === 'plains') {
            const list = ['grass/semi-dry', 'grass/semi-dry2', 'grass/semi-dry3', 'grass/semi-dry4', 'grass/semi-dry5', 'grass/semi-dry6'];
            return list[hash % list.length];
        }
        if (t === 'taiga') {
            const list = ['grass/dry', 'grass/dry2', 'grass/dry3', 'grass/dry4', 'grass/dry5', 'grass/dry6'];
            return list[hash % list.length];
        }
        if (t === 'forest') {
            const list = ['grass/green', 'grass/green2', 'grass/green3', 'grass/green4'];
            return list[hash % list.length];
        }
        if (t === 'jungle') {
            const list = ['grass/green', 'grass/green2', 'grass/green3'];
            return list[hash % list.length];
        }
        if (t === 'mountain') {
            const list = ['mountains/basic', 'mountains/basic2', 'mountains/basic3', 'mountains/dry', 'mountains/dry2', 'mountains/peak'];
            return list[hash % list.length];
        }
        if (t === 'water') {
            const list = ['water/ocean-A01', 'water/ocean-A02', 'water/ocean-A03', 'water/reef', 'water/reef2'];
            return list[hash % list.length];
        }
        if (t === 'desert') {
            const list = ['sand/desert', 'sand/desert2', 'sand/desert3', 'sand/beach', 'sand/beach2'];
            return list[hash % list.length];
        }
        if (t === 'swamp') {
            const list = ['swamp/mud', 'swamp/mud2', 'swamp/mud3', 'swamp/water', 'swamp/reed'];
            return list[hash % list.length];
        }
        if (t === 'tundra') {
            const list = ['frozen/snow', 'frozen/snow2', 'frozen/snow3', 'frozen/ice', 'hills/snow'];
            return list[hash % list.length];
        }
        if (t === 'village') {
            const list = ['village/human', 'village/human-city', 'village/elven', 'village/dwarven', 'village/log-cabin'];
            return list[hash % list.length];
        }
        if (t === 'castle') {
            const list = ['village/human-city', 'village/human-city2', 'village/human-hills', 'village/dwarven'];
            return list[hash % list.length];
        }
        if (t === 'ruins') {
            const list = ['village/human-cottage-ruin2', 'village/human-cottage-ruin3', 'village/human-hills-ruin', 'misc/rubble'];
            return list[hash % list.length];
        }
        if (t === 'cave_floor' || t === 'cave') {
            const list = ['village/cave', 'village/cave2', 'village/cave3', 'chasm/abyss'];
            return list[hash % list.length];
        }
        if (t === 'fungus') {
            const list = ['forest/mushrooms', 'forest/mushrooms2', 'forest/mushrooms3', 'forest/mushrooms4'];
            return list[hash % list.length];
        }
        if (t === 'lava') {
            const list = ['mountains/volcano', 'mountains/volcano6_1', 'mountains/volcano6_2'];
            return list[hash % list.length];
        }
        if (t === 'chasm') {
            const list = ['chasm/abyss', 'chasm/abyss2', 'chasm/abyss3', 'chasm/abyss4', 'chasm/abyss5'];
            return list[hash % list.length];
        }
        if (t === 'cobblestone') {
            const list = ['hills/regular', 'hills/regular2', 'village/human-city'];
            return list[hash % list.length];
        }
        if (t === 'dirt_road') {
            const list = ['grass/dry', 'grass/dry2', 'sand/desert'];
            return list[hash % list.length];
        }
        if (t === 'wood_floor') {
            const list = ['village/log-cabin', 'village/human'];
            return list[hash % list.length];
        }
        if (t === 'stone_floor') {
            const list = ['village/cave', 'village/cave2'];
            return list[hash % list.length];
        }
        if (t === 'wall_house') {
            const list = ['village/human-city', 'village/dwarven'];
            return list[hash % list.length];
        }
        return 'grass/green';
    }

    /**
     * Gets a canvas ready for 2D map drawing for a specific terrain and hex coordinates.
     */
    public getCanvasForTerrain(terrain: string, q: number = 0, r: number = 0): HTMLCanvasElement | null {
        const frameKey = this.getTerrainFrameKey(terrain, q, r);
        return this.getCanvas(frameKey);
    }

    /**
     * Gets tree / nature prop frame keys for overlays
     */
    public getTreePropKey(terrain: string, seed: number = 0): string {
        const t = (terrain || '').toLowerCase();
        const hash = Math.abs(seed);
        if (t.includes('taiga') || t.includes('tundra') || t.includes('snow')) {
            const list = ['forest/pine', 'forest/pine2', 'forest/snow-forest', 'forest/snow-forest2'];
            return list[hash % list.length];
        }
        if (t.includes('jungle')) {
            const list = ['forest/tropical/jungle', 'forest/tropical/jungle2', 'forest/tropical/palms', 'forest/tropical/rainforest'];
            return list[hash % list.length];
        }
        const list = ['forest/deciduous-summer-small', 'forest/pine-sparse', 'forest/pine', 'forest/deciduous-fall'];
        return list[hash % list.length];
    }

    /**
     * Returns all base variant keys for a given terrain type (e.g. 'grass', 'water', 'sand', etc.)
     */
    public getVariants(category: string): string[] {
        const cat = category.toLowerCase();
        const found = this.categoryVariants.get(cat);
        if (found && found.length > 0) return found;

        // Fallback search
        const fallback: string[] = [];
        for (const [key] of this.frames.entries()) {
            if (key.startsWith(`${cat}/`) && !key.endsWith('.png')) {
                fallback.push(key);
            }
        }
        return fallback;
    }

    /**
     * Deterministic variant selection based on grid coordinates (x, z)
     */
    public getDeterministicVariant(category: string, x: number, z: number, seed: number = 42): string {
        const variants = this.getVariants(category);
        if (!variants || variants.length === 0) {
            return `${category}/default`;
        }

        // 32-bit spatial hash
        let h = ((x * 73856093) ^ (z * 19349663) ^ (seed * 83492791)) >>> 0;
        h = ((h ^ (h >> 13)) * 1274126177) >>> 0;
        const index = h % variants.length;
        return variants[index];
    }

    /**
     * Obtains directional blend overlay frames for a tile based on its neighbors.
     */
    public getDirectionalTransitionFrames(
        centerTerrain: string,
        neighborDirections: { [dir in 'n' | 'ne' | 'se' | 's' | 'sw' | 'nw']?: string }
    ): { direction: string; frameKey: string }[] {
        const transitions: { direction: string; frameKey: string }[] = [];
        const normCenter = centerTerrain.toLowerCase();

        const dirs: ('n' | 'ne' | 'se' | 's' | 'sw' | 'nw')[] = ['n', 'ne', 'se', 's', 'sw', 'nw'];
        for (const dir of dirs) {
            const neighbor = neighborDirections[dir];
            if (neighbor && neighbor.toLowerCase() !== normCenter) {
                // Check if there is an overlay for the neighbor onto center or center blending out
                const candidateKey1 = `${normCenter}/${normCenter}-${dir}`;
                const candidateKey2 = `${normCenter}/dry-${dir}`;
                const candidateKey3 = `${normCenter}/green-${dir}`;
                const candidateKey4 = `water/coast-tropical-A01-${dir}`;

                if (this.hasFrame(candidateKey1)) {
                    transitions.push({ direction: dir, frameKey: candidateKey1 });
                } else if (this.hasFrame(candidateKey3)) {
                    transitions.push({ direction: dir, frameKey: candidateKey3 });
                } else if (this.hasFrame(candidateKey2)) {
                    transitions.push({ direction: dir, frameKey: candidateKey2 });
                } else if (normCenter.includes('water') && this.hasFrame(candidateKey4)) {
                    transitions.push({ direction: dir, frameKey: candidateKey4 });
                }
            }
        }

        return transitions;
    }

    /**
     * Water animation frame helper (cycles from 1 to 15)
     */
    public getAnimatedWaterKey(frameIndex: number, type: 'tropical' | 'ocean' = 'tropical'): string {
        const normalizedIndex = (Math.abs(Math.floor(frameIndex)) % 15) + 1;
        const pad = normalizedIndex < 10 ? `0${normalizedIndex}` : `${normalizedIndex}`;
        if (type === 'ocean') {
            return `water/ocean-A${pad}`;
        }
        return `water/coast-tropical-A${pad}`;
    }

    /**
     * Water blend animation frame helper for a direction (cycles from 1 to 15)
     */
    public getAnimatedCoastBlendKey(direction: string, frameIndex: number): string {
        const normalizedIndex = (Math.abs(Math.floor(frameIndex)) % 15) + 1;
        const pad = normalizedIndex < 10 ? `0${normalizedIndex}` : `${normalizedIndex}`;
        return `water/coast-tropical-A${pad}-${direction}`;
    }

    /**
     * Wave concave frame helper (cycles from 1 to 6)
     */
    public getAnimatedWaveConcaveKey(direction: string, frameIndex: number): string {
        const normalizedIndex = (Math.abs(Math.floor(frameIndex)) % 6) + 1;
        const pad = `0${normalizedIndex}`;
        return `water/waves-concave-A${pad}-${direction}`;
    }

    /**
     * Returns appropriate village / structure frame for a given terrain theme
     */
    public getVillageBuildingForTerrain(terrainCategory: string, x: number, z: number): string {
        const cat = terrainCategory.toLowerCase();
        let list: string[] = [];

        if (cat.includes('snow') || cat.includes('ice') || cat.includes('frozen')) {
            list = ['village/elven-snow', 'village/human-snow', 'village/igloo', 'village/hut-snow', 'village/log-cabin-snow'];
        } else if (cat.includes('desert') || cat.includes('sand')) {
            list = ['village/desert-oasis-1', 'village/desert-camp', 'village/desert', 'village/desert2'];
        } else if (cat.includes('swamp')) {
            list = ['village/swampwater', 'village/swampwater2', 'village/hut', 'village/hut2'];
        } else if (cat.includes('mountain') || cat.includes('cave') || cat.includes('stone')) {
            list = ['village/dwarven', 'village/dwarven2', 'village/cave', 'village/cave2'];
        } else if (cat.includes('forest')) {
            list = ['village/elven', 'village/elven2', 'village/log-cabin', 'village/tropical-forest'];
        } else if (cat.includes('ruin') || cat.includes('castle')) {
            list = ['village/human-city-ruin', 'village/human-cottage-ruin', 'village/camp'];
        } else {
            list = ['village/human', 'village/human2', 'village/human-city', 'village/camp', 'village/log-cabin'];
        }

        // Filter for frames actually existing in atlas
        const available = list.filter(f => this.hasFrame(f));
        if (available.length === 0) {
            return 'village/human';
        }

        const seed = ((x * 374761393) ^ (z * 668265263)) >>> 0;
        return available[seed % available.length];
    }

    /**
     * Memory cleanup helper for mobile performance: safely clears texture caches if needed.
     */
    public clearTextureCache(): void {
        this.textureCache.forEach(tex => tex.dispose());
        this.textureCache.clear();
    }

    public getStatus(): { isReady: boolean; totalFrames: number; cachedTextures: number } {
        return {
            isReady: this.isInitialized,
            totalFrames: this.frames.size,
            cachedTextures: this.textureCache.size
        };
    }
}

export const wesnothAtlas = WesnothAtlasManager.getInstance();

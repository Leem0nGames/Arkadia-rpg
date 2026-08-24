import * as THREE from 'three';
import { ASSETS, MC_BASE_URL, WESNOTH_BASE_URL, sanitizeAssetUrl } from '../constants';
import { VISUAL_CONFIG } from '../constants/visualConfig';
import { TerrainType } from '../types';
import { wesnothAtlas } from './WesnothAtlasManager';

export type TextureSourceType = 'LOCAL' | 'REMOTE' | 'PROCEDURAL';

export interface TextureMetadata {
  key: string;
  url: string;
  status: 'LOADED' | 'LOADING' | 'ERROR';
  sourceType?: TextureSourceType;
  folder: 'minecraft' | 'wesnoth' | 'other';
  width?: number;
  height?: number;
  requestedAt: number;
  resolvedAt?: number;
  error?: string;
  usedRemoteFallback?: boolean;
  isProcedural?: boolean;
  thumbnailUrl?: string;
}

export interface TextureDiagnosticReport {
  totalRequested: number;
  loadedCount: number;
  localCount: number;
  remoteCount: number;
  proceduralCount: number;
  loadingCount: number;
  errorCount: number;
  byFolder: {
    minecraft: { total: number; local: number; remote: number; procedural: number; error: number };
    wesnoth: { total: number; local: number; remote: number; procedural: number; error: number };
    other: { total: number; local: number; remote: number; procedural: number; error: number };
  };
  textures: TextureMetadata[];
}

class UnifiedTextureManager {
  private static instance: UnifiedTextureManager;

  // Single source of truth caches
  private imageCache = new Map<string, HTMLImageElement>();
  private threeTextureCache = new Map<string, THREE.Texture>();
  private diagnosticRegistry = new Map<string, TextureMetadata>();
  private listeners = new Set<() => void>();

  private constructor() {}

  public static getInstance(): UnifiedTextureManager {
    if (!UnifiedTextureManager.instance) {
      UnifiedTextureManager.instance = new UnifiedTextureManager();
    }
    return UnifiedTextureManager.instance;
  }

  /**
   * Resolves any block name, terrain type, unit key, or URL into a standardized asset path.
   */
  public resolveAssetUrl(keyOrUrl: string): string {
    if (!keyOrUrl) return `${MC_BASE_URL}/dirt.png`;

    const sanitizedUrl = sanitizeAssetUrl(keyOrUrl);
    const trimmed = sanitizedUrl.trim();

    // 1. Direct Data URLs or HTTP/HTTPS URLs
    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    // 2. Direct relative path starting with /assets/
    if (trimmed.startsWith('/assets/')) {
      return trimmed;
    }

    // 3. Check BLOCK_TEXTURES mapping in ASSETS
    const blockTexMap = ASSETS.BLOCK_TEXTURES as Record<string, string>;
    if (blockTexMap[trimmed]) return blockTexMap[trimmed];

    // 4. Check UNITS mapping in ASSETS
    const unitMap = ASSETS.UNITS as Record<string, string>;
    if (unitMap[trimmed]) return unitMap[trimmed];

    // 5. Check VOXEL_STRUCTURE_TEXTURES
    const voxelMap = ASSETS.VOXEL_STRUCTURE_TEXTURES as Record<string, string>;
    if (voxelMap[trimmed]) return voxelMap[trimmed];

    // 6. Check DECORATIONS
    const decorMap = ASSETS.DECORATIONS as Record<string, string>;
    if (decorMap[trimmed]) return decorMap[trimmed];

    // 7. Smart fallback mapping for short filenames (e.g. 'skeleton.png', 'grass.png') using Minecraft block textures
    const lower = trimmed.toLowerCase();
    if (lower.includes('skeleton')) return ASSETS.UNITS.SKELETON;
    if (lower.includes('thunderer')) return ASSETS.UNITS.PLAYER_GNOME;
    if (lower.includes('paladin')) return ASSETS.UNITS.PLAYER_PALADIN;
    if (lower.includes('grass')) return ASSETS.BLOCK_TEXTURES[TerrainType.GRASS] || `${MC_BASE_URL}/grass_block_top.png`;
    if (lower.includes('forest')) return ASSETS.BLOCK_TEXTURES[TerrainType.FOREST] || `${MC_BASE_URL}/grass_block_top.png`;
    if (lower.includes('plains')) return ASSETS.BLOCK_TEXTURES[TerrainType.PLAINS] || `${MC_BASE_URL}/grass_block_top.png`;

    if (trimmed.startsWith('/')) {
      return trimmed;
    }

    // 9. Default Minecraft block filename mapping (e.g. 'stone' -> '/assets/minecraft/stone.png')
    const sanitized = lower.replace(/[^a-z0-9_.]/g, '');
    const finalFilename = sanitized.endsWith('.png') ? sanitized : `${sanitized}.png`;
    return `${MC_BASE_URL}/${finalFilename}`;
  }

  private getFolderCategory(url: string): 'minecraft' | 'wesnoth' | 'other' {
    if (url.includes('/assets/minecraft') || url.includes('minecraft-assets')) return 'minecraft';
    if (url.includes('/assets/wesnoth') || url.includes('wesnoth')) return 'wesnoth';
    return 'other';
  }

  /**
   * Deterministic hash helper for procedural pixel textures
   */
  private pixelHash(x: number, y: number, seed: number = 1337): number {
    let h = (x * 374761393 + y * 668265263 + seed) ^ (x * 1274126177);
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967296;
  }

  /**
   * Generates high-quality authentic pixel-art block textures directly onto a canvas.
   */
  public generateProceduralPixelArt(canvas: HTMLCanvasElement, keyOrUrl: string, fallbackColor: string = '#64748b'): void {
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(32, 32);
    const data = imgData.data;
    const n = (keyOrUrl || fallbackColor || '').toLowerCase();

    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const h = this.pixelHash(x, y, 1337);
        const h2 = this.pixelHash(x, y, 9999);
        let r = 100, g = 100, b = 100, a = 255;

        if (n.includes('terrain/') && n.includes('-')) {
          // Hex directional transition edge blend
          if (n.includes('water')) { r = 20; g = 120; b = 210; }
          else if (n.includes('mountain')) { r = 130; g = 130; b = 130; }
          else if (n.includes('forest')) { r = 35; g = 95; b = 25; }
          else if (n.includes('desert') || n.includes('sand')) { r = 210; g = 180; b = 120; }
          else { r = 50; g = 135; b = 40; }
          
          const distFromCenter = Math.hypot(x - 16, y - 16) / 16;
          a = Math.max(0, Math.min(255, Math.floor((1 - distFromCenter * 0.7) * 200)));
        } else if (n.includes('stone_brick') || n.includes('stone_bricks')) {
          const isCracked = n.includes('cracked');
          const isMossy = n.includes('mossy');
          const row = Math.floor(y / 16);
          const rowY = y % 16;
          const colOffset = row === 0 ? 0 : 8;
          const colX = (x + colOffset) % 16;

          if (rowY === 0 || rowY === 15 || colX === 0 || colX === 15) {
            r = 50; g = 55; b = 60; // Mortar groove
          } else if (isMossy && this.pixelHash(x, y, 77) > 0.65) {
            r = 75 + Math.floor(h * 25); g = 130 + Math.floor(h * 35); b = 30; // Moss
          } else if (isCracked && Math.abs((x * 2 + y * 3) % 17 - 8) < 1) {
            r = 35; g = 40; b = 45; // Crack
          } else if (rowY === 1 || colX === 1) {
            r = 145; g = 145; b = 150; // Bevel highlight
          } else if (rowY === 14 || colX === 14) {
            r = 80; g = 85; b = 90; // Bevel shadow
          } else {
            const v = 110 + Math.floor(h * 25);
            r = v; g = v; b = v + 2;
          }
        } else if (n.includes('cobblestone')) {
          const isMossy = n.includes('mossy');
          const cellX = Math.floor(x / 8);
          const cellY = Math.floor(y / 8);
          const localX = x % 8;
          const localY = y % 8;

          if (localX === 0 || localY === 0) {
            r = 40; g = 45; b = 50; // Dark mortar
          } else if (isMossy && this.pixelHash(x, y, 88) > 0.6) {
            r = 70 + Math.floor(h * 30); g = 135 + Math.floor(h * 30); b = 35;
          } else {
            const cHash = this.pixelHash(cellX, cellY, 123);
            const baseV = 90 + Math.floor(cHash * 40) + Math.floor(h * 15);
            if (localX === 1 || localY === 1) {
              r = baseV + 20; g = baseV + 20; b = baseV + 25;
            } else {
              r = baseV; g = baseV; b = baseV + 5;
            }
          }
        } else if (n.includes('deepslate')) {
          const inLayer = y % 4;
          if (inLayer === 0) {
            r = 25; g = 25; b = 30;
          } else {
            const v = 45 + Math.floor(h * 20);
            r = v; g = v + 2; b = v + 5;
          }
        } else if (n.includes('bedrock')) {
          const v = Math.floor(h * 80);
          r = v; g = v; b = v;
        } else if (n.includes('obsidian') || n.includes('chasm') || n.includes('black_concrete')) {
          const v = 15 + Math.floor(h * 25);
          if (h2 > 0.88) {
            r = 135; g = 65; b = 210; // Arcane purple crystal glint
          } else {
            r = v + 5; g = v; b = v + 15;
          }
        } else if (n.includes('plank') || n.includes('wood_floor') || n.includes('oak_planks')) {
          const plankY = Math.floor(y / 8);
          const inPlankY = y % 8;
          if (inPlankY === 0) {
            r = 80; g = 40; b = 10; // Dark plank seam
          } else {
            const grain = Math.floor(Math.sin(x * 0.4 + plankY * 2.5) * 8);
            r = 180 + grain + Math.floor(h * 15);
            g = 130 + grain + Math.floor(h * 12);
            b = 70 + grain + Math.floor(h * 10);
            if ((x === 2 || x === 30) && (inPlankY === 4)) {
              r = 40; g = 20; b = 5; // Iron nail
            }
          }
        } else if (n.includes('log')) {
          const ridge = Math.floor(Math.sin(x * 1.5) * 15);
          const v = 70 + ridge + Math.floor(h * 20);
          r = Math.floor(v * 1.2); g = Math.floor(v * 0.7); b = Math.floor(v * 0.4);
        } else if (n.includes('leaves')) {
          const isAzalea = n.includes('azalea');
          if (isAzalea && h2 > 0.84) {
            r = 236; g = 72; b = 153; // Flowering bloom
          } else {
            const gVal = 100 + Math.floor(h * 100);
            r = Math.floor(gVal * 0.3); g = gVal; b = Math.floor(gVal * 0.2);
          }
        } else if (n.includes('grass_block') || n.includes('grass') || n.includes('plains')) {
          const gVal = 120 + Math.floor(h * 90);
          r = Math.floor(gVal * 0.4); g = gVal; b = Math.floor(gVal * 0.2);
        } else if (n.includes('dirt') || n.includes('podzol') || n.includes('ruins')) {
          r = 120 + Math.floor(h * 30);
          g = Math.floor(r * 0.6);
          b = Math.floor(r * 0.35);
        } else if (n.includes('sandstone') || n.includes('sand') || n.includes('desert')) {
          r = 215 + Math.floor(h * 25);
          g = 180 + Math.floor(h * 20);
          b = 120 + Math.floor(h * 20);
        } else if (n.includes('brick') || n.includes('wall_house')) {
          const row = Math.floor(y / 8);
          const rowY = y % 8;
          const colOffset = (row % 2 === 0) ? 0 : 8;
          const colX = (x + colOffset) % 16;
          if (rowY === 0 || colX === 0) {
            r = 200; g = 200; b = 200; // Mortar
          } else {
            r = 170 + Math.floor(h * 40);
            g = 55 + Math.floor(h * 20);
            b = 45 + Math.floor(h * 15);
          }
        } else if (n.includes('lava')) {
          if (h > 0.7) { r = 255; g = 230; b = 80; }
          else if (h > 0.35) { r = 240; g = 100; b = 20; }
          else { r = 160; g = 40; b = 10; }
        } else if (n.includes('water') || n.includes('blue_concrete')) {
          const wave = Math.sin(x * 0.3 + y * 0.3);
          b = 215 + Math.floor(wave * 30) + Math.floor(h * 15);
          r = 20; g = 125 + Math.floor(wave * 20);
        } else if (n.includes('snow') || n.includes('tundra')) {
          const v = 235 + Math.floor(h * 20);
          r = v; g = v; b = v + 2;
        } else if (n.includes('bookshelf')) {
          if (y < 4 || y > 27 || (y >= 14 && y <= 17)) {
            r = 150; g = 100; b = 50;
          } else {
            const bookIdx = Math.floor(x / 4);
            const bookColors = [[180, 40, 40], [40, 120, 180], [40, 160, 60], [200, 160, 40]];
            const c = bookColors[bookIdx % bookColors.length];
            r = c[0] + Math.floor(h * 20);
            g = c[1] + Math.floor(h * 20);
            b = c[2] + Math.floor(h * 20);
          }
        } else if (n.includes('mycelium') || n.includes('mushroom') || n.includes('fungus') || n.includes('swamp')) {
          r = 100 + Math.floor(h * 30);
          g = 70 + Math.floor(h * 25);
          b = 110 + Math.floor(h * 35);
          if (h2 > 0.88) { r = 200; g = 80; b = 220; }
        } else if (fallbackColor && fallbackColor.startsWith('#') && fallbackColor.length >= 7) {
          const hexR = parseInt(fallbackColor.slice(1, 3), 16) || 100;
          const hexG = parseInt(fallbackColor.slice(3, 5), 16) || 100;
          const hexB = parseInt(fallbackColor.slice(5, 7), 16) || 100;
          const noise = Math.floor((h - 0.5) * 30);
          r = Math.max(0, Math.min(255, hexR + noise));
          g = Math.max(0, Math.min(255, hexG + noise));
          b = Math.max(0, Math.min(255, hexB + noise));
        } else {
          const v = 115 + Math.floor(h * 30);
          r = v; g = v; b = v;
        }

        const offset = (y * 32 + x) * 4;
        data[offset] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
        data[offset + 3] = a;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Creates a pixelated procedural canvas texture as an immediate fallback or standalone texture.
   */
  public createProceduralCanvasTexture(keyOrUrl: string = '', fallbackColor: string = '#64748b'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    const isUnitOrSprite = keyOrUrl.includes('/units/') || keyOrUrl.includes('/halo/') || keyOrUrl.includes('/projectiles/') || keyOrUrl.includes('/items/') || fallbackColor === 'transparent';

    if (isUnitOrSprite) {
      // Create transparent placeholder with subtle soft silhouette
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 32, 32);
      }
    } else {
      this.generateProceduralPixelArt(canvas, keyOrUrl, fallbackColor);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Helper to create a ready-to-use THREE.CanvasTexture directly from a loaded HTMLImageElement
   */
  private createTextureFromImage(img: HTMLImageElement): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    const width = img.naturalWidth || img.width || 32;
    const height = img.naturalHeight || img.height || 32;
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Slices or gets a 2D HTMLCanvasElement for any terrain, unit, block, or Wesnoth atlas key.
   */
  public get2DCanvas(keyOrUrl: string): HTMLCanvasElement | null {
    if (!keyOrUrl) return null;
    const atlasCanvas = wesnothAtlas.getCanvas(keyOrUrl);
    if (atlasCanvas) return atlasCanvas;

    const url = this.resolveAssetUrl(keyOrUrl);
    const atlasCanvasFromUrl = wesnothAtlas.getCanvas(url);
    if (atlasCanvasFromUrl) return atlasCanvasFromUrl;

    const img = this.get2DImage(keyOrUrl);
    if (img && (img.naturalWidth || img.width)) {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 32;
      canvas.height = img.naturalHeight || img.height || 32;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0);
        return canvas;
      }
    }
    return null;
  }

  private getCdnFallbackUrl(url: string): string | null {
    if (url.startsWith('/assets/wesnoth/')) {
      const subPath = url.replace('/assets/wesnoth/', '');
      return `https://raw.githubusercontent.com/wesnoth/wesnoth/master/data/core/images/${subPath}`;
    }
    if (url.startsWith('/assets/minecraft/')) {
      const subPath = url.replace('/assets/minecraft/', '');
      return `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/block/${subPath}`;
    }
    return null;
  }

  /**
   * Asynchronously loads a 2D HTMLImageElement with automatic Wesnoth Atlas & local -> remote CDN fallback.
   * Usable for 2D Canvas rendering (OverworldMap).
   */
  public get2DImage(keyOrUrl: string, onLoaded?: (img: HTMLImageElement | null) => void): HTMLImageElement | null {
    const url = this.resolveAssetUrl(keyOrUrl);

    if (this.imageCache.has(url)) {
      const cached = this.imageCache.get(url)!;
      if (onLoaded) onLoaded(cached);
      return cached;
    }

    // 1. Check Wesnoth Atlas first
    const atlasImg = wesnothAtlas.getImage(keyOrUrl) || wesnothAtlas.getImage(url);
    if (atlasImg) {
      this.imageCache.set(url, atlasImg);
      const metadata: TextureMetadata = {
        key: keyOrUrl,
        url,
        status: 'LOADED',
        sourceType: 'LOCAL',
        folder: 'wesnoth',
        width: atlasImg.naturalWidth || atlasImg.width || 72,
        height: atlasImg.naturalHeight || atlasImg.height || 72,
        requestedAt: Date.now(),
        resolvedAt: Date.now()
      };
      this.diagnosticRegistry.set(url, metadata);
      if (onLoaded) onLoaded(atlasImg);
      return atlasImg;
    }

    const folder = this.getFolderCategory(url);
    const metadata: TextureMetadata = {
      key: keyOrUrl,
      url,
      status: 'LOADING',
      folder,
      requestedAt: Date.now()
    };
    this.diagnosticRegistry.set(url, metadata);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const handleSuccess = (loadedImg: HTMLImageElement, source: TextureSourceType = 'LOCAL') => {
      this.imageCache.set(url, loadedImg);
      metadata.status = 'LOADED';
      metadata.sourceType = source;
      metadata.width = loadedImg.naturalWidth || loadedImg.width || 32;
      metadata.height = loadedImg.naturalHeight || loadedImg.height || 32;
      metadata.resolvedAt = Date.now();
      metadata.usedRemoteFallback = (source === 'REMOTE');
      metadata.isProcedural = (source === 'PROCEDURAL');
      try {
        metadata.thumbnailUrl = loadedImg.src;
      } catch (e) {
        // ignore data url size issues
      }
      this.diagnosticRegistry.set(url, metadata);

      // If a Three.js canvas texture was already created for this URL, update its canvas now
      const cacheKey = url || keyOrUrl;
      if (this.threeTextureCache.has(cacheKey)) {
        const existingTex = this.threeTextureCache.get(cacheKey)!;
        if (existingTex.image && existingTex.image instanceof HTMLCanvasElement) {
          const canvas = existingTex.image as HTMLCanvasElement;
          const targetW = loadedImg.naturalWidth || loadedImg.width || 32;
          const targetH = loadedImg.naturalHeight || loadedImg.height || 32;
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, targetW, targetH);
            ctx.drawImage(loadedImg, 0, 0, targetW, targetH);
            existingTex.magFilter = THREE.NearestFilter;
            existingTex.minFilter = THREE.NearestFilter;
            existingTex.colorSpace = THREE.SRGBColorSpace;
            existingTex.needsUpdate = true;
          }
        }
      }

      this.notifyListeners();
      if (onLoaded) onLoaded(loadedImg);
    };

    const triggerProceduralFallback = () => {
      try {
        const pCanvas = document.createElement('canvas');
        this.generateProceduralPixelArt(pCanvas, keyOrUrl || url);
        const pImg = new Image();
        pImg.onload = () => handleSuccess(pImg, 'PROCEDURAL');
        pImg.src = pCanvas.toDataURL();
      } catch (err) {
        metadata.status = 'ERROR';
        metadata.error = 'Error en carga de imagen';
        metadata.resolvedAt = Date.now();
        this.diagnosticRegistry.set(url, metadata);
        this.notifyListeners();
        if (onLoaded) onLoaded(null);
      }
    };

    img.onload = () => handleSuccess(img, 'LOCAL');

    img.onerror = () => {
      const cdnFallback = this.getCdnFallbackUrl(url);
      if (cdnFallback) {
        const cdnImg = new Image();
        cdnImg.crossOrigin = 'anonymous';
        cdnImg.onload = () => handleSuccess(cdnImg, 'REMOTE');
        cdnImg.onerror = () => triggerProceduralFallback();
        cdnImg.src = cdnFallback;
      } else {
        triggerProceduralFallback();
      }
    };

    img.src = url;
    return null;
  }

  /**
   * Safely loads a Three.js THREE.Texture container backed by the unified image cache.
   * Usable for 3D scenes (BattleScene, Hunt3DScene, VoxelMap3D).
   */
  public get3DTexture(keyOrUrl: string, fallbackColor: string = '#64748b'): THREE.Texture {
    // 0. Check if Wesnoth Atlas provides this frame directly
    const atlasTex = wesnothAtlas.getTexture(keyOrUrl);
    if (atlasTex) {
      return atlasTex;
    }

    const url = this.resolveAssetUrl(keyOrUrl);
    const cacheKey = url || keyOrUrl || fallbackColor;

    if (this.threeTextureCache.has(cacheKey)) {
      return this.threeTextureCache.get(cacheKey)!;
    }

    // Check atlas with resolved url
    const atlasTexResolved = wesnothAtlas.getTexture(url);
    if (atlasTexResolved) {
      this.threeTextureCache.set(cacheKey, atlasTexResolved);
      return atlasTexResolved;
    }

    // If the 2D image is already loaded in memory, build the 3D texture immediately!
    if (this.imageCache.has(url)) {
      const cachedImg = this.imageCache.get(url)!;
      const directTex = this.createTextureFromImage(cachedImg);
      this.threeTextureCache.set(cacheKey, directTex);
      return directTex;
    }

    // Otherwise create placeholder canvas texture and trigger background loading
    const canvasTex = this.createProceduralCanvasTexture(keyOrUrl || url, fallbackColor);
    this.threeTextureCache.set(cacheKey, canvasTex);

    if (url) {
      this.get2DImage(keyOrUrl, (loadedImg) => {
        if (loadedImg) {
          const canvas = canvasTex.image as HTMLCanvasElement;
          if (canvas) {
            const targetW = loadedImg.naturalWidth || loadedImg.width || 32;
            const targetH = loadedImg.naturalHeight || loadedImg.height || 32;
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingEnabled = false;
              ctx.clearRect(0, 0, targetW, targetH);
              ctx.drawImage(loadedImg, 0, 0, targetW, targetH);
              canvasTex.magFilter = THREE.NearestFilter;
              canvasTex.minFilter = THREE.NearestFilter;
              canvasTex.wrapS = THREE.RepeatWrapping;
              canvasTex.wrapT = THREE.RepeatWrapping;
              canvasTex.colorSpace = THREE.SRGBColorSpace;
              canvasTex.needsUpdate = true;
            }
          }
        }
      });
    }

    return canvasTex;
  }

  /**
   * Preload a single asset and guarantee its 3D texture is ready in GPU memory
   */
  public preloadAsset(keyOrUrl: string): Promise<THREE.Texture> {
    if (!keyOrUrl) return Promise.resolve(this.get3DTexture(''));
    const url = this.resolveAssetUrl(keyOrUrl);
    const cacheKey = url || keyOrUrl;

    if (this.threeTextureCache.has(cacheKey) && this.diagnosticRegistry.get(url)?.status === 'LOADED') {
      return Promise.resolve(this.threeTextureCache.get(cacheKey)!);
    }

    return new Promise<THREE.Texture>((resolve) => {
      this.get2DImage(keyOrUrl, () => {
        const tex = this.get3DTexture(keyOrUrl);
        resolve(tex);
      });
    });
  }

  /**
   * Preloads a batch of assets asynchronously (useful during loading screens)
   */
  public async preloadAssets(keysOrUrls: string[]): Promise<void> {
    const valid = Array.from(new Set(keysOrUrls.filter(Boolean)));
    if (valid.length === 0) return;
    await Promise.allSettled(valid.map((k) => this.preloadAsset(k)));
  }

  /**
   * Preloads all fundamental assets required for standard gameplay
   */
  public async preloadCoreGameAssets(): Promise<void> {
    const urls: string[] = [];

    // Block textures
    Object.values(ASSETS.BLOCK_TEXTURES).forEach(u => urls.push(u));
    // Voxel structure textures
    Object.values(ASSETS.VOXEL_STRUCTURE_TEXTURES).forEach(u => urls.push(u));
    // Core unit sprites
    Object.values(ASSETS.UNITS).forEach(u => urls.push(u));
    // Decorations
    Object.values(ASSETS.DECORATIONS).forEach(u => urls.push(u));
    // Projectiles
    Object.values(ASSETS.PROJECTILES).forEach(u => urls.push(u));

    await this.preloadAssets(urls);
  }

  public retryFailedTextures(): void {
    this.diagnosticRegistry.forEach((meta, url) => {
      if (meta.status === 'ERROR') {
        this.imageCache.delete(url);
        this.get2DImage(meta.key || url);
      }
    });
  }

  public clearCaches(): void {
    this.imageCache.clear();
    this.threeTextureCache.clear();
    this.diagnosticRegistry.clear();
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn());
  }

  /**
   * Generates a full diagnostic report for all requested textures.
   */
  public getDiagnostics(): TextureDiagnosticReport {
    const textures = Array.from(this.diagnosticRegistry.values());
    let loadedCount = 0;
    let localCount = 0;
    let remoteCount = 0;
    let proceduralCount = 0;
    let loadingCount = 0;
    let errorCount = 0;

    const byFolder = {
      minecraft: { total: 0, local: 0, remote: 0, procedural: 0, error: 0 },
      wesnoth: { total: 0, local: 0, remote: 0, procedural: 0, error: 0 },
      other: { total: 0, local: 0, remote: 0, procedural: 0, error: 0 }
    };

    textures.forEach((t) => {
      if (t.status === 'LOADED') {
        loadedCount++;
        if (t.sourceType === 'LOCAL') localCount++;
        else if (t.sourceType === 'REMOTE') remoteCount++;
        else if (t.sourceType === 'PROCEDURAL') proceduralCount++;
      } else if (t.status === 'LOADING') {
        loadingCount++;
      } else if (t.status === 'ERROR') {
        errorCount++;
      }

      const f = byFolder[t.folder];
      if (f) {
        f.total++;
        if (t.status === 'LOADED') {
          if (t.sourceType === 'LOCAL') f.local++;
          else if (t.sourceType === 'REMOTE') f.remote++;
          else if (t.sourceType === 'PROCEDURAL') f.procedural++;
        } else if (t.status === 'ERROR') {
          f.error++;
        }
      }
    });

    return {
      totalRequested: textures.length,
      loadedCount,
      localCount,
      remoteCount,
      proceduralCount,
      loadingCount,
      errorCount,
      byFolder,
      textures
    };
  }

  public printDiagnosticsConsole() {
    const report = this.getDiagnostics();
    console.group('🔍 [TextureManager] Centralized Texture System Diagnostics');
    console.log(`📦 Total Requested: ${report.totalRequested}`);
    console.log(`✅ Loaded Successfully: ${report.loadedCount}`);
    console.log(`⏳ Loading: ${report.loadingCount}`);
    console.log(`❌ Errors / Fallback: ${report.errorCount}`);
    console.log(`📁 Folder Breakdown:`, report.byFolder);

    console.groupCollapsed('📜 Active Texture Registry Table');
    console.table(
      report.textures.map((t) => ({
        Key: t.key,
        Filename: t.url.split('/').pop() || t.url,
        Folder: t.folder.toUpperCase(),
        Status: t.status === 'LOADED' ? (t.usedRemoteFallback ? '⚡ REMOTO' : '✅ LOCAL') : t.status,
        Resolution: t.width ? `${t.width}x${t.height}px` : 'Procedural'
      }))
    );
    console.groupEnd();
    console.groupEnd();
  }
}

export const textureManager = UnifiedTextureManager.getInstance();

// Backward compatibility helper exports for existing codebase
export const getSafeTexture = (url: string, fallbackColor: string = '#64748b'): THREE.Texture => {
  return textureManager.get3DTexture(url, fallbackColor);
};

export const getTextureDiagnostics = () => textureManager.getDiagnostics();
export const printTextureDiagnosticsConsole = () => textureManager.printDiagnosticsConsole();
export const preloadAsset = (keyOrUrl: string) => textureManager.preloadAsset(keyOrUrl);
export const preloadAssets = (keysOrUrls: string[]) => textureManager.preloadAssets(keysOrUrls);
export const preloadCoreGameAssets = () => textureManager.preloadCoreGameAssets();
export const verifyAssetPathsMapping = () => {
  const mappedAssets: Record<string, string> = {};
  const addCategory = (catName: string, catObj: Record<string, string>) => {
    Object.entries(catObj).forEach(([k, url]) => {
      mappedAssets[`${catName}.${k}`] = url;
    });
  };
  addCategory('BLOCK_TEXTURES', ASSETS.BLOCK_TEXTURES);
  addCategory('TERRAIN', ASSETS.TERRAIN as any);
  addCategory('UNITS', ASSETS.UNITS as any);

  Object.values(mappedAssets).forEach((url) => textureManager.get3DTexture(url));

  return {
    validCount: Object.keys(mappedAssets).length,
    totalMapped: Object.keys(mappedAssets).length,
    mappedAssets
  };
};

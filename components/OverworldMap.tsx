import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { HexCell, TerrainType, PositionComponent, WeatherType, Dimension, GameState } from '../types';
import { HEX_SIZE, TERRAIN_COLORS, ASSETS, TERRAIN_PRIORITY, TRANSITION_COMBINATIONS, DIRECTION_ORDER } from '../constants';
import { useGameStore } from '../store/gameStore';
import { findPath } from '../services/pathfinding';
import { WorldGenerator } from '../services/WorldGenerator';
import { textureManager } from '../services/TextureManager';
import { wesnothAtlas } from '../services/WesnothAtlasManager';
import { tileTransitionMaskManager } from '../services/TileTransitionMaskManager';
import { WeatherOverlay } from './overworld/WeatherOverlay';
export { WeatherOverlay };
import { HexMapSVGOverlay } from './overworld/HexMapSVGOverlay';
import { BiomeShimmerOverlay } from './overworld/BiomeShimmerOverlay';
import { useOverworldLogic } from '../hooks/useOverworldLogic';
import { hexToPixel, pixelToAxial, NEIGHBOR_OFFSETS } from '../services/hexMath';
import { assetMapper } from '../services/AssetMappingSystem';
import { StandingPropPool, createHexClippedCanvas } from '../services/TileSpritePool';

interface OverworldMapProps {
  mapData?: HexCell[];
  playerPos: PositionComponent;
  onMove: (q: number, r: number) => void;
  dimension: Dimension;
  width?: number;
  height?: number;
}

export const OverworldMap: React.FC<OverworldMapProps> = ({ mapData: townMapData, playerPos, onMove, dimension, width, height }) => {
  const {
    containerRef,
    canvasRef,
    svgRef,
    viewport,
    pan,
    targetPan,
    isDragging,
    lastMousePos,
    dragDistance,
    needsRedraw,
    hoveredCellKey,
    setHoveredCellKey,
    previewPath,
    setPreviewPath,
    visibleCells,
    visibleEnemies,
    currentWeather,
    isGracePeriod,
    isTown,
    isUpsideDown,
    updateViewport
  } = useOverworldLogic(townMapData, playerPos, dimension);

  const travelHours = useGameStore(state => state.travelHours ?? 8);
  const travelMinutes = useGameStore(state => state.travelMinutes ?? 0);
  const travelDays = useGameStore(state => state.travelDays ?? 1);
  const advanceTime = useGameStore(state => state.advanceTime);
  const reachableTiles = useGameStore(state => state.reachableTiles);
  const setReachableTiles = useGameStore(state => state.setReachableTiles);

  // Recalculate reachable tiles on move if active
  useEffect(() => {
    if (reachableTiles) {
      setReachableTiles('player');
    }
  }, [playerPos.x, playerPos.y, setReachableTiles]);

  // Slow continuous time progression when the player is idle on the overworld map
  useEffect(() => {
    const interval = setInterval(() => {
      advanceTime(1); // 1 in-game minute per real second
    }, 1000);
    return () => clearInterval(interval);
  }, [advanceTime]);

  // Subscribe to WesnothAtlas so the map immediately updates when atlas chunks load
  useEffect(() => {
    return wesnothAtlas.subscribe(() => {
      tileCache.current.clear();
      imgCache.current.clear();
      transitionCache.current.clear();
      needsRedraw.current = true;
    });
  }, []);

  // Color interpolation for immersive Day/Night lighting transitions
  const getLightingColor = (hours: number, minutes: number): string => {
    const t = hours + minutes / 60;
    
    if (t >= 21 || t < 5) {
      // Midnight / Deep Night: Cool Midnight Blue
      return "rgba(10, 15, 45, 0.55)"; 
    }
    
    if (t >= 5 && t < 6) {
      // Dawn: 5:00 to 6:00 (From Deep Night to Warm Lavender Peach)
      const pct = t - 5;
      const r = Math.round(10 * (1 - pct) + 217 * pct);
      const g = Math.round(15 * (1 - pct) + 119 * pct);
      const b = Math.round(45 * (1 - pct) + 30 * pct);
      const a = 0.55 * (1 - pct) + 0.25 * pct;
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    
    if (t >= 6 && t < 8) {
      // Early Morning: 6:00 to 8:00 (From Warm Peach to Clear Daylight)
      const pct = (t - 6) / 2;
      const r = Math.round(217 * (1 - pct) + 255 * pct);
      const g = Math.round(119 * (1 - pct) + 255 * pct);
      const b = Math.round(30 * (1 - pct) + 255 * pct);
      const a = 0.25 * (1 - pct);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    
    if (t >= 8 && t < 17) {
      // Full Daylight: No filter overlay
      return "rgba(0, 0, 0, 0)";
    }
    
    if (t >= 17 && t < 19.5) {
      // Sunset: 17:00 to 19:30 (From Clear Day to Amber Sunset Orange)
      const pct = (t - 17) / 2.5;
      const r = Math.round(249 * pct);
      const g = Math.round(115 * pct);
      const b = Math.round(22 * pct);
      const a = 0.3 * pct;
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    
    if (t >= 19.5 && t < 21) {
      // Twilight Dusk: 19:30 to 21:00 (From Amber Orange to Cool Midnight Navy)
      const pct = (t - 19.5) / 1.5;
      const r = Math.round(249 * (1 - pct) + 10 * pct);
      const g = Math.round(115 * (1 - pct) + 15 * pct);
      const b = Math.round(22 * (1 - pct) + 45 * pct);
      const a = 0.3 * (1 - pct) + 0.55 * pct;
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    
    return "rgba(0, 0, 0, 0)";
  };

  const getPeriodLabel = (hours: number): { text: string; icon: string; color: string } => {
    if (hours >= 5 && hours < 8) return { text: "Amanecer", icon: "🌅", color: "text-amber-300" };
    if (hours >= 8 && hours < 12) return { text: "Mañana", icon: "☀️", color: "text-amber-400" };
    if (hours >= 12 && hours < 17) return { text: "Tarde", icon: "☀️", color: "text-amber-500" };
    if (hours >= 17 && hours < 19.5) return { text: "Atardecer", icon: "🌇", color: "text-orange-400" };
    if (hours >= 19.5 && hours < 21) return { text: "Anochecer", icon: "🌌", color: "text-indigo-300" };
    return { text: "Noche", icon: "🌙", color: "text-slate-300" };
  };

  const period = getPeriodLabel(travelHours);

  const tileCache = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const imgCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const transitionCache = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const standingPropPool = useRef<StandingPropPool>(new StandingPropPool(600));

  // High-performance 60 FPS rendering caches
  const cellTransitionsList = useRef<Map<string, Array<{ key: string }>>>(new Map());
  interface StaticProp {
      q: number;
      r: number;
      localX: number;
      localY: number;
      anchorYOffset: number;
      width: number;
      height: number;
      img: HTMLImageElement | HTMLCanvasElement;
      alpha: number;
  }
  const staticPropsList = useRef<StaticProp[]>([]);
  const visualPlayerPos = useRef({ x: 0, y: 0 });
  const hasInitializedVisualPos = useRef(false);

  // Texture Loading
  const loadImage = useCallback((src: string): Promise<HTMLImageElement | null> => {
    if (!src) return Promise.resolve(null);
    if (imgCache.current.has(src)) return Promise.resolve(imgCache.current.get(src)!);
    
    return new Promise((resolve) => {
      const cached = textureManager.get2DImage(src, (img) => {
        if (img) {
          imgCache.current.set(src, img);
          needsRedraw.current = true;
        }
        resolve(img);
      });
      if (cached) {
        imgCache.current.set(src, cached);
        resolve(cached);
      }
    });
  }, []);

  const prebuildTerrainTile = useCallback(async (cell: HexCell) => {
    const key = `base-${cell.terrain}-${cell.q}-${cell.r}`;
    if (tileCache.current.has(key)) return;
    const size = Math.ceil(HEX_SIZE * 3.2);

    // 1. Direct slice from Wesnoth Atlas using cell (q, r) for organic tile variety
    const atlasCanvas = wesnothAtlas.getCanvasForTerrain(cell.terrain, cell.q, cell.r);
    if (atlasCanvas) {
        const hexCanvas = createHexClippedCanvas(atlasCanvas, '#166534', size, HEX_SIZE);
        tileCache.current.set(key, hexCanvas);
        needsRedraw.current = true;
        return;
    }
    
    // Guaranteed Wesnoth texture fallback (never solid flat colors)
    const wesnothFallback = wesnothAtlas.getCanvas('grass/green') || wesnothAtlas.getCanvas('hills/regular') || wesnothAtlas.getCanvas('grass/semi-dry');
    const fallbackCanvas = createHexClippedCanvas(wesnothFallback, '#166534', size, HEX_SIZE);
    tileCache.current.set(key, fallbackCanvas);
  }, []);

  const prebuildTransition = useCallback(async (terrain: TerrainType, combo: string, isCoast: boolean = false) => {
      const key = `trans-${terrain}-${combo}-${isCoast ? 'coast' : 'land'}`;
      if (transitionCache.current.has(key)) return;

      let baseSource: HTMLImageElement | HTMLCanvasElement | null = wesnothAtlas.getCanvasForTerrain(terrain, 0, 0);
      if (!baseSource) {
        const src = assetMapper.getOverworldAsset(terrain);
        if (src) {
          baseSource = imgCache.current.get(src) || await loadImage(src);
        }
      }
      if (!baseSource) {
        baseSource = tileCache.current.get(`base-${terrain}`) || null;
      }
      if (!baseSource) return;

      const size = Math.ceil(HEX_SIZE * 3.2);
      const rawCanvas = tileTransitionMaskManager.getCompositeTransition(
        terrain,
        combo,
        baseSource,
        size,
        HEX_SIZE,
        isCoast
      );
      // Pre-clip transition canvas to hexagon so render loop is 100% direct drawImage
      const clippedCanvas = createHexClippedCanvas(rawCanvas, 'transparent', size, HEX_SIZE);
      transitionCache.current.set(key, clippedCanvas);
      needsRedraw.current = true;
  }, [loadImage]);

  useEffect(() => {
    const loadVisible = async () => {
        const terrains = new Set<TerrainType>();
        visibleCells.forEach(c => {
            terrains.add(c.terrain);
            const overlayDef = ASSETS.OVERLAYS[c.terrain];
            if (overlayDef) (Array.isArray(overlayDef) ? overlayDef : [overlayDef]).forEach(url => loadImage(url));
            if (c.decorations) {
                c.decorations.forEach(dec => {
                    if (dec.spriteKey && !wesnothAtlas.hasFrame(dec.spriteKey)) {
                        loadImage(dec.spriteKey);
                    }
                });
            }
        });
        await Promise.all(visibleCells.map(c => prebuildTerrainTile(c)));
        
        const transPromises: Promise<any>[] = [];
        for (const cell of visibleCells) {
            if (!cell.isExplored) continue;
            const priorityNeighbors: Record<string, { dirs: string[], isCoast: boolean }> = {};
            NEIGHBOR_OFFSETS.forEach(offset => {
                let neighborTerrain;
                if (isTown && townMapData) {
                    const n = townMapData.find(tc => tc.q === cell.q + offset.dq && tc.r === cell.r + offset.dr);
                    neighborTerrain = n?.terrain;
                } else {
                    neighborTerrain = WorldGenerator.getTile(cell.q + offset.dq, cell.r + offset.dr, dimension).terrain;
                }

                if (neighborTerrain && TERRAIN_PRIORITY[neighborTerrain] > TERRAIN_PRIORITY[cell.terrain]) {
                     if (!priorityNeighbors[neighborTerrain]) {
                         priorityNeighbors[neighborTerrain] = {
                             dirs: [],
                             isCoast: (cell.terrain === TerrainType.WATER || neighborTerrain === TerrainType.WATER)
                         };
                     }
                     priorityNeighbors[neighborTerrain].dirs.push(offset.dir);
                }
            });

            for (const [tStr, { dirs, isCoast }] of Object.entries(priorityNeighbors)) {
                const terrain = tStr as TerrainType;
                let activeDirs = [...dirs].sort((a, b) => DIRECTION_ORDER.indexOf(a) - DIRECTION_ORDER.indexOf(b));
                TRANSITION_COMBINATIONS.forEach(combo => {
                    if (activeDirs.length === 0) return;
                    const parts = combo.split('-');
                    if (parts.every(p => activeDirs.includes(p))) {
                        transPromises.push(prebuildTransition(terrain, combo, isCoast));
                        activeDirs = activeDirs.filter(d => !parts.includes(d));
                    }
                });
            }
        }
        await Promise.all(transPromises);

        // Prebuild static transitions draw-list
        const newCellTransitions = new Map<string, Array<{ key: string }>>();
        for (const cell of visibleCells) {
            if (!cell.isExplored) continue;
            const cellKey = `${cell.q},${cell.r}`;
            const list: Array<{ key: string }> = [];

            const priorityNeighbors: Record<string, { dirs: string[], isCoast: boolean }> = {};
            NEIGHBOR_OFFSETS.forEach(offset => {
                let neighborTerrain;
                if (isTown && townMapData) {
                    const n = townMapData.find(tc => tc.q === cell.q + offset.dq && tc.r === cell.r + offset.dr);
                    neighborTerrain = n?.terrain;
                } else {
                    neighborTerrain = WorldGenerator.getTile(cell.q + offset.dq, cell.r + offset.dr, dimension).terrain;
                }

                if (neighborTerrain && TERRAIN_PRIORITY[neighborTerrain] > TERRAIN_PRIORITY[cell.terrain]) {
                     if (!priorityNeighbors[neighborTerrain]) {
                          priorityNeighbors[neighborTerrain] = {
                              dirs: [],
                              isCoast: (cell.terrain === TerrainType.WATER || neighborTerrain === TerrainType.WATER)
                          };
                     }
                     priorityNeighbors[neighborTerrain].dirs.push(offset.dir);
                }
            });

            for (const [tStr, { dirs, isCoast }] of Object.entries(priorityNeighbors)) {
                const terrain = tStr as TerrainType;
                let activeDirs = [...dirs].sort((a, b) => DIRECTION_ORDER.indexOf(a) - DIRECTION_ORDER.indexOf(b));
                TRANSITION_COMBINATIONS.forEach(combo => {
                    if (activeDirs.length === 0) return;
                    const parts = combo.split('-');
                    if (parts.every(p => activeDirs.includes(p))) {
                        const key = `trans-${terrain}-${combo}-${isCoast ? 'coast' : 'land'}`;
                        list.push({ key });
                        activeDirs = activeDirs.filter(d => !parts.includes(d));
                    }
                });
            }
            if (list.length > 0) {
                newCellTransitions.set(cellKey, list);
            }
        }
        cellTransitionsList.current = newCellTransitions;

        // Prebuild static props layout cache
        const newStaticProps: StaticProp[] = [];
        const imgSize = Math.ceil(HEX_SIZE * 3.2);

        for (const cell of visibleCells) {
            if (!cell.isExplored) continue;

            const isForestLike = cell.terrain === TerrainType.FOREST || cell.terrain === TerrainType.JUNGLE || cell.terrain === TerrainType.TAIGA;
            const isMountain = cell.terrain === TerrainType.MOUNTAIN || cell.propType === 'ROCK_SPIRE';
            const isVillage = cell.terrain === TerrainType.VILLAGE || cell.propType === 'VILLAGE_HOUSE';
            const isCastle = cell.terrain === TerrainType.CASTLE || cell.terrain === TerrainType.RUINS || cell.propType === 'RUINS_OBELISK';
            const isFungus = cell.terrain === TerrainType.FUNGUS || cell.propType === 'MUSHROOM';

            const pseudoRand = (seed: number) => {
                const s = Math.sin(cell.q * 12.9898 + cell.r * 78.233 + seed) * 43758.5453;
                return s - Math.floor(s);
            };

            if (isForestLike) {
                const count = 2 + Math.floor(pseudoRand(1) * 2); // 2 to 3 trees per hex

                for (let i = 0; i < count; i++) {
                    const treeSeed = i * 7 + 3;
                    const treeKey = wesnothAtlas.getTreePropKey(cell.terrain, treeSeed);
                    const atlasTree = wesnothAtlas.getCanvas(treeKey) || 
                                      wesnothAtlas.getCanvas('forest/deciduous-summer-small') || 
                                      wesnothAtlas.getCanvas('forest/pine') ||
                                      wesnothAtlas.getCanvas('grass/green');

                    if (atlasTree) {
                        const jX = (pseudoRand(treeSeed + 1) - 0.5) * HEX_SIZE * 0.95;
                        const jY = (pseudoRand(treeSeed + 2) - 0.5) * HEX_SIZE * 0.85;
                        const scale = 0.85 + pseudoRand(treeSeed + 3) * 0.35;
                        const pWidth = imgSize * 0.82 * scale;
                        const pHeight = imgSize * 0.82 * scale;

                        newStaticProps.push({
                            q: cell.q,
                            r: cell.r,
                            localX: jX - pWidth / 2,
                            localY: jY - pHeight * 0.68,
                            anchorYOffset: jY + HEX_SIZE * 0.35 * scale,
                            width: pWidth,
                            height: pHeight,
                            img: atlasTree,
                            alpha: cell.isVisible ? 1.0 : 0.85
                        });
                    }
                }
            } else if (isMountain) {
                const mAtlasKey = pseudoRand(9) > 0.5 ? 'mountains/basic' : 'mountains/basic2';
                const atlasMountain = wesnothAtlas.getCanvas(mAtlasKey) || 
                                      wesnothAtlas.getCanvas('mountains/basic') || 
                                      wesnothAtlas.getCanvas('hills/regular');

                if (atlasMountain) {
                    const pWidth = imgSize * 1.2;
                    const pHeight = imgSize * 1.2;
                    newStaticProps.push({
                        q: cell.q,
                        r: cell.r,
                        localX: -pWidth / 2,
                        localY: -pHeight * 0.65,
                        anchorYOffset: HEX_SIZE * 0.45,
                        width: pWidth,
                        height: pHeight,
                        img: atlasMountain,
                        alpha: cell.isVisible ? 1.0 : 0.85
                    });
                }
            } else if (cell.propType || isVillage || isCastle || isFungus) {
                let atlasProp: HTMLCanvasElement | null = null;
                if (isVillage) {
                    atlasProp = wesnothAtlas.getCanvas(pseudoRand(15) > 0.5 ? 'village/human' : 'village/human-city') || 
                                wesnothAtlas.getCanvas('village/elven') ||
                                wesnothAtlas.getCanvas('village/human-cottage');
                } else if (cell.terrain === TerrainType.RUINS || cell.propType === 'RUINS_OBELISK') {
                    atlasProp = wesnothAtlas.getCanvas('village/human-cottage-ruin2') || 
                                wesnothAtlas.getCanvas('village/human-hills-ruin') ||
                                wesnothAtlas.getCanvas('misc/rubble');
                } else if (isCastle) {
                    atlasProp = wesnothAtlas.getCanvas('village/human-city') || 
                                wesnothAtlas.getCanvas('village/human-city2') ||
                                wesnothAtlas.getCanvas('village/human');
                } else if (isFungus) {
                    atlasProp = wesnothAtlas.getCanvas('forest/mushrooms') || 
                                wesnothAtlas.getCanvas('forest/mushrooms2') || 
                                wesnothAtlas.getCanvas('village/cave');
                }

                const fallbackImg = atlasProp || 
                                    wesnothAtlas.getCanvas('village/human') || 
                                    wesnothAtlas.getCanvas('grass/green');

                if (fallbackImg) {
                    const pWidth = imgSize * 1.0;
                    const pHeight = imgSize * 1.0;
                    newStaticProps.push({
                        q: cell.q,
                        r: cell.r,
                        localX: -pWidth / 2,
                        localY: -pHeight * 0.6,
                        anchorYOffset: HEX_SIZE * 0.35,
                        width: pWidth,
                        height: pHeight,
                        img: fallbackImg,
                        alpha: cell.isVisible ? 1.0 : 0.85
                    });
                }
            }
        }
        staticPropsList.current = newStaticProps;

        needsRedraw.current = true;
    };
    loadVisible();
  }, [visibleCells, dimension, prebuildTerrainTile, prebuildTransition, loadImage, isTown]);

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    let animationFrameId = 0;

    const render = () => {
        // Interpolate visual player position towards player's current target tile coordinates
        const playerTarget = hexToPixel(playerPos.x, playerPos.y);
        if (!hasInitializedVisualPos.current) {
            visualPlayerPos.current = { ...playerTarget };
            hasInitializedVisualPos.current = true;
        }

        const pDiffX = playerTarget.x - visualPlayerPos.current.x;
        const pDiffY = playerTarget.y - visualPlayerPos.current.y;
        
        if (Math.abs(pDiffX) > 0.05 || Math.abs(pDiffY) > 0.05) {
            visualPlayerPos.current.x += pDiffX * 0.14;
            visualPlayerPos.current.y += pDiffY * 0.14;
            needsRedraw.current = true;
        } else {
            visualPlayerPos.current.x = playerTarget.x;
            visualPlayerPos.current.y = playerTarget.y;
        }

        // Expose custom properties to container for smooth translation of player group in SVG
        const container = containerRef.current;
        if (container) {
            container.style.setProperty('--player-x', `${visualPlayerPos.current.x}px`);
            container.style.setProperty('--player-y', `${visualPlayerPos.current.y}px`);
        }

        // Anchor camera to player position when user is not manually panning
        if (!isDragging.current) {
            targetPan.current.x = visualPlayerPos.current.x;
            targetPan.current.y = visualPlayerPos.current.y;
        }

        const lerp = 0.1;
        const diffX = targetPan.current.x - pan.current.x;
        const diffY = targetPan.current.y - pan.current.y;
        
        if (Math.abs(diffX) > 0.05 || Math.abs(diffY) > 0.05) {
            pan.current.x += diffX * lerp;
            pan.current.y += diffY * lerp;
            needsRedraw.current = true;
            
            if (svgRef.current) {
                const vbX = pan.current.x - viewport.w / 2;
                const vbY = pan.current.y - viewport.h / 2;
                svgRef.current.setAttribute('viewBox', `${vbX} ${vbY} ${viewport.w} ${viewport.h}`);
            }
        } else {
            pan.current.x = targetPan.current.x;
            pan.current.y = targetPan.current.y;
        }

        if (!needsRedraw.current) { animationFrameId = requestAnimationFrame(render); return; }
        needsRedraw.current = false;

        const dpr = window.devicePixelRatio || 1;
        if (canvas.width !== viewport.w * dpr || canvas.height !== viewport.h * dpr) {
            canvas.width = viewport.w * dpr; 
            canvas.height = viewport.h * dpr;
            canvas.style.width = `${viewport.w}px`; 
            canvas.style.height = `${viewport.h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = isUpsideDown ? '#0a0010' : '#020617';
        ctx.fillRect(0, 0, viewport.w, viewport.h);

        const offsetX = (pan.current.x - viewport.w / 2);
        const offsetY = (pan.current.y - viewport.h / 2);
        const imgSize = Math.ceil(HEX_SIZE * 3.2);
        const halfSize = imgSize / 2;

        // ==========================================
        // PASS 1: BASE TERRAIN TILES (Pre-clipped Hex Sprite Pool, Zero Draw-call Churn)
        // ==========================================
        const cellCount = visibleCells.length;
        for (let i = 0; i < cellCount; i++) {
            const cell = visibleCells[i];
            if (!cell.isExplored) continue;
            const { x, y } = hexToPixel(cell.q, cell.r);
            const screenX = x - offsetX;
            const screenY = y - offsetY;

            if (screenX < -imgSize || screenX > viewport.w + imgSize || screenY < -imgSize || screenY > viewport.h + imgSize) continue;

            const baseCanvas = tileCache.current.get(`base-${cell.terrain}-${cell.q}-${cell.r}`);
            if (baseCanvas) {
                ctx.drawImage(baseCanvas, screenX - halfSize, screenY - halfSize, imgSize, imgSize);
            } else {
                // Prebuild on-demand if missing and draw Wesnoth fallback
                prebuildTerrainTile(cell);
                const fallback = wesnothAtlas.getCanvas('grass/green');
                if (fallback) {
                    ctx.drawImage(fallback, screenX - halfSize, screenY - halfSize, imgSize, imgSize);
                }
            }
        }

        // ==========================================
        // PASS 2: DIRECTIONAL TRANSITIONS & BLENDING (Direct Pre-clipped Draw calls)
        // ==========================================
        for (let i = 0; i < cellCount; i++) {
            const cell = visibleCells[i];
            if (!cell.isExplored) continue;
            const { x, y } = hexToPixel(cell.q, cell.r);
            const screenX = x - offsetX;
            const screenY = y - offsetY;

            if (screenX < -imgSize || screenX > viewport.w + imgSize || screenY < -imgSize || screenY > viewport.h + imgSize) continue;

            const transitions = cellTransitionsList.current.get(`${cell.q},${cell.r}`);
            if (transitions && transitions.length > 0) {
                const tLen = transitions.length;
                for (let t = 0; t < tLen; t++) {
                    const transCanvas = transitionCache.current.get(transitions[t].key);
                    if (transCanvas) {
                        ctx.drawImage(transCanvas, screenX - halfSize, screenY - halfSize, imgSize, imgSize);
                    }
                }
            }
        }

        // ==========================================
        // PASS 2.5: PROCEDURAL DECORATIONS & BATCHED MOVEMENT OVERLAYS
        // ==========================================
        for (let i = 0; i < cellCount; i++) {
            const cell = visibleCells[i];
            if (!cell.isExplored) continue;
            const { x, y } = hexToPixel(cell.q, cell.r);
            const screenX = x - offsetX;
            const screenY = y - offsetY;

            if (screenX < -imgSize || screenX > viewport.w + imgSize || screenY < -imgSize || screenY > viewport.h + imgSize) continue;

            // Draw ground decorations (Authentic Wesnoth embellishments)
            if (cell.decorations && cell.decorations.length > 0) {
                const decLen = cell.decorations.length;
                for (let d = 0; d < decLen; d++) {
                    const dec = cell.decorations[d];
                    const decCanvas = wesnothAtlas.getCanvas(dec.spriteKey) || (dec.spriteKey ? imgCache.current.get(dec.spriteKey) : null);
                    if (decCanvas) {
                        ctx.drawImage(decCanvas, screenX - halfSize, screenY - halfSize, imgSize, imgSize);
                    }
                }
            }
        }

        // Batched Movement Overlay in single draw-call
        if (reachableTiles && reachableTiles.size > 0) {
            ctx.beginPath();
            for (let i = 0; i < cellCount; i++) {
                const cell = visibleCells[i];
                if (!cell.isExplored) continue;
                if (!reachableTiles.has(`${cell.q},${cell.r}`)) continue;

                const { x, y } = hexToPixel(cell.q, cell.r);
                const screenX = x - offsetX;
                const screenY = y - offsetY;

                if (screenX < -imgSize || screenX > viewport.w + imgSize || screenY < -imgSize || screenY > viewport.h + imgSize) continue;

                for (let k = 0; k < 6; k++) {
                    const angle = 60 * k * (Math.PI / 180);
                    const px = screenX + HEX_SIZE * Math.cos(angle);
                    const py = screenY + HEX_SIZE * Math.sin(angle);
                    if (k === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
            }
            ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // ==========================================
        // PASS 3: STANDING SCENERY & MULTI-TREE CLUSTERS (Pooled 60 FPS)
        // ==========================================
        standingPropPool.current.reset();
        const staticList = staticPropsList.current;
        const staticLen = staticList.length;

        for (let i = 0; i < staticLen; i++) {
            const prop = staticList[i];
            const { x, y } = hexToPixel(prop.q, prop.r);
            const screenX = x - offsetX;
            const screenY = y - offsetY;

            if (screenX < -imgSize * 1.5 || screenX > viewport.w + imgSize * 1.5 || screenY < -imgSize * 1.5 || screenY > viewport.h + imgSize * 1.5) continue;

            standingPropPool.current.alloc(
                screenY + prop.anchorYOffset,
                screenX,
                screenY,
                screenX + prop.localX,
                screenY + prop.localY,
                prop.width,
                prop.height,
                prop.img,
                prop.alpha
            );
        }

        // Strict North-to-South Drawing Order via pooled slice
        const activeProps = standingPropPool.current.getActiveSlice();
        const activeCount = activeProps.length;
        for (let i = 0; i < activeCount; i++) {
            const prop = activeProps[i];
            ctx.drawImage(prop.img, prop.drawX, prop.drawY, prop.width, prop.height);
        }

        // ==========================================
        // PASS 4: FOG OF WAR (Batched Single Path Draw call)
        // ==========================================
        let hasFogToDraw = false;
        ctx.beginPath();
        for (let i = 0; i < cellCount; i++) {
            const cell = visibleCells[i];
            if (!cell.isExplored) continue;
            if (!cell.isVisible) {
                const { x, y } = hexToPixel(cell.q, cell.r);
                const screenX = x - offsetX;
                const screenY = y - offsetY;

                if (screenX < -imgSize || screenX > viewport.w + imgSize || screenY < -imgSize || screenY > viewport.h + imgSize) continue;

                hasFogToDraw = true;
                for (let k = 0; k < 6; k++) {
                    const angle = 60 * k * (Math.PI / 180);
                    const px = screenX + HEX_SIZE * Math.cos(angle);
                    const py = screenY + HEX_SIZE * Math.sin(angle);
                    if (k === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
            }
        }
        if (hasFogToDraw) {
            ctx.fillStyle = isUpsideDown ? 'rgba(30, 10, 50, 0.65)' : 'rgba(15, 23, 42, 0.6)';
            ctx.fill();
        }

        animationFrameId = requestAnimationFrame(render);
    };
    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [visibleCells, viewport, dimension, isTown, townMapData, playerPos]);

  const lastActionTime = useRef<number>(0);
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Pointer Interaction
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
      isDragging.current = true; dragDistance.current = 0;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      lastMousePos.current = { x: clientX, y: clientY };
      touchStartPos.current = { x: clientX, y: clientY };
      setPreviewPath([]);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      const dx = clientX - lastMousePos.current.x;
      const dy = clientY - lastMousePos.current.y;
      dragDistance.current += Math.abs(dx) + Math.abs(dy);
      
      pan.current.x -= dx; pan.current.y -= dy;
      targetPan.current.x = pan.current.x;
      targetPan.current.y = pan.current.y;
      
      lastMousePos.current = { x: clientX, y: clientY };
      updateViewport(); needsRedraw.current = true;
  };

  const processCellInteraction = (clientX: number, clientY: number) => {
      const now = Date.now();
      if (now - lastActionTime.current < 250) return;
      lastActionTime.current = now;

      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const clickY = clientY - rect.top;
      const worldX = clickX + (pan.current.x - viewport.w / 2);
      const worldY = clickY + (pan.current.y - viewport.h / 2);
      const { q, r } = pixelToAxial(worldX, worldY);
      
      if (q === playerPos.x && r === playerPos.y) {
          if (reachableTiles) {
              setReachableTiles(null);
          } else {
              setReachableTiles('player');
          }
      } else {
          onMove(q, r);
      }
  };

  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
      const wasDragging = isDragging.current;
      isDragging.current = false;

      // If it was a quick touch tap on mobile
      if ('changedTouches' in e && e.changedTouches.length > 0) {
          if (dragDistance.current <= 15) {
              const touch = e.changedTouches[0];
              processCellInteraction(touch.clientX, touch.clientY);
          }
      }
  };

  const handleClick = (e: React.MouseEvent) => {
      if (dragDistance.current > 15) return; 
      processCellInteraction(e.clientX, e.clientY);
  };

  const handleMouseMoveOverlay = (e: React.MouseEvent) => {
      if (isDragging.current) return; 
      const rect = containerRef.current!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
      const worldX = mouseX + (pan.current.x - viewport.w / 2);
      const worldY = mouseY + (pan.current.y - viewport.h / 2);
      const { q, r } = pixelToAxial(worldX, worldY);
      setHoveredCellKey(`${q},${r}`);
  };

  const regionTitle = useMemo(() => isUpsideDown ? 'The Shadow Realm' : 'Arcadia', [isUpsideDown]);
  const playerSprite = useGameStore.getState().party[0]?.visual.spriteUrl || ASSETS.UNITS.PLAYER;

  return (
    <div ref={containerRef} className={`w-full h-full bg-[#1e222b] relative overflow-hidden select-none transition-all duration-1000 ${isUpsideDown ? 'grayscale-[0.3] brightness-75 contrast-125 hue-rotate-[240deg]' : ''}`}
        onMouseDown={handlePointerDown} onMouseMove={(e) => { handlePointerMove(e); handleMouseMoveOverlay(e); }} onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp} onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp} onClick={handleClick}>
        
        {/* SVG Toon Shader Filter definition for cel-shaded comic aesthetic matching 3D tactical view */}
        <svg className="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
          <filter id="overworld-toon-shader" x="0%" y="0%" width="100%" height="100%">
            <feColorMatrix type="matrix" values="
              1.2 0   0   0  0.05
              0   1.2 0   0  0.05
              0   0   1.2 0  0.05
              0   0   0   1  0" />
            <feComponentTransfer>
              <feFuncR type="gamma" amplitude="1.1" exponent="0.85" offset="0.02" />
              <feFuncG type="gamma" amplitude="1.1" exponent="0.85" offset="0.02" />
              <feFuncB type="gamma" amplitude="1.1" exponent="0.85" offset="0.02" />
            </feComponentTransfer>
          </filter>
        </svg>

        {isUpsideDown && (
             <div className="absolute inset-0 z-20 pointer-events-none mix-blend-multiply bg-indigo-900/80" />
        )}

        <canvas ref={canvasRef} className="absolute inset-0 block pointer-events-none" style={{ filter: 'url(#overworld-toon-shader) saturate(1.2) contrast(1.25)' }} />

        <HexMapSVGOverlay
          svgRef={svgRef}
          pan={pan.current}
          viewport={viewport}
          visibleCells={visibleCells}
          visibleEnemies={visibleEnemies}
          playerPos={playerPos}
          isGracePeriod={isGracePeriod}
          previewPath={previewPath}
          hoveredCellKey={hoveredCellKey}
          isUpsideDown={isUpsideDown}
          playerSprite={playerSprite}
          hexToPixel={hexToPixel}
        />

        {/* Dynamic Day/Night Scene Lighting Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none z-10 transition-all duration-[2000ms] ease-in-out mix-blend-multiply"
          style={{ backgroundColor: getLightingColor(travelHours, travelMinutes) }}
        />

        {/* Sleek Solar/Lunar Dial Clock Widget */}
        <div className="absolute top-4 left-4 z-30 pointer-events-auto flex items-center gap-2 bg-slate-950/85 backdrop-blur border border-amber-500/30 px-3 py-1.5 rounded-full shadow-lg hover:border-amber-500/50 transition-all">
          <div className="text-sm select-none flex items-center justify-center animate-bounce">
            {period.icon}
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-mono text-xs font-bold text-slate-100">
                {String(Math.floor(travelHours)).padStart(2, '0')}:{String(Math.floor(travelMinutes)).padStart(2, '0')}
              </span>
              <span className={`text-[8px] font-bold tracking-wide uppercase px-1 rounded bg-black/45 ${period.color}`}>
                {period.text}
              </span>
            </div>
            <span className="text-[7.5px] font-mono text-slate-400 font-medium">
              Día {travelDays} de Expedición
            </span>
          </div>
        </div>
        
        <WeatherOverlay type={currentWeather} />

        <BiomeShimmerOverlay
          playerPos={playerPos}
          dimension={dimension}
          pan={pan.current}
          viewport={viewport}
        />

        <button onClick={() => { const center = hexToPixel(playerPos.x, playerPos.y); pan.current = { x: center.x, y: center.y }; targetPan.current = { ...pan.current }; updateViewport(); needsRedraw.current = true; }} className="absolute bottom-48 right-4 z-20 bg-slate-900/80 border border-amber-500/30 p-3 rounded-full shadow-lg text-amber-400 hover:bg-slate-800 hover:scale-105 transition-all" title="Recenter Camera">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>

        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at center, transparent 50%, ${isUpsideDown ? '#0a0010' : '#020617'} 100%)`, opacity: 0.95 }} />
    </div>
  );
};

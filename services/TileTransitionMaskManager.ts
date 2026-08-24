import { TerrainType } from '../types';
import { noise2D } from './WorldGenerator';
import { HEX_SIZE } from '../constants';

/**
 * Angles in radians for flat-topped hex neighbor directions:
 * se: +30 deg (pi/6)
 * s:  +90 deg (pi/2)
 * sw: +150 deg (5pi/6)
 * nw: +210 deg (7pi/6)
 * n:  +270 deg (3pi/2)
 * ne: +330 deg (11pi/6)
 */
export const DIRECTION_ANGLES: Record<string, number> = {
  se: Math.PI / 6,
  s: Math.PI / 2,
  sw: (5 * Math.PI) / 6,
  nw: (7 * Math.PI) / 6,
  n: (3 * Math.PI) / 2,
  ne: (11 * Math.PI) / 6,
};

export class TileTransitionMaskManager {
  private static instance: TileTransitionMaskManager;
  private maskCache: Map<string, HTMLCanvasElement> = new Map();
  private compositeCache: Map<string, HTMLCanvasElement> = new Map();

  private constructor() {}

  public static getInstance(): TileTransitionMaskManager {
    if (!TileTransitionMaskManager.instance) {
      TileTransitionMaskManager.instance = new TileTransitionMaskManager();
    }
    return TileTransitionMaskManager.instance;
  }

  /**
   * Generates a Wesnoth-style organic alpha mask for a set of directions (e.g. "n", "n-ne", "sw-nw-n").
   */
  public getDirectionalMask(combo: string, size: number = Math.ceil(HEX_SIZE * 3.2), hexRadius: number = HEX_SIZE): HTMLCanvasElement {
    const key = `mask_${combo}_${size}_${hexRadius}`;
    if (this.maskCache.has(key)) {
      return this.maskCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    const centerX = size / 2;
    const centerY = size / 2;
    const dirs = combo.split('-');
    
    // Distance from center to flat edge: R * sqrt(3) / 2
    const hEdge = hexRadius * (Math.sqrt(3) / 2);

    const dirVectors = dirs.map(d => {
      const angle = DIRECTION_ANGLES[d] ?? 0;
      return {
        cos: Math.cos(angle),
        sin: Math.sin(angle),
      };
    });

    for (let py = 0; py < size; py++) {
      const dy = py - centerY;
      for (let px = 0; px < size; px++) {
        const dx = px - centerX;
        const idx = (py * size + px) * 4;

        let maxAlpha = 0;

        for (let i = 0; i < dirVectors.length; i++) {
          const { cos, sin } = dirVectors[i];
          // Projection onto outward direction normal
          const proj = dx * cos + dy * sin;
          // Perpendicular distance along the hex face
          const perp = -dx * sin + dy * cos;

          // Organic fractal noise displacement for scalloped edges (grass blades, shorelines, rock scree)
          const n1 = noise2D((px + 100) * 0.09, (py + 100) * 0.09);
          const n2 = noise2D((px + 200) * 0.22, (py + 200) * 0.22);
          const noiseOffset = (n1 * 0.22 + n2 * 0.08) * hEdge;

          // Corner rounding curvature factor
          const cornerCurve = (perp * perp) / (2.6 * hexRadius);
          const effectiveDist = proj + noiseOffset - cornerCurve;

          // Smooth transition ramp from interior to edge boundary
          const startRamp = hEdge * 0.35;
          const endRamp = hEdge * 1.15;

          if (effectiveDist > startRamp) {
            const t = Math.min(1, Math.max(0, (effectiveDist - startRamp) / (endRamp - startRamp)));
            // Smoothstep curve: 3t^2 - 2t^3
            const alpha = t * t * (3 - 2 * t);
            if (alpha > maxAlpha) {
              maxAlpha = alpha;
            }
          }
        }

        if (maxAlpha > 0) {
          data[idx] = 255;     // R
          data[idx + 1] = 255; // G
          data[idx + 2] = 255; // B
          data[idx + 3] = Math.round(maxAlpha * 255); // Alpha
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    this.maskCache.set(key, canvas);
    return canvas;
  }

  /**
   * Creates or returns a cached transition canvas where `terrainImage` is masked
   * with the organic Wesnoth directional transition mask and blended seamlessly.
   */
  public getCompositeTransition(
    terrain: TerrainType,
    combo: string,
    terrainImage: HTMLImageElement | HTMLCanvasElement,
    size: number = Math.ceil(HEX_SIZE * 3.2),
    hexRadius: number = HEX_SIZE,
    isCoast: boolean = false
  ): HTMLCanvasElement {
    const key = `composite_${terrain}_${combo}_${size}_${isCoast ? 'coast' : 'land'}`;
    if (this.compositeCache.has(key)) {
      return this.compositeCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.imageSmoothingEnabled = false;

    // 1. Draw source terrain image scaled to canvas
    ctx.drawImage(terrainImage, 0, 0, size, size);

    // 2. Apply organic directional alpha mask
    const mask = this.getDirectionalMask(combo, size, hexRadius);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0);

    // 3. If coastline transition (land over water), add subtle wave foam fringe
    if (isCoast) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2.0;

      const dirs = combo.split('-');
      const centerX = size / 2;
      const centerY = size / 2;
      const hEdge = hexRadius * (Math.sqrt(3) / 2);

      dirs.forEach(d => {
        const angle = DIRECTION_ANGLES[d];
        if (angle !== undefined) {
          const perpAngle = angle + Math.PI / 2;
          const edgeCenterX = centerX + Math.cos(angle) * hEdge * 0.92;
          const edgeCenterY = centerY + Math.sin(angle) * hEdge * 0.92;
          const halfEdge = hexRadius * 0.52;

          ctx.beginPath();
          const startX = edgeCenterX - Math.cos(perpAngle) * halfEdge;
          const startY = edgeCenterY - Math.sin(perpAngle) * halfEdge;
          const endX = edgeCenterX + Math.cos(perpAngle) * halfEdge;
          const endY = edgeCenterY + Math.sin(perpAngle) * halfEdge;

          ctx.moveTo(startX, startY);
          // Soft wave curve
          const midX = (startX + endX) / 2 + Math.cos(angle) * 3;
          const midY = (startY + endY) / 2 + Math.sin(angle) * 3;
          ctx.quadraticCurveTo(midX, midY, endX, endY);
          ctx.stroke();
        }
      });
    }

    this.compositeCache.set(key, canvas);
    return canvas;
  }

  /**
   * Clear all caches if needed (e.g. on resolution changes).
   */
  public clearCache() {
    this.maskCache.clear();
    this.compositeCache.clear();
  }
}

export const tileTransitionMaskManager = TileTransitionMaskManager.getInstance();

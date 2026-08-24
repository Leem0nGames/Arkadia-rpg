/**
 * TileSpritePool & Instanced Batching System
 * 
 * High-performance object pooling and instanced sprite batching service
 * for Overworld and Tactical Hex Map rendering. Eliminates GC spikes,
 * removes per-frame canvas clipping overhead, and batches draw calls
 * for constant 60 FPS on mobile devices.
 */

export interface StandingPropItem {
  anchorY: number;
  screenX: number;
  screenY: number;
  drawX: number;
  drawY: number;
  width: number;
  height: number;
  img: HTMLImageElement | HTMLCanvasElement;
  alpha: number;
}

export interface TileBatchItem {
  screenX: number;
  screenY: number;
  imgSize: number;
  alpha: number;
  source: HTMLImageElement | HTMLCanvasElement;
}

export class CanvasPool {
  private static pool: Map<string, HTMLCanvasElement[]> = new Map();

  public static getCanvas(width: number, height: number): HTMLCanvasElement {
    const key = `${width}x${height}`;
    let list = this.pool.get(key);
    if (!list) {
      list = [];
      this.pool.set(key, list);
    }
    if (list.length > 0) {
      const c = list.pop()!;
      const ctx = c.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, width, height);
      return c;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  public static releaseCanvas(canvas: HTMLCanvasElement): void {
    const key = `${canvas.width}x${canvas.height}`;
    let list = this.pool.get(key);
    if (!list) {
      list = [];
      this.pool.set(key, list);
    }
    if (list.length < 50) {
      list.push(canvas);
    }
  }

  public static clear(): void {
    this.pool.clear();
  }
}

export class StandingPropPool {
  private pool: StandingPropItem[];
  private count: number = 0;

  constructor(initialCapacity: number = 500) {
    this.pool = new Array(initialCapacity);
    for (let i = 0; i < initialCapacity; i++) {
      this.pool[i] = {
        anchorY: 0,
        screenX: 0,
        screenY: 0,
        drawX: 0,
        drawY: 0,
        width: 0,
        height: 0,
        img: null as any,
        alpha: 1
      };
    }
  }

  public reset(): void {
    this.count = 0;
  }

  public alloc(
    anchorY: number,
    screenX: number,
    screenY: number,
    drawX: number,
    drawY: number,
    width: number,
    height: number,
    img: HTMLImageElement | HTMLCanvasElement,
    alpha: number = 1
  ): StandingPropItem {
    if (this.count >= this.pool.length) {
      // Expand pool capacity if needed
      const oldLen = this.pool.length;
      const newLen = oldLen * 2;
      for (let i = oldLen; i < newLen; i++) {
        this.pool.push({
          anchorY: 0,
          screenX: 0,
          screenY: 0,
          drawX: 0,
          drawY: 0,
          width: 0,
          height: 0,
          img: null as any,
          alpha: 1
        });
      }
    }

    const item = this.pool[this.count++];
    item.anchorY = anchorY;
    item.screenX = screenX;
    item.screenY = screenY;
    item.drawX = drawX;
    item.drawY = drawY;
    item.width = width;
    item.height = height;
    item.img = img;
    item.alpha = alpha;
    return item;
  }

  public getCount(): number {
    return this.count;
  }

  public getActiveSlice(): StandingPropItem[] {
    // Sort active props in-place from North to South (ascending anchorY)
    const active = this.pool.slice(0, this.count);
    active.sort((a, b) => a.anchorY - b.anchorY);
    return active;
  }
}

/**
 * Pre-bakes a texture into a reusable hex-clipped canvas tile in the pool.
 */
export function createHexClippedCanvas(
  source: HTMLImageElement | HTMLCanvasElement | null,
  fallbackColor: string,
  size: number,
  hexRadius: number
): HTMLCanvasElement {
  const canvas = CanvasPool.getCanvas(size, size);
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return canvas;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Clip to regular hexagon
  ctx.beginPath();
  const half = size / 2;
  for (let i = 0; i < 6; i++) {
    const angle = (60 * i * Math.PI) / 180;
    const px = half + hexRadius * Math.cos(angle);
    const py = half + hexRadius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.clip();

  if (source) {
    ctx.drawImage(source, 0, 0, size, size);
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.fill();
  }

  ctx.restore();
  return canvas;
}

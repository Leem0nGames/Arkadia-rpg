/**
 * Smart GPU & Mobile Performance Manager
 * Dynamically adjusts WebGL rendering parameters, DPR, shadow map resolutions,
 * particle density, light budgets, and shader passes to maintain 60 FPS on smartphones.
 */

export type PerformanceTier = 'MOBILE_LOW' | 'MOBILE_HIGH' | 'DESKTOP';

export interface GPUPerformanceProfile {
  tier: PerformanceTier;
  isMobile: boolean;
  dpr: [number, number];
  shadowMapSize: number;
  enablePostProcessing: boolean;
  particleMultiplier: number;
  maxLights: number;
  enableShadows: boolean;
  dofSamples: number;
  renderScale: number;
}

class GPUPerformanceManagerService {
  private currentTier: PerformanceTier = 'DESKTOP';
  private isMobileDevice: boolean = false;
  private subscribers: Set<() => void> = new Set();
  
  // Real-time FPS & DRS (Dynamic Resolution Scaling) monitoring
  private frameCount: number = 0;
  private lastFpsCheck: number = 0;
  private currentFps: number = 60;
  private lowFpsCounter: number = 0;
  private highFpsCounter: number = 0;
  private isAutoScaledDown: boolean = false;
  private currentDprScale: number = 1.0;

  constructor() {
    this.detectHardware();
    this.startFPSMonitor();
  }

  private detectHardware() {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent || '';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isSmallScreen = window.innerWidth < 768;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    this.isMobileDevice = isMobileUA || (isSmallScreen && hasTouch);

    const threads = navigator.hardwareConcurrency || 4;
    const deviceMemory = (navigator as any).deviceMemory || 4;

    if (this.isMobileDevice) {
      if (threads <= 4 || deviceMemory <= 3) {
        this.currentTier = 'MOBILE_LOW';
        this.currentDprScale = 0.9;
      } else {
        this.currentTier = 'MOBILE_HIGH';
        this.currentDprScale = 1.0;
      }
    } else {
      this.currentTier = 'DESKTOP';
      this.currentDprScale = 1.0;
    }
  }

  private startFPSMonitor() {
    if (typeof window === 'undefined') return;

    this.lastFpsCheck = performance.now();

    const checkFrame = () => {
      this.frameCount++;
      const now = performance.now();
      const elapsed = now - this.lastFpsCheck;

      if (elapsed >= 1200) {
        this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
        this.frameCount = 0;
        this.lastFpsCheck = now;

        // Auto-adapt if FPS drops under 48 on mobile / lower tier devices
        if (this.currentFps < 48) {
          this.lowFpsCounter++;
          this.highFpsCounter = 0;

          if (this.lowFpsCounter >= 2) {
            let changed = false;
            if (this.currentDprScale > 0.8) {
              this.currentDprScale = Math.max(0.75, this.currentDprScale - 0.1);
              changed = true;
            }

            if (!this.isAutoScaledDown) {
              this.isAutoScaledDown = true;
              if (this.currentTier === 'DESKTOP') {
                this.currentTier = 'MOBILE_HIGH';
                changed = true;
              } else if (this.currentTier === 'MOBILE_HIGH') {
                this.currentTier = 'MOBILE_LOW';
                changed = true;
              }
            }

            if (changed) {
              this.notify();
            }
          }
        } else if (this.currentFps >= 57) {
          this.highFpsCounter++;
          if (this.highFpsCounter >= 4) {
            this.lowFpsCounter = 0;
            // Gradually restore DPR scale if performance is rock solid
            if (this.currentDprScale < 1.0) {
              this.currentDprScale = Math.min(1.0, this.currentDprScale + 0.05);
              this.notify();
            }
          }
        }
      }

      requestAnimationFrame(checkFrame);
    };

    requestAnimationFrame(checkFrame);
  }

  public getProfile(): GPUPerformanceProfile {
    const dprMax = this.isMobileDevice ? Math.min(window.devicePixelRatio || 1, 1.25) : Math.min(window.devicePixelRatio || 1, 1.5);
    const scaledDprMax = Math.max(0.75, Number((dprMax * this.currentDprScale).toFixed(2)));

    switch (this.currentTier) {
      case 'MOBILE_LOW':
        return {
          tier: 'MOBILE_LOW',
          isMobile: true,
          dpr: [0.75, Math.min(1.0, scaledDprMax)],
          shadowMapSize: 512,
          enablePostProcessing: false, // Bypass heavy post-processing passes for max thermal comfort
          particleMultiplier: 0.35,
          maxLights: 1,
          enableShadows: true,
          dofSamples: 4,
          renderScale: this.currentDprScale,
        };
      case 'MOBILE_HIGH':
        return {
          tier: 'MOBILE_HIGH',
          isMobile: true,
          dpr: [0.85, Math.min(1.2, scaledDprMax)],
          shadowMapSize: 1024,
          enablePostProcessing: true,
          particleMultiplier: 0.65,
          maxLights: 2,
          enableShadows: true,
          dofSamples: 6,
          renderScale: this.currentDprScale,
        };
      case 'DESKTOP':
      default:
        return {
          tier: 'DESKTOP',
          isMobile: false,
          dpr: [1, Math.min(1.5, scaledDprMax)],
          shadowMapSize: 2048,
          enablePostProcessing: true,
          particleMultiplier: 1.0,
          maxLights: 4,
          enableShadows: true,
          dofSamples: 16,
          renderScale: 1.0,
        };
    }
  }

  public getFps(): number {
    return this.currentFps;
  }

  public canRenderDynamicLight(currentLightIndex: number): boolean {
    const max = this.getProfile().maxLights;
    return currentLightIndex < max;
  }

  public getClampedParticleCount(baseCount: number): number {
    const mult = this.getProfile().particleMultiplier;
    return Math.max(4, Math.round(baseCount * mult));
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.subscribers.forEach((cb) => cb());
  }

  public forceTier(tier: PerformanceTier) {
    this.currentTier = tier;
    this.notify();
  }
}

export const gpuManager = new GPUPerformanceManagerService();


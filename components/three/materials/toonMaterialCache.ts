import * as THREE from 'three';
import { DEFAULT_COZY_GRADIENT_MAP, injectCozyCelShader } from '../../../services/toonShader';

// NOTE: Global Material Cache with LRU eviction to prevent redundant GPU compilations and unbounded VRAM growth.
const MAX_CACHE_SIZE = 48;
const materialCache = new Map<string, THREE.MeshToonMaterial>();

export function getCacheKey(
  texture: THREE.Texture | undefined | null,
  fallbackColor: string
): string {
  const textureId = texture ? texture.uuid : 'no-texture';
  const validColor = (fallbackColor && fallbackColor.startsWith('#')) ? fallbackColor : '#64748b';
  const colorHex = texture ? '#ffffff' : validColor;
  return `${textureId}_${colorHex}`;
}

export function getCachedToonMaterial(
  texture: THREE.Texture | undefined | null,
  fallbackColor: string
): THREE.MeshToonMaterial {
  const cacheKey = getCacheKey(texture, fallbackColor);

  if (materialCache.has(cacheKey)) {
    const mat = materialCache.get(cacheKey)!;
    materialCache.delete(cacheKey);
    materialCache.set(cacheKey, mat);
    return mat;
  }

  // Evict oldest unused material if cache limit is exceeded
  if (materialCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = materialCache.keys().next().value;
    if (oldestKey) {
      const oldMat = materialCache.get(oldestKey);
      if (oldMat) {
        oldMat.dispose();
      }
      materialCache.delete(oldestKey);
    }
  }

  const validColor = (fallbackColor && fallbackColor.startsWith('#')) ? fallbackColor : '#64748b';
  const colorHex = texture ? '#ffffff' : validColor;

  const mat = new THREE.MeshToonMaterial({
    map: texture || null,
    gradientMap: DEFAULT_COZY_GRADIENT_MAP,
    color: new THREE.Color(colorHex),
  });

  // Inject cozy cel-shader (rim-light)
  injectCozyCelShader(mat, { rimIntensity: 0.3 });

  materialCache.set(cacheKey, mat);
  return mat;
}

export function removeMaterialFromCache(cacheKey: string) {
    const mat = materialCache.get(cacheKey);
    if (mat) {
        mat.dispose();
        materialCache.delete(cacheKey);
    }
}

export function clearMaterialCache() {
    materialCache.forEach(mat => mat.dispose());
    materialCache.clear();
}

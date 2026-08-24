import { useEffect } from 'react';
import { removeMaterialFromCache } from './toonMaterialCache';

/**
 * Hook to automatically dispose of a specific cached material when the component unmounts.
 * 
 * @param cacheKey The unique key used to cache the material in toonMaterialCache.
 */
export function useMaterialCleanup(cacheKey: string | null | undefined) {
  useEffect(() => {
    return () => {
      if (cacheKey) {
        removeMaterialFromCache(cacheKey);
      }
    };
  }, [cacheKey]);
}

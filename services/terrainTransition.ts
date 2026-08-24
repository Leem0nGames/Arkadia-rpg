import { Tile } from '../types';

/**
 * Finds a tile in various map structures (1D arrays, 2D arrays, or coordinate hash records).
 */
export function findTileInMap(map: any, q: number, r: number): any {
  if (!map) return null;
  
  if (Array.isArray(map)) {
    if (map.length === 0) return null;
    
    // Check if it is a 2D array
    if (Array.isArray(map[0])) {
      for (let i = 0; i < map.length; i++) {
        const row = map[i];
        if (row) {
          for (let j = 0; j < row.length; j++) {
            const tile = row[j];
            if (tile && tile.q === q && tile.r === r) {
              return tile;
            }
          }
        }
      }
      // Index fallback
      return map[r]?.[q] || null;
    } else {
      // 1D Flat Array
      return map.find((tile: any) => tile && tile.q === q && tile.r === r) || null;
    }
  } else if (typeof map === 'object') {
    // Record key "q,r"
    const key = `${q},${r}`;
    if (map[key]) return map[key];
    
    // Fallback search in values
    const vals = Object.values(map);
    return vals.find((tile: any) => tile && tile.q === q && tile.r === r) || null;
  }
  return null;
}

/**
 * Obtains the neighbor mask (0-63) based on 6 axial directions.
 * A bit is set to 1 if the neighbor exists and its terrain is different.
 */
export function getNeighborMask(map: Tile[][] | any, q: number, r: number): number {
  const centerTile = findTileInMap(map, q, r);
  if (!centerTile) return 0;
  
  const centerTerrainId = centerTile.terrainId || centerTile.terrain || 'grass';
  
  const directions = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1]
  ];
  
  let mask = 0;
  for (let i = 0; i < directions.length; i++) {
    const [dq, dr] = directions[i];
    const nQ = q + dq;
    const nR = r + dr;
    const neighbor = findTileInMap(map, nQ, nR);
    if (neighbor) {
      const neighborTerrainId = neighbor.terrainId || neighbor.terrain || 'grass';
      if (neighborTerrainId !== centerTerrainId) {
        mask |= (1 << i);
      }
    }
  }
  return mask;
}

/**
 * Returns the unique key representing the transition border texture.
 */
export function getTerrainSpriteKey(terrainId: string, mask: number): string {
  return `${terrainId}_border_${mask}`;
}

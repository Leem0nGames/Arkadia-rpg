import { Tile } from '../types';
import { TERRAIN_DATA, HEX_SIZE } from '../constants';
import { hexToPixel, NEIGHBOR_OFFSETS } from './hexMath';
import { findTileInMap } from './terrainTransition';

export interface ReachableTilesResult extends Set<string> {
  costMap: Map<string, number>;
}

/**
 * Calculates all reachable tiles from a starting point (startQ, startR)
 * using Dijkstra's algorithm. Applies terrain move costs and a 0.75x
 * isometric horizontal displacement factor.
 */
export function calculateReachableTiles(
  map: any,
  startQ: number,
  startR: number,
  maxMovePoints: number
): ReachableTilesResult {
  const reachable = new Set<string>() as ReachableTilesResult;
  const costMap = new Map<string, number>();
  reachable.costMap = costMap;

  // Queue for Dijkstra's algorithm
  interface QueueItem {
    q: number;
    r: number;
    cost: number;
  }

  const queue: QueueItem[] = [{ q: startQ, r: startR, cost: 0 }];
  costMap.set(`${startQ},${startR}`, 0);

  while (queue.length > 0) {
    // Sort queue by cost ascending (priority queue behavior)
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;

    const currentKey = `${current.q},${current.r}`;
    const recordedCost = costMap.get(currentKey);
    if (recordedCost !== undefined && current.cost > recordedCost) {
      continue;
    }

    reachable.add(currentKey);

    // Scan neighbors
    for (const offset of NEIGHBOR_OFFSETS) {
      const nQ = current.q + offset.dq;
      const nR = current.r + offset.dr;
      const neighbor = findTileInMap(map, nQ, nR);
      if (!neighbor) continue;

      const neighborTerrain = neighbor.terrainId || neighbor.terrain || 'grass';
      const terrainEntry = TERRAIN_DATA[neighborTerrain];
      const baseMoveCost = terrainEntry ? terrainEntry.moveCost : 1;

      // Compute isometric physical distance
      const p1 = hexToPixel(current.q, current.r);
      const p2 = hexToPixel(nQ, nR);
      const dx = (p2.x - p1.x) * 0.75; // 0.75x horizontal scaling
      const dy = p2.y - p1.y;
      const physicalDistance = Math.sqrt(dx * dx + dy * dy);
      
      // Default distance between standard hex centers is HEX_SIZE * Math.sqrt(3)
      const standardHexDistance = HEX_SIZE * 1.73205;
      const factor = physicalDistance / standardHexDistance;

      // Multiply the base terrain move cost by the isometric factor
      const stepCost = baseMoveCost * factor;
      const nextCost = current.cost + stepCost;

      if (nextCost <= maxMovePoints) {
        const neighborKey = `${nQ},${nR}`;
        const existingCost = costMap.get(neighborKey);
        if (existingCost === undefined || nextCost < existingCost) {
          costMap.set(neighborKey, nextCost);
          queue.push({ q: nQ, r: nR, cost: nextCost });
        }
      }
    }
  }

  return reachable;
}

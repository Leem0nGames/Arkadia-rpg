
import { HexCell, BattleCell, BattleHazard, Entity } from '../types';
import { TERRAIN_MOVEMENT_COST } from '../constants';
import { getHazardMovementMultiplier } from './dndRules';

const HEX_DIRECTIONS = [
    { dq: 1, dr: 0 }, { dq: 0, dr: 1 }, { dq: -1, dr: 1 },
    { dq: -1, dr: 0 }, { dq: 0, dr: -1 }, { dq: 1, dr: -1 }
];

const GRID_DIRECTIONS = [
    { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 },
    { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 }
];

const distHex = (a: {q:number, r:number}, b: {q:number, r:number}) => {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
};

const distGrid = (a: {x:number, y:number}, b: {x:number, y:number}) => {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
};

// Helper to get cell from either array or generator
const getCell = (q: number, r: number, map?: HexCell[], generator?: (q: number, r: number) => HexCell): HexCell | null => {
    if (map) {
        return map.find(c => c.q === q && c.r === r) || null;
    }
    if (generator) {
        return generator(q, r);
    }
    return null;
};

/**
 * Min-Heap Priority Queue for O(log N) push/pop operations in A* pathfinding.
 * Replaces O(N log N) sorting per search iteration and O(N) searching.
 */
class MinHeap<T> {
  private heap: { item: T; priority: number }[] = [];

  get size(): number {
    return this.heap.length;
  }

  push(item: T, priority: number): void {
    this.heap.push({ item, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0].item;
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      if (this.heap[index].priority >= this.heap[parentIndex].priority) break;
      const temp = this.heap[index];
      this.heap[index] = this.heap[parentIndex];
      this.heap[parentIndex] = temp;
      index = parentIndex;
    }
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      let smallest = index;
      const left = (index << 1) + 1;
      const right = (index << 1) + 2;

      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest === index) break;

      const temp = this.heap[index];
      this.heap[index] = this.heap[smallest];
      this.heap[smallest] = temp;
      index = smallest;
    }
  }
}

interface PathNode<T> {
    cell: T;
    g: number;
    f: number;
    parent?: PathNode<T>;
}

/**
 * A* Pathfinding for Hexagonal Grid (Overworld)
 * Uses MinHeap and Map lookups for optimal O(N log N) performance.
 */
export const findPath = (
    start: {q:number, r:number}, 
    end: {q:number, r:number}, 
    map?: HexCell[], 
    generator?: (q:number, r:number) => HexCell
): HexCell[] | null => {
    
    // Limit search depth for infinite map performance
    const MAX_DEPTH = 200; 

    const startCell = getCell(start.q, start.r, map, generator);
    const endCell = getCell(end.q, end.r, map, generator);

    if (!startCell || !endCell) return null;
    if ((TERRAIN_MOVEMENT_COST[endCell.terrain] || 1) >= 99) return null;

    // Fast lookup for g-scores to avoid O(N) array searching
    const openSetG = new Map<string, number>();
    const closedSet = new Set<string>();
    const openSet = new MinHeap<PathNode<HexCell>>();

    const startNode: PathNode<HexCell> = { cell: startCell, f: 0, g: 0 };
    openSet.push(startNode, 0);
    openSetG.set(`${startCell.q},${startCell.r}`, 0);

    let iterations = 0;

    while (openSet.size > 0) {
        iterations++;
        if (iterations > MAX_DEPTH * 10) return null; // Safety break

        const current = openSet.pop()!;
        const currentKey = `${current.cell.q},${current.cell.r}`;

        if (closedSet.has(currentKey)) continue;

        if (current.cell.q === end.q && current.cell.r === end.r) {
            const path: HexCell[] = [];
            let curr: PathNode<HexCell> | undefined = current;
            while (curr && curr.parent) {
                path.push(curr.cell);
                curr = curr.parent;
            }
            return path.reverse();
        }

        closedSet.add(currentKey);

        // If we are too far from target in infinite mode, heuristically prune
        if (generator && distHex(current.cell, end) > MAX_DEPTH) continue;

        for (const dir of HEX_DIRECTIONS) {
            const nQ = current.cell.q + dir.dq;
            const nR = current.cell.r + dir.dr;
            const nKey = `${nQ},${nR}`;

            if (closedSet.has(nKey)) continue;

            const neighbor = getCell(nQ, nR, map, generator);
            if (!neighbor) continue;

            const cost = TERRAIN_MOVEMENT_COST[neighbor.terrain] || 1;
            if (cost >= 99) continue;

            const tentativeG = current.g + cost;
            const existingG = openSetG.get(nKey);
            if (existingG !== undefined && tentativeG >= existingG) continue;

            const heuristic = distHex({q: nQ, r: nR}, end);
            const newNode: PathNode<HexCell> = {
                cell: neighbor,
                g: tentativeG,
                f: tentativeG + heuristic,
                parent: current
            };

            openSetG.set(nKey, tentativeG);
            openSet.push(newNode, newNode.f);
        }
    }
    return null;
};

/**
 * A* Pathfinding for Square Grid (Battle)
 * Uses MinHeap and Map lookups for optimal O(N log N) performance.
 */
export const findBattlePath = (
    start: {x:number, y:number}, 
    end: {x:number, y:number}, 
    grid: BattleCell[],
    hazards?: BattleHazard[]
): BattleCell[] | null => {
    const mapIndex = new Map<string, BattleCell>();
    grid.forEach(c => mapIndex.set(`${c.x},${c.z}`, c));

    const hazardMap = new Map<string, BattleHazard>();
    if (hazards) {
        hazards.forEach(h => hazardMap.set(`${h.x},${h.z}`, h));
    }

    if (!mapIndex.has(`${end.x},${end.y}`)) return null;
    const targetCell = mapIndex.get(`${end.x},${end.y}`);
    if (targetCell?.isObstacle) return null;

    const startCell = mapIndex.get(`${start.x},${start.y}`);
    if (!startCell) return null;

    // Fast lookup for g-scores to avoid O(N) linear array searches
    const openSetG = new Map<string, number>();
    const closedSet = new Set<string>();
    const openSet = new MinHeap<PathNode<BattleCell>>();

    const startNode: PathNode<BattleCell> = { cell: startCell, f: 0, g: 0 };
    openSet.push(startNode, 0);
    openSetG.set(`${startCell.x},${startCell.z}`, 0);

    while (openSet.size > 0) {
        const current = openSet.pop()!;
        const currentKey = `${current.cell.x},${current.cell.z}`;

        if (closedSet.has(currentKey)) continue;

        if (current.cell.x === end.x && current.cell.z === end.y) {
            const path: BattleCell[] = [];
            let curr: PathNode<BattleCell> | undefined = current;
            while (curr && curr.parent) {
                path.push(curr.cell);
                curr = curr.parent;
            }
            return path.reverse();
        }

        closedSet.add(currentKey);

        for (const dir of GRID_DIRECTIONS) {
            const nX = current.cell.x + dir.dx;
            const nY = current.cell.z + dir.dy;
            const nKey = `${nX},${nY}`;

            if (closedSet.has(nKey)) continue;

            const neighbor = mapIndex.get(nKey);
            if (!neighbor) continue;

            if (neighbor.isObstacle) continue;
            
            const heightDiff = (neighbor.offsetY + neighbor.height) - (current.cell.offsetY + current.cell.height);
            // Allow climbing steep slopes up to 2.0 height blocks, but restrict anything higher
            if (heightDiff > 2.0) continue;
            // Prevent falling off lethal cliffs (too deep drop)
            if (heightDiff < -3.0) continue;

            // Diagonal Cost + D&D 5E Environmental Hazard Multiplier (e.g. Difficult terrain = 2x)
            const isDiagonal = dir.dx !== 0 && dir.dy !== 0;
            let baseCost = isDiagonal ? 1.4 : 1.0;

            // Apply 3D Slope / Vertical Climbing Costs
            if (heightDiff > 0) {
                // Going uphill: extra fatigue/stamina/movement penalty (1.5x cost multiplier per height unit)
                baseCost += heightDiff * 1.5;
            } else if (heightDiff < 0) {
                // Going downhill: gravitational acceleration boost, making descending faster (clamped to min 0.5)
                baseCost = Math.max(0.5, baseCost - Math.abs(heightDiff) * 0.25);
            }

            const hazardOnNeighbor = hazardMap.get(nKey);
            const hazardMultiplier = getHazardMovementMultiplier(hazardOnNeighbor?.type);
            const cost = baseCost * hazardMultiplier;
            
            const tentativeG = current.g + cost;
            const existingG = openSetG.get(nKey);
            if (existingG !== undefined && tentativeG >= existingG) continue;

            const heuristic = distGrid({x: nX, y: nY}, end);
            const newNode: PathNode<BattleCell> = {
                cell: neighbor,
                g: tentativeG,
                f: tentativeG + heuristic,
                parent: current
            };

            openSetG.set(nKey, tentativeG);
            openSet.push(newNode, newNode.f);
        }
    }
    return null;
};

/**
 * Calculates danger zone / threat reach tiles for all active enemy entities.
 */
export const calculateDangerZoneTiles = (
    entities: Entity[],
    mapData: BattleCell[]
): { x: number; y: number }[] => {
    const enemies = entities.filter(e => e.type === 'ENEMY' && e.stats && e.stats.hp > 0);
    if (enemies.length === 0 || !mapData || mapData.length === 0) return [];

    const dangerSet = new Set<string>();
    const pack = (x: number, z: number) => `${x},${z}`;

    for (const enemy of enemies) {
        const ex = enemy.position.x;
        const ez = enemy.position.y;
        const speedInTiles = Math.floor((enemy.stats.speed || 30) / 5);
        const attackRange = (enemy.stats as any).range || 1;
        const totalThreatReach = speedInTiles + attackRange;

        for (const cell of mapData) {
            if (cell.isObstacle) continue;
            const dx = Math.abs(cell.x - ex);
            const dz = Math.abs(cell.z - ez);
            const dist = Math.max(dx, dz);
            if (dist <= totalThreatReach) {
                dangerSet.add(pack(cell.x, cell.z));
            }
        }
    }

    const result: { x: number; y: number }[] = [];
    dangerSet.forEach(key => {
        const [xStr, zStr] = key.split(',');
        result.push({ x: parseInt(xStr, 10), y: parseInt(zStr, 10) });
    });

    return result;
};

import { BattleCell, BattleHazard, BattleHazardType, TerrainType } from '../types';

export const generateBattleHazards = (
  map: BattleCell[],
  terrain: TerrainType,
  mapSize: number,
  isShadowRealm: boolean = false
): BattleHazard[] => {
  const hazards: BattleHazard[] = [];
  const validCells = map.filter(c => !c.isObstacle);
  if (validCells.length === 0) return hazards;

  const usedCoords = new Set<string>();

  // Prevent hazards on the exact spawn rows (bottom 2 rows for player, top 2 rows for enemies)
  const isSpawnZone = (x: number, z: number) => {
    return z <= 2 || z >= mapSize - 3;
  };

  const getCandidateCells = () => validCells.filter(c => !isSpawnZone(c.x, c.z) && !usedCoords.has(`${c.x},${c.z}`));

  const addHazard = (x: number, z: number, type: BattleHazardType, name: string, description: string, duration?: number) => {
    const key = `${x},${z}`;
    if (usedCoords.has(key)) return;
    usedCoords.add(key);
    hazards.push({
      id: `hazard_${type.toLowerCase()}_${x}_${z}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      x,
      z,
      name,
      description,
      duration
    });
  };

  // 1. Terrain-based Natural Hazards
  if (isShadowRealm) {
    const candidates = getCandidateCells();
    const count = Math.min(candidates.length, 4 + Math.floor(Math.random() * 3));
    for (let i = 0; i < count; i++) {
      const cell = candidates[Math.floor(Math.random() * candidates.length)];
      if (!cell) continue;
      const isElectrified = Math.random() > 0.5;
      if (isElectrified) {
        addHazard(cell.x, cell.z, BattleHazardType.ELECTRIFIED, 'Void Rift Energy', 'Arcane voltage discharges 1d8 lightning damage.');
      } else {
        addHazard(cell.x, cell.z, BattleHazardType.POISON_CLOUD, 'Noxious Void Miasma', 'CON Save DC 13 or suffer 1d6 poison damage.');
      }
    }
    return hazards;
  }

  switch (terrain) {
    case TerrainType.LAVA:
    case TerrainType.DESERT: {
      const candidates = getCandidateCells();
      const fireCount = Math.min(candidates.length, 4 + Math.floor(Math.random() * 3));
      for (let i = 0; i < fireCount; i++) {
        const cell = candidates[Math.floor(Math.random() * candidates.length)];
        if (cell) {
          addHazard(cell.x, cell.z, BattleHazardType.FIRE, 'Roaring Fire Surface', 'DEX Save DC 12 vs 1d6 Fire damage (half on save).');
        }
      }
      break;
    }

    case TerrainType.SWAMP: {
      const candidates = getCandidateCells();
      const poisonCount = Math.min(candidates.length, 3 + Math.floor(Math.random() * 2));
      for (let i = 0; i < poisonCount; i++) {
        const cell = candidates[Math.floor(Math.random() * candidates.length)];
        if (cell) {
          addHazard(cell.x, cell.z, BattleHazardType.POISON_CLOUD, 'Swamp Miasma Cloud', 'CON Save DC 13 vs 1d6 Poison damage.');
        }
      }
      const mudCount = Math.min(candidates.length, 3);
      for (let i = 0; i < mudCount; i++) {
        const cell = candidates[Math.floor(Math.random() * candidates.length)];
        if (cell) {
          addHazard(cell.x, cell.z, BattleHazardType.DIFFICULT_TERRAIN, 'Deep Bog Mud', 'Thick bog mud doubles movement cost.');
        }
      }
      break;
    }

    case TerrainType.TUNDRA:
    case TerrainType.TAIGA: {
      const candidates = getCandidateCells();
      const iceCount = Math.min(candidates.length, 4 + Math.floor(Math.random() * 3));
      for (let i = 0; i < iceCount; i++) {
        const cell = candidates[Math.floor(Math.random() * candidates.length)];
        if (cell) {
          addHazard(cell.x, cell.z, BattleHazardType.ICE_SHEET, 'Slick Ice Sheet', 'Difficult terrain. DEX Save DC 10 or slip & lose footing.');
        }
      }
      break;
    }

    case TerrainType.FOREST: {
      const candidates = getCandidateCells();
      const spikeCount = Math.min(candidates.length, 3 + Math.floor(Math.random() * 2));
      for (let i = 0; i < spikeCount; i++) {
        const cell = candidates[Math.floor(Math.random() * candidates.length)];
        if (cell) {
          addHazard(cell.x, cell.z, BattleHazardType.SPIKE_GROWTH, 'Bramble Briars', 'Difficult terrain. Causes 2d4 Piercing damage when entered.');
        }
      }
      break;
    }

    case TerrainType.RUINS:
    case TerrainType.CASTLE: {
      const candidates = getCandidateCells();
      if (candidates.length > 0) {
        // Consecrated Holy Ground Altar tile
        const holyCell = candidates[Math.floor(Math.random() * candidates.length)];
        if (holyCell) {
          addHazard(holyCell.x, holyCell.z, BattleHazardType.HOLY_GROUND, 'Sanctified Ground', 'Divine radiance heals allies for 1d4 HP.');
        }
      }
      const electCount = Math.min(candidates.length, 2);
      for (let i = 0; i < electCount; i++) {
        const cell = candidates[Math.floor(Math.random() * candidates.length)];
        if (cell) {
          addHazard(cell.x, cell.z, BattleHazardType.ELECTRIFIED, 'Exposed Arcane Conduit', 'Electrical arc deals 1d8 Lightning damage.');
        }
      }
      break;
    }

    default: {
      // Grass / Hills / Default: occasional difficult terrain or briars
      const candidates = getCandidateCells();
      if (Math.random() > 0.4 && candidates.length > 0) {
        const cell = candidates[Math.floor(Math.random() * candidates.length)];
        if (cell) {
          addHazard(cell.x, cell.z, BattleHazardType.SPIKE_GROWTH, 'Wild Thorns', 'Difficult terrain. Causes 2d4 Piercing damage when entered.');
        }
      }
      break;
    }
  }

  return hazards;
};

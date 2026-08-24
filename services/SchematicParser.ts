import * as pako from 'pako';
import { ASSETS } from '../constants';
import { TerrainType } from '../types';
import { cullHiddenBlocks } from './VoxelEngine';

export { cullHiddenBlocks };

export interface SchematicBlock {
  x: number;
  y: number;
  z: number;
  id: number;
  name: string;
  color: string;
  textureUrl: string;
  isSolid: boolean;
  isHazard?: boolean;
  isLight?: boolean;
  isDestructibleCover?: boolean;
  coverType?: 'TREE' | 'ROCK' | 'CRYSTAL';
  hp?: number;
  maxHp?: number;
}

export interface SchematicData {
  title: string;
  width: number;  // X
  height: number; // Y
  length: number; // Z
  blocks: SchematicBlock[];
  totalBlocks: number;
  source: 'uploaded' | 'preset';
}

// Map Minecraft Block Names or IDs to Colors and Textures
export const MINECRAFT_BLOCK_MAP: Record<string, { name: string; color: string; textureUrl: string; isSolid: boolean; isHazard?: boolean; isLight?: boolean; isDestructibleCover?: boolean; coverType?: 'TREE' | 'ROCK' | 'CRYSTAL'; hp?: number }> = {
  'air': { name: 'Aire', color: 'transparent', textureUrl: '', isSolid: false },
  'grass_block': { name: 'Hierba', color: '#4ade80', textureUrl: ASSETS.BLOCK_TEXTURES[TerrainType.GRASS], isSolid: true },
  'dirt': { name: 'Tierra', color: '#854d0e', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.DIRT, isSolid: true },
  'coarse_dirt': { name: 'Tierra Rocosa', color: '#713f12', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.COARSE_DIRT, isSolid: true },
  'stone': { name: 'Piedra', color: '#64748b', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.STONE, isSolid: true, isDestructibleCover: true, coverType: 'ROCK', hp: 30 },
  'cobblestone': { name: 'Adoquín', color: '#475569', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.COBBLESTONE, isSolid: true, isDestructibleCover: true, coverType: 'ROCK', hp: 25 },
  'mossy_cobblestone': { name: 'Adoquín Musgoso', color: '#334155', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.MOSSY_COBBLESTONE, isSolid: true, isDestructibleCover: true, coverType: 'ROCK', hp: 20 },
  'stone_bricks': { name: 'Ladrillos de Piedra', color: '#475569', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.STONE_BRICKS, isSolid: true, isDestructibleCover: true, coverType: 'ROCK', hp: 35 },
  'cracked_stone_bricks': { name: 'Ladrillos Agrietados', color: '#334155', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.CRACKED_STONE_BRICKS, isSolid: true, isDestructibleCover: true, coverType: 'ROCK', hp: 15 },
  'mossy_stone_bricks': { name: 'Ladrillos Musgosos', color: '#1e3a29', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.MOSSY_STONE_BRICKS, isSolid: true, isDestructibleCover: true, coverType: 'ROCK', hp: 25 },
  'oak_log': { name: 'Tronco de Roble', color: '#78350f', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.OAK_LOG, isSolid: true, isDestructibleCover: true, coverType: 'TREE', hp: 20 },
  'oak_leaves': { name: 'Hojas de Roble', color: '#15803d', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.OAK_LEAVES, isSolid: true, isDestructibleCover: true, coverType: 'TREE', hp: 10 },
  'oak_planks': { name: 'Madera de Roble', color: '#a16207', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.OAK_PLANKS, isSolid: true, isDestructibleCover: true, coverType: 'TREE', hp: 15 },
  'jungle_log': { name: 'Tronco de Selva', color: '#713f12', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.JUNGLE_LOG, isSolid: true, isDestructibleCover: true, coverType: 'TREE', hp: 25 },
  'jungle_leaves': { name: 'Hojas de Selva', color: '#166534', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.JUNGLE_LEAVES, isSolid: true, isDestructibleCover: true, coverType: 'TREE', hp: 10 },
  'sandstone': { name: 'Arenisca', color: '#fde047', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.SANDSTONE, isSolid: true },
  'chiseled_sandstone': { name: 'Arenisca Cincelada', color: '#eab308', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.CHISELED_SANDSTONE, isSolid: true },
  'water': { name: 'Agua', color: '#3b82f6', textureUrl: ASSETS.BLOCK_TEXTURES[TerrainType.WATER], isSolid: false },
  'lava': { name: 'Lava', color: '#ef4444', textureUrl: ASSETS.BLOCK_TEXTURES[TerrainType.LAVA], isSolid: true, isHazard: true },
  'obsidian': { name: 'Obsidiana', color: '#0f172a', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.DEEPSLATE, isSolid: true, isDestructibleCover: true, coverType: 'ROCK', hp: 50 },
  'deepslate': { name: 'Pizarra Profunda', color: '#1e293b', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.DEEPSLATE, isSolid: true, isDestructibleCover: true, coverType: 'ROCK', hp: 40 },
  'bedrock': { name: 'Roca Madre', color: '#090d16', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.BEDROCK, isSolid: true },
  'glowstone': { name: 'Piedra Brillante', color: '#fef08a', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.LANTERN, isSolid: true, isLight: true, isDestructibleCover: true, coverType: 'CRYSTAL', hp: 15 },
  'gold_block': { name: 'Bloque de Oro', color: '#eab308', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.CHISELED_SANDSTONE, isSolid: true },
  'diamond_block': { name: 'Bloque de Diamante', color: '#06b6d4', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.STONE_BRICKS, isSolid: true, isDestructibleCover: true, coverType: 'CRYSTAL', hp: 35 },
  'emerald_block': { name: 'Bloque de Esmeralda', color: '#10b981', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.MOSSY_STONE_BRICKS, isSolid: true, isDestructibleCover: true, coverType: 'CRYSTAL', hp: 30 },
  'brick_block': { name: 'Ladrillo', color: '#991b1b', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.CRACKED_STONE_BRICKS, isSolid: true },
  'bookshelf': { name: 'Librería', color: '#854d0e', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.BOOKSHELF, isSolid: true },
  'snow': { name: 'Nieve', color: '#f8fafc', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.SNOW, isSolid: true },
  'tnt': { name: 'TNT', color: '#dc2626', textureUrl: ASSETS.VOXEL_STRUCTURE_TEXTURES.TNT_SIDE, isSolid: true, isHazard: true }
};

// Legacy Minecraft numeric Block IDs fallback (MCEdit v1 schematic)
export const LEGACY_ID_MAP: Record<number, string> = {
  0: 'air',
  1: 'stone',
  2: 'grass_block',
  3: 'dirt',
  4: 'cobblestone',
  5: 'oak_planks',
  8: 'water',
  9: 'water',
  10: 'lava',
  11: 'lava',
  12: 'sandstone',
  17: 'oak_log',
  18: 'oak_leaves',
  24: 'sandstone',

  41: 'gold_block',
  45: 'brick_block',

  48: 'mossy_cobblestone',
  49: 'obsidian',

  89: 'glowstone',
  98: 'stone_bricks',
  161: 'oak_leaves',
  162: 'oak_log'
};

// --- NBT BINARY READER ---
class NBTReader {
  private buffer: Uint8Array;
  private offset: number = 0;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
  }

  readByte(): number {
    return this.buffer[this.offset++];
  }

  readShort(): number {
    const val = (this.buffer[this.offset] << 8) | this.buffer[this.offset + 1];
    this.offset += 2;
    // convert to signed short
    return val > 32767 ? val - 65536 : val;
  }

  readInt(): number {
    const val = (this.buffer[this.offset] << 24) |
                (this.buffer[this.offset + 1] << 16) |
                (this.buffer[this.offset + 2] << 8) |
                this.buffer[this.offset + 3];
    this.offset += 4;
    return val;
  }

  readString(): string {
    const len = (this.buffer[this.offset] << 8) | this.buffer[this.offset + 1];
    this.offset += 2;
    const strBytes = this.buffer.subarray(this.offset, this.offset + len);
    this.offset += len;
    return new TextDecoder('utf-8').decode(strBytes);
  }

  readByteArray(): Uint8Array {
    const len = this.readInt();
    const arr = this.buffer.subarray(this.offset, this.offset + len);
    this.offset += len;
    return arr;
  }

  readIntArray(): Int32Array {
    const len = this.readInt();
    const arr = new Int32Array(len);
    for (let i = 0; i < len; i++) {
      arr[i] = this.readInt();
    }
    return arr;
  }

  skipTagValue(tagType: number) {
    switch (tagType) {
      case 1: this.offset += 1; break; // Byte
      case 2: this.offset += 2; break; // Short
      case 3: this.offset += 4; break; // Int
      case 4: this.offset += 8; break; // Long
      case 5: this.offset += 4; break; // Float
      case 6: this.offset += 8; break; // Double
      case 7: { // Byte Array
        const len = this.readInt();
        this.offset += len;
        break;
      }
      case 8: { // String
        const len = (this.buffer[this.offset] << 8) | this.buffer[this.offset + 1];
        this.offset += 2 + len;
        break;
      }
      case 9: { // List
        const elemType = this.readByte();
        const len = this.readInt();
        for (let i = 0; i < len; i++) {
          this.skipTagValue(elemType);
        }
        break;
      }
      case 10: { // Compound
        while (true) {
          const innerTag = this.readByte();
          if (innerTag === 0) break;
          this.readString(); // name
          this.skipTagValue(innerTag);
        }
        break;
      }
      case 11: { // Int Array
        const len = this.readInt();
        this.offset += len * 4;
        break;
      }
      case 12: { // Long Array
        const len = this.readInt();
        this.offset += len * 8;
        break;
      }
    }
  }

  parseCompoundTag(): Record<string, any> {
    const result: Record<string, any> = {};
    while (this.offset < this.buffer.length) {
      const tagType = this.readByte();
      if (tagType === 0) break; // Tag_End
      const tagName = this.readString();
      result[tagName] = this.parseTagValue(tagType);
    }
    return result;
  }

  parseTagValue(tagType: number): any {
    switch (tagType) {
      case 1: return this.readByte();
      case 2: return this.readShort();
      case 3: return this.readInt();
      case 4: { this.offset += 8; return 0; } // Long simplified
      case 5: { this.offset += 4; return 0; } // Float
      case 6: { this.offset += 8; return 0; } // Double
      case 7: return this.readByteArray();
      case 8: return this.readString();
      case 9: {
        const elemType = this.readByte();
        const len = this.readInt();
        const list = [];
        for (let i = 0; i < len; i++) {
          list.push(this.parseTagValue(elemType));
        }
        return list;
      }
      case 10: return this.parseCompoundTag();
      case 11: return this.readIntArray();
      default:
        this.skipTagValue(tagType);
        return null;
    }
  }
}

/**
 * Parses raw ArrayBuffer of a .schematic or .schem file
 */
export const parseMinecraftSchematic = async (arrayBuffer: ArrayBuffer, title: string = 'Mapa Importado'): Promise<SchematicData> => {
  let decompressed: Uint8Array;
  try {
    decompressed = pako.ungzip(new Uint8Array(arrayBuffer));
  } catch (e) {
    // If not gzipped, try raw buffer
    decompressed = new Uint8Array(arrayBuffer);
  }

  const reader = new NBTReader(decompressed);
  const rootType = reader.readByte();
  if (rootType !== 10) {
    throw new Error('Archivo .schematic no válido (no contiene etiqueta Compound NBT inicial)');
  }
  const rootName = reader.readString();
  const nbt = reader.parseCompoundTag();

  // MCEdit format fields
  let width = nbt.Width || (nbt.Schematic && nbt.Schematic.Width) || 16;
  let height = nbt.Height || (nbt.Schematic && nbt.Schematic.Height) || 16;
  let length = nbt.Length || (nbt.Schematic && nbt.Schematic.Length) || 16;

  const rawBlocks: Uint8Array | Int32Array = nbt.Blocks || (nbt.Schematic && nbt.Schematic.Blocks) || (nbt.BlockData) || new Uint8Array();

  const blocks: SchematicBlock[] = [];

  if (rawBlocks && rawBlocks.length > 0) {
    // MCEdit Indexing formula: (y * Length + z) * Width + x
    for (let y = 0; y < height; y++) {
      for (let z = 0; z < length; z++) {
        for (let x = 0; x < width; x++) {
          const index = (y * length + z) * width + x;
          if (index < rawBlocks.length) {
            const rawId = rawBlocks[index];
            if (rawId > 0) {
              const keyName = LEGACY_ID_MAP[rawId] || 'stone';
              const blockMeta = MINECRAFT_BLOCK_MAP[keyName] || MINECRAFT_BLOCK_MAP.stone;
              blocks.push({
                x,
                y,
                z,
                id: rawId,
                name: blockMeta.name,
                color: blockMeta.color,
                textureUrl: blockMeta.textureUrl,
                isSolid: blockMeta.isSolid,
                isHazard: blockMeta.isHazard
              });
            }
          }
        }
      }
    }
  }

  // If map ended up empty or corrupt, fallback to generated procedural schematic
  if (blocks.length === 0) {
    return generatePresetSchematic('Castillo de Cacería de Obsidiana');
  }

  return {
    title,
    width,
    height,
    length,
    blocks,
    totalBlocks: blocks.length,
    source: 'uploaded'
  };
};

/**
 * Procedurally generates high-quality Community Minecraft-style Presets
 * (e.g., Obsidian Dragon Arena, Ancient Temple, Mountain Citadel)
 */
export const generatePresetSchematic = (presetType: string): SchematicData => {
  const blocks: SchematicBlock[] = [];
  let width = 22;
  let length = 22;
  let height = 12;

  const getMeta = (typeKey: string) => MINECRAFT_BLOCK_MAP[typeKey] || MINECRAFT_BLOCK_MAP.stone;

  if (presetType.includes('Bosque') || presetType.includes('Forest') || presetType.includes('Denso')) {
    // 🌲 FAST TACTICAL BIOME 1: Bosque de Voxel Denso (22x22)
    // Dense foliage, destructible trees, mossy stone boulders, choke points
    width = 22; length = 22; height = 12;

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < length; z++) {
        // Base grass ground
        blocks.push({ x, y: 0, z, id: 2, ...getMeta('grass_block') });

        // Tactical Choke Points & Path corridors (x=11 or z=11 clear walkways)
        const isPath = (x === 10 || x === 11 || z === 10 || z === 11);
        const isSpawn = (x <= 3 && z <= 3);

        if (!isSpawn && !isPath) {
          // Destructible Trees placement in tactical clusters
          const isTreeTrunk = (x % 4 === 1 && z % 4 === 1) || (x % 5 === 2 && z % 5 === 3);
          if (isTreeTrunk) {
            for (let y = 1; y <= 4; y++) {
              blocks.push({ x, y, z, id: 17, ...getMeta('oak_log') });
            }
            // Canopy leaves
            for (let lx = Math.max(0, x - 1); lx <= Math.min(width - 1, x + 1); lx++) {
              for (let lz = Math.max(0, z - 1); lz <= Math.min(length - 1, z + 1); lz++) {
                for (let ly = 3; ly <= 5; ly++) {
                  if (ly > 3 || (lx === x || lz === z)) {
                    blocks.push({ x: lx, y: ly, z: lz, id: 18, ...getMeta('oak_leaves') });
                  }
                }
              }
            }
          }

          // Mossy Boulder Covers (Destructible Rocks)
          const isBoulder = (x % 6 === 3 && z % 6 === 0) || (x % 7 === 4 && z % 7 === 2);
          if (isBoulder) {
            blocks.push({ x, y: 1, z, id: 48, ...getMeta('mossy_cobblestone') });
            if ((x + z) % 2 === 0) {
              blocks.push({ x, y: 2, z, id: 98, ...getMeta('mossy_stone_bricks') });
            }
          }
        }
      }
    }
  } else if (presetType.includes('Cristal') || presetType.includes('Templo') || presetType.includes('Ruinas')) {
    // 💎 FAST TACTICAL BIOME 2: Ruinas de Cristal Antiguo (22x22)
    // Crystal pillars, destructible arches, reflecting cover, high-ground platforms
    width = 22; length = 22; height = 14;

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < length; z++) {
        // Base stone brick ground
        blocks.push({ x, y: 0, z, id: 98, ...getMeta('stone_bricks') });

        const isSpawn = (x <= 3 && z <= 3);

        if (!isSpawn) {
          // Destructible Crystal Pillars at strategic positions
          const isCrystalPillar = (x === 6 && z === 6) || (x === 15 && z === 6) || (x === 6 && z === 15) || (x === 15 && z === 15);
          if (isCrystalPillar) {
            for (let y = 1; y <= 5; y++) {
              const bType = (y === 5) ? 'glowstone' : ((y % 2 === 0) ? 'emerald_block' : 'diamond_block');
              blocks.push({ x, y, z, id: 133, ...getMeta(bType) });
            }
          }

          // Destructible Ancient Ruin Walls / Arches
          const isRuinWall = ((x === 10 || x === 11) && z >= 4 && z <= 17 && z % 3 !== 0) ||
                             ((z === 10 || z === 11) && x >= 4 && x <= 17 && x % 3 !== 0);
          if (isRuinWall) {
            blocks.push({ x, y: 1, z, id: 98, ...getMeta('cracked_stone_bricks') });
            if ((x + z) % 2 === 0) {
              blocks.push({ x, y: 2, z, id: 98, ...getMeta('chiseled_sandstone') });
            }
          }
        }
      }
    }
  } else {
    // 🌋 FAST TACTICAL BIOME 3: Cañón de Obsidiana & Volcán (22x22 default)
    // Volcanic obsidian pillars, stone cover boulders, choke points
    width = 22; length = 22; height = 14;

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < length; z++) {
        // Base bedrock/deepslate
        blocks.push({ x, y: 0, z, id: 49, ...getMeta('deepslate') });

        const isSpawn = (x <= 3 && z <= 3);
        const isCorridor = (x >= 9 && x <= 12) || (z >= 9 && z <= 12);

        if (!isSpawn && !isCorridor) {
          // Destructible Obsidian Pillars
          const isObsidianPillar = (x % 5 === 2 && z % 5 === 2) || (x % 7 === 1 && z % 7 === 4);
          if (isObsidianPillar) {
            for (let y = 1; y <= 4; y++) {
              blocks.push({ x, y, z, id: 49, ...getMeta('obsidian') });
            }
          }

          // Stone / Cobblestone Cover Boulders
          const isStoneCover = (x % 4 === 0 && z % 4 === 2) || (x % 6 === 3 && z % 6 === 1);
          if (isStoneCover) {
            blocks.push({ x, y: 1, z, id: 4, ...getMeta('cobblestone') });
            blocks.push({ x, y: 2, z, id: 1, ...getMeta('stone') });
          }
        }
      }
    }
  }

  return {
    title: presetType,
    width,
    height,
    length,
    blocks,
    totalBlocks: blocks.length,
    source: 'preset'
  };
};


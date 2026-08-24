import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Complete map of Minecraft textures with RGB colors
const MC_TEXTURES = {
  'grass_block_top.png': [34, 197, 94],
  'podzol_top.png': [120, 53, 15],
  'snow.png': [241, 245, 249],
  'stone.png': [100, 116, 139],
  'blue_concrete.png': [59, 130, 246],
  'stone_bricks.png': [71, 85, 105],
  'mossy_cobblestone.png': [34, 197, 94],
  'oak_planks.png': [180, 83, 9],
  'sand.png': [252, 211, 77],
  'cobblestone.png': [148, 163, 184],
  'mycelium_top.png': [168, 85, 247],
  'lava_still.png': [239, 68, 68],
  'black_concrete.png': [15, 23, 42],
  'bricks.png': [185, 28, 28],
  'grass.png': [74, 222, 128],
  'poppy.png': [244, 63, 94],
  'red_mushroom.png': [225, 29, 72],
  'dirt.png': [133, 77, 14],
  'coarse_dirt.png': [113, 63, 18],
  'oak_log.png': [120, 53, 15],
  'oak_leaves.png': [21, 128, 61],
  'birch_log.png': [217, 219, 204],
  'birch_leaves.png': [132, 204, 22],
  'spruce_log.png': [67, 40, 24],
  'spruce_leaves.png': [20, 83, 45],
  'jungle_log.png': [113, 63, 18],
  'jungle_leaves.png': [22, 101, 52],
  'flowering_azalea_leaves.png': [236, 72, 153],
  'cactus_side.png': [22, 163, 74],
  'sandstone.png': [253, 224, 71],
  'chiseled_sandstone.png': [234, 179, 8],
  'cracked_stone_bricks.png': [51, 65, 85],
  'mossy_stone_bricks.png': [30, 58, 41],
  'deepslate.png': [30, 41, 59],
  'bedrock.png': [15, 23, 42],
  'red_mushroom_block.png': [220, 38, 38],
  'brown_mushroom_block.png': [146, 64, 14],
  'mushroom_stem.png': [241, 245, 249],
  'bookshelf.png': [133, 77, 14],
  'barrel_side.png': [161, 98, 7],
  'hay_block_side.png': [234, 179, 8],
  'tnt_side.png': [220, 38, 38],
  'tnt_top.png': [239, 68, 68],
  'enchanting_table_top.png': [147, 51, 234],
  'lantern.png': [254, 240, 138]
};

const WESNOTH_FILES = {
  // Terrain
  'terrain/grass/green.png': [34, 197, 94],
  'terrain/grass/semi-dry.png': [163, 163, 80],
  'terrain/grass/dry.png': [202, 138, 4],
  'terrain/frozen/snow.png': [241, 245, 249],
  'terrain/water/coast-tile.png': [59, 130, 246],
  'terrain/water/coast.png': [59, 130, 246],
  'terrain/mountains/basic.png': [100, 116, 139],
  'terrain/mountains/basic-tile.png': [100, 116, 139],
  'terrain/mountains/dry-tile.png': [148, 163, 184],
  'terrain/village/human-tile.png': [180, 83, 9],
  'terrain/village/human-city-tile.png': [148, 163, 184],
  'terrain/flat/dirt.png': [133, 77, 14],
  'terrain/flat/road.png': [148, 163, 184],
  'terrain/sand/desert.png': [252, 211, 77],
  'terrain/swamp/mud-tile.png': [120, 53, 15],
  'terrain/cave/floor.png': [71, 85, 105],
  'terrain/forest/mushrooms-tile.png': [168, 85, 247],
  'terrain/unwalkable/lava-tile.png': [239, 68, 68],
  'terrain/chasm/earthy-tile.png': [15, 23, 42],
  'terrain/castle/castle-tile.png': [71, 85, 105],
  'terrain/castle/ruin-tile.png': [51, 65, 85],
  'terrain/forest/pine-tile.png': [21, 128, 61],
  'terrain/forest/deciduous-summer-tile.png': [34, 197, 94],
  'terrain/forest/tropical/rainforest-small.png': [22, 101, 52],
  'terrain/forest/snow-forest-tile.png': [226, 232, 240],

  // Items
  'items/staff-magic.png': [168, 85, 247],
  'items/staff.png': [180, 83, 9],
  'items/potion-red.png': [239, 68, 68],
  'items/potion-blue.png': [59, 130, 246],
  'items/grain-sheaf.png': [234, 179, 8],
  'items/sword.png': [148, 163, 184],
  'items/dagger.png': [100, 116, 139],
  'items/armor.png': [100, 116, 139],
  'items/armor-golden.png': [234, 179, 8],
  'items/bow.png': [234, 179, 8],

  // Attacks
  'attacks/battleaxe.png': [148, 163, 184],
  'attacks/mace.png': [148, 163, 184],
  'attacks/heater-shield.png': [100, 116, 139],

  // Units
  'units/human-loyalists/lieutenant.png': [56, 189, 248],
  'units/human-loyalists/swordsman.png': [59, 130, 246],
  'units/human-loyalists/fencer.png': [236, 72, 153],
  'units/human-loyalists/paladin.png': [250, 204, 21],
  'units/human-magi/red-mage.png': [239, 68, 68],
  'units/human-magi/white-mage.png': [248, 250, 252],
  'units/human-magi/silver-mage.png': [14, 165, 233],
  'units/human-magi/dark-adept.png': [147, 51, 234],
  'units/human-outlaws/thief.png': [168, 85, 247],
  'units/human-outlaws/thug.png': [245, 158, 11],
  'units/human-outlaws/huntsman.png': [16, 185, 129],
  'units/human-outlaws/footpad.png': [217, 119, 6],
  'units/elves-wood/shaman.png': [34, 197, 94],
  'units/elves-wood/hero.png': [16, 185, 129],
  'units/elves-wood/archer.png': [34, 197, 94],
  'units/dwarves/steelclad.png': [100, 116, 139],
  'units/dwarves/guard.png': [71, 85, 105],
  'units/dwarves/thunderer.png': [148, 163, 184],
  'units/drakes/fighter.png': [220, 38, 38],
  'units/orcs/warrior.png': [22, 101, 52],
  'units/orcs/grunt.png': [21, 128, 61],
  'units/orcs/archer.png': [22, 163, 74],
  'units/goblins/spearman.png': [74, 222, 128],
  'units/undead-skeletal/skeleton.png': [203, 213, 225],
  'units/undead-skeletal/archer.png': [148, 163, 184],
  'units/undead-necromancers/dark-sorcerer.png': [126, 34, 206],
  'units/undead-necromancers/adept.png': [147, 51, 234],
  'units/undead/walking-corpse.png': [71, 85, 105],
  'units/monsters/wolf.png': [100, 116, 139],
  'units/monsters/vampire-bat.png': [30, 41, 59]
};

// Add Halos / VFX
for (let i = 1; i <= 8; i++) {
  WESNOTH_FILES[`halo/elven/nature-halo${i}.png`] = [74, 222, 128];
  WESNOTH_FILES[`projectiles/fire-burst-small-${i}.png`] = [239, 68, 68];
}
for (let i = 1; i <= 6; i++) {
  WESNOTH_FILES[`halo/undead/dark-magic-${i}.png`] = [168, 85, 247];
}
for (let i = 1; i <= 4; i++) {
  WESNOTH_FILES[`halo/lightning-bolt-1-${i}.png`] = [56, 189, 248];
}

function createPNG(dest, baseColor, isSprite = false) {
  const dir = path.dirname(dest);
  fs.mkdirSync(dir, { recursive: true });

  const width = isSprite ? 48 : 32;
  const height = isSprite ? 48 : 32;
  const png = new PNG({ width, height });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      
      if (isSprite) {
        // Character Ornate Badge Sprite
        const dx = x - width / 2;
        const dy = y - height / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= 20) {
          const shade = dist > 18 ? 0.6 : dist > 14 ? 1.15 : 0.9;
          png.data[idx] = Math.min(255, Math.floor(baseColor[0] * shade));
          png.data[idx + 1] = Math.min(255, Math.floor(baseColor[1] * shade));
          png.data[idx + 2] = Math.min(255, Math.floor(baseColor[2] * shade));
          png.data[idx + 3] = 255;
        } else {
          png.data[idx + 3] = 0; // Transparent
        }
      } else {
        // Pixelated Grid Texture
        const isAlt = (x < width/2 && y < height/2) || (x >= width/2 && y >= height/2);
        const shade = isAlt ? 0.88 : 1.0;

        png.data[idx] = Math.min(255, Math.floor(baseColor[0] * shade));
        png.data[idx + 1] = Math.min(255, Math.floor(baseColor[1] * shade));
        png.data[idx + 2] = Math.min(255, Math.floor(baseColor[2] * shade));
        png.data[idx + 3] = 255;
      }
    }
  }

  const buffer = PNG.sync.write(png);
  fs.writeFileSync(dest, buffer);
}

function main() {
  console.log("Generating complete local asset pack for Minecraft and Wesnoth...");

  let count = 0;
  Object.entries(MC_TEXTURES).forEach(([filename, rgb]) => {
    const dest = path.join('public', 'assets', 'minecraft', filename);
    createPNG(dest, rgb, false);
    count++;
  });

  Object.entries(WESNOTH_FILES).forEach(([relPath, rgb]) => {
    const dest = path.join('public', 'assets', 'wesnoth', relPath);
    const isSprite = relPath.startsWith('units/') || relPath.startsWith('items/') || relPath.startsWith('attacks/');
    createPNG(dest, rgb, isSprite);
    count++;
  });

  console.log(`Generated ${count} local PNG files across /public/assets!`);
}

main();

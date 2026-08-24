import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REMOTE_WESNOTH_URL = "https://raw.githubusercontent.com/wesnoth/wesnoth/master/data/core/images";
const REMOTE_MC_URL = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/block";

// Color map for block fallbacks
const BLOCK_COLOR_MAP = {
  'grass_block_top.png': [34, 197, 94],
  'podzol_top.png': [120, 53, 15],
  'snow.png': [241, 245, 249],
  'stone.png': [100, 116, 139],
  'blue_concrete.png': [59, 130, 246],
  'stone_bricks.png': [71, 85, 105],
  'mossy_cobblestone.png': [22, 101, 52],
  'oak_planks.png': [180, 83, 9],
  'sand.png': [252, 211, 77],
  'cobblestone.png': [148, 163, 184],
  'mycelium_top.png': [168, 85, 247],
  'lava_still.png': [239, 68, 68],
  'black_concrete.png': [15, 23, 42],
  'bricks.png': [185, 28, 28],
  'grass.png': [74, 222, 128],
  'poppy.png': [244, 63, 94],
  'red_mushroom.png': [225, 29, 72]
};

const WESNOTH_FILES = [
    'units/human-loyalists/lieutenant.png',
    'units/human-loyalists/swordsman.png',
    'units/human-magi/red-mage.png',
    'units/human-outlaws/thief.png',
    'units/human-magi/white-mage.png',
    'units/human-outlaws/thug.png',
    'units/human-loyalists/fencer.png',
    'units/elves-wood/shaman.png',
    'units/human-loyalists/paladin.png',
    'units/human-outlaws/huntsman.png',
    'units/human-magi/silver-mage.png',
    'units/human-magi/dark-adept.png',

    'units/elves-wood/hero.png',
    'units/dwarves/steelclad.png',
    'units/human-outlaws/footpad.png',
    'units/drakes/fighter.png',
    'units/dwarves/thunderer.png',
    'units/orcs/warrior.png',

    'units/goblins/spearman.png',
    'units/orcs/grunt.png',
    'units/orcs/archer.png',
    'units/undead-skeletal/skeleton/skeleton.png',
    'units/undead-skeletal/archer.png',
    'units/undead-necromancers/dark-sorcerer.png',
    'units/undead/walking-corpse.png',
    'units/monsters/wolf.png',
    'units/monsters/vampire-bat.png',
    
    'terrain/grass/green.png',
    'terrain/grass/semi-dry.png',
    'terrain/grass/dry.png',
    'terrain/frozen/snow.png',
    'terrain/water/coast.png',
    'terrain/flat/dirt.png',
    'terrain/sand/desert.png',
    'terrain/swamp/water-tile.png',
    
    'terrain/cave/floor.png', 
    'terrain/chasm/lava.png',
    'terrain/chasm/earthy.png',
    'terrain/path/cobble.png',
    'terrain/path/dirt.png',
    'terrain/interior/stone.png',
    'terrain/interior/wooden.png',
    'terrain/walls/stone.png',
    
    'terrain/forest/pine-tile.png',
    'terrain/forest/deciduous-summer-tile.png',
    'terrain/forest/rainforest-tile.png',
    'terrain/forest/snow-forest-tile.png',
    'terrain/mountains/basic-tile.png',
    'terrain/mountains/dry-tile.png',
    'terrain/village/human-cottage.png', 
    'terrain/village/human-city-tile.png', 
    'terrain/castle/castle.png', 
    'terrain/castle/ruin.png', 
    'terrain/cave/fungus-tile.png',
    
    'weather/rain-heavy.png'
];

const MC_FILES = [
    'grass_block_top.png',
    'podzol_top.png',
    'snow.png',
    'stone.png',
    'blue_concrete.png',
    'stone_bricks.png',
    'mossy_cobblestone.png',
    'oak_planks.png',
    'sand.png',
    'cobblestone.png',
    'mycelium_top.png',
    'lava_still.png',
    'black_concrete.png',
    'bricks.png',
    'grass.png',
    'poppy.png',
    'red_mushroom.png'
];

function generateFallbackPNG(dest, filename) {
  const dir = path.dirname(dest);
  fs.mkdirSync(dir, { recursive: true });

  const png = new PNG({ width: 16, height: 16 });
  const baseColor = BLOCK_COLOR_MAP[filename] || [100, 116, 139];

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      const isAlt = (x < 8 && y < 8) || (x >= 8 && y >= 8);
      const shade = isAlt ? 0.85 : 1.0;

      png.data[idx] = Math.min(255, Math.floor(baseColor[0] * shade));
      png.data[idx + 1] = Math.min(255, Math.floor(baseColor[1] * shade));
      png.data[idx + 2] = Math.min(255, Math.floor(baseColor[2] * shade));
      png.data[idx + 3] = 255;
    }
  }

  const buffer = PNG.sync.write(png);
  fs.writeFileSync(dest, buffer);
}

function downloadFile(url, dest, filename) {
  return new Promise((resolve) => {
    const dir = path.dirname(dest);
    fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(dest) && fs.statSync(dest).size > 100) {
      resolve(true);
      return;
    }

    const file = fs.createWriteStream(dest);
    const req = https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else {
        fs.unlink(dest, () => {});
        generateFallbackPNG(dest, filename);
        resolve(false);
      }
    });

    req.on('error', () => {
      fs.unlink(dest, () => {});
      generateFallbackPNG(dest, filename);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      fs.unlink(dest, () => {});
      generateFallbackPNG(dest, filename);
      resolve(false);
    });
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("Generating and downloading local assets...");

  const queue = [];

  WESNOTH_FILES.forEach(f => {
    queue.push({
      url: `${REMOTE_WESNOTH_URL}/${f}`,
      dest: path.join('public', 'assets', 'wesnoth', f),
      filename: path.basename(f)
    });
  });

  MC_FILES.forEach(f => {
    queue.push({
      url: `${REMOTE_MC_URL}/${f}`,
      dest: path.join('public', 'assets', 'minecraft', f),
      filename: path.basename(f)
    });
  });

  let downloaded = 0;
  let generated = 0;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const success = await downloadFile(item.url, item.dest, item.filename);
    if (success) downloaded++;
    else generated++;

    if (i % 10 === 0) {
      console.log(`Processed ${i + 1}/${queue.length} assets...`);
    }
    await sleep(50); // Gentle throttle to avoid HTTP 429
  }

  console.log(`\nCompleted! Downloaded: ${downloaded}, Procedurally Generated: ${generated}`);
}

main();

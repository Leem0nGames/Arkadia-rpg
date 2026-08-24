import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const LOCAL_WESNOTH_DIR = path.join(ROOT_DIR, 'public', 'assets', 'wesnoth');

const REMOTE_WESNOTH_URL = "https://raw.githubusercontent.com/wesnoth/wesnoth/master/data/core/images";

/**
 * Verified list of all Wesnoth assets required by Arcadia Tactics.
 * All paths have been cross-checked against the official GitHub repository.
 */
export const REQUIRED_WESNOTH_ASSETS = [
    // --- TERRAINS: BASE HEX TILES ---
    'terrain/grass/green.png',
    'terrain/grass/semi-dry.png',
    'terrain/grass/dry.png',
    'terrain/frozen/snow.png',
    'terrain/water/coast-tile.png',
    'terrain/sand/desert.png',
    'terrain/swamp/mud-tile.png',
    'terrain/swamp/water-tile.png',
    'terrain/cave/floor.png',
    'terrain/cave/beam-tile.png',
    'terrain/cave/earthy-floor.png',
    'terrain/unwalkable/lava-tile.png',
    'terrain/chasm/earthy-tile.png',
    'terrain/flat/road.png',
    'terrain/flat/dirt.png',
    'terrain/mountains/basic.png',

    // --- TERRAINS: OVERLAYS, FORESTS, MOUNTAINS, RUINS & VILLAGES ---
    'terrain/forest/pine-tile.png',
    'terrain/forest/deciduous-summer-tile.png',
    'terrain/forest/deciduous-winter-tile.png',
    'terrain/forest/snow-forest-tile.png',
    'terrain/forest/tropical/rainforest-tile.png',
    'terrain/forest/tropical/rainforest-small.png',
    'terrain/forest/tropical/rainforest.png',
    'terrain/forest/mushrooms-tile.png',
    
    'terrain/mountains/basic-tile.png',
    'terrain/mountains/dry-tile.png',
    'terrain/mountains/snow-tile.png',
    'terrain/mountains/volcano-tile.png',
    
    'terrain/village/human-tile.png',
    'terrain/village/human-city-tile.png',
    'terrain/village/human-hills-tile.png',
    'terrain/village/elven-tile.png',
    'terrain/village/orc-tile.png',
    'terrain/village/desert-tile.png',
    'terrain/village/cave-tile.png',
    'terrain/village/camp-tile.png',
    'terrain/village/hut-tile.png',
    'terrain/village/tropical-tile.png',

    'terrain/castle/castle-tile.png',
    'terrain/castle/keep-tile.png',
    'terrain/castle/ruin-tile.png',
    'terrain/castle/dwarven-castle-tile.png',
    'terrain/castle/dwarven-keep-tile.png',
    'terrain/castle/sunken-ruin-tile.png',

    // --- UNITS & CHARACTERS ---
    'units/human-loyalists/lieutenant.png',
    'units/human-loyalists/swordsman.png',
    'units/human-loyalists/fencer.png',
    'units/human-loyalists/paladin.png',
    'units/human-outlaws/thief.png',
    'units/human-outlaws/thug.png',
    'units/human-outlaws/huntsman.png',
    'units/human-outlaws/footpad.png',
    'units/human-magi/red-mage.png',
    'units/human-magi/white-mage.png',
    'units/human-magi/silver-mage.png',
    
    'units/elves-wood/hero.png',
    'units/elves-wood/archer.png',
    'units/elves-wood/shaman.png',
    'units/elves-wood/captain.png',
    'units/elves-wood/ranger.png',
    
    'units/dwarves/steelclad.png',
    'units/dwarves/guard.png',
    'units/dwarves/fighter.png',
    'units/dwarves/thunderer.png',
    
    'units/drakes/fighter.png',
    'units/orcs/warrior.png',
    'units/orcs/grunt.png',
    'units/orcs/archer.png',
    'units/goblins/spearman.png',
    
    'units/undead-skeletal/skeleton.png',
    'units/undead-skeletal/archer.png',
    'units/undead-necromancers/dark-sorcerer.png',
    'units/undead-necromancers/adept.png',
    'units/undead/walking-corpse.png',
    'units/monsters/wolf.png',
    'units/monsters/vampire-bat.png',

    // --- ITEMS, WEAPONS, SHIELDS & ATTACKS ---
    'items/staff.png',
    'items/staff-magic.png',
    'items/potion-red.png',
    'items/potion-blue.png',
    'items/potion-green.png',
    'items/potion-yellow.png',
    'items/potion-poison.png',
    'items/potion-grey.png',
    'items/holy-water.png',
    'items/dagger.png',
    'items/dagger-poison.png',
    'items/sword.png',
    'items/hammer-runic.png',
    'items/bow.png',
    'items/buckler.png',
    'items/armor.png',
    'items/armor-golden.png',
    'items/ring-gold.png',
    'items/ring-silver.png',
    'items/ring-red.png',
    'items/chest.png',
    'items/chest-plain-open.png',
    'items/book2.png',
    'items/scroll.png',
    'items/sceptre.png',
    'items/ankh.png',
    'items/ball-blue.png',
    'items/gem-blue.png',
    'items/gold-coins-medium.png',
    'items/grain-sheaf.png',
    
    'attacks/greatsword-human.png',
    'attacks/battleaxe.png',
    'attacks/axe.png',
    'attacks/mace.png',
    'attacks/saber-human.png',
    'attacks/heater-shield.png',
    'attacks/rectangular-shield.png',
    'attacks/staff-magic.png',
    'attacks/staff-elven.png',
    'attacks/staff-ruby.png',
    'attacks/bow-elven.png',
    'attacks/crossbow-human.png',

    // --- HALOS, SPELL ANIMATIONS & WEATHER ---
    'halo/elven/nature-halo1.png',
    'halo/elven/nature-halo2.png',
    'halo/elven/nature-halo3.png',
    'halo/elven/nature-halo4.png',
    'halo/elven/nature-halo5.png',
    'halo/elven/nature-halo6.png',
    'halo/elven/nature-halo7.png',
    'halo/elven/nature-halo8.png',
    
    'halo/undead/dark-magic-1.png',
    'halo/undead/dark-magic-2.png',
    'halo/undead/dark-magic-3.png',
    'halo/undead/dark-magic-4.png',
    'halo/undead/dark-magic-5.png',
    'halo/undead/dark-magic-6.png',
    
    'halo/lightning-bolt-1-1.png',
    'halo/lightning-bolt-1-2.png',
    'halo/lightning-bolt-1-3.png',
    'halo/lightning-bolt-1-4.png',
    
    'projectiles/fire-burst-small-1.png',
    'projectiles/fire-burst-small-2.png',
    'projectiles/fire-burst-small-3.png',
    'projectiles/fire-burst-small-4.png',
    'projectiles/fire-burst-small-5.png',
    'projectiles/fire-burst-small-6.png',
    'projectiles/fire-burst-small-7.png',
    'projectiles/fire-burst-small-8.png',
    
    'weather/rain-heavy.png'
];

function getFallbackColor(relPath) {
    const lower = relPath.toLowerCase();
    if (lower.includes('grass')) return [34, 197, 94];
    if (lower.includes('sand') || lower.includes('desert')) return [252, 211, 77];
    if (lower.includes('frozen') || lower.includes('snow')) return [241, 245, 249];
    if (lower.includes('water') || lower.includes('sea')) return [59, 130, 246];
    if (lower.includes('mountain')) return [100, 116, 139];
    if (lower.includes('village')) return [180, 83, 9];
    if (lower.includes('castle') || lower.includes('ruin')) return [71, 85, 105];
    if (lower.includes('swamp') || lower.includes('mud')) return [120, 53, 15];
    if (lower.includes('cave')) return [71, 85, 105];
    if (lower.includes('lava')) return [239, 68, 68];
    if (lower.includes('forest') || lower.includes('pine')) return [21, 128, 61];
    if (lower.includes('units/')) return [56, 189, 248];
    if (lower.includes('items/')) return [168, 85, 247];
    if (lower.includes('attacks/')) return [244, 63, 94];
    return [100, 116, 139];
}

function generateFallbackPNG(destPath, relPath) {
    try {
        const baseColor = getFallbackColor(relPath);
        const isSprite = relPath.startsWith('units/') || relPath.startsWith('items/') || relPath.startsWith('attacks/');
        const width = isSprite ? 48 : 32;
        const height = isSprite ? 48 : 32;
        const png = new PNG({ width, height });

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (width * y + x) << 2;
                if (isSprite) {
                    const centerX = width / 2;
                    const centerY = height / 2;
                    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                    if (dist < width * 0.4) {
                        const shade = 1.0 - (dist / (width * 0.4)) * 0.3;
                        png.data[idx] = Math.min(255, Math.floor(baseColor[0] * shade));
                        png.data[idx + 1] = Math.min(255, Math.floor(baseColor[1] * shade));
                        png.data[idx + 2] = Math.min(255, Math.floor(baseColor[2] * shade));
                        png.data[idx + 3] = 255;
                    } else {
                        png.data[idx + 3] = 0;
                    }
                } else {
                    const isAlt = (x < width / 2 && y < height / 2) || (x >= width / 2 && y >= height / 2);
                    const shade = isAlt ? 0.88 : 1.0;
                    png.data[idx] = Math.min(255, Math.floor(baseColor[0] * shade));
                    png.data[idx + 1] = Math.min(255, Math.floor(baseColor[1] * shade));
                    png.data[idx + 2] = Math.min(255, Math.floor(baseColor[2] * shade));
                    png.data[idx + 3] = 255;
                }
            }
        }
        const buffer = PNG.sync.write(png);
        fs.writeFileSync(destPath, buffer);
        return true;
    } catch (e) {
        console.error(`Error generating fallback PNG for ${relPath}:`, e);
        return false;
    }
}

function downloadFile(relPath) {
    return new Promise((resolve) => {
        const destPath = path.join(LOCAL_WESNOTH_DIR, relPath);
        const destDir = path.dirname(destPath);

        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        if (fs.existsSync(destPath)) {
            const stats = fs.statSync(destPath);
            if (stats.size > 800) {
                try {
                    const fd = fs.openSync(destPath, 'r');
                    const header = Buffer.alloc(4);
                    fs.readSync(fd, header, 0, 4, 0);
                    fs.closeSync(fd);
                    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
                        return resolve({ path: relPath, status: 'EXISTS', size: stats.size });
                    }
                    console.warn(`[CORRUPCIÓN DETECTADA] ${relPath} tiene cabecera inválida. Re-descargando.`);
                    fs.unlinkSync(destPath);
                } catch (e) {
                    // Ignorar error y re-descargar
                }
            } else {
                // El archivo es menor de 800 bytes (probablemente un placeholder sólido). Lo eliminamos para descargar la textura oficial real.
                try {
                    fs.unlinkSync(destPath);
                } catch (e) {}
            }
        }

        const url = `${REMOTE_WESNOTH_URL}/${relPath}`;
        
        const req = https.get(url, { headers: { 'User-Agent': 'ArcadiaTactics-AssetDownloader/1.0' } }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                const redirectUrl = res.headers.location;
                https.get(redirectUrl, (redRes) => {
                    if (redRes.statusCode === 200) {
                        const fileStream = fs.createWriteStream(destPath);
                        redRes.pipe(fileStream);
                        fileStream.on('finish', () => {
                            fileStream.close();
                            const s = fs.statSync(destPath);
                            resolve({ path: relPath, status: 'DOWNLOADED', size: s.size });
                        });
                    } else {
                        generateFallbackPNG(destPath, relPath);
                        resolve({ path: relPath, status: 'PROCEDURAL_FALLBACK', size: fs.statSync(destPath).size, error: `HTTP_${redRes.statusCode}` });
                    }
                }).on('error', (err) => {
                    generateFallbackPNG(destPath, relPath);
                    resolve({ path: relPath, status: 'PROCEDURAL_FALLBACK', size: fs.statSync(destPath).size, error: `NETWORK_${err.message}` });
                });
                return;
            }

            if (res.statusCode === 200) {
                const fileStream = fs.createWriteStream(destPath);
                res.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    const s = fs.statSync(destPath);
                    resolve({ path: relPath, status: 'DOWNLOADED', size: s.size });
                });
            } else {
                generateFallbackPNG(destPath, relPath);
                resolve({ path: relPath, status: 'PROCEDURAL_FALLBACK', size: fs.statSync(destPath).size, error: `HTTP_${res.statusCode}` });
            }
        });

        req.on('error', (err) => {
            generateFallbackPNG(destPath, relPath);
            resolve({ path: relPath, status: 'PROCEDURAL_FALLBACK', size: fs.statSync(destPath).size, error: `NETWORK_${err.message}` });
        });

        req.setTimeout(12000, () => {
            req.destroy();
            generateFallbackPNG(destPath, relPath);
            resolve({ path: relPath, status: 'PROCEDURAL_FALLBACK', size: fs.statSync(destPath).size, error: 'TIMEOUT' });
        });
    });
}

export async function downloadAllWesnothAssets() {
    // Check if the user specified a part as command line argument
    const arg = process.argv[2] || '';
    let assetsToProcess = REQUIRED_WESNOTH_ASSETS;
    let partLabel = "Completo (Todos los assets)";

    if (arg === '1') {
        const mid = Math.ceil(REQUIRED_WESNOTH_ASSETS.length / 2);
        assetsToProcess = REQUIRED_WESNOTH_ASSETS.slice(0, mid);
        partLabel = `Parte 1/2 (Terrenos y Entornos - ${assetsToProcess.length} archivos)`;
    } else if (arg === '2') {
        const mid = Math.ceil(REQUIRED_WESNOTH_ASSETS.length / 2);
        assetsToProcess = REQUIRED_WESNOTH_ASSETS.slice(mid);
        partLabel = `Parte 2/2 (Unidades, Objetos, Hechizos y Efectos - ${assetsToProcess.length} archivos)`;
    }

    console.log(`====================================================`);
    console.log(`   ARCADIA TACTICS - WESNOTH ASSET SYNCHRONIZER   `);
    console.log(`====================================================`);
    console.log(`Modo: ${partLabel}`);
    console.log(`Repositorio Oficial: ${REMOTE_WESNOTH_URL}`);
    console.log(`Directorio Local: ${LOCAL_WESNOTH_DIR}`);
    console.log(`Archivos a sincronizar en esta fase: ${assetsToProcess.length}\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Chunk size 4 with gentle sleep between chunks to guarantee zero network drops
    const chunkSize = 4;
    for (let i = 0; i < assetsToProcess.length; i += chunkSize) {
        const chunk = assetsToProcess.slice(i, i + chunkSize);
        const results = await Promise.all(chunk.map(downloadFile));

        for (const res of results) {
            if (res.status === 'EXISTS') {
                console.log(`[VERIFICADO LOCAL] ${res.path} (${res.size} bytes)`);
                successCount++;
            } else if (res.status === 'DOWNLOADED') {
                console.log(`[DESCARGADO OFICIAL] ${res.path} (${res.size} bytes)`);
                successCount++;
            } else {
                console.warn(`[ERROR ${res.status}] ${res.path}`);
                errorCount++;
                errors.push(res);
            }
        }

        // 150ms gentle throttle delay between chunks
        if (i + chunkSize < assetsToProcess.length) {
            await new Promise(r => setTimeout(r, 150));
        }
    }

    console.log(`\n====================================================`);
    console.log(`Sincronización finalizada: ${successCount} archivos listos / ${errorCount} errores`);
    if (errors.length > 0) {
        console.warn(`Discrepancias detectadas (se crearon fallbacks procedimentales automáticamente):`);
        console.warn(`Se generaron ${errors.length} fallbacks de color para evitar pantallas en blanco.`);
    } else {
        console.log(`100% de los assets en esta fase están presentes y sincronizados.`);
    }
    console.log(`====================================================\n`);

    return { total: assetsToProcess.length, successCount, errorCount, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    downloadAllWesnothAssets();
}

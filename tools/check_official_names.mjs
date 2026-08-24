import https from 'https';

const testUrls = [
    // Interior/Walls
    'terrain/flat/road.png',
    'terrain/interior/stone.png',
    'terrain/castle/castle-tile.png',
    'terrain/castle/keep-tile.png',
    'terrain/castle/encampment-regular-tile.png',
    'terrain/castle/sunken-ruin-tile.png',
    
    // Units
    'units/elves-wood/hero.png',
    'units/elves-wood/fighter.png',
    'units/elves-wood/scout.png',
    'units/elves-wood/captain.png',
    'units/elves-wood/ranger.png',
    
    // Potions & Items
    'items/potion-red.png',
    'items/potion-blue.png',
    'items/potion-green.png',
    'items/potion-yellow.png',
    'items/potion-poison.png',
    'items/ring-gold.png',
    'items/ring-silver.png',
    'items/ring-red.png',
    'items/chest.png',
    'items/buckler.png',
    'attacks/heater-shield.png',
    'attacks/buckler.png',
    'attacks/rectangular-shield.png',
    'items/staff-magic.png',
    'attacks/staff-magic.png',
    'attacks/staff-elven.png',
    'attacks/staff-ruby.png'
];

const BASE = "https://raw.githubusercontent.com/wesnoth/wesnoth/master/data/core/images";

async function checkUrl(p) {
    return new Promise((res) => {
        https.get(`${BASE}/${p}`, (r) => {
            res({ path: p, status: r.statusCode });
        }).on('error', () => res({ path: p, status: 'ERR' }));
    });
}

async function main() {
    const results = await Promise.all(testUrls.map(checkUrl));
    for (const r of results) {
        console.log(`${r.status === 200 ? '✅ 200' : '❌ ' + r.status} -> ${r.path}`);
    }
}
main();

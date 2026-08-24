import https from 'https';

const testUrls = [
    // Villages
    'terrain/village/human-tile.png',
    'terrain/village/human-city-tile.png',
    'terrain/village/human-hills-tile.png',
    'terrain/village/human-snow-tile.png',
    'terrain/village/elven-tile.png',
    'terrain/village/orc-tile.png',
    'terrain/village/dwarf-tile.png',
    'terrain/village/swamp-tile.png',
    'terrain/village/desert-tile.png',
    'terrain/village/cave-tile.png',
    'terrain/village/camp-tile.png',
    'terrain/village/hut-tile.png',
    'terrain/village/tropical-tile.png',

    // Castle & Keeps
    'terrain/castle/castle-tile.png',
    'terrain/castle/ruin-tile.png',
    'terrain/castle/keep-tile.png',
    'terrain/castle/dwarven-castle-tile.png',
    'terrain/castle/dwarven-keep-tile.png',
    'terrain/castle/elven-castle-tile.png',
    'terrain/castle/elven-keep-tile.png',
    'terrain/castle/orc-castle-tile.png',
    'terrain/castle/orc-keep-tile.png',
    'terrain/castle/sand-castle-tile.png',
    'terrain/castle/sand-ruin-tile.png',
    'terrain/castle/sunken-ruin-tile.png',

    // Forests & Mountains & Caves
    'terrain/forest/pine-tile.png',
    'terrain/forest/deciduous-summer-tile.png',
    'terrain/forest/deciduous-autumn-tile.png',
    'terrain/forest/deciduous-winter-tile.png',
    'terrain/forest/snow-forest-tile.png',
    'terrain/forest/mushrooms-tile.png',
    'terrain/forest/tropical/rainforest-small.png',
    'terrain/forest/tropical/rainforest-tile.png',
    'terrain/forest/tropical/rainforest.png',
    'terrain/forest/palms-tile.png',
    'terrain/mountains/basic-tile.png',
    'terrain/mountains/dry-tile.png',
    'terrain/mountains/snow-tile.png',
    'terrain/mountains/volcano-tile.png',
    'terrain/cave/floor.png',
    'terrain/cave/beam-tile.png',
    'terrain/cave/earthy-floor.png'
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
    const valid = results.filter(r => r.status === 200);
    console.log(`TOTAL VALID WESNOTH FILES FOUND: ${valid.length}`);
    for (const r of valid) {
        console.log(`✅ ${r.path}`);
    }
}
main();

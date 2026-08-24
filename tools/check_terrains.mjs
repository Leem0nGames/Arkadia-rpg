import https from 'https';

const testUrls = [
    'terrain/grass/green.png',
    'terrain/grass/semi-dry.png',
    'terrain/grass/dry.png',
    'terrain/frozen/snow.png',
    'terrain/water/coast-tile.png',
    'terrain/water/coast.png',
    'terrain/mountains/basic.png',
    'terrain/village/human-tile.png',
    'terrain/village/human-cottage.png',
    'terrain/village/human-city-tile.png',
    'terrain/castle/castle-tile.png',
    'terrain/castle/ruin-tile.png',
    'terrain/castle/keep-tile.png',
    'terrain/castle/ruin.png',
    'terrain/sand/desert.png',
    'terrain/swamp/mud-tile.png',
    'terrain/swamp/water-tile.png',
    'terrain/cave/floor.png',
    'terrain/cave/fungus-tile.png',
    'terrain/unwalkable/lava-tile.png',
    'terrain/chasm/earthy-tile.png',
    'terrain/path/cobble.png',
    'terrain/path/dirt.png',
    'terrain/flat/road.png',
    'terrain/flat/dirt.png',
    
    // Props
    'terrain/forest/pine-tile.png',
    'terrain/forest/deciduous-summer-tile.png',
    'terrain/forest/rainforest-tile.png',
    'terrain/forest/tropical/rainforest-small.png',
    'terrain/forest/snow-forest-tile.png',
    'terrain/mountains/basic-tile.png',
    'terrain/mountains/dry-tile.png',
    'terrain/forest/mushrooms-tile.png',
    
    // Other candidate interiors
    'terrain/cave/floor.png',
    'terrain/flat/road.png',
    'terrain/flat/dirt.png',
    'terrain/castle/castle-tile.png'
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

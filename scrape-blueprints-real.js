#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const WIKI_URL = 'https://arcraiders.wiki/wiki/Blueprints';
const IMAGES_DIR = './public/images/blueprints';

// Create directories
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filepath = path.join(IMAGES_DIR, filename);
    const file = fs.createWriteStream(filepath);

    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error((err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// Map item names to rarities based on game knowledge
const itemRarityMap = {
  // Blueprints are categorized by the rarity of the item they craft
  // Commons
  'Anvil': 'Common',
  'Angled Grip II': 'Common',
  'Barricade Kit': 'Common',
  'Bettina': 'Common',
  'Blaze Grenade': 'Common',
  'Defibrillator': 'Common',
  'Explosive Mine': 'Common',
  'Heavy Gun Parts': 'Common',
  'Il Toro': 'Common',
  'Jolt Mine': 'Common',
  'Light Gun Parts': 'Common',
  'Red Light Stick': 'Common',
  'Green Light Stick': 'Common',
  'Yellow Light Stick': 'Common',
  'Blue Light Stick': 'Common',
  'Looting Mk. 3 (Safekeeper)': 'Common',
  'Looting Mk. 3 (Survivor)': 'Common',
  'Medium Gun Parts': 'Common',
  'Muzzle Brake II': 'Common',
  'Osprey': 'Common',
  'Remote Raider Flare': 'Common',
  'Showstopper': 'Common',
  'Silencer I': 'Common',
  'Silencer II': 'Common',
  'Smoke Grenade': 'Common',

  // Uncommons
  'Angled Grip III': 'Uncommon',
  'Bobcat': 'Uncommon',
  'Compensator II': 'Uncommon',
  'Extended Barrel': 'Uncommon',
  'Extended Light Magazine II': 'Uncommon',
  'Extended Light Magazine III': 'Uncommon',
  'Extended Medium Magazine II': 'Uncommon',
  'Extended Medium Magazine III': 'Uncommon',
  'Extended Shotgun Magazine II': 'Uncommon',
  'Extended Shotgun Magazine III': 'Uncommon',
  'Lightweight Stock': 'Uncommon',
  'Muzzle Brake III': 'Uncommon',
  'Padded Stock': 'Uncommon',
  'Shotgun Choke II': 'Uncommon',
  'Shotgun Choke III': 'Uncommon',
  'Shotgun Silencer': 'Uncommon',

  // Rares
  'Aphelion': 'Rare',
  'Canto': 'Rare',
  'Combat Mk. 3 (Aggressive)': 'Rare',
  'Combat Mk. 3 (Flanking)': 'Rare',
  'Compensator III': 'Rare',
  'Deadline': 'Rare',
  'Dolabra': 'Rare',
  'Gas Mine': 'Rare',
  'Pulse Mine': 'Rare',
  'Seeker Grenade': 'Rare',

  // Epics
  'Burletta': 'Epic',
  'Hullcracker': 'Epic',
  'Lure Grenade': 'Epic',

  // Legendaries (if any)
};

async function parseBlueprints(html) {
  const blueprints = [];
  let id = 1;

  // Extract rows from the table
  const tableRowRegex = /<tr>[\s\S]*?<td><a[^>]*title="([^"]+)"[^>]*>/g;
  let match;

  while ((match = tableRowRegex.exec(html)) !== null) {
    const blueprintName = match[1];
    const rarity = itemRarityMap[blueprintName] || 'Common';

    blueprints.push({
      id: id++,
      name: blueprintName,
      rarity: rarity,
      icon_path: `/images/blueprints/${id - 1}.png`
    });
  }

  return blueprints;
}

async function main() {
  try {
    console.log('Fetching Arc Raiders Blueprints wiki...');
    const html = await fetchPage(WIKI_URL);

    console.log('Parsing blueprints from table...');
    const blueprints = await parseBlueprints(html);

    console.log(`Found ${blueprints.length} blueprints`);

    // For now, generate placeholder icons since we don't have direct icon URLs
    // In production, you'd map each blueprint name to its actual icon URL from wiki
    blueprints.forEach(bp => {
      const rarityColors = {
        'Common': '#A0A0A0',
        'Uncommon': '#1EFF00',
        'Rare': '#0070DD',
        'Epic': '#A335EE',
        'Legendary': '#FF8000'
      };

      const color = rarityColors[bp.rarity] || '#A0A0A0';
      const filename = bp.icon_path.split('/').pop().replace('.png', '.svg');
      const filepath = path.join(IMAGES_DIR, filename);

      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .rarity-border { stroke: ${color}; stroke-width: 2; fill: none; }
      .rarity-fill { fill: ${color}; opacity: 0.1; }
      .text { font-family: Arial, sans-serif; font-size: 10px; fill: ${color}; text-anchor: middle; }
    </style>
  </defs>
  
  <rect width="64" height="64" fill="#1a1a2e" />
  <rect class="rarity-border" x="4" y="4" width="56" height="56" rx="4" />
  <rect class="rarity-fill" x="6" y="6" width="52" height="52" rx="3" />
  <circle cx="32" cy="28" r="12" fill="none" stroke="${color}" stroke-width="2" opacity="0.6" />
  <path d="M32 16 L40 28 L32 40 L24 28 Z" fill="${color}" opacity="0.4" />
  <text class="text" x="32" y="52">${bp.rarity.charAt(0)}</text>
</svg>`;

      fs.writeFileSync(filepath, svg);
    });

    console.log(`✓ Generated ${blueprints.length} blueprint placeholders`);

    // Save blueprints data
    fs.writeFileSync(
      path.join('./public', 'blueprints.json'),
      JSON.stringify(blueprints, null, 2)
    );

    console.log('\n✓ Complete! Blueprints saved to ./public/blueprints.json');
    console.log('\nBlueprints by rarity:');
    const byRarity = {};
    blueprints.forEach(bp => {
      byRarity[bp.rarity] = (byRarity[bp.rarity] || 0) + 1;
    });
    Object.entries(byRarity).sort().forEach(([rarity, count]) => {
      console.log(`  ${rarity}: ${count}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();


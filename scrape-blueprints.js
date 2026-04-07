const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const WIKI_URL = 'https://arcraiders.wiki/wiki/Blueprints';
const OUTPUT_DIR = './public';
const IMAGES_DIR = './public/images/blueprints';

// Create directories if they don't exist
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Map wiki rarity names to standardized format
const rarityMap = {
  'common': 'Common',
  'uncommon': 'Uncommon',
  'rare': 'Rare',
  'epic': 'Epic',
  'legendary': 'Legendary'
};

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
    const protocol = url.startsWith('https') ? https : http;
    const filepath = path.join(IMAGES_DIR, filename);
    const file = fs.createWriteStream(filepath);

    protocol.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error(() => {
      fs.unlink(filepath, () => {});
      reject(new Error(`Failed to download ${url}`));
    });
  });
}

async function parseBlueprints(html) {
  const blueprints = [];
  let id = 1;

  // Parse HTML using regex to extract blueprint tables
  // Looking for blueprint rows with icon, name, and rarity info
  const blueprintRegex = /<tr[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<\/tr>/gi;

  let match;
  while ((match = blueprintRegex.exec(html)) !== null) {
    const [, iconUrl, name, rarity] = match;

    if (iconUrl && name && rarity) {
      const cleanName = name.trim();
      const cleanRarity = rarity.trim().toLowerCase();
      const rarityKey = Object.keys(rarityMap).find(key => cleanRarity.includes(key));

      if (rarityKey) {
        const filename = `blueprint-${id}.png`;
        blueprints.push({
          id: id++,
          name: cleanName,
          icon_url: iconUrl,
          rarity: rarityMap[rarityKey],
          icon_path: `/images/blueprints/${filename}`
        });
      }
    }
  }

  return blueprints;
}

async function main() {
  try {
    console.log('Fetching Arc Raiders Blueprints wiki...');
    const html = await fetchPage(WIKI_URL);

    console.log('Parsing blueprints...');
    const blueprints = await parseBlueprints(html);

    console.log(`Found ${blueprints.length} blueprints. Downloading images...`);

    // Download images with retries
    for (let i = 0; i < blueprints.length; i++) {
      const bp = blueprints[i];
      try {
        await downloadImage(bp.icon_url, `blueprint-${bp.id}.png`);
        process.stdout.write(`\rDownloaded ${i + 1}/${blueprints.length}`);
      } catch (err) {
        console.error(`\nFailed to download ${bp.name}: ${err.message}`);
        // Keep the blueprint but mark as no local image
        bp.icon_path = bp.icon_url;
      }
    }

    console.log('\n\nSaving blueprints.json...');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'blueprints.json'),
      JSON.stringify(blueprints, null, 2)
    );

    console.log(`✓ Complete! ${blueprints.length} blueprints saved to ${OUTPUT_DIR}/blueprints.json`);
    console.log('\nBlueprints by rarity:');
    const byRarity = {};
    blueprints.forEach(bp => {
      byRarity[bp.rarity] = (byRarity[bp.rarity] || 0) + 1;
    });
    Object.entries(byRarity).forEach(([rarity, count]) => {
      console.log(`  ${rarity}: ${count}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();


const fs = require('fs');
const https = require('https');
const zlib = require('zlib');

// Manual mapping of blueprints to their wiki image URLs (based on pattern from wiki)
// Format: name -> image URL from wiki
const blueprintImages = {
  'Anvil': 'https://arcraiders.wiki/w/images/0/00/Anvil-Level1.png',
  'Angled Grip II': 'https://arcraiders.wiki/w/images/2/2b/Angled_Grip_II.png',
  'Angled Grip III': 'https://arcraiders.wiki/w/images/3/38/Angled_Grip_III.png',
  'Aphelion': 'https://arcraiders.wiki/w/images/9/9c/Aphelion.png',
  'Barricade Kit': 'https://arcraiders.wiki/w/images/c/cb/Barricade_Kit.png',
  'Bettina': 'https://arcraiders.wiki/w/images/0/0f/Bettina.png',
  'Blaze Grenade': 'https://arcraiders.wiki/w/images/2/24/Blaze_Grenade.png',
  'Bobcat': 'https://arcraiders.wiki/w/images/b/ba/Bobcat.png',
  'Burletta': 'https://arcraiders.wiki/w/images/5/5c/Burletta.png',
  'Canto': 'https://arcraiders.wiki/w/images/8/8f/Canto.png',
  'Combat Mk. 3 (Aggressive)': 'https://arcraiders.wiki/w/images/6/60/Combat_Mk._3_%28Aggressive%29.png',
  'Combat Mk. 3 (Flanking)': 'https://arcraiders.wiki/w/images/b/b2/Combat_Mk._3_%28Flanking%29.png',
  'Compensator II': 'https://arcraiders.wiki/w/images/8/8c/Compensator_II.png',
  'Compensator III': 'https://arcraiders.wiki/w/images/d/d7/Compensator_III.png',
  'Complex Gun Parts': 'https://arcraiders.wiki/w/images/6/68/Complex_Gun_Parts.png',
  'Dolabra': 'https://arcraiders.wiki/w/images/0/04/Dolabra.png',
  'Deadline': 'https://arcraiders.wiki/w/images/3/39/Deadline.png',
  'Defibrillator': 'https://arcraiders.wiki/w/images/4/48/Defibrillator.png',
  'Explosive Mine': 'https://arcraiders.wiki/w/images/8/8d/Explosive_Mine.png',
  'Extended Barrel': 'https://arcraiders.wiki/w/images/2/21/Extended_Barrel.png',
};

// Function to fetch blueprint image URLs from wiki
async function fetchBlueprintImage(blueprintName) {
  return new Promise((resolve) => {
    const url = `https://arcraiders.wiki/wiki/${encodeURIComponent(blueprintName)}`;

    https.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      let stream = res;

      if (res.headers['content-encoding'] === 'gzip') {
        const gunzip = zlib.createGunzip();
        res.pipe(gunzip);
        stream = gunzip;
      }

      stream.on('data', (chunk) => {
        data += chunk.toString('utf-8');
      });

      stream.on('end', () => {
        // Extract first main image URL
        const match = data.match(/\/w\/images\/[^"]+\.(png|jpg|jpeg|webp)(?![\w\.\-])/);
        if (match) {
          const fullMatch = data.match(/\/w\/images\/[^"]+?\.(png|jpg|jpeg|webp)/);
          if (fullMatch && !fullMatch[0].includes('thumb') && !fullMatch[0].includes('Icon_')) {
            resolve(`https://arcraiders.wiki${fullMatch[0]}`);
          }
        }
        resolve(null);
      });

      stream.on('error', () => resolve(null));
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

async function main() {
  const blueprints = JSON.parse(fs.readFileSync('./public/blueprints.json', 'utf-8'));

  console.log('Scraping wiki URLs...\n');

  for (let i = 0; i < blueprints.length; i++) {
    const bp = blueprints[i];

    try {
      const imageUrl = await fetchBlueprintImage(bp.name);
      if (imageUrl) {
        bp.icon_path = imageUrl;
        process.stdout.write(`\r✓ ${i + 1}/${blueprints.length} - ${bp.name}`);
      } else {
        process.stdout.write(`\r  ${i + 1}/${blueprints.length} - ${bp.name} (no image)`);
      }
    } catch (err) {
      process.stdout.write(`\r✗ ${i + 1}/${blueprints.length} - ${bp.name} (error)`);
    }

    await new Promise(resolve => setTimeout(resolve, 150));
  }

  console.log('\n\n✓ Complete! Saving...');
  fs.writeFileSync('./public/blueprints.json', JSON.stringify(blueprints, null, 2));
  console.log('✓ Updated blueprints.json with wiki image URLs');
}

main();


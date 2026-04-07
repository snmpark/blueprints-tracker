#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = './public/images/blueprints';
const WIKI_BASE = 'https://arcraiders.wiki/wiki';

// Create directory
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Load blueprints
const blueprints = JSON.parse(fs.readFileSync('./public/blueprints.json', 'utf-8'));

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);

    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

function extractImageUrl(html) {
  // Look for the first main image (usually the item icon)
  // Pattern: href="/w/images/X/XX/ItemName-...png"
  const match = html.match(/href="\/w\/images\/[^"]*\.png"/);
  if (match) {
    const path = match[0].replace(/href="/, '').replace(/"/, '');
    return `https://arcraiders.wiki${path}`;
  }
  return null;
}

async function main() {
  console.log(`Scraping ${blueprints.length} blueprint icons from Arc Raiders wiki...\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < blueprints.length; i++) {
    const bp = blueprints[i];
    const wikiUrl = `${WIKI_BASE}/${encodeURIComponent(bp.name)}`;

    try {
      // Fetch the wiki page
      const html = await fetchPage(wikiUrl);

      // Extract image URL
      const imageUrl = extractImageUrl(html);

      if (imageUrl) {
        // Determine file extension from URL
        const ext = imageUrl.match(/\.(png|jpg|jpeg|webp|gif)$/i)?.[1] || 'png';
        const filename = `${bp.id}.${ext}`;
        const filepath = path.join(IMAGES_DIR, filename);

        // Download image
        await downloadImage(imageUrl, filepath);
        process.stdout.write(`\r✓ Downloaded ${success + failed + 1}/${blueprints.length} - ${bp.name}`);
        success++;

        // Update icon_path in blueprints.json
        bp.icon_path = `/images/blueprints/${filename}`;
      } else {
        throw new Error('No image found');
      }

    } catch (error) {
      process.stdout.write(`\r✗ Failed ${success + failed + 1}/${blueprints.length} - ${bp.name}`);
      failed++;

      // Keep the SVG fallback icon_path
      bp.icon_path = `/images/blueprints/${bp.id}.svg`;
    }

    // Rate limiting - be nice to the wiki
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n\n✓ Complete!`);
  console.log(`  Success: ${success}/${blueprints.length}`);
  console.log(`  Failed: ${failed}/${blueprints.length}`);

  // Save updated blueprints with new image paths
  fs.writeFileSync(
    './public/blueprints.json',
    JSON.stringify(blueprints, null, 2)
  );

  console.log('\n✓ Updated blueprints.json with image URLs');
}

main().catch(console.error);


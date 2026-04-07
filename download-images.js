#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const WIKI_BASE = 'https://arcraiders.wiki/wiki';
const IMAGES_DIR = './public/images/blueprints';

// Create directory
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, (res) => {
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

      stream.on('end', () => resolve(data));
      stream.on('error', reject);
      res.on('error', reject);
    }).on('error', reject);
  });
}

function extractImageUrl(html) {
  // Find first main image (not thumbnail, not icon)
  const matches = html.match(/\/w\/images\/[^\/]+\/[^\/]+\/[^"]+\.(png|jpg|jpeg)/g) || [];

  for (const match of matches) {
    const lower = match.toLowerCase();
    if (!lower.includes('thumb') && !lower.includes('icon_')) {
      return `https://arcraiders.wiki${match}`;
    }
  }

  return null;
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

async function main() {
  const blueprints = JSON.parse(fs.readFileSync('./public/blueprints.json', 'utf-8'));

  console.log(`Downloading ${blueprints.length} blueprint images...\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < blueprints.length; i++) {
    const bp = blueprints[i];
    const wikiUrl = `${WIKI_BASE}/${encodeURIComponent(bp.name)}`;

    try {
      const html = await fetchPage(wikiUrl);
      const imageUrl = extractImageUrl(html);

      if (imageUrl) {
        const ext = imageUrl.match(/\.(png|jpg|jpeg)$/i)?.[1] || 'png';
        const filename = `${bp.id}.${ext}`;
        const filepath = path.join(IMAGES_DIR, filename);

        await downloadImage(imageUrl, filepath);
        bp.icon_path = `/images/blueprints/${filename}`;
        process.stdout.write(`\r✓ ${i + 1}/${blueprints.length} - ${bp.name}`);
        success++;
      } else {
        throw new Error('No image found');
      }
    } catch (error) {
      process.stdout.write(`\r✗ ${i + 1}/${blueprints.length} - ${bp.name}\n`);
      failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 150));
  }

  console.log(`\n\n✓ Complete!`);
  console.log(`  Downloaded: ${success}/${blueprints.length}`);
  console.log(`  Failed: ${failed}/${blueprints.length}`);

  // Save updated blueprints
  fs.writeFileSync('./public/blueprints.json', JSON.stringify(blueprints, null, 2));
  console.log('\n✓ Updated blueprints.json with local image paths');
}

main().catch(console.error);


#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const zlib = require('zlib');

const WIKI_BASE = 'https://arcraiders.wiki/wiki';

// Load blueprints
const blueprints = JSON.parse(fs.readFileSync('./public/blueprints.json', 'utf-8'));

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      let stream = res;

      if (res.headers['content-encoding'] === 'gzip') {
        const gunzip = zlib.createGunzip();
        res.pipe(gunzip);
        stream = gunzip;
      } else if (res.headers['content-encoding'] === 'deflate') {
        const inflate = zlib.createInflate();
        res.pipe(inflate);
        stream = inflate;
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
  // Find the first main image URL (non-thumbnail)
  const match = html.match(/\/w\/images\/([^\/]+)\/([^\/]+)\/([^"]+)\.(png|jpg|jpeg|webp)/);

  if (match) {
    const fullPath = `/w/images/${match[1]}/${match[2]}/${match[3]}.${match[4]}`;
    return `https://arcraiders.wiki${fullPath}`;
  }

  return null;
}

async function main() {
  console.log(`Scraping ${blueprints.length} blueprint image URLs from Arc Raiders wiki...\n`);

  let success = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < blueprints.length; i++) {
    const bp = blueprints[i];
    const wikiUrl = `${WIKI_BASE}/${encodeURIComponent(bp.name)}`;

    try {
      const html = await fetchPage(wikiUrl);
      const imageUrl = extractImageUrl(html);

      if (imageUrl) {
        bp.icon_path = imageUrl;
        process.stdout.write(`\r✓ Found ${success + failed + 1}/${blueprints.length} - ${bp.name}`);
        success++;
      } else {
        throw new Error('No image URL found');
      }
    } catch (error) {
      process.stdout.write(`\r✗ Failed ${success + failed + 1}/${blueprints.length} - ${bp.name}\n`);
      console.log(`  Error: ${error.message}`);
      failed++;
      errors.push(bp.name);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n\n✓ Complete!`);
  console.log(`  Success: ${success}/${blueprints.length}`);
  console.log(`  Failed: ${failed}/${blueprints.length}`);

  if (errors.length > 0) {
    console.log(`\n  Failed blueprints: ${errors.join(', ')}`);
  }

  // Save updated blueprints with wiki image URLs
  fs.writeFileSync(
    './public/blueprints.json',
    JSON.stringify(blueprints, null, 2)
  );

  console.log('\n✓ Updated blueprints.json with wiki image URLs');
}

main().catch(console.error);


#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const IMAGES_DIR = './public/images/blueprints';

// Create directory if it doesn't exist
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Read blueprints.json
const blueprints = JSON.parse(fs.readFileSync('./public/blueprints.json', 'utf-8'));

// Color map for rarities
const rarityColors = {
  'Common': '#A0A0A0',      // Gray
  'Uncommon': '#1EFF00',    // Green
  'Rare': '#0070DD',        // Blue
  'Epic': '#A335EE',        // Purple
  'Legendary': '#FF8000'    // Orange
};

// Generate SVG icons
blueprints.forEach(bp => {
  const color = rarityColors[bp.rarity] || '#A0A0A0';
  const filename = bp.icon_path.split('/').pop();
  const filepath = path.join(IMAGES_DIR, filename);

  // Create a simple SVG icon
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .rarity-border { stroke: ${color}; stroke-width: 2; fill: none; }
      .rarity-fill { fill: ${color}; opacity: 0.1; }
      .text { font-family: Arial, sans-serif; font-size: 10px; fill: ${color}; text-anchor: middle; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="64" height="64" fill="#1a1a2e" />
  
  <!-- Rarity border -->
  <rect class="rarity-border" x="4" y="4" width="56" height="56" rx="4" />
  
  <!-- Inner fill -->
  <rect class="rarity-fill" x="6" y="6" width="52" height="52" rx="3" />
  
  <!-- Center icon symbol -->
  <circle cx="32" cy="28" r="12" fill="none" stroke="${color}" stroke-width="2" opacity="0.6" />
  <path d="M32 16 L40 28 L32 40 L24 28 Z" fill="${color}" opacity="0.4" />
  
  <!-- Rarity text -->
  <text class="text" x="32" y="52">${bp.rarity.charAt(0)}</text>
</svg>`;

  fs.writeFileSync(filepath, svg);
  console.log(`✓ Created ${filename}`);
});

console.log(`\n✓ Generated ${blueprints.length} blueprint icons in ${IMAGES_DIR}`);


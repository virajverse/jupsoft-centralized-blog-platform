const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createWebP(destPath, text, bg) {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${bg}"/>
    <text x="50%" y="50%" font-size="24" fill="#ffffff" font-family="sans-serif" font-weight="bold" text-anchor="middle" dy=".3em">${text}</text>
  </svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 85 }).toFile(destPath);
  console.log('Created:', destPath);
}

async function run() {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  await createWebP(path.join(uploadsDir, 'site-cloud', 'sample-confirmed.webp'), 'Sample Confirmed', '#4f46e5');
  await createWebP(path.join(uploadsDir, 'site-cloud', 'demo-asset.webp'), 'Demo Asset', '#059669');
  console.log('All WebP images created successfully.');
}

run().catch(console.error);

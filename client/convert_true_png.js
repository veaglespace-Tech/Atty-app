const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputImagePath = path.join(__dirname, 'public/logo-transparent.webp');
const outputPaths = [
  path.join(__dirname, 'public/veagle-space-logo.png'),
  path.join(__dirname, '../mobile-app/assets/images/veagle-space-logo.png'),
  path.join(__dirname, '../server/public/Logo.png'),
  path.join(__dirname, '../mobile-app/assets/images/icon.png'),
  path.join(__dirname, '../mobile-app/assets/images/splash-icon.png'),
  path.join(__dirname, '../mobile-app/assets/images/favicon.png'),
  path.join(__dirname, '../mobile-app/assets/images/atty-adaptive-foreground.png'),
  path.join(__dirname, '../mobile-app/assets/images/expo-logo.png')
];

async function processLogo() {
  console.log('Converting logo-transparent.webp to true transparent PNG...');
  
  // Convert retaining true alpha transparency
  const imgBuffer = await sharp(inputImagePath)
    .png({ force: true })
    .toBuffer();

  for (const outPath of outputPaths) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, imgBuffer);
    console.log(`Saved true transparent PNG to: ${outPath}`);
  }
  
  console.log('Done converting logos!');
}

processLogo().catch(console.error);

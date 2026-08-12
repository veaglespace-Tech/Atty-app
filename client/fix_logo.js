const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputImagePath = path.join(__dirname, '../mobile-app/assets/images/veagle-space-logo.png');
const outputPaths = [
  path.join(__dirname, '../mobile-app/assets/images/veagle-space-logo.png'),
  path.join(__dirname, 'public/veagle-space-logo.png'),
  path.join(__dirname, '../server/public/Logo.png')
];

async function fixSquareLogo() {
  console.log('Padding logo to be perfectly square (for Expo)...');
  
  const imgBuffer = await sharp(inputImagePath)
    .resize({
      width: 1024,
      height: 1024,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent padding
    })
    .png({ force: true })
    .toBuffer();

  for (const outPath of outputPaths) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, imgBuffer);
    console.log(`Saved square transparent PNG to: ${outPath}`);
  }
  
  console.log('Done!');
}

fixSquareLogo().catch(console.error);

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputImagePath = path.join(__dirname, '../client/public/logo-transparent.webp');
const mobileAssetsPath = path.join(__dirname, '../mobile-app/assets/images');

async function processLogos() {
  console.log('Generating atty-icon.png (1024x1024)');
  await sharp(inputImagePath)
    .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(mobileAssetsPath, 'atty-icon.png'));
    
  console.log('Generating icon.png (1024x1024)');
  await sharp(inputImagePath)
    .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(mobileAssetsPath, 'icon.png'));

  console.log('Generating atty-adaptive-foreground.png (1024x1024)');
  await sharp(inputImagePath)
    .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(mobileAssetsPath, 'atty-adaptive-foreground.png'));

  console.log('Generating splash-icon.png (1024x1024)');
  await sharp(inputImagePath)
    .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(mobileAssetsPath, 'splash-icon.png'));
    
  console.log('Generating favicon.png (256x256)');
  await sharp(inputImagePath)
    .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(mobileAssetsPath, 'favicon.png'));
    
  console.log('Done!');
}

processLogos().catch(console.error);

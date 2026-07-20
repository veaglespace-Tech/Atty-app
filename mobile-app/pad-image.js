const fs = require('fs');
const { execSync } = require('child_process');

try {
  require.resolve('jimp');
} catch (e) {
  console.log('Installing jimp...');
  execSync('npm install jimp@0.22.10 --no-save', { stdio: 'inherit' });
}

const Jimp = require('jimp');

async function processImage() {
  const input = './assets/images/attyLogo.png';
  const output = './assets/images/atty-adaptive-foreground.png';
  const iconOutput = './assets/images/atty-icon.png';

  console.log('Processing adaptive icon foreground...');
  const image = await Jimp.read(input);
  
  // Resize to 600x600 keeping aspect ratio
  image.contain(600, 600);
  
  // Create a 1082x1082 transparent image
  const adaptive = new Jimp(1082, 1082, 0x00000000);
  
  // Composite the resized logo into the center
  adaptive.composite(image, (1082 - 600) / 2, (1082 - 600) / 2);
  
  await adaptive.writeAsync(output);
  console.log('Created ' + output);

  console.log('Processing standard icon...');
  const image2 = await Jimp.read(input);
  image2.contain(800, 800);
  
  const stdIcon = new Jimp(1024, 1024, 0xFFFFFFFF); // White background
  stdIcon.composite(image2, (1024 - 800) / 2, (1024 - 800) / 2);
  await stdIcon.writeAsync(iconOutput);
  console.log('Created ' + iconOutput);
}

processImage().catch(console.error);

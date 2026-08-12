const sharp = require('sharp');
const path = require('path');

async function processLogos() {
    console.log('Converting logo-transparent.webp');
    try {
        await sharp(path.join(__dirname, 'public/logo-transparent.webp'))
            .png()
            .toFile(path.join(__dirname, 'public/logo-transparent.png'));
    } catch (e) {
        console.error('Failed logo-transparent.webp', e);
    }

    console.log('Converting Logo.webp');
    try {
        await sharp(path.join(__dirname, '../server/public/Logo.webp'))
            .png()
            .toFile(path.join(__dirname, '../server/public/Logo.png'));
    } catch (e) {
        console.error('Failed Logo.webp', e);
    }

    console.log('Done converting logos');
}

processLogos().catch(console.error);

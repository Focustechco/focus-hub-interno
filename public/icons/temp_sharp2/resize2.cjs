const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function processIcon(filePath, scaleFactor) {
    const inputPath = filePath;
    const outputPath = filePath + '.new.png';
    
    if (!fs.existsSync(inputPath)) {
        console.log(`File not found: ${inputPath}`);
        return;
    }
    
    const metadata = await sharp(inputPath).metadata();
    const width = metadata.width;
    const height = metadata.height;
    
    const newWidth = Math.round(width * scaleFactor);
    const newHeight = Math.round(height * scaleFactor);
    
    const resizedBuffer = await sharp(inputPath)
        .resize(newWidth, newHeight, { fit: 'contain' })
        .toBuffer();
    
    await sharp({
        create: {
            width: width,
            height: height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 } // transparent background
        }
    })
    .composite([{ input: resizedBuffer, gravity: 'center' }])
    .toFile(outputPath);
    
    // Replace original
    fs.copyFileSync(outputPath, inputPath);
    fs.unlinkSync(outputPath);
    console.log(`Processed ${filePath}`);
}

async function main() {
    // Process public/apple-touch-icon.png
    await processIcon(path.join(__dirname, '..', '..', 'apple-touch-icon.png'), 0.9);
}

main().catch(console.error);

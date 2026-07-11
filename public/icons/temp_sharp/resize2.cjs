const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function processIcon(filename, scaleFactor) {
    const inputPath = path.join(__dirname, '..', filename);
    const outputPath = path.join(__dirname, '..', `new_${filename}`);
    
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
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
    .composite([{ input: resizedBuffer, gravity: 'center' }])
    .toFile(outputPath);
    
    // Replace original
    fs.copyFileSync(outputPath, inputPath);
    fs.unlinkSync(outputPath);
    console.log(`Processed ${filename}`);
}

async function main() {
    await processIcon('apple-touch-icon.png', 0.9);
}

main().catch(console.error);

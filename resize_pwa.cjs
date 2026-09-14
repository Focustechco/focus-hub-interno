const jimp = require('jimp');
const fs = require('fs');
const path = require('path');

async function processImage() {
  try {
    const { Jimp } = jimp;
    console.log('Reading new_logo_final_5.png...');
    // We use new_logo_final_5.png because the user uploaded it recently
    const image = await (Jimp ? Jimp.read('new_logo_final_5.png') : jimp.read('new_logo_final_5.png'));
    
    // Add 10% padding to reduce icon size by 10%
    const originalWidth = image.bitmap.width;
    const originalHeight = image.bitmap.height;
    const newWidth = Math.round(originalWidth * 0.90);
    const newHeight = Math.round(originalHeight * 0.90);
    image.resize(newWidth, newHeight);
    
    const background = new (Jimp || jimp)(originalWidth, originalHeight, 0x00000000);
    const x = Math.round((originalWidth - newWidth) / 2);
    const y = Math.round((originalHeight - newHeight) / 2);
    background.composite(image, x, y);

    const paddedImage = background;
    
    console.log('Generating favicon.png (64x64)...');
    const favicon = paddedImage.clone().contain(64, 64);
    await favicon.writeAsync('public/favicon.png');

    console.log('Generating icon-192.png...');
    const icon192 = paddedImage.clone().contain(192, 192);
    await icon192.writeAsync('public/icons/icon-192.png');

    console.log('Generating icon-512.png...');
    const icon512 = paddedImage.clone().contain(512, 512);
    await icon512.writeAsync('public/icons/icon-512.png');
    
    console.log('Generating apple-touch-icon.png...');
    const appleIcon = paddedImage.clone().contain(180, 180);
    await appleIcon.writeAsync('public/apple-touch-icon.png');
    
    console.log('Icons successfully updated to precise dimensions.');
  } catch (error) {
    console.error('Error resizing images:', error);
  }
}

processImage();

const jimp = require('jimp');

async function processImage() {
  try {
    const { Jimp } = jimp;
    const image = await (Jimp ? Jimp.read('new_logo_final.png') : jimp.read('new_logo_final.png'));
    
    const originalWidth = image.bitmap.width;
    const originalHeight = image.bitmap.height;
    
    // Shrink the image by 5%
    const newWidth = Math.round(originalWidth * 0.95);
    const newHeight = Math.round(originalHeight * 0.95);
    
    image.resize(newWidth, newHeight);
    
    // Create a transparent background of the original size
    const background = new (Jimp || jimp)(originalWidth, originalHeight, 0x00000000);
    
    // Calculate center coordinates
    const x = Math.round((originalWidth - newWidth) / 2);
    const y = Math.round((originalHeight - newHeight) / 2);
    
    // Place the shrunk image onto the transparent background
    background.composite(image, x, y);

    await background.writeAsync('new_logo_final_5.png');
    console.log('Done resizing down by 5%');
  } catch (error) {
    console.error(error);
  }
}

processImage();

const Jimp = require('jimp');

async function processImage() {
  try {
    const image = await Jimp.read('new_logo.png');
    
    // Autocrop removes the transparent borders
    image.autocrop();
    
    // Optional: we can scale it to a standard square size like 512x512
    // with a tiny padding (e.g. 5%)
    // But autocrop alone makes it fill the boundaries.
    image.contain(512, 512);

    await image.writeAsync('new_logo_large.png');
    console.log('Done resising');
  } catch (error) {
    console.error(error);
  }
}

processImage();

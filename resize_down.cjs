const Jimp = require('jimp');

async function processImage() {
  try {
    console.log('Reading new_logo_final_5.png...');
    const original = await Jimp.read('new_logo_final_5.png');
    
    // Scale factor: 0.7 (30% smaller than original, i.e., another 10% smaller)
    const sf = 0.7;
    const pad = (1 - sf) / 2;

    // We will use 0x00000000 (transparent) as background.
    // iOS will automatically fill transparent with black (which matches the app's dark mode).

    // Apple Touch Icon (180)
    let bg180 = new Jimp(180, 180, 0x00000000);
    let fg180 = original.clone().resize(180 * sf, 180 * sf, Jimp.RESIZE_BICUBIC);
    bg180.composite(fg180, 180 * pad, 180 * pad);
    await bg180.writeAsync('public/apple-touch-icon.png');
    
    // Icon 192
    let bg192 = new Jimp(192, 192, 0x00000000);
    let fg192 = original.clone().resize(192 * sf, 192 * sf, Jimp.RESIZE_BICUBIC);
    bg192.composite(fg192, 192 * pad, 192 * pad);
    await bg192.writeAsync('public/icons/icon-192.png');
    
    // Icon 512
    let bg512 = new Jimp(512, 512, 0x00000000);
    let fg512 = original.clone().resize(512 * sf, 512 * sf, Jimp.RESIZE_BICUBIC);
    bg512.composite(fg512, 512 * pad, 512 * pad);
    await bg512.writeAsync('public/icons/icon-512.png');
    
    // Favicon (64)
    let bg64 = new Jimp(64, 64, 0x00000000);
    let fg64 = original.clone().resize(64 * sf, 64 * sf, Jimp.RESIZE_BICUBIC);
    bg64.composite(fg64, 64 * pad, 64 * pad);
    await bg64.writeAsync('public/favicon.png');
    
    console.log('Icons padded successfully.');
  } catch (e) {
    console.error(e);
  }
}
processImage();

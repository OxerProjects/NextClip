const { Jimp } = require('jimp');
async function run() {
  try {
    const image = await Jimp.read('C:/Users/omerh/.gemini/antigravity/brain/5baa8dea-47b8-43dc-8370-23b5795a5bb3/media__1778163342286.png');
    console.log(`Dimensions: ${image.bitmap.width}x${image.bitmap.height}`);
  } catch (e) {
    console.error(e);
  }
}
run();

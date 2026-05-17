const { Jimp } = require('jimp');
const fs = require('fs');

async function run() {
  try {
    const imgPath = 'C:/Users/omerh/.gemini/antigravity/brain/5baa8dea-47b8-43dc-8370-23b5795a5bb3/media__1778163342286.png';
    const image = await Jimp.read(imgPath);
    const w = image.bitmap.width;
    const h = image.bitmap.height;

    // We assume 3 top frames, and 2 bottom frames
    const frameW1 = Math.floor(w / 3);
    const frameH1 = Math.floor(h / 2);

    const outDir = './assets/images';
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Top row (3 frames)
    for (let i = 0; i < 3; i++) {
      const clone = image.clone();
      clone.crop({ x: i * frameW1, y: 0, w: frameW1, h: frameH1 });
      await clone.write(`${outDir}/frame${i + 1}.jpg`);
      console.log(`Saved frame${i + 1}.jpg`);
    }

    // Bottom row (might be a wide shot, let's just split in 2 for frame 4 and 5)
    // Or if it's 1 wide frame and they just want 5 frames total, maybe the bottom is 2 frames.
    const frameW2 = Math.floor(w / 2);
    for (let i = 0; i < 2; i++) {
      const clone = image.clone();
      clone.crop({ x: i * frameW2, y: frameH1, w: frameW2, h: frameH1 });
      await clone.write(`${outDir}/frame${i + 4}.jpg`);
      console.log(`Saved frame${i + 4}.jpg`);
    }

    console.log("Done cropping!");
  } catch (e) {
    console.error(e);
  }
}
run();

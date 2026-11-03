import {createRequire} from 'node:module';
import {readFile, writeFile} from 'node:fs/promises';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE_PATH || 'sharp');
const photos = new URL('../dark/assets/photos/', import.meta.url);
const sources = ['rehab-ai.webp', 'gait-clinic.webp', 'model-rehab-workbench.jpg',
  'upper-limb-game.webp', 'expert-digital-twin.webp', 'data-security-center.webp'];

// Keep a consistent 16:9 canvas and transfer budget without padding smaller files.
for (const source of sources) {
  const input = await readFile(new URL(source, photos));
  const stem = source.replace(/\.[^.]+$/, '');
  for (const [width, budget] of [[800, 56 * 1024], [1440, 128 * 1024]]) {
    let output, quality = 86;
    do {
      output = await sharp(input).resize(width, width * 9 / 16, {fit: 'cover'})
        .webp({quality, effort: 6}).toBuffer();
      if (output.length <= budget || quality === 78) break;
      quality -= 2;
    } while (true);
    const name = `tech-${stem}-${width}.webp`;
    for (const theme of ['dark', 'white']) {
      await writeFile(new URL(`../${theme}/assets/photos/${name}`, import.meta.url), output);
    }
    console.log(`${name}: ${(output.length / 1024).toFixed(1)} KB, quality ${quality}`);
  }
}

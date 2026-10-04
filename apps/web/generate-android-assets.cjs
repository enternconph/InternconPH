const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const LOGO_PATH = path.join(__dirname, 'public', 'logo1.png');
const RES_DIR = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const MIPMAP_DENSITIES = [
  { folder: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
  { folder: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
  { folder: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
  { folder: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
  { folder: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 },
];

const SPLASH_DENSITIES = [
  { folder: 'drawable', w: 512, h: 512 },
  { folder: 'drawable-port-mdpi', w: 320, h: 480 },
  { folder: 'drawable-port-hdpi', w: 480, h: 800 },
  { folder: 'drawable-port-xhdpi', w: 720, h: 1280 },
  { folder: 'drawable-port-xxhdpi', w: 960, h: 1600 },
  { folder: 'drawable-port-xxxhdpi', w: 1280, h: 1920 },
  { folder: 'drawable-land-mdpi', w: 480, h: 320 },
  { folder: 'drawable-land-hdpi', w: 800, h: 480 },
  { folder: 'drawable-land-xhdpi', w: 1280, h: 720 },
  { folder: 'drawable-land-xxhdpi', w: 1600, h: 960 },
  { folder: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
];

async function generateAssets() {
  console.log('Starting Android icon and splash screen generation from public/logo.png...');

  if (!fs.existsSync(LOGO_PATH)) {
    console.error('Error: logo.png not found at', LOGO_PATH);
    process.exit(1);
  }

  // 1. Generate Mipmap Icons
  for (const item of MIPMAP_DENSITIES) {
    const targetFolder = path.join(RES_DIR, item.folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    // A. ic_launcher_foreground.png (Adaptive Foreground with transparent background & safe margin)
    const fgLogoWidth = Math.round(item.fgSize * 0.62); // 62% of fgSize for safe zone
    const fgLogoResized = await sharp(LOGO_PATH)
      .resize(fgLogoWidth, fgLogoWidth, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: item.fgSize,
        height: item.fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: fgLogoResized, gravity: 'center' }])
      .png()
      .toFile(path.join(targetFolder, 'ic_launcher_foreground.png'));

    // B. ic_launcher.png (Legacy Square Icon with white background)
    const legacyLogoWidth = Math.round(item.iconSize * 0.85);
    const legacyLogoResized = await sharp(LOGO_PATH)
      .resize(legacyLogoWidth, legacyLogoWidth, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .toBuffer();

    await sharp({
      create: {
        width: item.iconSize,
        height: item.iconSize,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([{ input: legacyLogoResized, gravity: 'center' }])
      .png()
      .toFile(path.join(targetFolder, 'ic_launcher.png'));

    // C. ic_launcher_round.png (Legacy Round Icon with white circular background)
    const circleSvg = Buffer.from(
      `<svg width="${item.iconSize}" height="${item.iconSize}">
        <circle cx="${item.iconSize / 2}" cy="${item.iconSize / 2}" r="${item.iconSize / 2}" fill="#FFFFFF"/>
      </svg>`
    );

    const roundBg = await sharp(circleSvg).png().toBuffer();
    const roundLogoWidth = Math.round(item.iconSize * 0.72);
    const roundLogoResized = await sharp(LOGO_PATH)
      .resize(roundLogoWidth, roundLogoWidth, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp(roundBg)
      .composite([{ input: roundLogoResized, gravity: 'center' }])
      .png()
      .toFile(path.join(targetFolder, 'ic_launcher_round.png'));

    console.log(`Generated ${item.folder} icons (${item.iconSize}x${item.iconSize}, fg: ${item.fgSize}x${item.fgSize})`);
  }

  // 2. Generate Splash Screens
  for (const item of SPLASH_DENSITIES) {
    const targetFolder = path.join(RES_DIR, item.folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const minDim = Math.min(item.w, item.h);
    const splashLogoSize = Math.round(minDim * 0.38);

    const splashLogoResized = await sharp(LOGO_PATH)
      .resize(splashLogoSize, splashLogoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .toBuffer();

    await sharp({
      create: {
        width: item.w,
        height: item.h,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([{ input: splashLogoResized, gravity: 'center' }])
      .png()
      .toFile(path.join(targetFolder, 'splash.png'));

    console.log(`Generated ${item.folder}/splash.png (${item.w}x${item.h})`);
  }

  console.log('All Android app launcher icons and splash screens generated successfully!');
}

generateAssets().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});

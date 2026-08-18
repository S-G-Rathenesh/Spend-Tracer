const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Android mipmap sizes
const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// Foreground sizes (108dp adaptive icon)
const fgSizes = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

const srcImage = path.join(__dirname, '..', 'assets', 'spendly_logo.png');
const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.log('Installing sharp...');
    execSync('npm install sharp --no-save', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
    sharp = require('sharp');
  }

  for (const [folder, size] of Object.entries(sizes)) {
    const outDir = path.join(resDir, folder);
    
    // ic_launcher.png
    await sharp(srcImage)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(path.join(outDir, 'ic_launcher.png'));
    console.log(`Created ${folder}/ic_launcher.png (${size}x${size})`);

    // ic_launcher_round.png (same image, Android handles rounding)
    await sharp(srcImage)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(path.join(outDir, 'ic_launcher_round.png'));
    console.log(`Created ${folder}/ic_launcher_round.png (${size}x${size})`);
  }

  for (const [folder, size] of Object.entries(fgSizes)) {
    const outDir = path.join(resDir, folder);
    
    // ic_launcher_foreground.png (larger with padding for adaptive icons)
    const padding = Math.round(size * 0.2); // 20% padding
    const innerSize = size - (padding * 2);
    
    // Create a transparent canvas with the logo centered
    const resized = await sharp(srcImage)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: resized, left: padding, top: padding }])
      .png()
      .toFile(path.join(outDir, 'ic_launcher_foreground.png'));
    console.log(`Created ${folder}/ic_launcher_foreground.png (${size}x${size})`);
  }

  console.log('\nAll icons generated successfully!');
}

main().catch(console.error);

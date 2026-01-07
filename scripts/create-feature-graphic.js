const sharp = require('sharp');
const path = require('path');

async function createFeatureGraphic() {
  const inputPath = path.join(__dirname, '..', 'Graphic.jpg');
  const outputPath = path.join(__dirname, '..', 'feature-graphic-new.png');

  // Get original image dimensions
  const metadata = await sharp(inputPath).metadata();
  console.log('Original image:', metadata.width, 'x', metadata.height);

  // Play Store feature graphic dimensions
  const width = 1024;
  const height = 500;

  // Step 1: Load original and resize
  const resizedBuffer = await sharp(inputPath)
    .resize(800, null, { fit: 'inside' })
    .png()
    .toBuffer();

  // Step 2: Remove white background (make it transparent)
  // by replacing near-white pixels with transparency
  const { data, info } = await sharp(resizedBuffer)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  // Process pixels - make white transparent, make dark colors white
  const processedData = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Check if pixel is near white (background)
    if (r > 240 && g > 240 && b > 240) {
      // Make transparent
      processedData[i] = 0;
      processedData[i + 1] = 0;
      processedData[i + 2] = 0;
      processedData[i + 3] = 0;
    } else {
      // Keep the bell gradient colors, but make dark navy text white
      // Navy is roughly: r < 50, g < 80, b < 120
      const isNavy = r < 80 && g < 100 && b < 150 && Math.abs(r - g) < 50;

      if (isNavy) {
        // Change to white
        processedData[i] = 255;
        processedData[i + 1] = 255;
        processedData[i + 2] = 255;
        processedData[i + 3] = 255;
      } else {
        // Keep original color (bell gradient)
        processedData[i] = r;
        processedData[i + 1] = g;
        processedData[i + 2] = b;
        processedData[i + 3] = 255;
      }
    }
  }

  const processedImage = await sharp(processedData, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
    .png()
    .toBuffer();

  // Step 3: Create blue background and composite
  await sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: { r: 40, g: 133, b: 232, alpha: 1 } // #2885e8
    }
  })
    .composite([
      {
        input: processedImage,
        gravity: 'center'
      }
    ])
    .png()
    .toFile(outputPath);

  console.log('Feature graphic saved to:', outputPath);
}

createFeatureGraphic().catch(console.error);

const fs = require('fs');
const path = require('path');
const { app, nativeImage } = require('electron');

function createBmpBuffer(width, height, getPixelBgr) {
  const padding = (4 - ((width * 3) % 4)) % 4;
  const rowSize = width * 3 + padding;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buf = Buffer.alloc(fileSize);

  // BITMAPFILEHEADER (14 bytes)
  buf.write('BM', 0); // Signature
  buf.writeUInt32LE(fileSize, 2); // File size
  buf.writeUInt16LE(0, 6); // Reserved 1
  buf.writeUInt16LE(0, 8); // Reserved 2
  buf.writeUInt32LE(54, 10); // Offset to pixel data

  // BITMAPINFOHEADER (40 bytes)
  buf.writeUInt32LE(40, 14); // Header size
  buf.writeInt32LE(width, 18); // Width
  buf.writeInt32LE(height, 22); // Height (positive = bottom-up)
  buf.writeUInt16LE(1, 26); // Color planes
  buf.writeUInt16LE(24, 28); // Bits per pixel (24-bit RGB)
  buf.writeUInt32LE(0, 30); // Compression (0 = BI_RGB)
  buf.writeUInt32LE(pixelArraySize, 34); // Image size
  buf.writeInt32LE(2835, 38); // Horizontal resolution (pixels/meter)
  buf.writeInt32LE(2835, 42); // Vertical resolution
  buf.writeUInt32LE(0, 46); // Colors in color table
  buf.writeUInt32LE(0, 50); // Important color count

  let offset = 54;
  // BMP stores rows bottom to top
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const [b, g, r] = getPixelBgr(x, y);
      buf.writeUInt8(b, offset++);
      buf.writeUInt8(g, offset++);
      buf.writeUInt8(r, offset++);
    }
    for (let p = 0; p < padding; p++) {
      buf.writeUInt8(0, offset++);
    }
  }

  return buf;
}

app.whenReady().then(() => {
  const rootDir = path.resolve(__dirname, '..');
  const iconPngPath = path.join(rootDir, 'build', 'icon.png');
  const icon = nativeImage.createFromPath(iconPngPath);

  // 1. Sidebar BMP (164 x 314)
  const sidebarW = 164;
  const sidebarH = 314;
  const iconSidebarSize = 96;
  const iconSidebar = icon.resize({ width: iconSidebarSize, height: iconSidebarSize });
  const iconSidebarBmp = iconSidebar.toBitmap(); // BGRA format
  const iconSidebarX = Math.round((sidebarW - iconSidebarSize) / 2);
  const iconSidebarY = Math.round((sidebarH - iconSidebarSize) / 2) - 30; // slightly above center

  const sidebarBmp = createBmpBuffer(sidebarW, sidebarH, (x, y) => {
    // Dark background gradient with subtle purple-indigo glow at top
    const factor = y / sidebarH;
    let bgR = Math.round(24 + factor * 8);
    let bgG = Math.round(25 + factor * 10);
    let bgB = Math.round(32 + factor * 16);

    // Subtle indigo glow on top area
    if (y < 120) {
      const glow = (1 - y / 120) * 0.25;
      bgR = Math.round(bgR * (1 - glow) + 99 * glow);
      bgG = Math.round(bgG * (1 - glow) + 102 * glow);
      bgB = Math.round(bgB * (1 - glow) + 241 * glow);
    }

    // Overlay icon if inside icon box
    if (
      x >= iconSidebarX &&
      x < iconSidebarX + iconSidebarSize &&
      y >= iconSidebarY &&
      y < iconSidebarY + iconSidebarSize
    ) {
      const ix = x - iconSidebarX;
      const iy = y - iconSidebarY;
      const idx = (iy * iconSidebarSize + ix) * 4;
      const b = iconSidebarBmp[idx];
      const g = iconSidebarBmp[idx + 1];
      const r = iconSidebarBmp[idx + 2];
      const a = iconSidebarBmp[idx + 3] / 255;

      return [
        Math.round(b * a + bgB * (1 - a)),
        Math.round(g * a + bgG * (1 - a)),
        Math.round(r * a + bgR * (1 - a)),
      ];
    }

    return [bgB, bgG, bgR];
  });

  fs.writeFileSync(path.join(rootDir, 'build', 'installerSidebar.bmp'), sidebarBmp);
  fs.writeFileSync(path.join(rootDir, 'build', 'uninstallerSidebar.bmp'), sidebarBmp);
  console.log('Created installerSidebar.bmp & uninstallerSidebar.bmp (164x314)');

  // 2. Header BMP (150 x 57)
  const headerW = 150;
  const headerH = 57;
  const iconHeaderSize = 42;
  const iconHeader = icon.resize({ width: iconHeaderSize, height: iconHeaderSize });
  const iconHeaderBmp = iconHeader.toBitmap();
  const iconHeaderX = headerW - iconHeaderSize - 10;
  const iconHeaderY = Math.round((headerH - iconHeaderSize) / 2);

  const headerBmp = createBmpBuffer(headerW, headerH, (x, y) => {
    // Dark clean background
    let bgR = 24;
    let bgG = 25;
    let bgB = 32;

    // Overlay icon on the right
    if (
      x >= iconHeaderX &&
      x < iconHeaderX + iconHeaderSize &&
      y >= iconHeaderY &&
      y < iconHeaderY + iconHeaderSize
    ) {
      const ix = x - iconHeaderX;
      const iy = y - iconHeaderY;
      const idx = (iy * iconHeaderSize + ix) * 4;
      const b = iconHeaderBmp[idx];
      const g = iconHeaderBmp[idx + 1];
      const r = iconHeaderBmp[idx + 2];
      const a = iconHeaderBmp[idx + 3] / 255;

      return [
        Math.round(b * a + bgB * (1 - a)),
        Math.round(g * a + bgG * (1 - a)),
        Math.round(r * a + bgR * (1 - a)),
      ];
    }

    return [bgB, bgG, bgR];
  });

  fs.writeFileSync(path.join(rootDir, 'build', 'installerHeader.bmp'), headerBmp);
  console.log('Created installerHeader.bmp (150x57)');

  app.quit();
});

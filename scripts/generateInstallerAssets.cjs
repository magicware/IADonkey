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

// Signed distance function for anti-aliased rounded rectangle
function roundedBoxSdf(px, py, halfW, halfH, radius) {
  const qx = Math.abs(px) - halfW + radius;
  const qy = Math.abs(py) - halfH + radius;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

app.whenReady().then(() => {
  const rootDir = path.resolve(__dirname, '..');
  const iconPngPath = path.join(rootDir, 'build', 'icon.png');
  const icon = nativeImage.createFromPath(iconPngPath);

  // Theme base colors: #1E1E28 (RGB: 30, 30, 40)
  const BASE_R = 30;
  const BASE_G = 30;
  const BASE_B = 40;

  // Accent indigo: #6366F1 (RGB: 99, 102, 241)
  const ACCENT_R = 99;
  const ACCENT_G = 102;
  const ACCENT_B = 241;

  // Card panel: #262634 (RGB: 38, 38, 52)
  const CARD_R = 38;
  const CARD_G = 38;
  const CARD_B = 52;

  // -------------------------------------------------------------
  // 1. Sidebar BMP (164 x 314) - Welcome & Finish page left panel
  // -------------------------------------------------------------
  const sidebarW = 164;
  const sidebarH = 314;

  const cardCenterX = 82;
  const cardCenterY = 98;
  const cardHalfW = 46;
  const cardHalfH = 46;
  const cardRadius = 14;

  const iconSidebarSize = 64;
  const iconSidebar = icon.resize({ width: iconSidebarSize, height: iconSidebarSize });
  const iconSidebarBmp = iconSidebar.toBitmap(); // BGRA
  const iconSidebarX = cardCenterX - Math.round(iconSidebarSize / 2);
  const iconSidebarY = cardCenterY - Math.round(iconSidebarSize / 2);

  const sidebarBmp = createBmpBuffer(sidebarW, sidebarH, (x, y) => {
    let r = BASE_R;
    let g = BASE_G;
    let b = BASE_B;

    // 1. Left vertical accent stripe (3px) with soft glow
    if (x < 3) {
      r = ACCENT_R;
      g = ACCENT_G;
      b = ACCENT_B;
    } else if (x === 3) {
      r = Math.round(BASE_R * 0.4 + ACCENT_R * 0.6);
      g = Math.round(BASE_G * 0.4 + ACCENT_G * 0.6);
      b = Math.round(BASE_B * 0.4 + ACCENT_B * 0.6);
    }

    // 2. Soft radial ambient indigo glow behind the card
    const glowDist = Math.hypot(x - cardCenterX, y - cardCenterY);
    if (glowDist < 75) {
      const glow = (1 - glowDist / 75) * 0.28;
      r = Math.round(r * (1 - glow) + ACCENT_R * glow);
      g = Math.round(g * (1 - glow) + ACCENT_G * glow);
      b = Math.round(b * (1 - glow) + ACCENT_B * glow);
    }

    // 3. Card container with anti-aliased rounded rectangle
    const dCard = roundedBoxSdf(x - cardCenterX, y - cardCenterY, cardHalfW, cardHalfH, cardRadius);
    if (dCard < 1.0) {
      const cardAlpha = clamp(1.0 - dCard, 0, 1);
      // Check if pixel is on the 1.5px border
      const isBorder = dCard >= -1.5 && dCard <= 0.5;
      const borderAlpha = isBorder ? 0.65 : 0;

      if (isBorder) {
        const tr = Math.round(CARD_R * 0.4 + ACCENT_R * 0.6);
        const tg = Math.round(CARD_G * 0.4 + ACCENT_G * 0.6);
        const tb = Math.round(CARD_B * 0.4 + ACCENT_B * 0.6);
        r = Math.round(r * (1 - cardAlpha) + tr * cardAlpha);
        g = Math.round(g * (1 - cardAlpha) + tg * cardAlpha);
        b = Math.round(b * (1 - cardAlpha) + tb * cardAlpha);
      } else {
        r = Math.round(r * (1 - cardAlpha) + CARD_R * cardAlpha);
        g = Math.round(g * (1 - cardAlpha) + CARD_G * cardAlpha);
        b = Math.round(b * (1 - cardAlpha) + CARD_B * cardAlpha);
      }
    }

    // 4. Render icon inside card
    if (
      x >= iconSidebarX &&
      x < iconSidebarX + iconSidebarSize &&
      y >= iconSidebarY &&
      y < iconSidebarY + iconSidebarSize
    ) {
      const ix = x - iconSidebarX;
      const iy = y - iconSidebarY;
      const idx = (iy * iconSidebarSize + ix) * 4;
      const ib = iconSidebarBmp[idx];
      const ig = iconSidebarBmp[idx + 1];
      const ir = iconSidebarBmp[idx + 2];
      const ia = iconSidebarBmp[idx + 3] / 255;

      b = Math.round(ib * ia + b * (1 - ia));
      g = Math.round(ig * ia + g * (1 - ia));
      r = Math.round(ir * ia + r * (1 - ia));
    }

    // 5. Decorative accent pill below card (y from 162 to 166, centered)
    const dPill = roundedBoxSdf(x - cardCenterX, y - 165, 24, 2, 2);
    if (dPill < 1.0) {
      const pillAlpha = clamp(1.0 - dPill, 0, 1) * 0.75;
      r = Math.round(r * (1 - pillAlpha) + ACCENT_R * pillAlpha);
      g = Math.round(g * (1 - pillAlpha) + ACCENT_G * pillAlpha);
      b = Math.round(b * (1 - pillAlpha) + ACCENT_B * pillAlpha);
    }

    // 6. Decorative three small status dots below pill
    const dotY = 176;
    [-12, 0, 12].forEach((offsetDot, idx) => {
      const dotDist = Math.hypot(x - (cardCenterX + offsetDot), y - dotY);
      if (dotDist < 2.2) {
        const dotAlpha = clamp(2.2 - dotDist, 0, 1) * (idx === 1 ? 0.8 : 0.4);
        r = Math.round(r * (1 - dotAlpha) + ACCENT_R * dotAlpha);
        g = Math.round(g * (1 - dotAlpha) + ACCENT_G * dotAlpha);
        b = Math.round(b * (1 - dotAlpha) + ACCENT_B * dotAlpha);
      }
    });

    return [b, g, r];
  });

  fs.writeFileSync(path.join(rootDir, 'build', 'installerSidebar.bmp'), sidebarBmp);
  fs.writeFileSync(path.join(rootDir, 'build', 'uninstallerSidebar.bmp'), sidebarBmp);
  console.log('Created installerSidebar.bmp & uninstallerSidebar.bmp (164x314)');

  // -------------------------------------------------------------
  // 2. Header BMP (150 x 57) - Directory & Progress page top banner
  // -------------------------------------------------------------
  const headerW = 150;
  const headerH = 57;

  const headerCardCenterX = 120;
  const headerCardCenterY = Math.round(headerH / 2);
  const headerCardHalfW = 20;
  const headerCardHalfH = 20;
  const headerCardRadius = 8;

  const iconHeaderSize = 30;
  const iconHeader = icon.resize({ width: iconHeaderSize, height: iconHeaderSize });
  const iconHeaderBmp = iconHeader.toBitmap();
  const iconHeaderX = headerCardCenterX - Math.round(iconHeaderSize / 2);
  const iconHeaderY = headerCardCenterY - Math.round(iconHeaderSize / 2);

  const headerBmp = createBmpBuffer(headerW, headerH, (x, y) => {
    let r = BASE_R;
    let g = BASE_G;
    let b = BASE_B;

    // Ambient glow on the right around icon card
    const glowDist = Math.hypot(x - headerCardCenterX, y - headerCardCenterY);
    if (glowDist < 40) {
      const glow = (1 - glowDist / 40) * 0.22;
      r = Math.round(r * (1 - glow) + ACCENT_R * glow);
      g = Math.round(g * (1 - glow) + ACCENT_G * glow);
      b = Math.round(b * (1 - glow) + ACCENT_B * glow);
    }

    // Rounded card container
    const dCard = roundedBoxSdf(x - headerCardCenterX, y - headerCardCenterY, headerCardHalfW, headerCardHalfH, headerCardRadius);
    if (dCard < 1.0) {
      const cardAlpha = clamp(1.0 - dCard, 0, 1);
      const isBorder = dCard >= -1.2 && dCard <= 0.5;

      if (isBorder) {
        const tr = Math.round(CARD_R * 0.3 + ACCENT_R * 0.7);
        const tg = Math.round(CARD_G * 0.3 + ACCENT_G * 0.7);
        const tb = Math.round(CARD_B * 0.3 + ACCENT_B * 0.7);
        r = Math.round(r * (1 - cardAlpha) + tr * cardAlpha);
        g = Math.round(g * (1 - cardAlpha) + tg * cardAlpha);
        b = Math.round(b * (1 - cardAlpha) + tb * cardAlpha);
      } else {
        r = Math.round(r * (1 - cardAlpha) + CARD_R * cardAlpha);
        g = Math.round(g * (1 - cardAlpha) + CARD_G * cardAlpha);
        b = Math.round(b * (1 - cardAlpha) + CARD_B * cardAlpha);
      }
    }

    // Icon
    if (
      x >= iconHeaderX &&
      x < iconHeaderX + iconHeaderSize &&
      y >= iconHeaderY &&
      y < iconHeaderY + iconHeaderSize
    ) {
      const ix = x - iconHeaderX;
      const iy = y - iconHeaderY;
      const idx = (iy * iconHeaderSize + ix) * 4;
      const ib = iconHeaderBmp[idx];
      const ig = iconHeaderBmp[idx + 1];
      const ir = iconHeaderBmp[idx + 2];
      const ia = iconHeaderBmp[idx + 3] / 255;

      b = Math.round(ib * ia + b * (1 - ia));
      g = Math.round(ig * ia + g * (1 - ia));
      r = Math.round(ir * ia + r * (1 - ia));
    }

    return [b, g, r];
  });

  fs.writeFileSync(path.join(rootDir, 'build', 'installerHeader.bmp'), headerBmp);
  console.log('Created installerHeader.bmp (150x57)');

  app.quit();
});
